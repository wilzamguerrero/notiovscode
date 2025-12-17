/**
 * Sistema de Sidebar/Panel lateral - Versión mejorada
 */

let sidebarCollapsed = false;

// Estado del upload panel
let sidebarUploadFiles = [];
let sidebarUploadTab = 'file';
let isUploading = false;

// CORS Proxy para llamadas directas a Notion
const CORS_PROXY = 'https://corsproxy.io/?';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Obtener headers para Notion API
 */
function getNotionHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  };
}

/**
 * Obtener credenciales de Notion desde la sesión
 */
function getNotionCredentialsFromSession() {
  const sessionId = sessionStorage.getItem('notionSessionId');
  if (!sessionId) return null;
  
  try {
    const decoded = atob(sessionId);
    const [pageId, ...secretParts] = decoded.split(':');
    const notionSecret = secretParts.join(':');
    return { pageId, notionSecret };
  } catch (e) {
    console.error('Error decodificando sesión:', e);
    return null;
  }
}

/**
 * Subir archivo a Notion usando el proxy CORS
 */
async function uploadFileToNotionViaProxy(toggleId, file) {
  const credentials = getNotionCredentialsFromSession();
  if (!credentials) throw new Error('No hay credenciales de Notion');
  
  const { notionSecret } = credentials;
  const headers = getNotionHeaders(notionSecret);
  
  // 1. Iniciar upload
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
    const errorText = await initResponse.text();
    throw new Error(`Error iniciando upload: ${initResponse.status} - ${errorText}`);
  }
  
  const { upload_url, id: fileUploadId } = await initResponse.json();
  
  // 2. Subir el archivo
  const sendUrl = `${CORS_PROXY}${encodeURIComponent(upload_url)}`;
  const formData = new FormData();
  formData.append('file', file);
  
  const uploadResponse = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionSecret}`,
      'Notion-Version': NOTION_VERSION
    },
    body: formData
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Error subiendo archivo: ${uploadResponse.status} - ${errorText}`);
  }
  
  // 3. Agregar el bloque a Notion
  const blockType = file.type.startsWith('video/') ? 'video' : 'image';
  const cleanToggleId = formatNotionUUID(toggleId);
  const appendUrl = `${CORS_PROXY}${encodeURIComponent(`${NOTION_API_BASE}/blocks/${cleanToggleId}/children`)}`;
  
  const appendResponse = await fetch(appendUrl, {
    method: 'PATCH',
    headers: headers,
    body: JSON.stringify({
      children: [
        {
          object: 'block',
          type: blockType,
          [blockType]: {
            type: 'file_upload',
            file_upload: { id: fileUploadId },
            caption: [{ type: 'text', text: { content: file.name } }]
          }
        }
      ]
    })
  });
  
  if (!appendResponse.ok) {
    const errorText = await appendResponse.text();
    throw new Error(`Error agregando bloque: ${appendResponse.status} - ${errorText}`);
  }
  
  return await appendResponse.json();
}

/**
 * Subir URL a Notion usando el proxy CORS
 */
async function uploadUrlToNotionViaProxy(toggleId, url, caption = '') {
  const credentials = getNotionCredentialsFromSession();
  if (!credentials) throw new Error('No hay credenciales de Notion');
  
  const { notionSecret } = credentials;
  const headers = getNotionHeaders(notionSecret);
  
  // Detectar si es video o imagen
  const isVideo = /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(url) || 
                  url.includes('youtube.com') || 
                  url.includes('youtu.be') ||
                  url.includes('vimeo.com');
  
  const blockType = isVideo ? 'video' : 'image';
  const cleanToggleId = formatNotionUUID(toggleId);
  const appendUrl = `${CORS_PROXY}${encodeURIComponent(`${NOTION_API_BASE}/blocks/${cleanToggleId}/children`)}`;
  
  const blockContent = {
    type: 'external',
    external: { url: url }
  };
  
  if (caption) {
    blockContent.caption = [{ type: 'text', text: { content: caption } }];
  }
  
  const response = await fetch(appendUrl, {
    method: 'PATCH',
    headers: headers,
    body: JSON.stringify({
      children: [
        {
          object: 'block',
          type: blockType,
          [blockType]: blockContent
        }
      ]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error agregando URL: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Formatear UUID de Notion
 */
function formatNotionUUID(idOrUrl) {
  if (!idOrUrl) return '';
  const clean = idOrUrl.replace(/-/g, '');
  const match = clean.match(/[a-fA-F0-9]{32}/);
  return match ? match[0] : idOrUrl;
}

/**
 * Inicializar el sidebar
 */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarTab = document.getElementById('sidebarTab');

  // Cargar estado guardado
  const savedState = localStorage.getItem('sidebarCollapsed');
  if (savedState === 'true') {
    collapseSidebar(false);
  }

  // Toggle del sidebar con la pestaña
  if (sidebarTab) {
    sidebarTab.addEventListener('click', toggleSidebar);
  }

  // Configurar eventos de los controles del sidebar
  initSidebarControls();
  
  // Inicializar panel de upload integrado
  initSidebarUploadPanel();
  
  // Inicializar botón de carpeta raíz
  if (typeof initRootFolderButton === 'function') {
    initRootFolderButton();
  }
}

/**
 * Toggle del sidebar
 */
function toggleSidebar() {
  if (sidebarCollapsed) {
    expandSidebar();
  } else {
    collapseSidebar(true);
  }
}

/**
 * Colapsar el sidebar
 */
function collapseSidebar(animate = true) {
  const sidebar = document.getElementById('sidebar');
  const sidebarTab = document.getElementById('sidebarTab');
  const tabIcon = sidebarTab?.querySelector('.sidebar-tab-icon');

  sidebarCollapsed = true;
  localStorage.setItem('sidebarCollapsed', 'true');

  if (animate) {
    sidebar.classList.add('sidebar-animating');
  }
  
  sidebar.classList.add('sidebar-collapsed');
  sidebarTab?.classList.add('tab-collapsed');
  
  // YA NO modificamos la galería - el sidebar es flotante
  // gallery.classList.add('gallery-full-width');
  
  // Rotar el icono de la pestaña
  if (tabIcon) {
    tabIcon.style.transform = 'rotate(180deg)';
  }

  if (animate) {
    setTimeout(() => {
      sidebar.classList.remove('sidebar-animating');
    }, 300);
  }

  // Ya no necesitamos recalcular Macy porque el layout no cambia
}


/**
 * Expandir el sidebar
 */
function expandSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarTab = document.getElementById('sidebarTab');
  const tabIcon = sidebarTab?.querySelector('.sidebar-tab-icon');

  sidebarCollapsed = false;
  localStorage.setItem('sidebarCollapsed', 'false');

  sidebar.classList.add('sidebar-animating');
  sidebar.classList.remove('sidebar-collapsed');
  sidebarTab?.classList.remove('tab-collapsed');
  
  // YA NO modificamos la galería - el sidebar es flotante
  // gallery.classList.remove('gallery-full-width');
  
  // Rotar el icono de la pestaña
  if (tabIcon) {
    tabIcon.style.transform = 'rotate(0deg)';
  }

  setTimeout(() => {
    sidebar.classList.remove('sidebar-animating');
  }, 300);

  // Ya no necesitamos recalcular Macy porque el layout no cambia
}

/**
 * Inicializar controles dentro del sidebar
 */
function initSidebarControls() {
  // Opciones de columnas con transición suave
  document.querySelectorAll('.column-options-row .column-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const colsAttr = btn.getAttribute('data-columns');
      const gallery = document.getElementById('gallery');
      
      // Quitar selección de todos los botones
      document.querySelectorAll('.column-options-row .column-opt').forEach(b => b.classList.remove('active'));
      
      // Marcar el nuevo como activo
      btn.classList.add('active');
      
      // Determinar el nuevo valor de columnas
      let newColumnCount;
      if (colsAttr === 'auto') {
        newColumnCount = null;
      } else {
        newColumnCount = parseInt(colsAttr, 10);
      }
      
      // Si es el mismo valor, no hacer nada
      const currentValue = (typeof forcedColumnCount !== 'undefined') ? forcedColumnCount : window.forcedColumnCount;
      if (newColumnCount === currentValue) {
        return;
      }
      
      // Ocultar galería con fade
      if (gallery) {
        gallery.style.transition = 'opacity 0.2s ease';
        gallery.style.opacity = '0';
      }
      
      // Esperar a que el fade termine antes de recalcular
      setTimeout(() => {
        // Actualizar el valor de columnas
        if (typeof forcedColumnCount !== 'undefined') {
          forcedColumnCount = newColumnCount;
        } else {
          window.forcedColumnCount = newColumnCount;
        }
        
        // Recalcular Macy
        if (typeof initializeMacy === 'function') {
          initializeMacy();
        }
        
        // Mostrar galería con fade después de que Macy recalcule
        setTimeout(() => {
          if (gallery) {
            gallery.style.opacity = '1';
          }
        }, 100);
      }, 200); // Esperar el fade out completo
    });
  });

  // Botón fullscreen
  const fullscreenBtn = document.getElementById('toggleFullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      fullscreenBtn.classList.toggle('active');
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        fullscreenBtn.classList.remove('active');
      }
    });
  }

  // Botón animación
  const animBtn = document.getElementById('toggleNeuroAnim');
  if (animBtn) {
    animBtn.addEventListener('click', () => {
      animBtn.classList.toggle('active');
      const canvas = document.getElementById('neuro');
      if (canvas) {
        canvas.style.display = canvas.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  // Botón scroll
  const scrollBtn = document.getElementById('backToToporbottom');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', () => {
      if (typeof scrollToTopOrBottom === 'function') {
        scrollToTopOrBottom();
      } else {
        const halfway = document.body.scrollHeight / 2;
        if (window.scrollY < halfway) {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  }

  // Botón logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof logout === 'function') {
        logout();
      }
    });
  }
  
  // Botón refresh
  const refreshBtn = document.getElementById('refreshTreeBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      window.treeDataCache = null;
      if (typeof loadCustomTree === 'function') {
        await loadCustomTree(true);
      }
    });
  }
}

/**
 * Inicializar panel de upload integrado en el sidebar
 */
function initSidebarUploadPanel() {
  const openBtn = document.getElementById('openUploadPanelBtn');
  const panel = document.getElementById('sidebarUploadPanel');
  const footer = document.getElementById('sidebarFooter');
  const cancelBtn = document.getElementById('cancelUploadBtn');
  const fileInput = document.getElementById('sidebarFileInput');
  const selectFilesBtn = document.getElementById('selectFilesBtn');
  const urlInput = document.getElementById('sidebarUrlInput');
  const uploadBtn = document.getElementById('uploadHereBtn');
  
  // Abrir panel
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      panel.classList.remove('hidden');
      footer.classList.add('hidden');
    });
  }
  
  // Cerrar panel
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetSidebarUpload();
    });
  }
  
  // Tabs
  document.querySelectorAll('.upload-panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      sidebarUploadTab = tab.dataset.tab;
      
      document.querySelectorAll('.upload-panel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.getElementById('uploadPanelFileTab').classList.toggle('hidden', sidebarUploadTab !== 'file');
      document.getElementById('uploadPanelLinkTab').classList.toggle('hidden', sidebarUploadTab !== 'link');
      
      updateSidebarUploadBtn();
    });
  });
  
  // Seleccionar archivos
  if (selectFilesBtn && fileInput) {
    selectFilesBtn.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      sidebarUploadFiles = [...sidebarUploadFiles, ...files.filter(f => 
        f.type.startsWith('image/') || f.type.startsWith('video/')
      )];
      updateFilesCountText();
      updateSidebarUploadBtn();
    });
  }
  
  // URL input
  if (urlInput) {
    urlInput.addEventListener('input', updateSidebarUploadBtn);
  }
  
  // Upload button
  if (uploadBtn) {
    uploadBtn.addEventListener('click', handleSidebarUpload);
  }
}

/**
 * Actualizar texto de cantidad de archivos
 */
function updateFilesCountText() {
  const textEl = document.getElementById('filesCountText');
  if (textEl) {
    if (sidebarUploadFiles.length > 0) {
      textEl.innerHTML = `<span class="files-count">${sidebarUploadFiles.length}</span> file${sidebarUploadFiles.length > 1 ? 's' : ''} selected`;
    } else {
      textEl.textContent = 'Select Files';
    }
  }
}

/**
 * Actualizar estado del botón de upload
 */
function updateSidebarUploadBtn() {
  const uploadBtn = document.getElementById('uploadHereBtn');
  const urlInput = document.getElementById('sidebarUrlInput');
  
  if (!uploadBtn) return;
  
  let hasContent = false;
  
  if (sidebarUploadTab === 'file') {
    hasContent = sidebarUploadFiles.length > 0;
  } else {
    hasContent = urlInput && urlInput.value.trim().length > 0;
  }
  
  // También verificar que haya un nodo seleccionado
  const hasDestination = selectedNodeId !== null;
  
  uploadBtn.disabled = !hasContent || !hasDestination || isUploading;
}

/**
 * Manejar upload desde el sidebar
 */
async function handleSidebarUpload() {
  if (!selectedNodeId) {
    alert('Por favor selecciona una carpeta de destino en el árbol');
    return;
  }
  
  const uploadBtn = document.getElementById('uploadHereBtn');
  const btnText = document.getElementById('uploadBtnText');
  const spinner = document.getElementById('uploadingSpinner');
  
  isUploading = true;
  uploadBtn.disabled = true;
  spinner.classList.remove('hidden');
  
  try {
    if (sidebarUploadTab === 'file' && sidebarUploadFiles.length > 0) {
      // Subir archivos en paralelo (como en el otro proyecto)
      const uploadPromises = sidebarUploadFiles.map(async (file) => {
        try {
          btnText.textContent = `${sidebarUploadFiles.length} remaining...`;
          await uploadFileToNotionViaProxy(selectedNodeId, file);
          // Remover archivo exitoso del array
          sidebarUploadFiles = sidebarUploadFiles.filter(f => f !== file);
          updateFilesCountText();
        } catch (error) {
          console.error(`Error subiendo ${file.name}:`, error);
        }
      });
      
      await Promise.all(uploadPromises);
      
      if (sidebarUploadFiles.length === 0) {
        // Todos subidos exitosamente
        await refreshCurrentGallery();
        resetSidebarUpload();
      } else {
        btnText.textContent = 'Upload Here';
        alert(`${sidebarUploadFiles.length} archivo(s) no se pudieron subir`);
      }
      
    } else if (sidebarUploadTab === 'link') {
      const urlInput = document.getElementById('sidebarUrlInput');
      const url = urlInput?.value.trim();
      
      if (url) {
        btnText.textContent = 'Uploading...';
        await uploadUrlToNotionViaProxy(selectedNodeId, url, '');
        await refreshCurrentGallery();
        resetSidebarUpload();
      }
    }
  } catch (error) {
    console.error('Error en upload:', error);
    alert('Error al subir: ' + error.message);
  } finally {
    isUploading = false;
    spinner.classList.add('hidden');
    btnText.textContent = 'Upload Here';
    updateSidebarUploadBtn();
  }
}

/**
 * Refrescar la galería actual después de subir
 */
async function refreshCurrentGallery() {
  if (!selectedNodeId) return;
  
  // Limpiar caché
  if (typeof treeCache !== 'undefined' && treeCache[selectedNodeId]) {
    delete treeCache[selectedNodeId];
  }
  
  // Recargar la galería
  try {
    const res = await authFetch(`/notion/toggle/${selectedNodeId}`);
    if (res.ok) {
      const data = await res.json();
      if (typeof treeCache !== 'undefined') {
        treeCache[selectedNodeId] = data;
      }
      if (data.items && data.items.length > 0 && typeof loadGallery === 'function') {
        await loadGallery(data);
      }
    }
  } catch (e) {
    console.error('Error recargando galería:', e);
  }
}

/**
 * Resetear el panel de upload
 */
function resetSidebarUpload() {
  const panel = document.getElementById('sidebarUploadPanel');
  const footer = document.getElementById('sidebarFooter');
  const fileInput = document.getElementById('sidebarFileInput');
  const urlInput = document.getElementById('sidebarUrlInput');
  
  sidebarUploadFiles = [];
  sidebarUploadTab = 'file';
  
  if (fileInput) fileInput.value = '';
  if (urlInput) urlInput.value = '';
  
  updateFilesCountText();
  
  // Resetear tabs
  document.querySelectorAll('.upload-panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.upload-panel-tab[data-tab="file"]')?.classList.add('active');
  document.getElementById('uploadPanelFileTab')?.classList.remove('hidden');
  document.getElementById('uploadPanelLinkTab')?.classList.add('hidden');
  
  panel.classList.add('hidden');
  footer.classList.remove('hidden');
  
  updateSidebarUploadBtn();
}

/**
 * Mostrar/ocultar sidebar en móvil
 */
function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('sidebar-mobile-open');
}