/**
 * Funciones de galería y creación de cards
 */

let macyInstance = null;
let forcedColumnCount = null;

/**
 * Inicializar/reinicializar Macy con transición suave
 */
function initializeMacy() {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;
  
  // Añadir clase para indicar recálculo
  gallery.classList.add('macy-recalculating');
  
  let columns, breakAtConfig;
  
  // Obtener el valor de columnas forzado
  const forcedCols = (typeof forcedColumnCount !== 'undefined') ? forcedColumnCount : window.forcedColumnCount;
  
  if (forcedCols !== null && forcedCols !== undefined) {
    columns = forcedCols;
    breakAtConfig = {}; // Sin breakpoints en modo forzado
  } else {
    // Configuración responsive por defecto
    columns = 6;
    breakAtConfig = {
      1200: 3,
      768: 2,
      480: 2
    };
  }
  
  // Si ya existe una instancia, destruirla
  if (typeof macyInstance !== 'undefined' && macyInstance) {
    try {
      macyInstance.remove();
    } catch (e) {
      // Ignorar errores al destruir
    }
  }
  
  // Crear nueva instancia
  macyInstance = Macy({
    container: "#gallery",
    trueOrder: false,
    margin: { x: 16, y: 16 },
    columns: columns,
    breakAt: breakAtConfig,
    waitForImages: false
  });
  
  // Forzar recálculo y quitar clase
  setTimeout(() => {
    if (macyInstance) {
      macyInstance.recalculate(true);
    }
    gallery.classList.remove('macy-recalculating');
  }, 50);
}

/**
 * Limpiar galería
 */
function clearGallery() {
  if (macyInstance) {
    macyInstance.remove(true);
    macyInstance = null;
  }
  
  safeDestroyLightGallery();
  
  const gallery = document.getElementById('gallery');
  gallery.style.visibility = 'hidden';
  gallery.innerHTML = "<div class='welcome-message'></div>";
  gallery.style.visibility = 'visible';
}

/**
 * Crear card de imagen
 */
function createImageCard(item) {
  const card = document.createElement("div");
  card.className = "card hidden";
  
  const link = document.createElement("a");
  link.href = item.src;
  link.className = "image-item";
  
  link.setAttribute('data-src', item.src);
  link.setAttribute('data-thumb', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E');
  link.setAttribute('data-real-thumb', item.src);
  link.setAttribute('data-sub-html', item.name || '');
  
  const img = document.createElement("img");
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
  img.setAttribute('data-src', item.src);
  img.style.backgroundColor = "#232323";
  img.loading = "lazy";
  
  link.appendChild(img);
  card.appendChild(link);
  return card;
}

/**
 * Crear card de archivo
 */
function createFileCard(item) {
  const card = document.createElement("div");
  card.className = "card file-card hidden";
  
  const fileWrapper = document.createElement("div");
  fileWrapper.className = "file-wrapper";
  
  const iconMap = {
    pdf: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
    word: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
    excel: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
    powerpoint: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
    zip: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
    text: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
    audio: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
    image: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
    video: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
    file: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png"
  };
  
  const icon = document.createElement("img");
  icon.className = "file-icon-img";
  icon.src = iconMap[item.fileType] || iconMap.file;
  icon.alt = item.fileType || "file";
  
  const fileInfo = document.createElement("div");
  fileInfo.className = "file-info";
  
  const fileName = document.createElement("div");
  fileName.className = "file-name";
  fileName.textContent = item.name || "Archivo";
  
  const fileType = document.createElement("div");
  fileType.className = "file-type";
  fileType.textContent = (item.fileType || "archivo").toUpperCase();
  
  fileInfo.appendChild(fileName);
  fileInfo.appendChild(fileType);
  
  fileWrapper.appendChild(icon);
  fileWrapper.appendChild(fileInfo);
  
  const link = document.createElement("a");
  link.href = item.src;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "file-link";
  link.appendChild(fileWrapper);
  
  if (item.fileType === "pdf") {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      openPdfViewer(item.src, item.name);
    });
  }
  
  card.appendChild(link);
  return card;
}

/**
 * Crear card de código
 */
function createCodeCard(item) {
  const card = document.createElement("div");
  card.className = "card code-card hidden";
  
  const codeWrapper = document.createElement("div");
  codeWrapper.className = "code-wrapper";
  
  const codeHeader = document.createElement("div");
  codeHeader.className = "code-header";
  
  const langBadge = document.createElement("span");
  langBadge.className = "code-language";
  langBadge.textContent = item.language || "text";
  
  const codeTitle = document.createElement("span");
  codeTitle.className = "code-title";
  codeTitle.textContent = item.caption || "Código";
  
  codeHeader.appendChild(langBadge);
  codeHeader.appendChild(codeTitle);
  
  const codePreview = document.createElement("pre");
  codePreview.className = "code-preview";
  
  const codeContent = document.createElement("code");
  codeContent.className = `language-${item.language || "text"}`;
  
  const previewText = item.content.length > 150 
    ? item.content.substring(0, 150) + "..." 
    : item.content;
  
  codeContent.textContent = previewText;
  codePreview.appendChild(codeContent);
  
  codeWrapper.appendChild(codeHeader);
  codeWrapper.appendChild(codePreview);
  
  card.appendChild(codeWrapper);
  card.addEventListener('click', function() {
    openCodeViewer(item.content, item.language, item.caption);
  });
  
  return card;
}

/**
 * Crear card de embed
 */
function createEmbedCard(item) {
  const card = document.createElement("div");
  card.className = "card embed-card hidden";
  
  if (item.embedType === "youtube" || item.embedType === "vimeo") {
    const videoOuterContainer = document.createElement("div");
    videoOuterContainer.className = "video-outer-container";
    
    const videoContainer = document.createElement("div");
    videoContainer.className = "video-container";
    
    let srcWithParams = item.src;
    
    if (item.embedType === "youtube") {
      srcWithParams = srcWithParams.replace('youtube.com', 'youtube-nocookie.com');
      const separator = srcWithParams.includes('?') ? '&' : '?';
      srcWithParams = `${srcWithParams}${separator}rel=0&modestbranding=1&enablejsapi=0`;
    }
    
    const iframe = document.createElement("iframe");
    iframe.src = srcWithParams;
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    iframe.frameBorder = "0";
    iframe.allowFullscreen = true;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    
    videoContainer.appendChild(iframe);
    videoOuterContainer.appendChild(videoContainer);
    card.appendChild(videoOuterContainer);
  } else {
    const fileWrapper = document.createElement("div");
    fileWrapper.className = "file-wrapper";
    
    const iconMap = {
      youtube: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
      vimeo: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
      twitter: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
      instagram: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
      facebook: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
      github: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
      figma: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
      maps: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png",
      default: "https://raw.githubusercontent.com/wilzamguerrero/SDZ/main/SDZ_custom/icon2/update.png"
    };
    
    let embedIconType = "default";
    if (item.src) {
      const url = item.src.toLowerCase();
      if (url.includes('youtube')) embedIconType = "youtube";
      else if (url.includes('vimeo')) embedIconType = "vimeo";
      else if (url.includes('twitter')) embedIconType = "twitter";
      else if (url.includes('instagram')) embedIconType = "instagram";
      else if (url.includes('facebook')) embedIconType = "facebook";
      else if (url.includes('github')) embedIconType = "github";
      else if (url.includes('figma')) embedIconType = "figma";
      else if (url.includes('maps.google') || url.includes('goo.gl/maps')) embedIconType = "maps";
    }
    
    const icon = document.createElement("img");
    icon.className = "file-icon-img";
    icon.src = iconMap[embedIconType] || iconMap.default;
    icon.alt = item.embedType || "enlace";
    
    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";
    
    const fileName = document.createElement("div");
    fileName.className = "file-name";
    fileName.textContent = item.title || "Enlace externo";
    
    const fileType = document.createElement("div");
    fileType.className = "file-type";
    fileType.textContent = (embedIconType === "default" ? "URL" : embedIconType).toUpperCase();
    
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileType);
    
    fileWrapper.appendChild(icon);
    fileWrapper.appendChild(fileInfo);
    
    const link = document.createElement("a");
    link.href = item.src;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "file-link";
    link.appendChild(fileWrapper);
    
    card.appendChild(link);
  }
  
  return card;
}

/**
 * Configurar lazy loading de imágenes
 */
function setupLazyImageLoading() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        
        if (src) {
          const tempImg = new Image();
          
          tempImg.onload = function() {
            img.src = src;
            img.removeAttribute('data-src');
            
            setTimeout(() => {
              if (macyInstance) {
                macyInstance.recalculate(true);
              }
            }, 50);
          };
          
          tempImg.src = src;
        }
        
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '200px 20px' });
  
  document.querySelectorAll('#gallery img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Configurar lazy loading de videos
 */
function setupLazyVideoLoading() {
  const videoObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const video = entry.target;
        const src = video.getAttribute('data-src');
        
        if (src) {
          if (video.poster) {
            const posterImg = new Image();
            posterImg.onload = function() {
              video.setAttribute('data-width', posterImg.width);
              video.setAttribute('data-height', posterImg.height);
              
              video.src = src;
              video.removeAttribute('data-src');
              
              video.addEventListener('loadedmetadata', () => {
                if (macyInstance) macyInstance.recalculate(true);
              });
            };
            posterImg.src = video.poster;
          } else {
            video.src = src;
            video.removeAttribute('data-src');
            
            video.addEventListener('loadedmetadata', () => {
              if (macyInstance) macyInstance.recalculate(true);
            });
          }
        }
        
        observer.unobserve(video);
      }
    });
  }, { rootMargin: '200px 0px' });
  
  document.querySelectorAll('#gallery video[data-src]').forEach(video => {
    videoObserver.observe(video);
  });
}

/**
 * Cargar galería con datos de toggle
 */
async function loadGallery(toggle) {
  if (macyInstance) {
    macyInstance.remove(true);
    macyInstance = null;
  }
  
  safeDestroyLightGallery();
  
  const gallery = document.getElementById('gallery');
  gallery.style.visibility = 'hidden';
  gallery.innerHTML = "";
  
  if (!toggle || !toggle.items || toggle.items.length === 0) {
    console.log("No hay elementos para mostrar en loadGallery");
    gallery.style.visibility = 'visible';
    return;
  }
  
  currentTextItems = toggle.items.filter(item => 
    item.type === "text" || 
    item.type === "heading_1" || 
    item.type === "heading_2" || 
    item.type === "heading_3" ||
    item.type === "code"
  );

  toggle.items.forEach(item => {
    if (item.type === "text") {
      const textBlock = document.createElement("div");
      textBlock.className = "gallery-text-block";
      let content = '';
      if (item.rich_text) {
        content = renderNotionRichText(item.rich_text);
        textBlock.innerHTML = content;
      } else {
        content = item.content;
        textBlock.textContent = content;
      }
      
      textBlock.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const index = currentTextItems.findIndex(i => 
          (i.type === "text" && 
           ((i.rich_text && renderNotionRichText(i.rich_text) === content) || 
            (i.content && i.content === content)))
        );
        openTextModal(content, index);
      });
      gallery.appendChild(textBlock);
    }
    else if (item.type === "heading_1" || item.type === "heading_2" || item.type === "heading_3") {
      const wrapper = document.createElement("div");
      wrapper.className = "gallery-text-block gallery-heading-block";
      const h = document.createElement(item.type.replace("_", ""));
      let content = '';
      if (item.rich_text) {
        content = renderNotionRichText(item.rich_text);
        h.innerHTML = content;
      } else {
        content = item.content;
        h.textContent = content;
      }
      wrapper.appendChild(h);
      
      wrapper.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const headingContent = '<' + item.type.replace("_", "") + '>' + content + '</' + item.type.replace("_", "") + '>';
        const index = currentTextItems.findIndex(i => i === item);
        openTextModal(headingContent, index);
      });
      
      gallery.appendChild(wrapper);
    }
    else if (item.type === "image") {
      gallery.appendChild(createImageCard(item));
    }
    else if (item.type === "video") {
      const card = document.createElement("div");
      card.className = "card hidden";

      const video = document.createElement("video");
      video.src = item.src;
      video.controls = true;
      video.preload = "metadata";
      video.loop = true;
      video.muted = true;
      card.appendChild(video);

      if (item.name) {
        const tooltip = document.createElement("span");
        tooltip.className = "custom-tooltip";
        tooltip.textContent = item.name || "Sin nombre";
        card.appendChild(tooltip);
        
        setTimeout(() => {
          tooltip.classList.add('tooltip-auto-hide');
        }, 5000);
      }

      gallery.appendChild(card);
    }
    else if (item.type === "file") {
      gallery.appendChild(createFileCard(item));
    } 
    else if (item.type === "code") {
      gallery.appendChild(createCodeCard(item));
    } 
    else if (item.type === "embed") {
      gallery.appendChild(createEmbedCard(item));
    }
  });

  imagesLoaded(gallery, { background: true }, () => {
    document.querySelectorAll(".card.hidden").forEach(card => card.classList.remove("hidden"));
    
    const allImages = document.querySelectorAll("#gallery img");
    allImages.forEach(img => {
      if (img.complete) {
        if (macyInstance) macyInstance.recalculate(true);
      } else {
        img.addEventListener('load', () => {
          if (macyInstance) macyInstance.recalculate(true);
        });
      }
    });
    
    // Suprimir warning de licencia
    console.warn = (function(originalWarn) {
      return function(msg, ...args) {
        if (!msg.includes('license key is not valid')) {
          originalWarn.apply(console, [msg, ...args]);
        }
      };
    })(console.warn);

    try {
      if (gallery.querySelector(".image-item")) {
        safeDestroyLightGallery();
        
        window.lgInstance = lightGallery(gallery, {
          selector: ".image-item", 
          mode: 'lg-fade',
          plugins: [lgZoom, lgAutoplay, lgFullscreen, lgThumbnail, lgRotate],
          speed: 300,
          autoplay: true,
          fullScreen: true,
          thumbnail: true,
          animateThumb: true,
          showThumbByDefault: true,
          rotate: true,
          zoomFromOrigin: true,
          allowMediaOverlap: true,
          toggleThumb: true,
        });

        gallery.addEventListener('lgAfterSlide', function(event) {
          if (document.querySelector('.lg-thumb-outer') && 
              !document.querySelector('.lg-thumb-outer').classList.contains('lg-thumb-hide')) {
            cargarThumbnailActual(event.detail.index);
          }
        });

        gallery.addEventListener('lgToggleThumb', function() {
          setTimeout(function() {
            if (document.querySelector('.lg-thumb-outer') && 
                !document.querySelector('.lg-thumb-outer').classList.contains('lg-thumb-hide')) {
              cargarThumbnailsVisibles();
              
              const thumbStrip = document.querySelector('.lg-thumb');
              if (thumbStrip) {
                thumbStrip.addEventListener('scroll', function() {
                  const currentIndex = document.querySelector('.lg-current')?.getAttribute('data-lg-index');
                  if (currentIndex !== undefined) {
                    clearTimeout(thumbStrip.scrollTimer);
                    thumbStrip.scrollTimer = setTimeout(function() {
                      cargarThumbnailActual(parseInt(currentIndex, 10));
                    }, 100);
                  }
                });
              }
            }
          }, 50);
        });
      }
    } catch (e) {
      console.warn("Error al inicializar lightgallery:", e);
      window.lgInstance = null;
    }

    initializeMacy();

    const allVideos = document.querySelectorAll("#gallery video");
    allVideos.forEach((vid) => {
      vid.addEventListener("loadedmetadata", () => {
        if (macyInstance) {
          macyInstance.recalculate(true);
        }
      });
    });

    setTimeout(() => gallery.style.visibility = 'visible', 150);
  });

  setupLazyImageLoading();
  setupLazyVideoLoading();
}

/**
 * Cargar toggle cards (botones de navegación)
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
      buttonCard.className = 'card gallery-button-card';
      
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
 * Virtualización para mejorar rendimiento con muchos elementos
 */
function setupVirtualization() {
  function updateVisibleItems() {
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    const bufferSize = 500;
    
    document.querySelectorAll('#gallery .card').forEach(item => {
      const rect = item.getBoundingClientRect();
      const itemTop = rect.top + window.scrollY;
      const itemBottom = rect.bottom + window.scrollY;
      
      if (itemBottom >= viewportTop - bufferSize && 
          itemTop <= viewportBottom + bufferSize) {
        if (item.classList.contains('virtualized')) {
          item.classList.remove('virtualized');
        }
      } else {
        if (!item.classList.contains('virtualized')) {
          item.classList.add('virtualized');
        }
      }
    });
  }
  
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateVisibleItems, 100);
  });
  
  updateVisibleItems();
}

// Funciones de thumbnails
function cargarThumbnailActual(index) {
  const thumbnails = document.querySelectorAll('.lg-thumb-item img');
  if (!thumbnails.length) return;
  
  const minIndex = Math.max(0, index - 5);
  const maxIndex = Math.min(thumbnails.length - 1, index + 5);
  
  for (let i = minIndex; i <= maxIndex; i++) {
    const thumbImg = thumbnails[i];
    if (!thumbImg) continue;
    
    if (!thumbImg.src || thumbImg.src.includes('data:image/svg')) {
      const galleryItems = document.querySelectorAll('.image-item');
      if (galleryItems[i] && galleryItems[i].getAttribute('data-real-thumb')) {
        thumbImg.src = galleryItems[i].getAttribute('data-real-thumb');
      }
    }
  }
  
  setTimeout(() => cargarThumbnailsProgresivamente(index, thumbnails), 300);
}

function cargarThumbnailsProgresivamente(index, thumbnails) {
  if (!thumbnails || !thumbnails.length) return;
  
  const totalThumbs = thumbnails.length;
  const galleryItems = document.querySelectorAll('.image-item');
  
  if (!document.querySelector('.lg-outer')) return;
  
  if (!document.querySelector('.lg-thumb-outer') || 
      document.querySelector('.lg-thumb-outer').classList.contains('lg-thumb-hide')) {
    return;
  }
  
  let cargarPendientes = false;
  const radios = [7, 10, 15, 20, 30, 50, totalThumbs];
  
  for (const radio of radios) {
    const minIdx = Math.max(0, index - radio);
    const maxIdx = Math.min(totalThumbs - 1, index + radio);
    
    let pendientesEnRango = false;
    
    for (let i = minIdx; i <= maxIdx; i++) {
      if (i >= index-5 && i <= index+5) continue;
      
      const thumbImg = thumbnails[i];
      if (!thumbImg) continue;
      
      if (!thumbImg.src || thumbImg.src.includes('data:image/svg')) {
        if (galleryItems[i] && galleryItems[i].getAttribute('data-real-thumb')) {
          thumbImg.src = galleryItems[i].getAttribute('data-real-thumb');
          pendientesEnRango = true;
          cargarPendientes = true;
          break;
        }
      }
    }
    
    if (pendientesEnRango) break;
  }
  
  if (cargarPendientes) {
    setTimeout(() => cargarThumbnailsProgresivamente(index, thumbnails), 150);
  }
}

function cargarThumbnailsVisibles() {
  const thumbContainer = document.querySelector('.lg-thumb');
  if (!thumbContainer) return;
  
  const currentIndex = document.querySelector('.lg-current')?.getAttribute('data-lg-index');
  if (currentIndex !== undefined) {
    cargarThumbnailActual(parseInt(currentIndex, 10));
  }
  
  const thumbObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const thumbItem = entry.target;
        const thumbImg = thumbItem.querySelector('img');
        
        if (thumbImg && (!thumbImg.src || thumbImg.src.includes('data:image/svg'))) {
          const thumbIndex = Array.from(document.querySelectorAll('.lg-thumb-item')).indexOf(thumbItem);
          
          const galleryItems = document.querySelectorAll('.image-item');
          if (galleryItems[thumbIndex] && galleryItems[thumbIndex].getAttribute('data-real-thumb')) {
            thumbImg.src = galleryItems[thumbIndex].getAttribute('data-real-thumb');
          }
        }
        
        observer.unobserve(thumbItem);
      }
    });
  }, { rootMargin: '200px 0px' });
  
  document.querySelectorAll('.lg-thumb-item').forEach(thumbItem => {
    thumbObserver.observe(thumbItem);
  });
}