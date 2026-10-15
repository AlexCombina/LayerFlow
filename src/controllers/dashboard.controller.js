const { db } = require('../db/database');
const asyncHandler = require('../utils/asyncHandler');

const stats = asyncHandler(async (req, res) => {
  const porEstado = db
    .prepare('SELECT estado, COUNT(*) AS total FROM trabajos GROUP BY estado')
    .all();

  const totalTrabajos = db.prepare('SELECT COUNT(*) AS total FROM trabajos').get().total;
  const totalClientes = db.prepare('SELECT COUNT(*) AS total FROM clientes').get().total;
  const totalImpresoras = db.prepare('SELECT COUNT(*) AS total FROM impresoras').get().total;

  const atrasados = db
    .prepare(
      `SELECT COUNT(*) AS total FROM trabajos
       WHERE fecha_estimada_entrega IS NOT NULL
         AND date(fecha_estimada_entrega) < date('now')
         AND estado NOT IN ('entregado', 'cancelado')`
    )
    .get().total;

  const activos = db
    .prepare(`SELECT COUNT(*) AS total FROM trabajos WHERE estado NOT IN ('entregado', 'cancelado')`)
    .get().total;

  const entregadosMes = db
    .prepare(
      `SELECT COUNT(*) AS total FROM trabajos
       WHERE estado = 'entregado' AND strftime('%Y-%m', fecha_entrega_real) = strftime('%Y-%m', 'now')`
    )
    .get().total;

  const ingresosMes = db
    .prepare(
      `SELECT COALESCE(SUM(costo), 0) AS total FROM trabajos
       WHERE estado = 'entregado' AND strftime('%Y-%m', fecha_entrega_real) = strftime('%Y-%m', 'now')`
    )
    .get().total;

  const proximasEntregas = db
    .prepare(
      `SELECT t.id, t.codigo, t.pieza, t.fecha_estimada_entrega, t.estado, t.prioridad, c.nombre AS cliente_nombre
       FROM trabajos t
       LEFT JOIN clientes c ON c.id = t.cliente_id
       WHERE t.estado NOT IN ('entregado', 'cancelado') AND t.fecha_estimada_entrega IS NOT NULL
       ORDER BY date(t.fecha_estimada_entrega) ASC
       LIMIT 6`
    )
    .all();

  const recientes = db
    .prepare(
      `SELECT t.id, t.codigo, t.pieza, t.estado, t.prioridad, t.created_at, c.nombre AS cliente_nombre
       FROM trabajos t
       LEFT JOIN clientes c ON c.id = t.cliente_id
       ORDER BY t.created_at DESC
       LIMIT 6`
    )
    .all();

  const porEstadoMap = Object.fromEntries(porEstado.map((e) => [e.estado, e.total]));

  res.json({
    totales: {
      trabajos: totalTrabajos,
      clientes: totalClientes,
      impresoras: totalImpresoras,
      activos,
      atrasados,
      entregados_mes: entregadosMes,
      ingresos_mes: ingresosMes,
    },
    por_estado: porEstadoMap,
    proximas_entregas: proximasEntregas,
    recientes,
  });
});

module.exports = { stats };
