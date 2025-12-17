/**
 * Sistema de navegación e historial
 */

/**
 * Actualizar título del nivel actual
 */
function updateCurrentLevelTitle(title, forceShow = false) {
  const titleElement = document.getElementById('currentLevelTitle');
  if (!titleElement) return;
  
  // Limpiar título (ya no hay símbolo *)
  const cleanTitle = title ? title.trim() : 'Inicio';
  
  titleElement.textContent = cleanTitle;
  titleElement.classList.remove('hidden');
  
  window.currentPageTitle = cleanTitle;
}

/**
 * Obtener título de un nodo por ID
 */
function getNodeTitle(nodeId) {
  if (window.titleCache && window.titleCache[nodeId]) {
    return window.titleCache[nodeId];
  }
  
  if (treeCache[nodeId]) {
    const title = treeCache[nodeId].title || 'Sin título';
    if (!window.titleCache) window.titleCache = {};
    window.titleCache[nodeId] = title;
    return title;
  }
  
  const nodeElement = findNodeElementById(nodeId);
  if (nodeElement) {
    let title = nodeElement.textContent.trim();
    const folderIcon = nodeElement.querySelector('.tree-folder-icon');
    if (folderIcon) {
      const nodeContents = Array.from(nodeElement.childNodes);
      const textNodes = nodeContents.filter(node => node.nodeType === 3);
      if (textNodes.length > 0) {
        title = textNodes[textNodes.length - 1].textContent.trim();
      }
    }
    
    if (!window.titleCache) window.titleCache = {};
    window.titleCache[nodeId] = title;
    return title;
  }
  
  try {
    const cachedDataStr = localStorage.getItem(`toggle_${nodeId}`);
    if (cachedDataStr) {
      const cachedData = JSON.parse(cachedDataStr);
      const title = cachedData.title;
      if (!window.titleCache) window.titleCache = {};
      window.titleCache[nodeId] = title;
      return title;
    }
  } catch (e) {
    console.warn('Error al obtener título de localStorage:', e);
  }
  
  if (window.currentPageTitle) {
    return window.currentPageTitle;
  }
  
  return 'Contenido';
}

/**
 * Encontrar elemento de nodo por ID
 */
function findNodeElementById(nodeId) {
  // Buscar en nodos del árbol
  let node = document.querySelector(`.tree-node[data-id="${nodeId}"]`);
  if (node) return node;
  
  // Buscar en botones de raíz
  node = document.querySelector(`.tree-root-btn[data-id="${nodeId}"]`);
  return node;
}

/**
 * Actualizar visualmente el nodo seleccionado
 */
function updateSelectedNodeVisually(nodeId) {
  document.querySelectorAll('.tree-node.selected').forEach(node => {
    node.classList.remove('selected');
  });
  
  const nodeElement = findNodeElementById(nodeId);
  if (nodeElement) {
    nodeElement.classList.add('selected');
  }
}

/**
 * Mostrar indicador de carga
 */
function showLoadingIndicator() {
  const gallery = document.getElementById('gallery');
  if (gallery) {
    gallery.classList.add('loading');
  }
}

/**
 * Cargar nodo por ID
 */
async function loadNodeById(nodeId, addToHistory = true) {
  console.log(`Cargando nodo: ${nodeId} (addToHistory: ${addToHistory})`);
  
  try {
    const nodeElement = findNodeElementById(nodeId);
    
    if (nodeElement) {
      let data;
      try {
        data = await loadToggleDataWithCache(nodeId);
      } catch (e) {
        console.warn('Error cargando desde caché, usamos clic normal:', e);
        nodeElement.click();
        return;
      }
      
      if (data) {
        selectedNodeId = nodeId;
        saveTreeState();
        
        if (nodeElement.classList.contains('tree-root-btn')) {
          document.querySelectorAll('.tree-root-btn.selected').forEach(b => b.classList.remove('selected'));
          nodeElement.classList.add('selected');
        } else {
          markSelectedNode(nodeElement);
        }
        
        // Siempre cargar galería si hay items
        if (data.items && data.items.length > 0) {
          await loadGallery(data);
        } else if (data.children && data.children.length > 0) {
          // Si no hay items pero sí hijos, mostrar cards de navegación
          await loadToggleCards(data);
        } else {
          clearGallery();
        }
        
        if (addToHistory) {
          const title = getNodeTitle(nodeId) || 'Contenido';
          window.history.pushState({ nodeId: nodeId }, title, `#node=${nodeId}`);
        }
        return;
      }
      
      nodeElement.click();
      return;
    }
    
    // Nodo no encontrado en DOM, cargar desde API
    const data = await loadToggleDataWithCache(nodeId);
    
    if (data.items && data.items.length > 0) {
      await loadGallery(data);
    } else if (data.children && data.children.length > 0) {
      await loadToggleCards(data);
    } else {
      clearGallery();
    }
    
    selectedNodeId = nodeId;
    saveTreeState();
    updateSelectedNodeVisually(nodeId);
    
    if (addToHistory) {
      const title = getNodeTitle(nodeId) || 'Contenido';
      window.history.pushState({ nodeId: nodeId }, title, `#node=${nodeId}`);
    }
  } catch (error) {
    console.error("Error cargando nodo:", error);
  }
}

/**
 * Cargar cards de toggle (navegación por carpetas)
 */
async function loadToggleCards(data) {
  const gallery = document.getElementById('gallery');
  
  if (macyInstance) {
    macyInstance.remove(true);
    macyInstance = null;
  }
  
  safeDestroyLightGallery();
  
  gallery.style.visibility = 'hidden';
  gallery.innerHTML = "";
  
  if (data.children && data.children.length > 0) {
    data.children.forEach(child => {
      const buttonCard = document.createElement('div');
      buttonCard.className = 'card toggle-card';
      
      const button = document.createElement('button');
      button.className = 'gallery-nav-button';
      
      // Ya no hay símbolo *
      const displayTitle = child.title.trim();
      button.textContent = displayTitle;
      
      button.addEventListener('click', async () => {
        let childData;
        try {
          childData = await loadToggleDataWithCache(child.id);
        } catch (error) {
          console.error("Error al cargar el nodo hijo:", error);
          return;
        }

        updateCurrentLevelTitle(displayTitle, true);
        
        // Siempre cargar galería si hay items
        if (childData.items && childData.items.length > 0) {
          await loadGallery(childData);
        } else if (childData.children && childData.children.length > 0) {
          // Si no hay items pero sí hijos, mostrar cards
          await loadToggleCards(childData);
        } else {
          clearGallery();
        }
        
        window.history.pushState({ nodeId: child.id }, displayTitle, `#node=${child.id}`);
      });
      
      buttonCard.appendChild(button);
      gallery.appendChild(buttonCard);
    });
    
    setTimeout(() => {
      initializeMacy();
      gallery.style.visibility = 'visible';
    }, 100);
  } else {
    await loadGallery(data);
  }
}

/**
 * Configurar navegación con historial
 */
function setupHistoryNavigation() {
  window.addEventListener('popstate', async (event) => {
    if (!event.state) {
      const hash = window.location.hash;
      if (hash.startsWith('#node=')) {
        const nodeId = hash.substring(6);
        await loadNodeById(nodeId, false);
        updateCurrentLevelTitle(getNodeTitle(nodeId));
        return;
      }
      
      clearGallery();
      updateCurrentLevelTitle('Inicio');
      return;
    }
    
    if (event.state.nodeId) {
      await loadNodeById(event.state.nodeId, false);
      updateCurrentLevelTitle(getNodeTitle(event.state.nodeId));
    }
  });
  
  if (!window.history.state && window.location.hash) {
    const hash = window.location.hash;
    if (hash.startsWith('#node=')) {
      const nodeId = hash.substring(6);
      const title = getNodeTitle(nodeId) || 'Contenido';
      window.history.replaceState({ nodeId: nodeId }, title, window.location.href);
    }
  }
}

/**
 * Configurar eventos de navegación del DOM
 */
function initNavigationEvents() {
  document.body.addEventListener('click', function(e) {
    const treeNode = e.target.closest('.tree-node');
    if (treeNode) {
      let nodeText = treeNode.textContent.trim();
      
      const folderIcon = treeNode.querySelector('.tree-folder-icon');
      if (folderIcon) {
        const nodeContents = Array.from(treeNode.childNodes);
        const textNodes = nodeContents.filter(node => node.nodeType === 3);
        if (textNodes.length > 0) {
          nodeText = textNodes[textNodes.length - 1].textContent.trim();
        }
      }
      
      updateCurrentLevelTitle(nodeText);
    }
  });
  
  document.body.addEventListener('click', function(e) {
    const navButton = e.target.closest('.gallery-nav-button');
    if (navButton) {
      updateCurrentLevelTitle(navButton.textContent.trim());
    }
  });
}