/**
 * Sistema de Sidebar/Panel lateral - Versión mejorada
 */

let sidebarCollapsed = false;

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
  const gallery = document.getElementById('gallery');
  const tabIcon = sidebarTab?.querySelector('.sidebar-tab-icon');

  sidebarCollapsed = true;
  localStorage.setItem('sidebarCollapsed', 'true');

  if (animate) {
    sidebar.classList.add('sidebar-animating');
  }
  
  sidebar.classList.add('sidebar-collapsed');
  sidebarTab?.classList.add('tab-collapsed');
  gallery.classList.add('gallery-full-width');
  
  // Rotar el icono de la pestaña
  if (tabIcon) {
    tabIcon.style.transform = 'rotate(180deg)';
  }

  if (animate) {
    setTimeout(() => {
      sidebar.classList.remove('sidebar-animating');
    }, 300);
  }

  // Recalcular Macy después de la transición
  setTimeout(() => {
    if (typeof initializeMacy === 'function' && typeof macyInstance !== 'undefined' && macyInstance) {
      macyInstance.recalculate(true);
    }
  }, 350);
}

/**
 * Expandir el sidebar
 */
function expandSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarTab = document.getElementById('sidebarTab');
  const gallery = document.getElementById('gallery');
  const tabIcon = sidebarTab?.querySelector('.sidebar-tab-icon');

  sidebarCollapsed = false;
  localStorage.setItem('sidebarCollapsed', 'false');

  sidebar.classList.add('sidebar-animating');
  sidebar.classList.remove('sidebar-collapsed');
  sidebarTab?.classList.remove('tab-collapsed');
  gallery.classList.remove('gallery-full-width');
  
  // Rotar el icono de la pestaña
  if (tabIcon) {
    tabIcon.style.transform = 'rotate(0deg)';
  }

  setTimeout(() => {
    sidebar.classList.remove('sidebar-animating');
  }, 300);

  // Recalcular Macy después de la transición
  setTimeout(() => {
    if (typeof initializeMacy === 'function' && typeof macyInstance !== 'undefined' && macyInstance) {
      macyInstance.recalculate(true);
    }
  }, 350);
}

/**
 * Inicializar controles dentro del sidebar
 */
function initSidebarControls() {
  // Botón de columnas
  const columnBtn = document.getElementById('toggleColumnBtn');
  const columnOptions = document.getElementById('columnOptions');
  
  if (columnBtn && columnOptions) {
    columnBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      columnOptions.classList.toggle('hidden');
      columnBtn.classList.toggle('active');
    });

    // Opciones de columnas
    document.querySelectorAll('.column-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const cols = parseInt(btn.getAttribute('data-columns'), 10);
        
        // Marcar el seleccionado
        document.querySelectorAll('.column-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        if (typeof forcedColumnCount !== 'undefined') {
          if (forcedColumnCount === cols) {
            forcedColumnCount = null;
            btn.classList.remove('active');
          } else {
            forcedColumnCount = cols;
          }
        }
        
        if (typeof initializeMacy === 'function') {
          initializeMacy();
        }
        
        columnOptions.classList.add('hidden');
        columnBtn.classList.remove('active');
      });
    });
  }

  // Botón fullscreen
  const fullscreenBtn = document.getElementById('toggleFullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      fullscreenBtn.classList.toggle('active');
      if (typeof toggleFullscreen === 'function') {
        toggleFullscreen();
      } else {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error: ${err.message}`);
          });
        } else {
          document.exitFullscreen();
        }
      }
    });

    // Escuchar cambios de fullscreen para actualizar el estado del botón
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
      // Tu lógica de animación aquí
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

  // Cerrar opciones de columnas al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (columnOptions && !columnOptions.classList.contains('hidden')) {
      if (!columnOptions.contains(e.target) && columnBtn && !columnBtn.contains(e.target)) {
        columnOptions.classList.add('hidden');
        columnBtn.classList.remove('active');
      }
    }
  });
}

/**
 * Mostrar/ocultar sidebar en móvil
 */
function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('sidebar-mobile-open');
}