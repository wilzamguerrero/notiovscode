/**
 * Sistema de Upload de archivos a Notion (REDISEÑADO)
 */

let uploadFiles = [];
let uploadPreviews = [];
let activeUploadTab = 'file';
let selectedBoardId = null;
let treeData = []; // Datos del árbol en memoria

// Configuración del proxy CORS
const CORS_PROXY = 'https://corsproxy.io/?';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function initUploadSystem() {
  const openBtn = document.getElementById('openUploadBtn');
  const closeBtn = document.getElementById('closeUploadModal');
  const overlay = document.querySelector('.upload-modal-overlay');
  
  if (openBtn) openBtn.addEventListener('click', openUploadModal);
  if (closeBtn) closeBtn.addEventListener('click', closeUploadModal);
  if (overlay) overlay.addEventListener('click', closeUploadModal);
  
  // Tabs
  document.querySelectorAll('.upload-tab-modern').forEach(tab => {
    tab.addEventListener('click', () => switchUploadTab(tab.dataset.tab));
  });
  
  // File input
  const fileInput = document.getElementById('fileInput');
  if (fileInput) fileInput.addEventListener('change', handleFileSelect);
  
  // Dropzone
  const dropzone = document.getElementById('uploadDropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', handleDrop);
  }
  
  // Paste handler
  document.addEventListener('paste', handlePaste);
  
  // Submit
  const submitBtn = document.getElementById('submitUpload');
  if (submitBtn) submitBtn.addEventListener('click', handleUploadSubmit);

  // URL Input validation
  const urlInput = document.getElementById('urlInput');
  if (urlInput) urlInput.addEventListener('input', validateUploadForm);
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
    // Reusamos el endpoint existente
    const res = await authFetch('/notion/get-quick-tree');
    if (!res.ok) throw new Error('Error cargando árbol');
    
    const json = await res.json();
    treeData = json.data || json;
    
    renderUploadTree();
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="text-red-500 text-sm p-4">Error al cargar carpetas</div>';
  }
}

function renderUploadTree() {
  const container = document.getElementById('uploadTreeContainer');
  container.innerHTML = '';
  
  // Renderizar nodo raíz (Main Page)
  const rootNode = document.createElement('div');
  // Usamos un ID especial para la raíz si queremos permitir subir ahí, 
  // o forzamos a seleccionar un hijo. En este caso, permitimos raíz.
  // Pero Notion API necesita un block_id. Asumimos que el usuario selecciona carpetas existentes.
  
  // Renderizar lista recursiva
  treeData.forEach(node => {
    container.appendChild(createTreeNodeElement(node, 0));
  });
}

function createTreeNodeElement(node, depth) {
  const wrapper = document.createElement('div');
  
  const nodeEl = document.createElement('div');
  nodeEl.className = `upload-tree-node ${selectedBoardId === node.id ? 'selected' : ''}`;
  nodeEl.style.paddingLeft = `${depth * 16 + 12}px`;
  nodeEl.dataset.id = node.id;
  
  // Ya no hay símbolo * - título limpio
  const title = node.title.trim();
  const hasChildren = node.children && node.children.length > 0;
  
  nodeEl.innerHTML = `
    <div class="node-content">
      <div class="node-arrow">
        ${hasChildren ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>' : ''}
      </div>
      <svg class="node-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
      <span class="node-title">${title}</span>
    </div>
    <button class="add-folder-btn" title="Nueva subcarpeta">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
    </button>
  `;

  // Evento Click: Seleccionar
  nodeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    selectBoard(node.id);
    // Toggle expandir si tiene hijos
    if (hasChildren) {
      const childrenContainer = wrapper.querySelector('.children-container');
      if (childrenContainer) {
        childrenContainer.classList.toggle('hidden');
        const arrow = nodeEl.querySelector('.node-arrow svg');
        if (arrow) arrow.style.transform = childrenContainer.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
      }
    }
  });

  // Evento Click: Crear Carpeta
  const addBtn = nodeEl.querySelector('.add-folder-btn');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showCreateFolderInput(wrapper, node.id, depth + 1);
    // Expandir para ver el input
    const childrenContainer = wrapper.querySelector('.children-container');
    if (childrenContainer) {
      childrenContainer.classList.remove('hidden');
      const arrow = nodeEl.querySelector('.node-arrow svg');
      if (arrow) arrow.style.transform = 'rotate(90deg)';
    }
  });

  wrapper.appendChild(nodeEl);

  // 2. Contenedor de hijos
  const childrenContainer = document.createElement('div');
  childrenContainer.className = 'children-container hidden'; // Colapsado por defecto
  
  if (hasChildren) {
    node.children.forEach(child => {
      childrenContainer.appendChild(createTreeNodeElement(child, depth + 1));
    });
  }
  
  wrapper.appendChild(childrenContainer);
  return wrapper;
}

function selectBoard(id) {
  selectedBoardId = id;
  // Actualizar visualmente
  document.querySelectorAll('.upload-tree-node').forEach(el => {
    if (el.dataset.id === id) el.classList.add('selected');
    else el.classList.remove('selected');
  });
  validateUploadForm();
}

function showCreateFolderInput(parentWrapper, parentId, depth) {
  // Verificar si ya existe un input abierto
  if (parentWrapper.querySelector('.new-folder-form')) return;

  let childrenContainer = parentWrapper.querySelector('.children-container');
  // Si no existe contenedor de hijos (porque no tenía hijos), crearlo
  if (!childrenContainer) {
    childrenContainer = document.createElement('div');
    childrenContainer.className = 'children-container';
    parentWrapper.appendChild(childrenContainer);
  }
  childrenContainer.classList.remove('hidden');

  const form = document.createElement('form');
  form.className = 'new-folder-form';
  form.style.paddingLeft = `${depth * 16 + 12}px`;
  form.innerHTML = `
    <input type="text" class="new-folder-input" placeholder="Nombre carpeta..." autoFocus />
    <button type="submit" class="text-green-400 hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
    <button type="button" class="cancel-btn text-red-400 hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
  `;

  const input = form.querySelector('input');
  const cancelBtn = form.querySelector('.cancel-btn');

  cancelBtn.onclick = () => form.remove();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;

    input.disabled = true;
    try {
      const res = await authFetch('/api/create-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, parentId })
      });
      
      if (!res.ok) throw new Error('Error creando carpeta');
      
      // Recargar árbol completo para simplificar
      await loadUploadTree();
      // Opcional: Auto-seleccionar la nueva carpeta (requeriría buscarla en el nuevo árbol)
      
    } catch (err) {
      console.error(err);
      alert('Error al crear carpeta');
      input.disabled = false;
      input.focus();
    }
  };

  // Insertar al principio de la lista de hijos
  childrenContainer.insertBefore(form, childrenContainer.firstChild);
  input.focus();
}

// --- MANEJO DE ARCHIVOS ---

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  addFiles(files);
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files);
  addFiles(files);
}

function handlePaste(e) {
  const modal = document.getElementById('uploadModal');
  if (modal.classList.contains('hidden')) return;
  
  if (e.clipboardData && e.clipboardData.files.length > 0) {
    const files = Array.from(e.clipboardData.files);
    addFiles(files);
    switchUploadTab('file');
  }
}

function addFiles(newFiles) {
  const validFiles = newFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
  
  validFiles.forEach(file => {
    uploadFiles.push(file);
    uploadPreviews.push({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    });
  });
  
  renderFilePreviews();
  validateUploadForm();
}

function renderFilePreviews() {
  const grid = document.getElementById('filePreviewGrid');
  grid.innerHTML = '';
  
  uploadPreviews.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/40 group';
    
    if (item.type === 'video') {
      div.innerHTML = `<video src="${item.url}" class="w-full h-full object-cover" muted></video>`;
      // Play on hover logic could go here
    } else {
      div.innerHTML = `<img src="${item.url}" class="w-full h-full object-cover" />`;
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity';
    removeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    removeBtn.onclick = () => removeFile(index);
    
    div.appendChild(removeBtn);
    grid.appendChild(div);
  });
}

function removeFile(index) {
  URL.revokeObjectURL(uploadPreviews[index].url);
  uploadFiles.splice(index, 1);
  uploadPreviews.splice(index, 1);
  renderFilePreviews();
  validateUploadForm();
}

function switchUploadTab(tabName) {
  activeUploadTab = tabName;
  document.querySelectorAll('.upload-tab-modern').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.getElementById('tabFile').classList.toggle('hidden', tabName !== 'file');
  document.getElementById('tabUrl').classList.toggle('hidden', tabName !== 'url');
  validateUploadForm();
}

function validateUploadForm() {
  const btn = document.getElementById('submitUpload');
  let isValid = false;
  
  if (selectedBoardId) {
    if (activeUploadTab === 'file') isValid = uploadFiles.length > 0;
    else isValid = document.getElementById('urlInput').value.trim().length > 0;
  }
  
  btn.disabled = !isValid;
  const span = btn.querySelector('span');
  if (activeUploadTab === 'file' && uploadFiles.length > 0) {
    span.textContent = `Subir ${uploadFiles.length} archivo${uploadFiles.length > 1 ? 's' : ''}`;
  } else {
    span.textContent = 'Subir';
  }
}

function resetUploadForm() {
  uploadPreviews.forEach(p => URL.revokeObjectURL(p.url));
  uploadFiles = [];
  uploadPreviews = [];
  selectedBoardId = null;
  document.getElementById('urlInput').value = '';
  renderFilePreviews();
  renderUploadTree(); // Re-render para quitar selección
  switchUploadTab('file');
  document.getElementById('uploadOverlay').classList.add('hidden');
}

// --- SUBMIT ---

async function handleUploadSubmit() {
  if (!selectedBoardId) return;
  
  const overlay = document.getElementById('uploadOverlay');
  const statusText = document.getElementById('uploadStatusText');
  const progressFill = document.querySelector('.progress-fill-modern');
  
  overlay.classList.remove('hidden');
  
  try {
    if (activeUploadTab === 'file') {
      const total = uploadFiles.length;
      let completed = 0;
      
      // Cola de subida (concurrencia 3)
      const queue = uploadFiles.map((file, i) => ({ file, i }));
      const worker = async () => {
        while (queue.length > 0) {
          const { file } = queue.shift();
          // SIN CAPTION
          await uploadFileToNotionDirect(selectedBoardId, file, '');
          completed++;
          const pct = (completed / total) * 100;
          progressFill.style.width = `${pct}%`;
          statusText.textContent = `Subiendo ${completed}/${total}...`;
        }
      };
      
      await Promise.all([worker(), worker(), worker()]); // 3 workers
      
    } else {
      const url = document.getElementById('urlInput').value.trim();
      statusText.textContent = 'Guardando URL...';
      progressFill.style.width = '50%';
      await uploadUrlToNotion(selectedBoardId, url, '');
      progressFill.style.width = '100%';
    }
    
    statusText.textContent = '¡Completado!';
    setTimeout(() => {
      closeUploadModal();
      // Recargar vista actual si es necesario
      if (typeof loadCustomTree === 'function') loadCustomTree(true);
    }, 1000);
    
  } catch (error) {
    console.error(error);
    alert('Error al subir: ' + error.message);
    overlay.classList.add('hidden');
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
 * Subir archivo directamente a Notion (sin pasar por el servidor)
 * Usa el mismo método que notiopinterest
 */
async function uploadFileToNotionDirect(toggleId, file, caption) {
  // 1. Obtener credenciales del servidor
  const credentials = await getNotionCredentials();
  const { notionSecret } = credentials;
  
  const headers = {
    'Authorization': `Bearer ${notionSecret}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
  
  // 2. Crear sesión de subida de archivo
  const initUrl = `${CORS_PROXY}${encodeURIComponent(`${NOTION_API_BASE}/file_uploads`)}`;
  
  const initResponse = await fetch(initUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      mode: 'single_part',
      filename: file.name,
      content_type: file.type
    })
  });
  
  if (!initResponse.ok) {
    const err = await initResponse.text();
    console.error('Init upload error:', err);
    throw new Error(`Error iniciando subida: ${err}`);
  }
  
  const initData = await initResponse.json();
  const { upload_url, id: fileUploadId } = initData;
  
  console.log('File upload session created:', { fileUploadId, upload_url });
  
  // 3. Subir el contenido del archivo
  const sendUrl = `${CORS_PROXY}${encodeURIComponent(upload_url)}`;
  
  const formData = new FormData();
  formData.append('file', file);
  
  const uploadResponse = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionSecret}`,
      'Notion-Version': NOTION_VERSION,
      // No establecer Content-Type - el navegador lo hará con el boundary correcto
    },
    body: formData
  });
  
  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    console.error('Send file error:', errText);
    throw new Error(`Error subiendo archivo: ${errText}`);
  }
  
  const uploadResult = await uploadResponse.json();
  console.log('File uploaded:', uploadResult);
  
  if (uploadResult.status !== 'uploaded') {
    throw new Error(`Subida incompleta. Estado: ${uploadResult.status}`);
  }
  
  // 4. Agregar el bloque al toggle en Notion
  const type = file.type.startsWith('video/') ? 'video' : 'image';
  const cleanToggleId = formatNotionId(toggleId);
  const appendUrl = `${CORS_PROXY}${encodeURIComponent(`${NOTION_API_BASE}/blocks/${cleanToggleId}/children`)}`;
  
  const blockContent = {
    type: 'file_upload',
    file_upload: { id: fileUploadId }
  };
  
  if (caption) {
    blockContent.caption = [{ type: 'text', text: { content: caption } }];
  }
  
  const appendResponse = await fetch(appendUrl, {
    method: 'PATCH',
    headers: headers,
    body: JSON.stringify({
      children: [
        {
          object: 'block',
          type: type,
          [type]: blockContent
        }
      ]
    })
  });
  
  if (!appendResponse.ok) {
    const errorText = await appendResponse.text();
    console.error('Append block error:', errorText);
    throw new Error('Error agregando bloque a Notion');
  }
  
  return await appendResponse.json();
}

/**
 * Formatear ID de Notion (remover guiones)
 */
function formatNotionId(idOrUrl) {
  const uuidRegex = /[a-f0-9]{32}/;
  const cleanId = idOrUrl.replace(/-/g, '');
  const match = cleanId.match(uuidRegex);
  return match ? match[0] : cleanId;
}

/**
 * Subir URL a Notion (usando el servidor)
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
  successDiv.classList.remove('hidden');
  
  setTimeout(() => {
    successDiv.classList.add('hidden');
    closeUploadModal();
    
    // Recargar el contenido actual si es necesario
    if (typeof selectedNodeId !== 'undefined' && selectedNodeId) {
      loadNodeById(selectedNodeId, false);
    }
  }, 1500);
}

/**
 * Reset del formulario
 */
function resetUploadForm() {
  // Limpiar archivos
  uploadPreviews.forEach(url => URL.revokeObjectURL(url));
  uploadFiles = [];
  uploadPreviews = [];
  selectedBoardId = null;
  document.getElementById('urlInput').value = '';
  renderFilePreviews();
  renderUploadTree(); // Re-render para quitar selección
  switchUploadTab('file');
  document.getElementById('uploadOverlay').classList.add('hidden');
}