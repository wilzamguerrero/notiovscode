/**
 * Sistema de Upload de archivos a Notion (REDISEÑADO)
 */

let uploadFiles = [];
let uploadPreviews = [];
let activeUploadTab = 'file';
let selectedBoardId = null;
let treeData = []; // Datos del árbol en memoria
let uploadTreeCache = {}; // Caché para nodos expandidos en upload

// Configuración del proxy CORS
const CORS_PROXY = 'https://corsproxy.io/?';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function initUploadSystem() {
  // Botón abrir modal
  const openBtn = document.getElementById('openUploadBtn');
  if (openBtn) {
    openBtn.addEventListener('click', openUploadModal);
  }
  
  // Botón cerrar modal
  const closeBtn = document.getElementById('closeUploadModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeUploadModal);
  }
  
  // Click en overlay para cerrar
  const overlay = document.querySelector('.upload-modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeUploadModal);
  }
  
  // Tabs
  document.querySelectorAll('.upload-tab-modern').forEach(tab => {
    tab.addEventListener('click', () => switchUploadTab(tab.dataset.tab));
  });
  
  // Input de archivos
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }
  
  // Dropzone
  const dropzone = document.getElementById('uploadDropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', handleDrop);
  }
  
  // Paste global
  document.addEventListener('paste', handlePaste);
  
  // Submit
  const submitBtn = document.getElementById('uploadSubmitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleUploadSubmit);
  }
}

async function openUploadModal() {
  const modal = document.getElementById('uploadModal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Cargar árbol
  await loadUploadTree();
  
  // Reset form
  resetUploadForm();
}

function closeUploadModal() {
  const modal = document.getElementById('uploadModal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  
  // Limpiar
  uploadPreviews.forEach(p => URL.revokeObjectURL(p.url));
  uploadFiles = [];
  uploadPreviews = [];
}

// --- LÓGICA DEL ÁRBOL ---

async function loadUploadTree() {
  const container = document.getElementById('uploadTreeContainer');
  container.innerHTML = '<div class="text-gray-500 text-sm p-4">Cargando carpetas...</div>';
  
  try {
    const res = await authFetch('/notion/get-quick-tree');
    if (!res.ok) throw new Error('Error cargando árbol');
    
    const json = await res.json();
    treeData = json.data || json;
    
    // Limpiar caché al recargar
    uploadTreeCache = {};
    
    renderUploadTree();
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="text-red-500 text-sm p-4">Error al cargar carpetas</div>';
  }
}

function renderUploadTree() {
  const container = document.getElementById('uploadTreeContainer');
  container.innerHTML = '';
  
  treeData.forEach(node => {
    container.appendChild(createTreeNodeElement(node, 0));
  });
}

function createTreeNodeElement(node, depth) {
  const wrapper = document.createElement('div');
  wrapper.className = 'upload-tree-wrapper';
  wrapper.dataset.nodeId = node.id;
  
  const nodeEl = document.createElement('div');
  nodeEl.className = `upload-tree-node ${selectedBoardId === node.id ? 'selected' : ''}`;
  nodeEl.style.paddingLeft = `${depth * 16 + 12}px`;
  nodeEl.dataset.id = node.id;
  
  const title = node.title.trim();
  const isExpanded = uploadTreeCache[node.id] ? true : false;
  
  nodeEl.innerHTML = `
    <div class="node-content">
      <div class="node-arrow ${isExpanded ? 'expanded' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
      <svg class="node-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
      <span class="node-title">${title}</span>
    </div>
    <button class="add-folder-btn" title="Nueva subcarpeta">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
    </button>
  `;

  // Click en el contenido del nodo (no en el botón de agregar)
  const nodeContent = nodeEl.querySelector('.node-content');
  nodeContent.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    // Seleccionar este nodo
    selectBoard(node.id);
    
    // Toggle expandir/colapsar
    await toggleExpandNode(node.id, wrapper, depth);
  });

  // Botón para crear subcarpeta
  const addBtn = nodeEl.querySelector('.add-folder-btn');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Primero expandir el nodo si no está expandido
    const childrenContainer = wrapper.querySelector('.children-container');
    if (!childrenContainer || childrenContainer.classList.contains('hidden')) {
      toggleExpandNode(node.id, wrapper, depth).then(() => {
        showCreateFolderInput(wrapper, node.id, depth + 1);
      });
    } else {
      showCreateFolderInput(wrapper, node.id, depth + 1);
    }
  });

  wrapper.appendChild(nodeEl);

  // Contenedor de hijos
  const childrenContainer = document.createElement('div');
  childrenContainer.className = 'children-container hidden';
  wrapper.appendChild(childrenContainer);
  
  return wrapper;
}

/**
 * Toggle expandir/colapsar nodo
 */
async function toggleExpandNode(nodeId, wrapper, depth) {
  const childrenContainer = wrapper.querySelector('.children-container');
  const arrow = wrapper.querySelector('.node-arrow');
  const nodeEl = wrapper.querySelector('.upload-tree-node');
  
  if (!childrenContainer) return;
  
  const isCurrentlyHidden = childrenContainer.classList.contains('hidden');
  
  if (isCurrentlyHidden) {
    // Expandir - cargar hijos si no están en caché
    if (!uploadTreeCache[nodeId]) {
      nodeEl.classList.add('loading');
      
      try {
        const res = await authFetch(`/notion/toggle/${nodeId}`);
        if (!res.ok) throw new Error('Error cargando nodo');
        
        const data = await res.json();
        uploadTreeCache[nodeId] = data;
      } catch (error) {
        console.error('Error expandiendo nodo:', error);
        nodeEl.classList.remove('loading');
        return;
      }
      
      nodeEl.classList.remove('loading');
    }
    
    // Renderizar hijos
    const data = uploadTreeCache[nodeId];
    childrenContainer.innerHTML = '';
    
    if (data.children && data.children.length > 0) {
      data.children.forEach(child => {
        // Crear nodo hijo con la estructura correcta
        const childNode = {
          id: child.id,
          title: child.title,
          children: child.children // puede ser true o un array
        };
        childrenContainer.appendChild(createTreeNodeElement(childNode, depth + 1));
      });
    }
    
    childrenContainer.classList.remove('hidden');
    if (arrow) {
      arrow.classList.add('expanded');
    }
  } else {
    // Colapsar
    childrenContainer.classList.add('hidden');
    if (arrow) {
      arrow.classList.remove('expanded');
    }
  }
}

/**
 * Seleccionar un board/carpeta
 */
function selectBoard(boardId) {
  selectedBoardId = boardId;
  
  // Actualizar UI - quitar selección anterior
  document.querySelectorAll('.upload-tree-node.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Marcar el nuevo como seleccionado
  const newSelected = document.querySelector(`.upload-tree-node[data-id="${boardId}"]`);
  if (newSelected) {
    newSelected.classList.add('selected');
  }
  
  // Habilitar botón de submit si hay archivos
  updateSubmitButton();
}

/**
 * Mostrar input para crear nueva carpeta
 */
function showCreateFolderInput(parentWrapper, parentId, depth) {
  const childrenContainer = parentWrapper.querySelector('.children-container');
  if (!childrenContainer) return;
  
  // Remover formulario existente si hay
  const existingForm = childrenContainer.querySelector('.new-folder-form');
  if (existingForm) {
    existingForm.remove();
  }
  
  const form = document.createElement('div');
  form.className = 'new-folder-form';
  form.style.paddingLeft = `${depth * 16 + 12}px`;
  form.innerHTML = `
    <input type="text" class="new-folder-input" placeholder="Nombre de carpeta..." autofocus />
    <button class="new-folder-confirm" title="Crear">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </button>
    <button class="new-folder-cancel" title="Cancelar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;
  
  // Insertar al inicio del contenedor de hijos
  childrenContainer.insertBefore(form, childrenContainer.firstChild);
  childrenContainer.classList.remove('hidden');
  
  const input = form.querySelector('.new-folder-input');
  const confirmBtn = form.querySelector('.new-folder-confirm');
  const cancelBtn = form.querySelector('.new-folder-cancel');
  
  input.focus();
  
  const createFolder = async () => {
    const name = input.value.trim();
    if (!name) {
      form.remove();
      return;
    }
    
    try {
      input.disabled = true;
      confirmBtn.disabled = true;
      
      const res = await authFetch('/api/create-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name, parentId: parentId })
      });
      
      if (!res.ok) throw new Error('Error creando carpeta');
      
      const result = await res.json();
      
      // Limpiar caché del padre para forzar recarga
      delete uploadTreeCache[parentId];
      
      // Recargar hijos del padre
      await toggleExpandNode(parentId, parentWrapper, depth - 1);
      // Expandir de nuevo ya que toggleExpandNode colapsa si está expandido
      const childrenCont = parentWrapper.querySelector('.children-container');
      if (childrenCont && childrenCont.classList.contains('hidden')) {
        await toggleExpandNode(parentId, parentWrapper, depth - 1);
      }
      
      // Seleccionar la nueva carpeta
      selectBoard(result.id);
      
    } catch (error) {
      console.error('Error creando carpeta:', error);
      alert('Error al crear la carpeta');
    }
    
    form.remove();
  };
  
  confirmBtn.addEventListener('click', createFolder);
  cancelBtn.addEventListener('click', () => form.remove());
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createFolder();
    if (e.key === 'Escape') form.remove();
  });
}

/**
 * Actualizar estado del botón submit
 */
function updateSubmitButton() {
  const submitBtn = document.getElementById('uploadSubmitBtn');
  if (!submitBtn) return;
  
  const hasFiles = uploadFiles.length > 0;
  const hasUrl = document.getElementById('urlInput')?.value.trim();
  const hasDestination = selectedBoardId !== null;
  
  submitBtn.disabled = !hasDestination || (!hasFiles && !hasUrl);
}

// --- MANEJO DE ARCHIVOS ---

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  addFiles(files);
}

function handleDrop(e) {
  e.preventDefault();
  e.target.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files);
  addFiles(files);
}

function handlePaste(e) {
  const modal = document.getElementById('uploadModal');
  if (modal.classList.contains('hidden')) return;
  
  const items = e.clipboardData?.items;
  if (!items) return;
  
  const files = [];
  for (const item of items) {
    if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  
  if (files.length > 0) {
    addFiles(files);
  }
}

function addFiles(newFiles) {
  newFiles.forEach(file => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      uploadFiles.push(file);
      uploadPreviews.push({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name
      });
    }
  });
  
  renderFilePreviews();
  updateSubmitButton();
}

function renderFilePreviews() {
  const grid = document.getElementById('filePreviewGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  uploadPreviews.forEach((preview, index) => {
    const item = document.createElement('div');
    item.className = 'upload-preview-item';
    
    if (preview.type === 'image') {
      item.innerHTML = `
        <img src="${preview.url}" alt="${preview.name}" />
        <button class="upload-preview-remove" data-index="${index}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
    } else {
      item.innerHTML = `
        <video src="${preview.url}" muted></video>
        <button class="upload-preview-remove" data-index="${index}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
    }
    
    grid.appendChild(item);
  });
  
  // Event listeners para remover
  grid.querySelectorAll('.upload-preview-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      removeFile(index);
    });
  });
}

function removeFile(index) {
  URL.revokeObjectURL(uploadPreviews[index].url);
  uploadFiles.splice(index, 1);
  uploadPreviews.splice(index, 1);
  renderFilePreviews();
  updateSubmitButton();
}

function switchUploadTab(tabName) {
  activeUploadTab = tabName;
  
  document.querySelectorAll('.upload-tab-modern').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  document.querySelectorAll('.upload-view').forEach(view => {
    view.classList.add('hidden');
  });
  
  const activeView = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if (activeView) {
    activeView.classList.remove('hidden');
  }
  
  updateSubmitButton();
}

function resetUploadForm() {
  uploadPreviews.forEach(p => URL.revokeObjectURL(p.url));
  uploadFiles = [];
  uploadPreviews = [];
  selectedBoardId = null;
  
  const urlInput = document.getElementById('urlInput');
  if (urlInput) urlInput.value = '';
  
  renderFilePreviews();
  
  // Quitar selección del árbol
  document.querySelectorAll('.upload-tree-node.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  switchUploadTab('file');
  
  const overlay = document.getElementById('uploadOverlay');
  if (overlay) overlay.classList.add('hidden');
  
  updateSubmitButton();
}

// --- SUBMIT ---

async function handleUploadSubmit() {
  if (!selectedBoardId) {
    alert('Por favor selecciona una carpeta de destino');
    return;
  }
  
  const overlay = document.getElementById('uploadOverlay');
  const progressFill = document.querySelector('.progress-fill-modern');
  
  if (overlay) overlay.classList.remove('hidden');
  if (progressFill) progressFill.style.width = '0%';
  
  try {
    if (activeUploadTab === 'file' && uploadFiles.length > 0) {
      // Subir archivos
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        await uploadFileToNotionDirect(selectedBoardId, file, file.name);
        
        if (progressFill) {
          progressFill.style.width = `${((i + 1) / uploadFiles.length) * 100}%`;
        }
      }
    } else if (activeUploadTab === 'url') {
      const url = document.getElementById('urlInput')?.value.trim();
      if (url) {
        await uploadUrlToNotion(selectedBoardId, url, '');
      }
    }
    
    showUploadSuccess();
    
  } catch (error) {
    console.error('Error en upload:', error);
    alert('Error al subir: ' + error.message);
    if (overlay) overlay.classList.add('hidden');
  }
}

/**
 * Obtener credenciales de Notion desde el servidor
 */
async function getNotionCredentials() {
  const res = await authFetch('/api/get-credentials');
  if (!res.ok) throw new Error('No se pudieron obtener las credenciales');
  return await res.json();
}

/**
 * Subir archivo directamente a Notion
 */
async function uploadFileToNotionDirect(toggleId, file, caption) {
  // Notion no permite subir archivos directamente via API pública
  // Usamos el endpoint del servidor
  const formData = new FormData();
  formData.append('file', file);
  formData.append('toggleId', toggleId);
  formData.append('caption', caption || '');
  formData.append('type', file.type.startsWith('image/') ? 'image' : 'video');
  
  const res = await authFetch('/api/upload-file', {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al subir archivo');
  }
  
  return await res.json();
}

/**
 * Formatear ID de Notion
 */
function formatNotionId(idOrUrl) {
  const uuidRegex = /[a-f0-9]{32}/;
  const cleanId = idOrUrl.replace(/-/g, '');
  const match = cleanId.match(uuidRegex);
  return match ? match[0] : cleanId;
}

/**
 * Subir URL a Notion
 */
async function uploadUrlToNotion(toggleId, url, caption) {
  const res = await authFetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toggleId, url, caption })
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al guardar URL');
  }
  
  return await res.json();
}

/**
 * Mostrar mensaje de éxito
 */
function showUploadSuccess() {
  const successDiv = document.getElementById('uploadSuccess');
  if (successDiv) successDiv.classList.remove('hidden');
  
  setTimeout(() => {
    if (successDiv) successDiv.classList.add('hidden');
    closeUploadModal();
    
    if (typeof selectedNodeId !== 'undefined' && selectedNodeId) {
      loadNodeById(selectedNodeId, false);
    }
  }, 1500);
}