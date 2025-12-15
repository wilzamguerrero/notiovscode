/**
 * Controles de la interfaz de usuario
 */

// Variables para el temporizador de controles
let controlsTimer;
let mobileInactivityTimer;

/**
 * Mostrar botones de control
 */
function showControlButtons() {
  const controlButtons = document.getElementById('controlButtons');
  const showControlsBtn = document.getElementById('showControlsBtn');

  // Si los controles están en animación de salida, espera a que termine
  if (controlButtons.classList.contains('fade-out')) {
    controlButtons.addEventListener('animationend', function handler() {
      controlButtons.classList.remove('fade-out');
      controlButtons.classList.remove('hidden');
      controlButtons.classList.add('fade-in');
      showControlsBtn.classList.add('hidden');
      clearTimeout(controlsTimer);
      controlsTimer = setTimeout(hideControlButtons, 3000);
      controlButtons.removeEventListener('animationend', handler);
    });
    return;
  }

  // Ocultar el botón principal
  showControlsBtn.classList.add('hidden');

  // Mostrar los botones de control con animación
  controlButtons.classList.remove('hidden');
  controlButtons.classList.add('fade-in');

  // Establecer temporizador para ocultar los botones después de 3 segundos
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(hideControlButtons, 3000);
}

/**
 * Ocultar botones de control
 */
function hideControlButtons() {
  const controlButtons = document.getElementById('controlButtons');
  const showControlsBtn = document.getElementById('showControlsBtn');
  const menuPopover = document.getElementById('menuPopover');
  const columnOptions = document.getElementById('columnOptions');

  // Cierra los menús INMEDIATAMENTE antes de animar los controles
  if (menuPopover && !menuPopover.classList.contains('hidden')) {
    closeMenuPopover();
  }
  if (columnOptions && !columnOptions.classList.contains('hidden')) {
    closeColumnOptions();
  }

  // Ahora anima y oculta los controles
  controlButtons.classList.remove('fade-in');
  controlButtons.classList.add('fade-out');

  setTimeout(() => {
    controlButtons.classList.add('hidden');
    controlButtons.classList.remove('fade-out');
    showControlsBtn.classList.remove('hidden');
  }, 300);
}

/**
 * Cerrar opciones de columnas
 */
function closeColumnOptions() {
  const optionsMenu = document.getElementById("columnOptions");
  if (!optionsMenu.classList.contains("hidden")) {
    optionsMenu.classList.remove("show-numbers");
    optionsMenu.classList.add("hide-numbers");
    optionsMenu.addEventListener("animationend", function handler() {
      optionsMenu.classList.add("hidden");
      optionsMenu.classList.remove("hide-numbers");
      optionsMenu.removeEventListener("animationend", handler);
    });
  }
}

/**
 * Toggle de opciones de columnas
 */
function toggleColumnOptions() {
  const optionsMenu = document.getElementById("columnOptions");
  
  if (!optionsMenu.classList.contains("hidden")) {
    closeColumnOptions();
    return;
  }
  
  optionsMenu.classList.remove("hidden", "hide-numbers");
  optionsMenu.classList.add("show-numbers");
}

/**
 * Toggle de pantalla completa
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error al intentar pantalla completa: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

/**
 * Temporizador de inactividad para móvil
 */
function startMobileInactivityTimer() {
  clearTimeout(mobileInactivityTimer);
  mobileInactivityTimer = setTimeout(() => {
    closeMenuPopover();
    closeColumnOptions();
  }, 5000);
}

function resetMobileInactivityTimer() {
  clearTimeout(mobileInactivityTimer);
  startMobileInactivityTimer();
}

/**
 * Inicializar eventos de controles
 */
function initControlEvents() {
  // Botón mostrar controles
  const showControlsBtn = document.getElementById('showControlsBtn');
  if (showControlsBtn) {
    showControlsBtn.addEventListener('click', function() {
      const controlButtons = document.getElementById('controlButtons');
      if (controlButtons.classList.contains('hidden') || controlButtons.classList.contains('fade-out')) {
        showControlButtons();
      } else {
        hideControlButtons();
      }
    });
  }

  // Botón pantalla completa
  const fullscreenBtn = document.getElementById('toggleFullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  // Botón columnas
  const columnBtn = document.getElementById('toggleColumnBtn');
  if (columnBtn) {
    columnBtn.addEventListener('click', toggleColumnOptions);
  }

  // Cerrar menú de columnas al hacer clic fuera
  document.addEventListener("click", function(e) {
    const optionsMenu = document.getElementById("columnOptions");
    const toggleBtn = document.getElementById("toggleColumnBtn");
    if (!optionsMenu.classList.contains("hidden") &&
        !optionsMenu.contains(e.target) &&
        !toggleBtn.contains(e.target)
    ) {
      closeColumnOptions();
    }
  });

  // Opciones de columnas
  document.querySelectorAll(".column-option").forEach(button => {
    button.addEventListener("click", () => {
      const selectedColumns = parseInt(button.getAttribute("data-columns"), 10);
      if (forcedColumnCount === selectedColumns) {
        forcedColumnCount = null;
      } else {
        forcedColumnCount = selectedColumns;
      }
      initializeMacy();

      const optionsMenu = document.getElementById("columnOptions");
      optionsMenu.classList.add("hide-numbers");
      optionsMenu.addEventListener("animationend", function handler(e) {
        if (e.animationName === "slideOutnumbers") {
          optionsMenu.classList.add("hidden");
          optionsMenu.classList.remove("hide-numbers", "show-numbers");
          optionsMenu.removeEventListener("animationend", handler);
        }
      });
    });
  });

  // Botón scroll arriba/abajo
  const scrollBtn = document.getElementById('backToToporbottom');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', scrollToTopOrBottom);
  }

  // Tooltips para todos los botones
  document.querySelectorAll('.button-style').forEach(btn => {
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

    btn.addEventListener('blur', () => {
      tooltip.classList.add('tooltip-hide-on-click');
    });
  });

  // Limpiar clase tooltip al soltar el mouse
  document.addEventListener('pointerup', () => {
    document.querySelectorAll('.custom-tooltip.tooltip-hide-on-click').forEach(tooltip => {
      tooltip.classList.remove('tooltip-hide-on-click');
    });
  });

  // Configuración para móviles
  if (isMobile()) {
    const showAllFoldersBtn = document.getElementById('showAllFolders');
    if (showAllFoldersBtn) {
      showAllFoldersBtn.addEventListener('touchend', startMobileInactivityTimer);
    }
    
    document.getElementById('toggleColumnBtn')?.addEventListener('touchend', startMobileInactivityTimer);
    document.getElementById('menuPopover')?.addEventListener('touchstart', resetMobileInactivityTimer);
    document.getElementById('columnOptions')?.addEventListener('touchstart', resetMobileInactivityTimer);

    document.body.addEventListener('touchstart', function(e) {
      const menu = document.getElementById('menuPopover');
      const columns = document.getElementById('columnOptions');
      if (
        (!menu.classList.contains('hidden') && !menu.contains(e.target)) ||
        (!columns.classList.contains('hidden') && !columns.contains(e.target))
      ) {
        startMobileInactivityTimer();
      }
    });
  }
}