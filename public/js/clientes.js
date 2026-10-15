/* ==========================================================================
   clientes.js - Listado, alta, edicion y detalle de clientes.
   ========================================================================== */

const Clientes = {
  cache: [],

  async cargar() {
    const buscar = document.getElementById('clientes-buscar');
    if (!buscar.dataset.wired) {
      buscar.addEventListener('input', debounce(() => this.cargar(), 300));
      buscar.dataset.wired = '1';
    }

    const q = buscar.value.trim();
    try {
      const data = await Api.get(`/clientes${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      this.cache = data.clientes;
      this.pintarTabla(data.clientes);
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },

  pintarTabla(clientes) {
    const tbody = document.getElementById('clientes-tbody');
    if (!clientes.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No hay clientes registrados todavia.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = clientes
      .map(
        (c) => `
        <tr class="row-clickable" data-id="${c.id}">
          <td><strong>${escapeHtml(c.nombre)}</strong></td>
          <td>${escapeHtml(c.email || '-')}</td>
          <td>${escapeHtml(c.telefono || '-')}</td>
          <td>${c.total_trabajos}</td>
          <td class="actions-cell">
            <button class="btn btn-icon btn-sm" data-editar="${c.id}" title="Editar">✎</button>
            <button class="btn btn-icon btn-sm btn-red" data-eliminar="${c.id}" title="Eliminar">✕</button>
          </td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-editar]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.abrirFormulario(Number(btn.dataset.editar));
      })
    );
    tbody.querySelectorAll('[data-eliminar]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.eliminar(Number(btn.dataset.eliminar));
      })
    );
    tbody.querySelectorAll('tr[data-id]').forEach((tr) =>
      tr.addEventListener('click', () => this.verDetalle(Number(tr.dataset.id)))
    );
  },

  abrirFormulario(id) {
    const cliente = id ? this.cache.find((c) => c.id === id) : null;
    const overlay = abrirModal(`
      <div class="modal-header">
        <h2>${cliente ? 'Editar cliente' : 'Nuevo cliente'}</h2>
        <button class="modal-close" data-cerrar>&times;</button>
      </div>
      <form id="form-cliente">
        <div class="field">
          <label for="cliente-nombre">Nombre *</label>
          <input type="text" id="cliente-nombre" required value="${escapeHtml(cliente?.nombre || '')}" />
        </div>
        <div class="form-row">
          <div class="field">
            <label for="cliente-email">Email</label>
            <input type="email" id="cliente-email" value="${escapeHtml(cliente?.email || '')}" />
          </div>
          <div class="field">
            <label for="cliente-telefono">Telefono</label>
            <input type="text" id="cliente-telefono" value="${escapeHtml(cliente?.telefono || '')}" />
          </div>
        </div>
        <div class="field">
          <label for="cliente-notas">Notas</label>
          <textarea id="cliente-notas">${escapeHtml(cliente?.notas || '')}</textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn-yellow">${cliente ? 'Guardar cambios' : 'Crear cliente'}</button>
        </div>
      </form>
    `);

    overlay.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarModal));

    document.getElementById('form-cliente').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        nombre: document.getElementById('cliente-nombre').value.trim(),
        email: document.getElementById('cliente-email').value.trim(),
        telefono: document.getElementById('cliente-telefono').value.trim(),
        notas: document.getElementById('cliente-notas').value.trim(),
      };
      try {
        if (cliente) {
          await Api.put(`/clientes/${cliente.id}`, payload);
          mostrarToast('Cliente actualizado.', 'success');
        } else {
          await Api.post('/clientes', payload);
          mostrarToast('Cliente creado.', 'success');
        }
        cerrarModal();
        this.cargar();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  },

  async verDetalle(id) {
    try {
      const { cliente, trabajos } = await Api.get(`/clientes/${id}`);
      abrirModal(`
        <div class="modal-header">
          <h2>${escapeHtml(cliente.nombre)}</h2>
          <button class="modal-close" data-cerrar>&times;</button>
        </div>
        <div class="detail-grid">
          <div><div class="d-label">Email</div><div class="d-value">${escapeHtml(cliente.email || '-')}</div></div>
          <div><div class="d-label">Telefono</div><div class="d-value">${escapeHtml(cliente.telefono || '-')}</div></div>
        </div>
        ${cliente.notas ? `<p class="text-muted">${escapeHtml(cliente.notas)}</p>` : ''}
        <h3>Trabajos (${trabajos.length})</h3>
        ${
          trabajos.length
            ? trabajos
                .map(
                  (t) => `
              <div class="list-item">
                <div class="item-main">
                  <div class="item-title">${escapeHtml(t.pieza)} <span class="text-muted">(${escapeHtml(t.codigo)})</span></div>
                  <div class="item-sub">Solicitado: ${formatearFecha(t.fecha_solicitud)}</div>
                </div>
                ${badgeEstadoHtml(t.estado)}
              </div>`
                )
                .join('')
            : '<p class="text-muted">Este cliente aun no tiene trabajos.</p>'
        }
        <div class="modal-footer">
          <button type="button" class="btn" data-cerrar>Cerrar</button>
        </div>
      `);
      document.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarModal));
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar este cliente? Solo es posible si no tiene trabajos asociados.')) return;
    try {
      await Api.delete(`/clientes/${id}`);
      mostrarToast('Cliente eliminado.', 'success');
      this.cargar();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },
};
