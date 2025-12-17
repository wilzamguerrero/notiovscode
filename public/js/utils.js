/**
 * Utilidades generales de la aplicación
 */

// Deshabilitar consola en producción
(function() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    trace: console.trace
  };
  
  const noop = function() {};
  
  console.log = noop;
  console.error = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;
  console.clear = noop;
  console.dir = noop;
  console.table = noop;
  
  window._enableConsole = function() {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
    console.trace = originalConsole.trace;
  };
  
  window.addEventListener('error', function(e) {
    e.preventDefault();
    return true;
  }, true);
})();

// Deshabilitar click derecho
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});

/**
 * Renderiza rich text de Notion a HTML
 */
function renderNotionRichText(richTextArr) {
  if (!richTextArr) return "";
  return richTextArr.map(rt => {
    let text = rt.plain_text || "";
    if (!text) return "";

    if (rt.annotations) {
      if (rt.annotations.bold) text = `<strong>${text}</strong>`;
      if (rt.annotations.italic) text = `<em>${text}</em>`;
      if (rt.annotations.underline) text = `<u>${text}</u>`;
      if (rt.annotations.strikethrough) text = `<s>${text}</s>`;
      if (rt.annotations.code) text = `<code>${text}</code>`;
    }
    
    if (rt.href) {
      text = `<a href="${rt.href}" target="_blank" rel="noopener">${text}</a>`;
    }
    return text;
  }).join("");
}

/**
 * Scroll al inicio o final de la página
 */
function scrollToTopOrBottom() {
  const halfway = document.body.scrollHeight / 2;

  if (window.scrollY < halfway) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Detectar si es dispositivo móvil
 */
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
 * Destruir LightGallery de forma segura
 */
function safeDestroyLightGallery() {
  try {
    if (window.lgInstance) {
      const lgContainer = document.querySelector('.lg-container');
      const lgBackdrop = document.querySelector('.lg-backdrop');
      
      if (!lgContainer && !lgBackdrop) {
        window.lgInstance = null;
        return;
      }
      
      if (typeof window.lgInstance.destroy === 'function') {
        window.lgInstance.destroy();
      }
      
      if (lgBackdrop) lgBackdrop.remove();
      if (lgContainer) lgContainer.remove();
      
      window.lgInstance = null;
    }
  } catch (e) {
    console.warn("Error controlado al destruir lightgallery:", e);
    
    const lgElements = document.querySelectorAll('.lg-backdrop, .lg-container, .lg-outer, .lg-inner');
    lgElements.forEach(el => el.remove());
    
    window.lgInstance = null;
  }
}