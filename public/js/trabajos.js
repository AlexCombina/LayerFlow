/* ==========================================================================
   trabajos.js - Listado, alta, edicion, detalle y cambio de estado
   de los trabajos de impresion 3D.
   ========================================================================== */

const Trabajos = {
  cache: [],
  filtrosListos: false,

  async cargar() {
    this.prepararFiltros();

    const params = new URLSearchParams();
    const q = document.getElementById('trabajos-buscar').value.trim();
    const estado = document.getElementById('trabajos-filtro-estado').value;
    const prioridad = document.getElementById('trabajos-filtro-prioridad').value;
    const atrasados = document.getElementById('trabajos-filtro-atrasados').checked;

    if (q) params.set('q', q);
    if (estado) params.set('estado', estado);
    if (prioridad) params.set('prioridad', prioridad);
    if (atrasados) params.set('atrasados', 'true');

    try {
      const data = await Api.get(`/trabajos?${params.toString()}`);
      this.cache = data.trabajos;
      this.pintarTabla(data.trabajos);
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },

  prepararFiltros() {
    if (this.filtrosListos) return;
    this.filtrosListos = true;

    const selEstado = document.getElementById('trabajos-filtro-estado');
    ESTADOS_TRABAJO.forEach((e) => {
      const opt = document.createElement('option');
      opt.value = e.valor;
      opt.textContent = e.etiqueta;
      selEstado.appendChild(opt);
    });

    const selPrioridad = document.getElementById('trabajos-filtro-prioridad');
    PRIORIDADES_TRABAJO.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.valor;
      opt.textContent = p.etiqueta;
      selPrioridad.appendChild(opt);
    });

    document.getElementById('trabajos-buscar').addEventListener('input', debounce(() => this.cargar(), 300));
    selEstado.addEventListener('change', () => this.cargar());
    selPrioridad.addEventListener('change', () => this.cargar());
    document.getElementById('trabajos-filtro-atrasados').addEventListener('change', () => this.cargar());
  },

  pintarTabla(trabajos) {
    const tbody = document.getElementById('trabajos-tbody');
    if (!trabajos.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No se encontraron trabajos con esos filtros.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = trabajos
      .map((t) => {
        const atrasado = estaAtrasado(t);
        return `
        <tr class="row-clickable" data-id="${t.id}">
          <td class="code-cell">${escapeHtml(t.codigo)}</td>
          <td>${escapeHtml(t.pieza)} ${t.cantidad > 1 ? `<span class="text-muted">x${t.cantidad}</span>` : ''}</td>
          <td>${escapeHtml(t.cliente_nombre || '-')}</td>
          <td>${badgeEstadoHtml(t.estado)}</td>
          <td>${badgePrioridadHtml(t.prioridad)}</td>
          <td>${formatearFecha(t.fecha_estimada_entrega)} ${atrasado ? '<span class="badge badge-cancelado">Atrasado</span>' : ''}</td>
          <td class="actions-cell">
            <button class="btn btn-icon btn-sm btn-red" data-eliminar="${t.id}" title="Eliminar">✕</button>
          </td>
        </tr>`;
      })
      .join('');

    tbody.querySelectorAll('tr[data-id]').forEach((tr) =>
      tr.addEventListener('click', (e) => {
        if (e.target.closest('[data-eliminar]')) return;
        this.verDetalle(Number(tr.dataset.id));
      })
    );
    tbody.querySelectorAll('[data-eliminar]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.eliminar(Number(btn.dataset.eliminar));
      })
    );
  },

  async obtenerClientesEImpresoras() {
    const [clientesRes, impresorasRes] = await Promise.all([Api.get('/clientes'), Api.get('/impresoras')]);
    return { clientes: clientesRes.clientes, impresoras: impresorasRes.impresoras };
  },

  async abrirFormulario(id) {
    let trabajo = null;
    if (id) {
      const data = await Api.get(`/trabajos/${id}`);
      trabajo = data.trabajo;
    }

    let clientes = [];
    let impresoras = [];
    try {
      const relaciones = await this.obtenerClientesEImpresoras();
      clientes = relaciones.clientes;
      impresoras = relaciones.impresoras;
    } catch (err) {
      mostrarToast(err.message, 'error');
      return;
    }

    if (!clientes.length) {
      mostrarToast('Primero registra al menos un cliente.', 'info');
      Clientes.abrirFormulario();
      return;
    }

    const overlay = abrirModal(`
      <div class="modal-header">
        <h2>${trabajo ? `Editar ${escapeHtml(trabajo.codigo)}` : 'Nuevo trabajo'}</h2>
        <button class="modal-close" data-cerrar>&times;</button>
      </div>
      <form id="form-trabajo">
        <div class="form-row">
          <div class="field">
            <label for="t-cliente">Cliente *</label>
            <select id="t-cliente" required>
              ${clientes
                .map((c) => `<option value="${c.id}" ${trabajo?.cliente_id === c.id ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <label for="t-impresora">Impresora</label>
            <select id="t-impresora">
              <option value="">Sin asignar</option>
              ${impresoras
                .map((i) => `<option value="${i.id}" ${trabajo?.impresora_id === i.id ? 'selected' : ''}>${escapeHtml(i.nombre)}</option>`)
                .join('')}
            </select>
          </div>
        </div>

        <div class="field">
          <label for="t-pieza">Nombre de la pieza *</label>
          <input type="text" id="t-pieza" required value="${escapeHtml(trabajo?.pieza || '')}" placeholder="Ej: Soporte para telefono" />
        </div>

        <div class="field">
          <label for="t-descripcion">Descripcion</label>
          <textarea id="t-descripcion">${escapeHtml(trabajo?.descripcion || '')}</textarea>
        </div>

        <div class="form-row-3">
          <div class="field">
            <label for="t-material">Material</label>
            <input type="text" id="t-material" value="${escapeHtml(trabajo?.material || '')}" placeholder="PLA, ABS, PETG..." />
          </div>
          <div class="field">
            <label for="t-color">Color</label>
            <input type="text" id="t-color" value="${escapeHtml(trabajo?.color || '')}" />
          </div>
          <div class="field">
            <label for="t-cantidad">Cantidad</label>
            <input type="number" id="t-cantidad" min="1" value="${trabajo?.cantidad || 1}" />
          </div>
        </div>

        <div class="form-row-3">
          <div class="field">
            <label for="t-prioridad">Prioridad</label>
            <select id="t-prioridad">
              ${PRIORIDADES_TRABAJO.map(
                (p) => `<option value="${p.valor}" ${(trabajo?.prioridad || 'media') === p.valor ? 'selected' : ''}>${p.etiqueta}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field">
            <label for="t-fecha-solicitud">Fecha de solicitud</label>
            <input type="date" id="t-fecha-solicitud" value="${trabajo?.fecha_solicitud || new Date().toISOString().slice(0, 10)}" />
          </div>
          <div class="field">
            <label for="t-fecha-estimada">Entrega estimada</label>
            <input type="date" id="t-fecha-estimada" value="${trabajo?.fecha_estimada_entrega || ''}" />
          </div>
        </div>

        <div class="form-row-3">
          <div class="field">
            <label for="t-peso">Peso (g)</label>
            <input type="number" step="0.1" id="t-peso" value="${trabajo?.peso_gramos ?? ''}" />
          </div>
          <div class="field">
            <label for="t-horas">Horas estimadas</label>
            <input type="number" step="0.1" id="t-horas" value="${trabajo?.horas_estimadas ?? ''}" />
          </div>
          <div class="field">
            <label for="t-costo">Costo</label>
            <input type="number" step="0.01" id="t-costo" value="${trabajo?.costo ?? ''}" />
          </div>
        </div>

        <div class="field">
          <label for="t-archivo">Referencia de archivo (link o nombre del STL)</label>
          <div class="flex gap-sm">
            <input type="text" id="t-archivo" value="${escapeHtml(trabajo?.archivo_referencia || '')}" style="flex:1;" />
            <button type="button" class="btn btn-sm btn-cyan" id="t-buscar-modelo">🔍 Buscar modelo 3D</button>
          </div>
          <input type="hidden" id="t-imagen-modelo" value="${escapeHtml(trabajo?.imagen_modelo || '')}" />
          <div id="t-modelo-preview" class="modelo3d-preview ${trabajo?.imagen_modelo ? '' : 'hidden'}">
            ${trabajo?.imagen_modelo ? `<img src="${escapeHtml(trabajo.imagen_modelo)}" alt="" /><span>Modelo seleccionado</span>` : ''}
          </div>
        </div>

        <div class="field">
          <label for="t-notas">Notas</label>
          <textarea id="t-notas">${escapeHtml(trabajo?.notas || '')}</textarea>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn-yellow">${trabajo ? 'Guardar cambios' : 'Crear trabajo'}</button>
        </div>
      </form>
    `);

    overlay.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarModal));

    document.getElementById('t-buscar-modelo').addEventListener('click', () => {
      Modelos3D.abrirBuscador((modelo) => {
        document.getElementById('t-archivo').value = modelo.url || '';
        document.getElementById('t-imagen-modelo').value = modelo.imagen || '';

        const campoPieza = document.getElementById('t-pieza');
        if (!campoPieza.value.trim()) campoPieza.value = modelo.nombre || '';

        const preview = document.getElementById('t-modelo-preview');
        if (modelo.imagen) {
          preview.innerHTML = `<img src="${escapeHtml(modelo.imagen)}" alt="" /><span>${escapeHtml(modelo.nombre)}</span>`;
          preview.classList.remove('hidden');
        } else {
          preview.innerHTML = '';
          preview.classList.add('hidden');
        }

        mostrarToast('Modelo agregado al trabajo.', 'success');
      });
    });

    document.getElementById('form-trabajo').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        cliente_id: Number(document.getElementById('t-cliente').value),
        impresora_id: document.getElementById('t-impresora').value || null,
        pieza: document.getElementById('t-pieza').value.trim(),
        descripcion: document.getElementById('t-descripcion').value.trim(),
        material: document.getElementById('t-material').value.trim(),
        color: document.getElementById('t-color').value.trim(),
        cantidad: Number(document.getElementById('t-cantidad').value) || 1,
        prioridad: document.getElementById('t-prioridad').value,
        fecha_solicitud: document.getElementById('t-fecha-solicitud').value,
        fecha_estimada_entrega: document.getElementById('t-fecha-estimada').value || null,
        peso_gramos: document.getElementById('t-peso').value || null,
        horas_estimadas: document.getElementById('t-horas').value || null,
        costo: document.getElementById('t-costo').value || null,
        archivo_referencia: document.getElementById('t-archivo').value.trim(),
        imagen_modelo: document.getElementById('t-imagen-modelo').value.trim(),
        notas: document.getElementById('t-notas').value.trim(),
      };

      try {
        if (trabajo) {
          await Api.put(`/trabajos/${trabajo.id}`, payload);
          mostrarToast('Trabajo actualizado.', 'success');
        } else {
          await Api.post('/trabajos', payload);
          mostrarToast('Trabajo registrado.', 'success');
        }
        cerrarModal();
        this.cargar();
        if (typeof Dashboard !== 'undefined') Dashboard.cargar();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  },

  async verDetalle(id) {
    try {
      const { trabajo, historial } = await Api.get(`/trabajos/${id}`);
      this.pintarDetalle(trabajo, historial);
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },

  pintarDetalle(trabajo, historial) {
    const siguientesEstados = ESTADOS_TRABAJO.filter((e) => e.valor !== trabajo.estado);

    const overlay = abrirModal(`
      <div class="modal-header">
        <div>
          <h2>${escapeHtml(trabajo.pieza)}</h2>
          <span class="text-muted code-cell">${escapeHtml(trabajo.codigo)}</span>
        </div>
        <button class="modal-close" data-cerrar>&times;</button>
      </div>

      <div class="flex gap-sm" style="margin-bottom:14px;">
        ${badgeEstadoHtml(trabajo.estado)}
        ${badgePrioridadHtml(trabajo.prioridad)}
        ${estaAtrasado(trabajo) ? '<span class="badge badge-cancelado">Atrasado</span>' : ''}
      </div>

      <div class="detail-grid">
        <div><div class="d-label">Cliente</div><div class="d-value">${escapeHtml(trabajo.cliente_nombre || '-')}</div></div>
        <div><div class="d-label">Impresora</div><div class="d-value">${escapeHtml(trabajo.impresora_nombre || 'Sin asignar')}</div></div>
        <div><div class="d-label">Material / Color</div><div class="d-value">${escapeHtml(trabajo.material || '-')} ${trabajo.color ? '· ' + escapeHtml(trabajo.color) : ''}</div></div>
        <div><div class="d-label">Cantidad</div><div class="d-value">${trabajo.cantidad}</div></div>
        <div><div class="d-label">Solicitud</div><div class="d-value">${formatearFecha(trabajo.fecha_solicitud)}</div></div>
        <div><div class="d-label">Entrega estimada</div><div class="d-value">${formatearFecha(trabajo.fecha_estimada_entrega)}</div></div>
        <div><div class="d-label">Entrega real</div><div class="d-value">${formatearFecha(trabajo.fecha_entrega_real)}</div></div>
        <div><div class="d-label">Costo</div><div class="d-value">${formatearMoneda(trabajo.costo)}</div></div>
        <div><div class="d-label">Peso</div><div class="d-value">${trabajo.peso_gramos ? trabajo.peso_gramos + ' g' : '-'}</div></div>
        <div><div class="d-label">Horas estimadas</div><div class="d-value">${trabajo.horas_estimadas || '-'}</div></div>
      </div>

      ${trabajo.imagen_modelo ? `<div class="modelo3d-preview" style="margin-bottom:14px;"><img src="${escapeHtml(trabajo.imagen_modelo)}" alt="" /><span>Modelo de referencia</span></div>` : ''}

      ${trabajo.descripcion ? `<p><strong>Descripcion:</strong> ${escapeHtml(trabajo.descripcion)}</p>` : ''}
      ${trabajo.notas ? `<p><strong>Notas:</strong> ${escapeHtml(trabajo.notas)}</p>` : ''}
      ${trabajo.archivo_referencia ? `<p><strong>Archivo:</strong> ${escapeHtml(trabajo.archivo_referencia)}</p>` : ''}

      <h3>Cambiar estado</h3>
      <div class="status-actions">
        ${siguientesEstados
          .map((e) => `<button class="btn btn-sm" data-estado="${e.valor}">${e.etiqueta}</button>`)
          .join('')}
      </div>

      <h3>Historial</h3>
      <div class="timeline">
        ${historial
          .map(
            (h) => `
          <div class="timeline-item">
            <span class="t-dot"></span>
            <div>
              <div><strong>${escapeHtml(etiquetaEstado(h.estado_nuevo))}</strong> ${h.usuario_nombre ? `por ${escapeHtml(h.usuario_nombre)}` : ''}</div>
              ${h.nota ? `<div>${escapeHtml(h.nota)}</div>` : ''}
              <div class="t-when">${formatearFechaHora(h.fecha)}</div>
            </div>
          </div>`
          )
          .join('')}
      </div>

      <div class="modal-footer">
        <button type="button" class="btn" data-cerrar>Cerrar</button>
        <button type="button" class="btn btn-cyan" data-editar>Editar trabajo</button>
      </div>
    `);

    overlay.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarModal));

    overlay.querySelector('[data-editar]').addEventListener('click', () => {
      cerrarModal();
      this.abrirFormulario(trabajo.id);
    });

    overlay.querySelectorAll('[data-estado]').forEach((btn) => {
      btn.addEventListener('click', () => this.cambiarEstado(trabajo.id, btn.dataset.estado));
    });
  },

  async cambiarEstado(id, estado) {
    const nota = prompt(`Nota para el cambio a "${etiquetaEstado(estado)}" (opcional):`, '');
    if (nota === null) return;

    try {
      await Api.patch(`/trabajos/${id}/estado`, { estado, nota: nota || undefined });
      mostrarToast('Estado actualizado.', 'success');
      cerrarModal();
      this.cargar();
      if (typeof Dashboard !== 'undefined') Dashboard.cargar();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar este trabajo? Esta accion no se puede deshacer.')) return;
    try {
      await Api.delete(`/trabajos/${id}`);
      mostrarToast('Trabajo eliminado.', 'success');
      this.cargar();
      if (typeof Dashboard !== 'undefined') Dashboard.cargar();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },
};
