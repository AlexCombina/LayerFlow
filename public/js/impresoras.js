/* ==========================================================================
   impresoras.js - Listado, alta y edicion del parque de impresoras.
   ========================================================================== */

const ESTADOS_IMPRESORA = [
  { valor: 'disponible', etiqueta: 'Disponible' },
  { valor: 'ocupada', etiqueta: 'Ocupada' },
  { valor: 'mantenimiento', etiqueta: 'Mantenimiento' },
  { valor: 'fuera_de_servicio', etiqueta: 'Fuera de servicio' },
];

const COLOR_ESTADO_IMPRESORA = {
  disponible: 'var(--lime)',
  ocupada: 'var(--yellow)',
  mantenimiento: 'var(--orange)',
  fuera_de_servicio: 'var(--red)',
};

const Impresoras = {
  cache: [],

  async cargar() {
    try {
      const data = await Api.get('/impresoras');
      this.cache = data.impresoras;
      this.pintarTabla(data.impresoras);
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },

  pintarTabla(impresoras) {
    const tbody = document.getElementById('impresoras-tbody');
    if (!impresoras.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No hay impresoras registradas todavia.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = impresoras
      .map((i) => {
        const etiqueta = ESTADOS_IMPRESORA.find((e) => e.valor === i.estado)?.etiqueta || i.estado;
        const color = COLOR_ESTADO_IMPRESORA[i.estado] || 'var(--surface)';
        return `
        <tr>
          <td><strong>${escapeHtml(i.nombre)}</strong></td>
          <td>${escapeHtml(i.modelo || '-')}</td>
          <td><span class="badge" style="background:${color};">${escapeHtml(etiqueta)}</span></td>
          <td>${i.trabajos_activos}</td>
          <td class="actions-cell">
            <button class="btn btn-icon btn-sm" data-editar="${i.id}" title="Editar">✎</button>
            <button class="btn btn-icon btn-sm btn-red" data-eliminar="${i.id}" title="Eliminar">✕</button>
          </td>
        </tr>`;
      })
      .join('');

    tbody.querySelectorAll('[data-editar]').forEach((btn) =>
      btn.addEventListener('click', () => this.abrirFormulario(Number(btn.dataset.editar)))
    );
    tbody.querySelectorAll('[data-eliminar]').forEach((btn) =>
      btn.addEventListener('click', () => this.eliminar(Number(btn.dataset.eliminar)))
    );
  },

  abrirFormulario(id) {
    const impresora = id ? this.cache.find((i) => i.id === id) : null;
    const overlay = abrirModal(`
      <div class="modal-header">
        <h2>${impresora ? 'Editar impresora' : 'Nueva impresora'}</h2>
        <button class="modal-close" data-cerrar>&times;</button>
      </div>
      <form id="form-impresora">
        <div class="field">
          <label for="imp-nombre">Nombre *</label>
          <input type="text" id="imp-nombre" required value="${escapeHtml(impresora?.nombre || '')}" placeholder="Ej: Ender 3 #1" />
        </div>
        <div class="form-row">
          <div class="field">
            <label for="imp-modelo">Modelo</label>
            <input type="text" id="imp-modelo" value="${escapeHtml(impresora?.modelo || '')}" />
          </div>
          <div class="field">
            <label for="imp-estado">Estado</label>
            <select id="imp-estado">
              ${ESTADOS_IMPRESORA.map(
                (e) => `<option value="${e.valor}" ${impresora?.estado === e.valor ? 'selected' : ''}>${e.etiqueta}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label for="imp-notas">Notas</label>
          <textarea id="imp-notas">${escapeHtml(impresora?.notas || '')}</textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn-yellow">${impresora ? 'Guardar cambios' : 'Crear impresora'}</button>
        </div>
      </form>
    `);

    overlay.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarModal));

    document.getElementById('form-impresora').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        nombre: document.getElementById('imp-nombre').value.trim(),
        modelo: document.getElementById('imp-modelo').value.trim(),
        estado: document.getElementById('imp-estado').value,
        notas: document.getElementById('imp-notas').value.trim(),
      };
      try {
        if (impresora) {
          await Api.put(`/impresoras/${impresora.id}`, payload);
          mostrarToast('Impresora actualizada.', 'success');
        } else {
          await Api.post('/impresoras', payload);
          mostrarToast('Impresora creada.', 'success');
        }
        cerrarModal();
        this.cargar();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar esta impresora? Los trabajos asociados quedaran sin impresora asignada.')) return;
    try {
      await Api.delete(`/impresoras/${id}`);
      mostrarToast('Impresora eliminada.', 'success');
      this.cargar();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },
};
