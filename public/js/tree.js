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

  // Botón para crear subcarpeta
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'tree-node-actions';
  
  const addFolderBtn = document.createElement('button');
  addFolderBtn.className = 'tree-add-folder-btn';
  addFolderBtn.title = 'Nueva subcarpeta';
  addFolderBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      <line x1="12" y1="11" x2="12" y2="17"/>
      <line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  `;
  
  addFolderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showInlineNewFolder(li, item.id);
  });
  
  actionsDiv.appendChild(addFolderBtn);
  span.appendChild(actionsDiv);

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

    window.history.pushState({ nodeId: item.id }, displayTitle, `#node=${item.id}`);
    
    setTimeout(() => {
      treeContainer.classList.remove('loading-blur');
      closeMenuPopover();
    }, 0);
  });

  li.appendChild(span);
  return li;
}

/**
 * Mostrar input inline para crear nueva carpeta
 */
function showInlineNewFolder(parentLi, parentId) {
  // Verificar si ya existe un input
  const existingInput = parentLi.querySelector('.new-folder-inline');
  if (existingInput) {
    existingInput.remove();
    return;
  }
  
  // Obtener o crear el ul de hijos
  let childUl = parentLi.querySelector('ul');
  if (!childUl) {
    childUl = document.createElement('ul');
    childUl.classList.add('child-tree');
    parentLi.appendChild(childUl);
  }
  
  // Asegurar que esté visible
  childUl.classList.remove('collapsed');
  const span = parentLi.querySelector('.tree-node');
  if (span) span.classList.add('expanded');
  
  // Crear el formulario inline
  const form = document.createElement('li');
  form.className = 'new-folder-inline';
  form.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:#6b7280;">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
    <input type="text" placeholder="Nombre de carpeta..." autofocus />
    <button class="new-folder-inline-btn confirm" title="Crear">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
    <button class="new-folder-inline-btn cancel" title="Cancelar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  
  // Insertar al inicio
  childUl.insertBefore(form, childUl.firstChild);
  
  const input = form.querySelector('input');
  const confirmBtn = form.querySelector('.confirm');
  const cancelBtn = form.querySelector('.cancel');
  
  input.focus();
  
  const createFolder = async () => {
    const name = input.value.trim();
    if (!name) {
      form.remove();
      return;
    }
    
    confirmBtn.classList.add('loading');
    input.disabled = true;
    
    try {
      const res = await authFetch('/api/create-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name, parentId: parentId })
      });
      
      if (!res.ok) throw new Error('Error creando carpeta');
      
      const result = await res.json();
      
      // Limpiar caché del padre
      delete treeCache[parentId];
      
      // Crear el nuevo nodo
      const newNode = createTreeNode({ id: result.id, title: name });
      
      // Reemplazar el formulario con el nuevo nodo
      form.replaceWith(newNode);
      
    } catch (error) {
      console.error('Error creando carpeta:', error);
      alert('Error al crear la carpeta');
      form.remove();
    }
  };
  
  confirmBtn.addEventListener('click', createFolder);
  cancelBtn.addEventListener('click', () => form.remove());
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createFolder();
    if (e.key === 'Escape') form.remove();
  });
}

/**
 * Inicializar botón para crear carpeta raíz
 */
function initRootFolderButton() {
  const addRootBtn = document.getElementById('addRootFolderBtn');
  if (addRootBtn) {
    addRootBtn.addEventListener('click', () => {
      showRootFolderInput();
    });
  }
}

/**
 * Mostrar input para crear carpeta raíz
 */
function showRootFolderInput() {
  const treeContainer = document.getElementById('customTree');
  const ul = treeContainer.querySelector('ul') || treeContainer;
  
  // Verificar si ya existe
  const existing = ul.querySelector('.new-folder-inline');
  if (existing) {
    existing.remove();
    return;
  }
  
  const form = document.createElement('li');
  form.className = 'new-folder-inline';
  form.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:#6b7280;">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
    <input type="text" placeholder="Nueva carpeta raíz..." autofocus />
    <button class="new-folder-inline-btn confirm" title="Crear">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
    <button class="new-folder-inline-btn cancel" title="Cancelar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  
  ul.insertBefore(form, ul.firstChild);
  
  const input = form.querySelector('input');
  const confirmBtn = form.querySelector('.confirm');
  const cancelBtn = form.querySelector('.cancel');
  
  input.focus();
  
  const createFolder = async () => {
    const name = input.value.trim();
    if (!name) {
      form.remove();
      return;
    }
    
    confirmBtn.classList.add('loading');
    input.disabled = true;
    
    try {
      const res = await authFetch('/api/create-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name })
      });
      
      if (!res.ok) throw new Error('Error creando carpeta');
      
      const result = await res.json();
      
      // Limpiar caché del árbol
      window.treeDataCache = null;
      
      // Crear el nuevo nodo
      const newNode = createTreeNode({ id: result.id, title: name });
      
      form.replaceWith(newNode);
      
    } catch (error) {
      console.error('Error creando carpeta:', error);
      alert('Error al crear la carpeta');
      form.remove();
    }
  };
  
  confirmBtn.addEventListener('click', createFolder);
  cancelBtn.addEventListener('click', () => form.remove());
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createFolder();
    if (e.key === 'Escape') form.remove();
  });
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