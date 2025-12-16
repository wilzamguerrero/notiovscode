/**
 * Funciones del árbol de navegación
 */

let treeLoaded = false;
let treeCache = {};
let expandedNodes = JSON.parse(localStorage.getItem('expandedNodes') || '[]');
let selectedNodeId = localStorage.getItem('selectedNodeId') || null;
let rootButtonsLoaded = false;
let createdRootButtonIds = new Set();

/**
 * Guardar estado del árbol
 */
function saveTreeState() {
  localStorage.setItem('expandedNodes', JSON.stringify(expandedNodes));
  localStorage.setItem('selectedNodeId', selectedNodeId);
}

/**
 * Guardar posición del scroll del árbol
 */
function saveTreeScroll() {
  const treeContainer = document.getElementById('customTree');
  if (treeContainer) {
    localStorage.setItem('treeScrollTop', treeContainer.scrollTop);
  }
}

/**
 * Restaurar posición del scroll del árbol
 */
function restoreTreeScroll() {
  const treeContainer = document.getElementById('customTree');
  const scrollTop = parseInt(localStorage.getItem('treeScrollTop') || '0', 10);
  treeContainer.scrollTop = scrollTop;
}

/**
 * Marcar nodo como seleccionado
 */
function markSelectedNode(span) {
  const allNodes = document.querySelectorAll('.tree-node.selected');
  allNodes.forEach(node => node.classList.remove('selected'));
  span.classList.add('selected');
}

/**
 * Cerrar popover del menú
 */
function closeMenuPopover() {
  saveTreeScroll();
  const menu = document.getElementById("menuPopover");
  if (!menu) return;
  menu.classList.remove("animate-in");
  menu.classList.add("animate-out");
  menu.addEventListener("animationend", function handler() {
    menu.classList.add("hidden");
    menu.classList.remove("animate-out");
    menu.removeEventListener("animationend", handler);
  });
}

/**
 * Crear nodo del árbol - TODOS son carpetas híbridas
 */
function createTreeNode(item) {
  const li = document.createElement('li');
  // Ya no usamos el símbolo * - todos los nodos son tratados igual
  const displayTitle = item.title.trim();

  const span = document.createElement('span');
  span.classList.add('tree-node', 'expandable'); // Todos son expandibles
  span.setAttribute('data-id', item.id);
  
  // Icono de carpeta para todos
  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconSvg.setAttribute('class', 'tree-folder-icon');
  iconSvg.setAttribute('viewBox', '0 0 24 24');
  iconSvg.setAttribute('fill', 'none');
  iconSvg.setAttribute('stroke', 'currentColor');
  iconSvg.setAttribute('stroke-width', '2');
  iconSvg.innerHTML = '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>';
  
  span.appendChild(iconSvg);
  span.appendChild(document.createTextNode(displayTitle));

  if (item.id === selectedNodeId) span.classList.add('selected');

  span.addEventListener('click', async function (event) {
    event.stopPropagation();
    const treeContainer = document.getElementById('customTree');
    treeContainer.classList.add('loading-blur');
    const nodeId = span.getAttribute('data-id');

    // Marcar como seleccionado
    selectedNodeId = item.id;
    saveTreeState();
    markSelectedNode(span);
    updateCurrentLevelTitle(displayTitle, true);

    // Cargar datos del nodo
    let data;
    if (treeCache[item.id]) {
      data = treeCache[item.id];
    } else {
      try {
        const res = await authFetch(`/notion/toggle/${item.id}`);
        if (!res.ok) throw new Error(`Error al cargar el toggle: ${res.statusText}`);
        data = await res.json();
        treeCache[item.id] = data;
      } catch (error) {
        console.error("Error al cargar el nodo:", error);
        treeContainer.classList.remove('loading-blur');
        return;
      }
    }

    // SIEMPRE mostrar contenido en galería si existe
    if (data.items && data.items.length > 0) {
      await loadGallery(data);
    } else {
      // Si no hay items, limpiar galería
      clearGallery();
    }

    // Manejar expansión del árbol para mostrar hijos
    let childUl = li.querySelector('ul');
    
    if (childUl) {
      // Ya existe subárbol, toggle collapse
      const wasCollapsed = childUl.classList.contains('collapsed');
      childUl.classList.toggle('collapsed');

      if (wasCollapsed) {
        span.classList.add('expanded');
        if (!expandedNodes.includes(item.id)) expandedNodes.push(item.id);
      } else {
        span.classList.remove('expanded');
        expandedNodes = expandedNodes.filter(id => id !== item.id);
      }
      saveTreeState();
    } else if (data.children && data.children.length > 0) {
      // Crear subárbol con los hijos
      childUl = document.createElement('ul');
      childUl.classList.add('child-tree');
      data.children.forEach(child => {
        const childNode = createTreeNode(child);
        childUl.appendChild(childNode);
      });
      li.appendChild(childUl);

      span.classList.add('expanded');
      if (!expandedNodes.includes(item.id)) expandedNodes.push(item.id);
      saveTreeState();
    }

    // Actualizar historial
    const title = displayTitle || 'Contenido';
    window.history.pushState({ nodeId: nodeId }, title, `#node=${nodeId}`);

    treeContainer.classList.remove('loading-blur');
    updateCurrentLevelTitle(displayTitle);
  });

  // Si debe estar expandido, expandir automáticamente
  if (expandedNodes.includes(item.id)) {
    setTimeout(async () => {
      span.click();
    }, 0);
  }

  li.appendChild(span);
  return li;
}

/**
 * Cargar árbol personalizado
 */
async function loadCustomTree(force = false) {
  const treeContainer = document.getElementById('customTree');
  treeContainer.innerHTML = '';

  let data;
  if (!force && window.treeDataCache) {
    data = window.treeDataCache;
  } else {
    try {
      const res = await authFetch("/notion/get-quick-tree");
      if (!res.ok) throw new Error("Error al obtener el árbol rápido.");
      const json = await res.json();
      data = json.data || json;
      window.treeDataCache = data;
    } catch (error) {
      console.error("Error al cargar el árbol personalizado:", error);
      data = [];
    }
  }

  const ul = document.createElement('ul');
  data.forEach(item => {
    const node = createTreeNode(item);
    ul.appendChild(node);
  });
  treeContainer.appendChild(ul);
}

/**
 * Cargar árbol en el sidebar
 */
async function loadSidebarTree() {
  const treeContainer = document.getElementById('customTree');
  if (!treeContainer) return;
  
  treeContainer.innerHTML = '';

  let data;
  if (window.treeDataCache) {
    data = window.treeDataCache;
  } else {
    try {
      const res = await authFetch("/notion/get-quick-tree");
      if (!res.ok) throw new Error("Error al obtener el árbol rápido.");
      const json = await res.json();
      data = json.data || json;
      window.treeDataCache = data;
    } catch (error) {
      console.error("Error al cargar el árbol:", error);
      data = [];
    }
  }

  const ul = document.createElement('ul');
  data.forEach(item => {
    const node = createTreeNode(item);
    ul.appendChild(node);
  });
  treeContainer.appendChild(ul);
}

/**
 * Cargar botones de raíz del árbol
 */
async function loadRootTreeButtons() {
  if (rootButtonsLoaded) {
    console.log('Botones de raíz ya cargados, omitiendo duplicación');
    return;
  }
  
  const container = document.getElementById('treeRootButtons');
  if (!container) return;
  
  if (container.children.length > 0) {
    console.warn('Detectados botones existentes, limpiando para prevenir duplicación');
    container.innerHTML = '';
    createdRootButtonIds.clear();
  }
  
  try {
    let data;
    if (window.rootButtonsCache) {
      data = window.rootButtonsCache;
      console.log('Usando caché de botones de raíz');
    } else {
      console.log('Cargando botones de raíz desde API');
      const res = await authFetch("/notion/get-quick-tree");
      if (!res.ok) throw new Error("Error al obtener el árbol rápido.");
      const json = await res.json();
      data = json.data || json;
      window.rootButtonsCache = data;
    }
    
    data.forEach(item => {
      // Ya no usamos el símbolo * 
      const displayTitle = item.title.trim();

      if (createdRootButtonIds.has(item.id)) {
        console.warn(`Botón con ID ${item.id} ya existe, omitiendo`);
        return;
      }
      
      const btn = document.createElement('button');
      btn.className = 'button-style tree-root-btn';
      btn.textContent = displayTitle.charAt(0).toUpperCase();
      btn.setAttribute('data-id', item.id);
      
      const tooltip = document.createElement('span');
      tooltip.className = 'custom-tooltip';
      tooltip.textContent = displayTitle;
      btn.appendChild(tooltip);
      
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.tree-root-btn.selected').forEach(b => 
          b.classList.remove('selected'));
        btn.classList.add('selected');
        
        let dataToLoad;
        try {
          dataToLoad = await loadToggleDataWithCache(item.id);
        } catch (error) {
          console.error("Error al cargar el nodo:", error);
          return;
        }
        
        // Mostrar contenido si existe
        if (dataToLoad.items && dataToLoad.items.length > 0) {
          await loadGallery(dataToLoad);
        }
        
        // Si tiene hijos, mostrar como cards de navegación
        if (dataToLoad.children && dataToLoad.children.length > 0) {
          // Si NO tiene items, mostrar cards de navegación
          if (!dataToLoad.items || dataToLoad.items.length === 0) {
            await loadToggleCards(dataToLoad);
          }
        }
        
        window.history.pushState({ nodeId: item.id }, displayTitle, `#node=${item.id}`);
      });
      
      container.appendChild(btn);
      createdRootButtonIds.add(item.id);
    });
    
    rootButtonsLoaded = true;
    console.log('Botones de raíz cargados correctamente');
    
  } catch (error) {
    console.error("Error al cargar los botones de raíz:", error);
  }

  // Configurar tooltips para botones de raíz
  document.querySelectorAll('.tree-root-btn').forEach(btn => {
    const tooltip = btn.querySelector('.custom-tooltip');
    if (!tooltip) return;

    btn.addEventListener('click', () => {
      tooltip.classList.add('tooltip-hide-on-click');
    });

    btn.addEventListener('mouseenter', () => {
      if (!btn.matches(':active')) {
        tooltip.classList.remove('tooltip-hide-on-click');
      }
    });

    btn.addEventListener('mouseleave', () => {
      tooltip.classList.add('tooltip-hide-on-click');
    });
  });
}

/**
 * Toggle del menú popover
 */
async function toggleMenuPopover() {
  const menu = document.getElementById("menuPopover");
  const controlButtons = document.getElementById('controlButtons');

  if (controlButtons && (controlButtons.classList.contains('hidden') || controlButtons.classList.contains('fade-out'))) {
    showControlButtons();
    setTimeout(() => {
      toggleMenuPopover();
    }, 310);
    return;
  }

  if (!menu.classList.contains("hidden")) {
    closeMenuPopover();
    return;
  }

  setTimeout(restoreTreeScroll, 50);

  menu.classList.remove("hidden", "animate-out");
  void menu.offsetWidth;
  menu.classList.add("animate-in");
}