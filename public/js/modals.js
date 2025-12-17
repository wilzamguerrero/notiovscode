/**
 * Funciones para modales (texto, PDF, código)
 */

let currentTextItems = [];
let currentTextIndex = -1;

/**
 * Abrir modal de texto
 */
function openTextModal(content, index) {
  const modal = document.getElementById('textModal');
  const modalContent = document.getElementById('textModalContent');
  
  modalContent.innerHTML = content;
  currentTextIndex = index;
  
  updateModalNavButtons();
  
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
}

/**
 * Cerrar modal de texto
 */
function closeTextModal() {
  const modal = document.getElementById('textModal');
  
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }, 300);
}

/**
 * Actualizar botones de navegación del modal
 */
function updateModalNavButtons() {
  const prevBtn = document.getElementById('prevTextBtn');
  const nextBtn = document.getElementById('nextTextBtn');
  
  prevBtn.disabled = currentTextIndex <= 0;
  nextBtn.disabled = currentTextIndex === -1 || currentTextIndex >= currentTextItems.length - 1;
}

/**
 * Navegar en el modal de texto
 */
function navigateTextModal(direction) {
  if (currentTextIndex === -1 || currentTextItems.length === 0) return;
  
  const newIndex = currentTextIndex + direction;
  
  if (newIndex < 0 || newIndex >= currentTextItems.length) return;
  
  const item = currentTextItems[newIndex];
  let content = '';
  
  if (item.type === "text") {
    content = item.rich_text ? renderNotionRichText(item.rich_text) : item.content;
  } else if (item.type === "heading_1" || item.type === "heading_2" || item.type === "heading_3") {
    const headingContent = item.rich_text ? renderNotionRichText(item.rich_text) : item.content;
    content = '<' + item.type.replace("_", "") + '>' + headingContent + '</' + item.type.replace("_", "") + '>';
  }
  
  openTextModal(content, newIndex);
}

/**
 * Abrir visor de PDF
 */
function openPdfViewer(src, title) {
  const modal = document.createElement("div");
  modal.className = "pdf-modal";
  
  const modalContent = document.createElement("div");
  modalContent.className = "pdf-modal-content";
  
  const modalHeader = document.createElement("div");
  modalHeader.className = "pdf-modal-header";
  
  const modalTitle = document.createElement("div");
  modalTitle.className = "pdf-modal-title";
  modalTitle.textContent = title || "Documento PDF";
  
  const closeBtn = document.createElement("span");
  closeBtn.className = "pdf-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.onclick = () => document.body.removeChild(modal);
  
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeBtn);
  
  const iframe = document.createElement("iframe");
  iframe.className = "pdf-iframe";
  iframe.src = src;
  iframe.width = "100%";
  iframe.height = "100%";
  
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(iframe);
  modal.appendChild(modalContent);
  
  document.body.appendChild(modal);
  
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

/**
 * Abrir visor de código
 */
function openCodeViewer(content, language, title) {
  const modal = document.createElement("div");
  modal.className = "code-modal";
  
  const modalContent = document.createElement("div");
  modalContent.className = "code-modal-content";
  
  const modalHeader = document.createElement("div");
  modalHeader.className = "code-modal-header";
  
  const headerInfo = document.createElement("div");
  headerInfo.className = "code-modal-header-info";
  
  const langBadge = document.createElement("span");
  langBadge.className = "code-language-badge";
  langBadge.textContent = language || "text";
  
  const modalTitle = document.createElement("span");
  modalTitle.className = "code-modal-title";
  modalTitle.textContent = title || "Código";
  
  headerInfo.appendChild(langBadge);
  headerInfo.appendChild(modalTitle);
  
  const closeBtn = document.createElement("span");
  closeBtn.className = "code-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.onclick = () => document.body.removeChild(modal);
  
  modalHeader.appendChild(headerInfo);
  modalHeader.appendChild(closeBtn);
  
  const codeContainer = document.createElement("pre");
  codeContainer.className = "code-modal-container";
  
  const codeElement = document.createElement("code");
  codeElement.className = `language-${language || "text"}`;
  codeElement.textContent = content;
  
  codeContainer.appendChild(codeElement);
  
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(codeContainer);
  modal.appendChild(modalContent);
  
  document.body.appendChild(modal);
  
  if (typeof hljs !== 'undefined') {
    hljs.highlightElement(codeElement);
  }
  
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

/**
 * Inicializar eventos de modales
 */
function initModalEvents() {
  // Cerrar modal al hacer clic en el botón cerrar
  const closeBtn = document.querySelector('.text-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeTextModal);
  }
  
  // Cerrar modal al hacer clic fuera del contenido
  const modal = document.getElementById('textModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeTextModal();
      }
    });
  }
  
  // Navegación del modal
  const prevBtn = document.getElementById('prevTextBtn');
  const nextBtn = document.getElementById('nextTextBtn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => navigateTextModal(-1));
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => navigateTextModal(1));
  }
  
  // Cerrar con tecla Escape y navegar con flechas
  document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('textModal');
    
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeTextModal();
    }
    
    // Navegación con teclas de flecha
    if (modal.classList.contains('show')) {
      if (e.key === 'ArrowLeft') {
        navigateTextModal(-1);
      } else if (e.key === 'ArrowRight') {
        navigateTextModal(1);
      }
    }
  });
}