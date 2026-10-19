// CONFIGURACIÓN DE TU API KEY
const API_KEY = 'AIzaSyCMjHCQ02iIyq1XB5jZuce6CQ2wF5m-KiE';

// Íconos SVG inline en Base64 (Respaldo por si la imagen local no existe)
const SVG_CARPETA = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230b6fa4'><path d='M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'/></svg>";
const SVG_ARCHIVO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230b6fa4'><path d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'/></svg>";

// 1. CARGAR ARCHIVOS DE GOOGLE DRIVE
async function cargarArchivosFolder(folderId) {
  const galeria = document.getElementById('drive-gallery');
  if (!galeria) return;

  galeria.classList.remove('padlet-mode');
  galeria.innerHTML = '<p class="loading-text">Cargando recursos desde Google Drive...</p>';

  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&orderBy=createdTime+desc&fields=files(id,name,thumbnailLink,webViewLink,mimeType)&key=${API_KEY}`;

  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();

    if (!datos.files || datos.files.length === 0) {
      galeria.innerHTML = '<p class="loading-text">Próximamente...</p>';
      return;
    }

    galeria.innerHTML = '';

    // Detecta si la página actual está dentro de una subcarpeta (ej: ramas, material, comites)
    const esSubcarpeta = window.location.pathname.includes('/ramas/') || 
                         window.location.pathname.includes('/material/') || 
                         window.location.pathname.includes('/comites/');

    const basePath = esSubcarpeta ? '../img/' : 'img/';

    datos.files.forEach(archivo => {
      const esCarpeta = archivo.mimeType === 'application/vnd.google-apps.folder';
      const nombreIcono = esCarpeta ? 'icono-carpeta.png' : 'icono-archivo.png';
      
      const rutaLocal = basePath + nombreIcono;
      const svgFallback = esCarpeta ? SVG_CARPETA : SVG_ARCHIVO;

      // Si es carpeta, forzamos el ícono local; si es archivo con miniatura, la usamos en HD
      let miniatura = (archivo.thumbnailLink && !esCarpeta)
        ? archivo.thumbnailLink.replace('=s220', '=s600') 
        : rutaLocal;

      const nombreLimpio = archivo.name.replace(/\.[^/.]+$/, "");

      const tarjetaHTML = `
        <article class="gallery-card ${esCarpeta ? 'card-folder' : ''}">
          <a href="${archivo.webViewLink}" target="_blank" rel="noopener noreferrer">
            <div class="card-image-wrapper">
              <img src="${miniatura}" 
                   alt="${nombreLimpio}" 
                   loading="lazy"
                   onerror="if (!this.dataset.triedLocal) { this.dataset.triedLocal = true; this.src='${rutaLocal}'; } else { this.onerror=null; this.src='${svgFallback}'; } this.classList.add('fallback-icon');">
            </div>
            <span class="card-title">${nombreLimpio}</span>
          </a>
        </article>
      `;

      galeria.innerHTML += tarjetaHTML;
    });

  } catch (error) {
    console.error('Error al conectar con Google Drive:', error);
    galeria.innerHTML = '<p class="loading-text">Error al cargar el material. Verificá los permisos de la carpeta de Drive.</p>';
  }
}

// 2. CARGAR IFRAME DE PADLET
function cargarPadlet(urlPadlet) {
  const galeria = document.getElementById('drive-gallery');
  if (!galeria) return;

  galeria.classList.add('padlet-mode');
  
  galeria.innerHTML = `
    <div class="padlet-container">
      <iframe 
        src="${urlPadlet}" 
        frameborder="0" 
        allow="camera; microphone; geolocation" 
        style="width:100%; height:650px; border:none; border-radius:12px;">
      </iframe>
    </div>
  `;
}

// 3. CONTROL DE GRILLAS SECUNDARIAS / EXTRAS
function mostrarGrillaRecursos(targetGridId) {
  const grillas = document.querySelectorAll('.recursos-grid, .seccion-tab-extra');

  if (targetGridId) {
    // Para páginas con contenido filtrado por pestaña (ej: material-programa)
    grillas.forEach(grid => grid.style.display = 'none');
    
    const grillaActiva = document.getElementById(targetGridId);
    if (grillaActiva) {
      grillaActiva.style.display = 'flex';
    }
  } else {
    // Para páginas de Ramas (pimpollitos, alitas, etc.): la grilla fija permanece siempre visible
    grillas.forEach(grid => {
      grid.style.display = 'flex';
    });
  }
}

// 4. INICIALIZACIÓN DE EVENTOS AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
  const pestañas = document.querySelectorAll('.tabs-bar .tab-item');

  const pestañaInicial = document.querySelector('.tabs-bar .tab-item.active');
  if (pestañaInicial) {
    procesarPestaña(pestañaInicial);
  }

  pestañas.forEach(pestaña => {
    pestaña.addEventListener('click', (e) => {
      e.preventDefault();

      pestañas.forEach(p => p.classList.remove('active'));
      e.currentTarget.classList.add('active');

      procesarPestaña(e.currentTarget);
    });
  });

  function procesarPestaña(pestañaElem) {
    const tipo = pestañaElem.getAttribute('data-type');
    const targetGridId = pestañaElem.getAttribute('data-target-grid');

    // Muestra u oculta la grilla extra correspondiente
    mostrarGrillaRecursos(targetGridId);

    if (tipo === 'padlet') {
      const padletUrl = pestañaElem.getAttribute('data-padlet-url');
      cargarPadlet(padletUrl);
    } else {
      const folderId = pestañaElem.getAttribute('data-folder');
      if (folderId) cargarArchivosFolder(folderId);
    }
  }

  // INTERACCIÓN CON EL MODAL FLOTANTE (DELEGACIÓN DE EVENTOS)
  const modal = document.getElementById('resource-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-description');
  const modalLink = document.getElementById('modal-link');

  if (modal) {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.modal-card');
      if (card) {
        const imgSrc = card.getAttribute('data-img');
        const titleText = card.getAttribute('data-title');
        const descText = card.getAttribute('data-description');
        const linkUrl = card.getAttribute('data-link');
        const btnText = card.getAttribute('data-btn-text');

        if (modalImg) modalImg.src = imgSrc || '';
        if (modalTitle) modalTitle.textContent = titleText || '';
        if (modalDesc) modalDesc.innerHTML = descText || '';
        
        if (modalLink) {
          modalLink.href = linkUrl || '#';
          modalLink.textContent = btnText || 'Acceder al recurso';
        }

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });

    function closeModal() {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  }
});