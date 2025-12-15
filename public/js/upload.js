/**
 * Sistema de Upload de archivos a Notion
 * Usa subida directa desde el navegador (como notiopinterest)
 */

let uploadFiles = [];
let uploadPreviews = [];
let activeUploadTab = 'file';

// Configuración del proxy CORS
const CORS_PROXY = 'https://corsproxy.io/?';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Inicializar el sistema de upload
 */
function initUploadSystem() {
  const openBtn = document.getElementById('openUploadBtn');
  const closeBtn = document.getElementById('closeUploadModal');
  const overlay = document.querySelector('.upload-modal-overlay');
  const modal = document.getElementById('uploadModal');
  
  // Abrir modal
  if (openBtn) {
    openBtn.addEventListener('click', openUploadModal);
  }
  
  // Cerrar modal
  if (closeBtn) {
    closeBtn.addEventListener('click', closeUploadModal);
  }
  
  if (overlay) {
    overlay.addEventListener('click', closeUploadModal);
  }
  
  // Tabs
  document.querySelectorAll('.upload-tab').forEach(tab => {
    tab.addEventListener('click', () => switchUploadTab(tab.dataset.tab));
  });
  
  // File input
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }
  
  // Dropzone
  const dropzone = document.getElementById('uploadDropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
  }
  
  // Paste handler
  document.addEventListener('paste', handlePaste);
  
  // URL input
  const urlInput = document.getElementById('urlInput');
  if (urlInput) {
    urlInput.addEventListener('input', validateUploadForm);
  }
  
  // Caption input
  const captionInput = document.getElementById('uploadCaption');
  if (captionInput) {
    captionInput.addEventListener('input', validateUploadForm);
  }
  
  // Submit button
  const submitBtn = document.getElementById('submitUpload');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleUploadSubmit);
  }
  
  // Nueva carpeta
  const createNewToggleBtn = document.getElementById('createNewToggle');
  if (createNewToggleBtn) {
    createNewToggleBtn.addEventListener('click', showNewToggleInput);
  }
  
  const confirmNewToggleBtn = document.getElementById('confirmNewToggle');
  if (confirmNewToggleBtn) {
    confirmNewToggleBtn.addEventListener('click', createNewToggle);
  }
  
  const cancelNewToggleBtn = document.getElementById('cancelNewToggle');
  if (cancelNewToggleBtn) {
    cancelNewToggleBtn.addEventListener('click', hideNewToggleInput);
  }
  
  // Destination select
  const destSelect = document.getElementById('uploadDestination');
  if (destSelect) {
    destSelect.addEventListener('change', validateUploadForm);
  }
}

/**
 * Abrir modal de upload
 */
async function openUploadModal() {
  const modal = document.getElementById('uploadModal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Cargar destinos disponibles
  await loadUploadDestinations();
  
  // Reset form
  resetUploadForm();
}

/**
 * Cerrar modal de upload
 */
function closeUploadModal() {
  const modal = document.getElementById('uploadModal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  
  // Limpiar previews
  uploadPreviews.forEach(url => URL.revokeObjectURL(url));
  uploadFiles = [];
  uploadPreviews = [];
}

/**
 * Cargar destinos (toggles) disponibles
 */
async function loadUploadDestinations() {
  const select = document.getElementById('uploadDestination');
  select.innerHTML = '<option value="">Cargando...</option>';
  
  try {
    const res = await authFetch('/notion/get-quick-tree');
    if (!res.ok) throw new Error('Error cargando destinos');
    
    const data = await res.json();
    const toggles = data.data || data;
    
    select.innerHTML = '<option value="">Selecciona una carpeta...</option>';
    
    toggles.forEach(toggle => {
      const option = document.createElement('option');
      option.value = toggle.id;
      // Limpiar asteriscos del título
      const title = toggle.title.startsWith('*') 
        ? toggle.title.substring(1).trim() 
        : toggle.title;
      option.textContent = title;
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error cargando destinos:', error);
    select.innerHTML = '<option value="">Error al cargar</option>';
  }
}

/**
 * Cambiar tab de upload
 */
function switchUploadTab(tabName) {
  activeUploadTab = tabName;
  
  // Actualizar tabs
  document.querySelectorAll('.upload-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Mostrar contenido
  document.getElementById('tabFile').classList.toggle('hidden', tabName !== 'file');
  document.getElementById('tabUrl').classList.toggle('hidden', tabName !== 'url');
  
  validateUploadForm();
}

/**
 * Manejar selección de archivos
 */
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  addFiles(files);
}

/**
 * Manejar drag over
 */
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('dragover');
}

/**
 * Manejar drag leave
 */
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('dragover');
}

/**
 * Manejar drop
 */
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('dragover');
  
  const files = Array.from(e.dataTransfer.files);
  addFiles(files);
}

/**
 * Manejar paste
 */
function handlePaste(e) {
  const modal = document.getElementById('uploadModal');
  if (modal.classList.contains('hidden')) return;
  
  if (e.clipboardData && e.clipboardData.files.length > 0) {
    const files = Array.from(e.clipboardData.files);
    addFiles(files);
    switchUploadTab('file');
  }
}

/**
 * Agregar archivos a la lista
 */
function addFiles(newFiles) {
  const validFiles = newFiles.filter(f => 
    f.type.startsWith('image/') || f.type.startsWith('video/')
  );
  
  validFiles.forEach(file => {
    uploadFiles.push(file);
    const previewUrl = URL.createObjectURL(file);
    uploadPreviews.push(previewUrl);
  });
  
  renderFilePreviews();
  validateUploadForm();
}

/**
 * Remover archivo de la lista
 */
function removeFile(index) {
  URL.revokeObjectURL(uploadPreviews[index]);
  uploadFiles.splice(index, 1);
  uploadPreviews.splice(index, 1);
  
  renderFilePreviews();
  validateUploadForm();
}

/**
 * Renderizar previews de archivos
 */
function renderFilePreviews() {
  const grid = document.getElementById('filePreviewGrid');
  grid.innerHTML = '';
  
  uploadPreviews.forEach((src, index) => {
    const file = uploadFiles[index];
    const isVideo = file.type.startsWith('video/');
    
    const item = document.createElement('div');
    item.className = 'upload-preview-item';
    
    if (isVideo) {
      const video = document.createElement('video');
      video.src = src;
      video.muted = true;
      item.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = file.name;
      item.appendChild(img);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'upload-preview-remove';
    removeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    `;
    removeBtn.addEventListener('click', () => removeFile(index));
    item.appendChild(removeBtn);
    
    grid.appendChild(item);
  });
  
  // Botón para agregar más
  if (uploadFiles.length > 0) {
    const addMore = document.createElement('label');
    addMore.className = 'upload-preview-add';
    addMore.innerHTML = `
      <input type="file" multiple accept="image/*,video/*" hidden />
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Añadir</span>
    `;
    addMore.querySelector('input').addEventListener('change', handleFileSelect);
    grid.appendChild(addMore);
  }
}

/**
 * Validar formulario de upload
 */
function validateUploadForm() {
  const submitBtn = document.getElementById('submitUpload');
  const destination = document.getElementById('uploadDestination').value;
  
  let isValid = false;
  
  if (destination) {
    if (activeUploadTab === 'file') {
      isValid = uploadFiles.length > 0;
    } else {
      const url = document.getElementById('urlInput').value.trim();
      isValid = url.length > 0 && (url.startsWith('http://') || url.startsWith('https://'));
    }
  }
  
  submitBtn.disabled = !isValid;
  
  // Actualizar texto del botón
  const btnText = submitBtn.querySelector('span');
  if (activeUploadTab === 'file' && uploadFiles.length > 1) {
    btnText.textContent = `Subir ${uploadFiles.length} archivos`;
  } else {
    btnText.textContent = 'Subir';
  }
}

/**
 * Mostrar input para nueva carpeta
 */
function showNewToggleInput() {
  document.getElementById('newToggleInput').classList.remove('hidden');
  document.getElementById('newToggleName').focus();
}

/**
 * Ocultar input para nueva carpeta
 */
function hideNewToggleInput() {
  document.getElementById('newToggleInput').classList.add('hidden');
  document.getElementById('newToggleName').value = '';
}

/**
 * Crear nuevo toggle en Notion
 */
async function createNewToggle() {
  const name = document.getElementById('newToggleName').value.trim();
  if (!name) return;
  
  const confirmBtn = document.getElementById('confirmNewToggle');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Creando...';
  
  try {
    const res = await authFetch('/api/create-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name })
    });
    
    if (!res.ok) throw new Error('Error creando toggle');
    
    const data = await res.json();
    
    // Agregar al select y seleccionarlo
    const select = document.getElementById('uploadDestination');
    const option = document.createElement('option');
    option.value = data.id;
    option.textContent = name;
    option.selected = true;
    select.appendChild(option);
    
    hideNewToggleInput();
    validateUploadForm();
    
    // Recargar el árbol del sidebar
    if (typeof loadCustomTree === 'function') {
      loadCustomTree(true);
    }
    
  } catch (error) {
    console.error('Error creando toggle:', error);
    alert('Error al crear la carpeta');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Crear';
  }
}

/**
 * Manejar submit del upload
 */
async function handleUploadSubmit() {
  const destination = document.getElementById('uploadDestination').value;
  const caption = document.getElementById('uploadCaption').value.trim();
  
  if (!destination) return;
  
  const submitBtn = document.getElementById('submitUpload');
  const progressDiv = document.getElementById('uploadProgress');
  const progressFill = progressDiv.querySelector('.upload-progress-fill');
  const progressText = progressDiv.querySelector('.upload-progress-text');
  
  submitBtn.disabled = true;
  progressDiv.classList.remove('hidden');
  
  try {
    if (activeUploadTab === 'file') {
      const total = uploadFiles.length;
      const CONCURRENCY_LIMIT = 3; // Subir 3 archivos en paralelo
      
      let completed = 0;
      const queue = [...uploadFiles.map((file, index) => ({ file, index }))];
      
      // Función worker que procesa archivos de la cola
      const worker = async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          
          const { file, index } = item;
          const itemCaption = total > 1 ? (caption ? `${caption} (${index + 1})` : '') : caption;
          
          try {
            await uploadFileToNotionDirect(destination, file, itemCaption);
          } catch (err) {
            console.error(`Error subiendo archivo ${index + 1}:`, err);
          }
          
          completed++;
          progressText.textContent = `Subiendo ${completed}/${total}...`;
          progressFill.style.width = `${(completed / total) * 100}%`;
        }
      };
      
      // Crear workers para subida paralela
      const workers = Array(Math.min(total, CONCURRENCY_LIMIT))
        .fill(null)
        .map(() => worker());
      
      // Esperar a que todos terminen
      await Promise.all(workers);
      
    } else {
      const url = document.getElementById('urlInput').value.trim();
      progressText.textContent = 'Guardando...';
      progressFill.style.width = '50%';
      
      await uploadUrlToNotion(destination, url, caption);
      progressFill.style.width = '100%';
    }
    
    // Mostrar éxito
    showUploadSuccess();
    
  } catch (error) {
    console.error('Error en upload:', error);
    alert('Error al subir: ' + error.message);
    progressDiv.classList.add('hidden');
    submitBtn.disabled = false;
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
  renderFilePreviews();
  
  // Reset inputs
  document.getElementById('urlInput').value = '';
  document.getElementById('uploadCaption').value = '';
  document.getElementById('newToggleName').value = '';
  
  // Reset UI
  hideNewToggleInput();
  document.getElementById('uploadProgress').classList.add('hidden');
  document.getElementById('uploadSuccess').classList.add('hidden');
  document.querySelector('.upload-progress-fill').style.width = '0%';
  
  // Reset tab
  switchUploadTab('file');
  
  validateUploadForm();
}