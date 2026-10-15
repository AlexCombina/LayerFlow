/* ==========================================================================
   utils.js - Helpers compartidos: toasts, formateo, mapas de etiquetas.
   ========================================================================== */

const ESTADOS_TRABAJO = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'en_cola', etiqueta: 'En cola' },
  { valor: 'imprimiendo', etiqueta: 'Imprimiendo' },
  { valor: 'post_procesado', etiqueta: 'Post-procesado' },
  { valor: 'listo_entrega', etiqueta: 'Listo para entrega' },
  { valor: 'entregado', etiqueta: 'Entregado' },
  { valor: 'cancelado', etiqueta: 'Cancelado' },
];

const PRIORIDADES_TRABAJO = [
  { valor: 'baja', etiqueta: 'Baja' },
  { valor: 'media', etiqueta: 'Media' },
  { valor: 'alta', etiqueta: 'Alta' },
  { valor: 'urgente', etiqueta: 'Urgente' },
];

function etiquetaEstado(valor) {
  const item = ESTADOS_TRABAJO.find((e) => e.valor === valor);
  return item ? item.etiqueta : valor;
}

function etiquetaPrioridad(valor) {
  const item = PRIORIDADES_TRABAJO.find((p) => p.valor === valor);
  return item ? item.etiqueta : valor;
}

function badgeEstadoHtml(estado) {
  return `<span class="badge badge-${estado}">${escapeHtml(etiquetaEstado(estado))}</span>`;
}

function badgePrioridadHtml(prioridad) {
  return `<span class="badge badge-${prioridad}">${escapeHtml(etiquetaPrioridad(prioridad))}</span>`;
}

function escapeHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatearFecha(fecha) {
  if (!fecha) return '-';
  const partes = fecha.split(/[-T ]/);
  if (partes.length >= 3) {
    const [anio, mes, dia] = partes;
    return `${dia}/${mes}/${anio}`;
  }
  return fecha;
}

function formatearFechaHora(fecha) {
  if (!fecha) return '-';
  try {
    const d = new Date(fecha.replace(' ', 'T') + (fecha.includes('Z') ? '' : 'Z'));
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    return fecha;
  }
}

function formatearMoneda(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '-';
  return `$${numero.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function estaAtrasado(trabajo) {
  if (!trabajo.fecha_estimada_entrega) return false;
  if (['entregado', 'cancelado'].includes(trabajo.estado)) return false;
  const hoy = new Date().toISOString().slice(0, 10);
  return trabajo.fecha_estimada_entrega < hoy;
}

function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/* ---------------------------------------------------------------------- */
/* Toasts                                                                   */
/* ---------------------------------------------------------------------- */

function obtenerContenedorToast() {
  let contenedor = document.querySelector('.toast-container');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.className = 'toast-container';
    document.body.appendChild(contenedor);
  }
  return contenedor;
}

function mostrarToast(mensaje, tipo = 'info') {
  const contenedor = obtenerContenedorToast();
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

/* ---------------------------------------------------------------------- */
/* Modal generico                                                          */
/* ---------------------------------------------------------------------- */

function abrirModal(innerHtml, { onClose } = {}) {
  cerrarModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${innerHtml}</div>`;

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      cerrarModal();
      if (onClose) onClose();
    }
  });

  document.body.appendChild(overlay);
  document.addEventListener('keydown', escCierraModal);

  return overlay;
}

function escCierraModal(e) {
  if (e.key === 'Escape') {
    cerrarModal();
  }
}

function cerrarModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', escCierraModal);
}
