/* ==========================================================================
   modelos3d.js - Buscador nativo de modelos 3D gratuitos (Thingiverse).
   Se abre como un modal secundario, independiente del modal generico de
   utils.js, para poder mostrarse encima del formulario de un trabajo sin
   cerrarlo.
   ========================================================================== */

const Modelos3D = {
  cache: new Map(),
  estado: { q: '', pagina: 1 },

  abrirBuscador(onSeleccionar) {
    this.cache.clear();
    this.estado = { q: '', pagina: 1 };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay modal-overlay-secundario';
    overlay.innerHTML = `
      <div class="modal modal-buscador-3d">
        <div class="modal-header">
          <h2>Buscar modelo 3D</h2>
          <button class="modal-close" data-cerrar>&times;</button>
        </div>
        <p class="text-muted" style="margin-top:-10px;">
          Resultados de Thingiverse (modelos gratuitos). Elegi uno para usarlo en el trabajo.
        </p>
        <form id="form-buscar-modelo" class="flex gap-sm" style="margin-bottom:16px;">
          <input type="text" id="m3d-input" placeholder="Ej: soporte celular, engranaje, maceta..." autofocus style="flex:1;" />
          <button type="submit" class="btn btn-yellow">Buscar</button>
        </form>
        <div id="m3d-resultados" class="modelo3d-grid"></div>
        <div class="text-center" style="margin-top:14px;">
          <button type="button" class="btn btn-sm hidden" id="m3d-cargar-mas">Cargar mas resultados</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cerrar = () => {
      overlay.remove();
      document.removeEventListener('keydown', alCancelar);
    };
    const alCancelar = (e) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', alCancelar);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) cerrar();
    });
    overlay.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrar));

    const input = overlay.querySelector('#m3d-input');
    const contenedor = overlay.querySelector('#m3d-resultados');
    const btnMas = overlay.querySelector('#m3d-cargar-mas');

    const buscar = async (esBusquedaNueva) => {
      const q = input.value.trim();
      if (!q) return;

      if (esBusquedaNueva) {
        this.estado.q = q;
        this.estado.pagina = 1;
        this.cache.clear();
        contenedor.innerHTML = '<div class="text-center" style="padding:30px;"><span class="spinner"></span></div>';
      } else {
        this.estado.pagina += 1;
      }

      try {
        const data = await Api.get(`/modelos3d/buscar?q=${encodeURIComponent(this.estado.q)}&page=${this.estado.pagina}`);
        if (esBusquedaNueva) contenedor.innerHTML = '';
        this.pintarResultados(contenedor, data.resultados);
        btnMas.classList.toggle('hidden', !data.hayMas);
      } catch (err) {
        if (esBusquedaNueva) contenedor.innerHTML = '';
        mostrarToast(err.message, 'error');
        btnMas.classList.add('hidden');
      }
    };

    overlay.querySelector('#form-buscar-modelo').addEventListener('submit', (e) => {
      e.preventDefault();
      buscar(true);
    });
    btnMas.addEventListener('click', () => buscar(false));

    contenedor.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-usar-id]');
      if (!btn) return;
      const modelo = this.cache.get(btn.dataset.usarId);
      if (!modelo) return;
      onSeleccionar(modelo);
      cerrar();
    });
  },

  pintarResultados(contenedor, resultados) {
    if (!resultados.length && !contenedor.children.length) {
      contenedor.innerHTML = '<div class="empty-state">Sin resultados. Proba con otras palabras.</div>';
      return;
    }

    resultados.forEach((m) => this.cache.set(String(m.id), m));

    const html = resultados
      .map(
        (m) => `
      <div class="modelo3d-card">
        <div class="modelo3d-thumb"${m.imagen ? ` style="background-image:url('${encodeURI(m.imagen)}')"` : ''}>
          ${!m.imagen ? '<span>🧊</span>' : ''}
        </div>
        <div class="modelo3d-info">
          <div class="modelo3d-nombre" title="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre)}</div>
          <div class="modelo3d-autor">${m.autor ? 'por ' + escapeHtml(m.autor) : '&nbsp;'}</div>
        </div>
        <button type="button" class="btn btn-sm btn-lime btn-block" data-usar-id="${m.id}">Usar este modelo</button>
      </div>`
      )
      .join('');

    contenedor.insertAdjacentHTML('beforeend', html);
  },
};
