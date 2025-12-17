/**
 * Inicialización de la aplicación
 */

document.addEventListener('DOMContentLoaded', async function() {
  // Verificar autenticación antes de cargar la app
  const isAuth = await requireAuth();
  if (!isAuth) return;

  // Inicializar el sidebar (ahora incluye el panel de upload)
  if (typeof initSidebar === 'function') {
    initSidebar();
  }

  // Ya no necesitamos inicializar el sistema de upload modal
  // if (typeof initUploadSystem === 'function') {
  //   initUploadSystem();
  // }

  // Cargar el árbol en el sidebar
  try {
    await loadCustomTree(true);
  } catch (e) {
    console.error("Error precargando el árbol:", e);
  }
  
  // Inicializar eventos de modales
  if (typeof initModalEvents === 'function') {
    initModalEvents();
  }
  
  // Inicializar eventos de navegación
  if (typeof initNavigationEvents === 'function') {
    initNavigationEvents();
  }
  
  // Inicializar sistema de navegación con historial
  if (typeof setupHistoryNavigation === 'function') {
    setupHistoryNavigation();
  }

  // Si hay un hash en la URL, cargar ese nodo
  if (window.location.hash.startsWith('#node=')) {
    const nodeId = window.location.hash.replace('#node=', '');
    if (nodeId && typeof loadNodeById === 'function') {
      await loadNodeById(nodeId);
    }
  }
});

// Cerrar menús al hacer clic fuera
document.addEventListener("click", function(e) {
  const columnOptions = document.getElementById("columnOptions");
  const columnBtn = document.getElementById("toggleColumnBtn");
  
  if (columnOptions && !columnOptions.classList.contains("hidden")) {
    if (!columnOptions.contains(e.target) && columnBtn && !columnBtn.contains(e.target)) {
      columnOptions.classList.add("hidden");
    }
  }
});


// Cerrar menú popover al hacer clic fuera
document.addEventListener("click", function(e) {
  const menu = document.getElementById("menuPopover");
  const showAllFoldersBtn = document.getElementById("showAllFolders");
  const treeRootButtons = document.getElementById("treeRootButtons");
  
  if (!menu.classList.contains("hidden") && 
      !menu.contains(e.target) && 
      (!showAllFoldersBtn || !showAllFoldersBtn.contains(e.target)) &&
      (!treeRootButtons || !treeRootButtons.contains(e.target))
  ) {
    closeMenuPopover();
  }
});

/**
 * Configurar tooltips de videos (auto-hide)
 */
function setupVideoTooltips() {
  const videos = document.querySelectorAll('#gallery video');
  
  videos.forEach(video => {
    const tooltip = video.nextElementSibling;
    if (tooltip && tooltip.classList.contains('custom-tooltip')) {
      setTimeout(() => {
        tooltip.classList.add('tooltip-auto-hide');
      }, 5000);
      
      video.addEventListener('mouseenter', () => {
        tooltip.classList.remove('tooltip-auto-hide');
        
        setTimeout(() => {
          tooltip.classList.add('tooltip-auto-hide');
        }, 5000);
      });
    }
  });
}

// Extender loadGallery para configurar tooltips de videos
const originalLoadGallery = typeof loadGallery !== 'undefined' ? loadGallery : null;
if (originalLoadGallery) {
  loadGallery = async function(toggle) {
    await originalLoadGallery(toggle);
    setupVideoTooltips();
    
    if (toggle && toggle.title) {
      updateCurrentLevelTitle(toggle.title);
    }
  };
}

// Extender loadNodeById para actualizar el título
const originalLoadNodeById = typeof loadNodeById !== 'undefined' ? loadNodeById : null;
if (originalLoadNodeById) {
  loadNodeById = async function(nodeId, addToHistory = true) {
    const result = await originalLoadNodeById(nodeId, addToHistory);
    
    const title = getNodeTitle(nodeId);
    updateCurrentLevelTitle(title);
    
    return result;
  };
}