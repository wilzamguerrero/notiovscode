/**
 * Sistema de navegación e historial
 */

/**
 * Actualizar título del nivel actual (versión completa)
 */
function updateCurrentLevelTitle(title, forceShow = false) {
  // Si no hay título, usar 'Inicio'
  if (!title || title === 'undefined') {
    title = 'Inicio';
  }
  
  // Eliminar el asterisco si existe
  if (title && title.startsWith('*')) {
    title = title.substring(1).trim();
  }
  
  const titleElement = document.getElementById('currentLevelTitle');
  if (!titleElement) return;
  
  // Guardar el título en una variable global para referencia futura
  window.currentPageTitle = title;
  
  // Mostrar el título
  titleElement.textContent = title;
  titleElement.style.display = 'block';
  titleElement.classList.remove('hidden', 'fade-out');
  titleElement.classList.add('fade-in');
  
  // IMPORTANTE: Siempre limpiar el temporizador anterior
  if (window.levelTitleTimer) {
    clearTimeout(window.levelTitleTimer);
    window.levelTitleTimer = null;
  }
  
  // Si no es forceShow, ocultar después de un tiempo
  if (!forceShow) {
    window.levelTitleTimer = setTimeout(() => {
      titleElement.classList.remove('fade-in');
      titleElement.classList.add('fade-out');
      
      setTimeout(() => {
        titleElement.classList.add('hidden');
        titleElement.classList.remove('fade-out');
      }, 300);
    }, 3000);
  }
}

/**
 * Obtener título de un nodo por ID
 */
function getNodeTitle(nodeId) {
  // 1. Intentar obtener desde caché global
  if (window.titleCache && window.titleCache[nodeId]) {
    return window.titleCache[nodeId];
  }
  
  // 2. Buscar en treeCache
  if (treeCache[nodeId]) {
    const title = treeCache[nodeId].title || 'Sin título';
    if (!window.titleCache) window.titleCache = {};
    window.titleCache[nodeId] = title;
    return title;
  }
  
  // 3. Buscar en elementos DOM
  const nodeElement = findNodeElementById(nodeId);
  if (nodeElement) {
    let title;
    if (nodeElement.classList.contains('tree-root-btn')) {
      title = nodeElement.title || nodeElement.textContent.trim();
    } else {
      title = nodeElement.textContent.trim();
      
      const folderIcon = nodeElement.querySelector('.tree-folder-icon');
      if (folderIcon) {
        const nodeContents = Array.from(nodeElement.childNodes);
        const textNodes = nodeContents.filter(node => node.nodeType === 3);
        if (textNodes.length > 0) {
          title = textNodes[textNodes.length - 1].textContent.trim();
        }
      }
    }
    
    if (!window.titleCache) window.titleCache = {};
    window.titleCache[nodeId] = title;
    return title;
  }
  
  // 4. Intentar cargar desde localStorage
  try {
    const cachedData = getCachedData(nodeId);
    if (cachedData && cachedData.title) {
      const title = cachedData.title;
      if (!window.titleCache) window.titleCache = {};
      window.titleCache[nodeId] = title;
      return title;
    }
  } catch (e) {
    console.warn('Error al obtener título de localStorage:', e);
  }
  
  // 5. Usar el título actual si existe
  if (window.currentPageTitle) {
    return window.currentPageTitle;
  }
  
  return 'Contenido';
}

/**
 * Encontrar elemento de nodo por ID
 */
function findNodeElementById(nodeId) {
  // Buscar en la estructura de árbol
  const nodes = document.querySelectorAll('.tree-node[data-id="' + nodeId + '"]');
  if (nodes.length > 0) {
    return nodes[0];
  }
  
  // Buscar en los botones de raíz
  const rootButtons = document.querySelectorAll('.tree-root-btn[data-id="' + nodeId + '"]');
  if (rootButtons.length > 0) {
    return rootButtons[0];
  }
  
  return null;
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
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-overlay';
  loadingDiv.innerHTML = '<div class="loading-spinner"></div>';
  document.body.appendChild(loadingDiv);
  
  return function hideLoading() {
    if (document.body.contains(loadingDiv)) {
      document.body.removeChild(loadingDiv);
    }
  };
}

/**
 * Cargar nodo por ID
 */
async function loadNodeById(nodeId, addToHistory = true) {
  console.log(`Cargando nodo: ${nodeId} (addToHistory: ${addToHistory})`);
  
  try {
    const nodeElement = findNodeElementById(nodeId);
    
    if (nodeElement) {
      if (nodeElement.classList.contains('leaf') || nodeElement.classList.contains('tree-root-btn')) {
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
          } else if (nodeElement.classList.contains('leaf')) {
            markSelectedLeaf(nodeElement);
          }
          
          if (data.title && data.title.trim().startsWith('*') || (data.items && data.items.length > 0)) {
            await loadGallery(data);
          } else if (data.children && data.children.length > 0) {
            await loadToggleCards(data);
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
      
      selectedNodeId = nodeId;
      saveTreeState();
      
      try {
        const data = await loadToggleDataWithCache(nodeId);
        
        if (data.items && data.items.length > 0) {
          await loadGallery(data);
        } else if (data.children && data.children.length > 0) {
          await loadToggleCards(data);
        }
        
        updateSelectedNodeVisually(nodeId);
        
        if (addToHistory) {
          const title = getNodeTitle(nodeId) || 'Contenido';
          window.history.pushState({ nodeId: nodeId }, title, `#node=${nodeId}`);
        }
      } catch (error) {
        console.error("Error cargando datos del nodo:", error);
      }
    } else {
      const data = await loadToggleDataWithCache(nodeId);
      
      if (data.title && data.title.trim().startsWith('*') || (data.items && data.items.length > 0)) {
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
    }
  } catch (error) {
    console.error("Error al cargar el nodo por ID:", error);
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
      
      const displayTitle = child.title.trim().startsWith('*') 
        ? child.title.trim().substring(1).trim()
        : child.title.trim();
      
      button.textContent = displayTitle;
      
      button.addEventListener('click', async () => {
        let childData = child;
        if (!child.items) {
          try {
            childData = await loadToggleDataWithCache(child.id);
          } catch (error) {
            console.error("Error al cargar el nodo hijo:", error);
            return;
          }
        }

        updateCurrentLevelTitle(displayTitle, true);
        
        if (child.title.trim().startsWith('*') || !childData.children || childData.children.length === 0) {
          await loadGallery(childData);
          
          const title = child.title.trim().startsWith('*') 
            ? child.title.trim().substring(1).trim()
            : child.title.trim();
          window.history.pushState({ nodeId: child.id }, title, `#node=${child.id}`);
        } else {
          await loadToggleCards(childData);
          
          const title = child.title.trim();
          window.history.pushState({ nodeId: child.id }, title, `#node=${child.id}`);
        }
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
  window.addEventListener('popstate', async function(event) {
    console.log('Navegación detectada:', event.state);
    
    const hideLoading = showLoadingIndicator();
    
    try {
      if (!event.state) {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#node=')) {
          const nodeId = hash.substring(6);
          await loadNodeById(nodeId, false);
          
          const title = getNodeTitle(nodeId);
          updateCurrentLevelTitle(title, true);
          
          setTimeout(() => {
            updateCurrentLevelTitle(title);
          }, 100);
          
          return;
        }
        
        clearGallery();
        updateCurrentLevelTitle('Inicio', true);
        return;
      }
      
      if (event.state.nodeId) {
        await loadNodeById(event.state.nodeId, false);
        
        const title = getNodeTitle(event.state.nodeId);
        updateCurrentLevelTitle(title, true);
        
        setTimeout(() => {
          updateCurrentLevelTitle(title);
        }, 100);
      }
    } finally {
      hideLoading();
    }
  });
  
  // Guardar estado inicial si es necesario
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
  // Observar clicks en los nodos del árbol
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
  
  // También en los botones de navegación de las cards
  document.body.addEventListener('click', function(e) {
    const navButton = e.target.closest('.gallery-nav-button');
    if (navButton) {
      updateCurrentLevelTitle(navButton.textContent.trim());
    }
  });
}