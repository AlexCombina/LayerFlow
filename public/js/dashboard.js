/* ==========================================================================
   dashboard.js - Vista de resumen general.
   ========================================================================== */

const Dashboard = {
  async cargar() {
    const grid = document.getElementById('stats-grid');
    grid.innerHTML = '<p class="text-muted">Cargando estadisticas...</p>';

    try {
      const data = await Api.get('/dashboard/stats');
      this.pintarStats(data);
      this.pintarProximas(data.proximas_entregas);
      this.pintarRecientes(data.recientes);
    } catch (err) {
      grid.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  pintarStats(data) {
    const grid = document.getElementById('stats-grid');
    const t = data.totales;

    const tarjetas = [
      { label: 'Trabajos activos', valor: t.activos, color: 'var(--cyan)' },
      { label: 'Atrasados', valor: t.atrasados, color: 'var(--red)' },
      { label: 'Entregados este mes', valor: t.entregados_mes, color: 'var(--lime)' },
      { label: 'Ingresos del mes', valor: formatearMoneda(t.ingresos_mes), color: 'var(--yellow)' },
      { label: 'Total trabajos', valor: t.trabajos, color: 'var(--surface)' },
      { label: 'Clientes', valor: t.clientes, color: 'var(--surface)' },
      { label: 'Impresoras', valor: t.impresoras, color: 'var(--surface)' },
      { label: 'Pendientes', valor: data.por_estado.pendiente || 0, color: 'var(--surface)' },
    ];

    grid.innerHTML = tarjetas
      .map(
        (c) => `
        <div class="stat-card" style="background:${c.color};">
          <div class="stat-label">${escapeHtml(c.label)}</div>
          <div class="stat-value">${c.valor}</div>
        </div>`
      )
      .join('');
  },

  pintarProximas(items) {
    const cont = document.getElementById('dashboard-proximas');
    if (!items.length) {
      cont.innerHTML = '<p class="text-muted">No hay entregas programadas.</p>';
      return;
    }
    cont.innerHTML = items
      .map(
        (t) => `
        <div class="list-item">
          <div class="item-main">
            <div class="item-title">${escapeHtml(t.pieza)} <span class="text-muted">(${escapeHtml(t.codigo)})</span></div>
            <div class="item-sub">${escapeHtml(t.cliente_nombre || 'Sin cliente')} · Entrega: ${formatearFecha(t.fecha_estimada_entrega)}</div>
          </div>
          ${badgePrioridadHtml(t.prioridad)}
        </div>`
      )
      .join('');
  },

  pintarRecientes(items) {
    const cont = document.getElementById('dashboard-recientes');
    if (!items.length) {
      cont.innerHTML = '<p class="text-muted">Aun no hay trabajos registrados.</p>';
      return;
    }
    cont.innerHTML = items
      .map(
        (t) => `
        <div class="list-item">
          <div class="item-main">
            <div class="item-title">${escapeHtml(t.pieza)} <span class="text-muted">(${escapeHtml(t.codigo)})</span></div>
            <div class="item-sub">${escapeHtml(t.cliente_nombre || 'Sin cliente')}</div>
          </div>
          ${badgeEstadoHtml(t.estado)}
        </div>`
      )
      .join('');
  },
};
