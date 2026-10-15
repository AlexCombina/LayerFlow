const { db } = require('../db/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const ESTADOS = [
  'pendiente',
  'en_cola',
  'imprimiendo',
  'post_procesado',
  'listo_entrega',
  'entregado',
  'cancelado',
];
const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'];

function generarCodigo() {
  const fila = db.prepare('SELECT MAX(id) AS maxId FROM trabajos').get();
  const siguiente = (fila.maxId || 0) + 1;
  return `TRB-${String(siguiente).padStart(4, '0')}`;
}

function trabajoConRelaciones(id) {
  const trabajo = db
    .prepare(
      `SELECT t.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_email,
              i.nombre AS impresora_nombre, u.nombre AS creado_por
       FROM trabajos t
       LEFT JOIN clientes c ON c.id = t.cliente_id
       LEFT JOIN impresoras i ON i.id = t.impresora_id
       LEFT JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.id = ?`
    )
    .get(id);
  return trabajo;
}

const listar = asyncHandler(async (req, res) => {
  const { estado, cliente_id, impresora_id, prioridad, q, atrasados } = req.query;

  const condiciones = [];
  const params = [];

  if (estado) {
    condiciones.push('t.estado = ?');
    params.push(estado);
  }
  if (cliente_id) {
    condiciones.push('t.cliente_id = ?');
    params.push(cliente_id);
  }
  if (impresora_id) {
    condiciones.push('t.impresora_id = ?');
    params.push(impresora_id);
  }
  if (prioridad) {
    condiciones.push('t.prioridad = ?');
    params.push(prioridad);
  }
  if (q) {
    condiciones.push('(t.pieza LIKE ? OR t.codigo LIKE ? OR c.nombre LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (atrasados === 'true') {
    condiciones.push(
      `t.fecha_estimada_entrega IS NOT NULL AND date(t.fecha_estimada_entrega) < date('now') AND t.estado NOT IN ('entregado', 'cancelado')`
    );
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const trabajos = db
    .prepare(
      `SELECT t.*, c.nombre AS cliente_nombre, i.nombre AS impresora_nombre
       FROM trabajos t
       LEFT JOIN clientes c ON c.id = t.cliente_id
       LEFT JOIN impresoras i ON i.id = t.impresora_id
       ${where}
       ORDER BY
         CASE t.prioridad WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
         t.created_at DESC`
    )
    .all(...params);

  res.json({ trabajos });
});

const obtener = asyncHandler(async (req, res) => {
  const trabajo = trabajoConRelaciones(req.params.id);
  if (!trabajo) {
    throw new ApiError(404, 'Trabajo no encontrado.');
  }

  const historial = db
    .prepare(
      `SELECT h.*, u.nombre AS usuario_nombre
       FROM trabajo_historial h
       LEFT JOIN usuarios u ON u.id = h.usuario_id
       WHERE h.trabajo_id = ?
       ORDER BY h.fecha ASC`
    )
    .all(trabajo.id);

  res.json({ trabajo, historial });
});

const crear = asyncHandler(async (req, res) => {
  const {
    cliente_id,
    impresora_id,
    pieza,
    descripcion,
    material,
    color,
    cantidad,
    prioridad,
    fecha_solicitud,
    fecha_estimada_entrega,
    peso_gramos,
    horas_estimadas,
    costo,
    archivo_referencia,
    imagen_modelo,
    notas,
  } = req.body;

  if (!cliente_id) throw new ApiError(400, 'Debes seleccionar un cliente.');
  if (!pieza || !pieza.trim()) throw new ApiError(400, 'El nombre de la pieza es obligatorio.');
  if (prioridad && !PRIORIDADES.includes(prioridad)) {
    throw new ApiError(400, `Prioridad invalida. Usa uno de: ${PRIORIDADES.join(', ')}`);
  }

  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(cliente_id);
  if (!cliente) throw new ApiError(400, 'El cliente indicado no existe.');

  if (impresora_id) {
    const impresora = db.prepare('SELECT id FROM impresoras WHERE id = ?').get(impresora_id);
    if (!impresora) throw new ApiError(400, 'La impresora indicada no existe.');
  }

  const codigo = generarCodigo();
  const solicitud = fecha_solicitud || new Date().toISOString().slice(0, 10);

  const info = db
    .prepare(
      `INSERT INTO trabajos (
        codigo, cliente_id, impresora_id, usuario_id, pieza, descripcion, material, color,
        cantidad, prioridad, estado, fecha_solicitud, fecha_estimada_entrega,
        peso_gramos, horas_estimadas, costo, archivo_referencia, imagen_modelo, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      codigo,
      cliente_id,
      impresora_id || null,
      req.usuario.id,
      pieza.trim(),
      descripcion || null,
      material || null,
      color || null,
      cantidad ? Number(cantidad) : 1,
      prioridad || 'media',
      solicitud,
      fecha_estimada_entrega || null,
      peso_gramos ? Number(peso_gramos) : null,
      horas_estimadas ? Number(horas_estimadas) : null,
      costo ? Number(costo) : null,
      archivo_referencia || null,
      imagen_modelo || null,
      notas || null
    );

  db.prepare(
    `INSERT INTO trabajo_historial (trabajo_id, estado_anterior, estado_nuevo, usuario_id, nota)
     VALUES (?, NULL, 'pendiente', ?, 'Trabajo registrado')`
  ).run(info.lastInsertRowid, req.usuario.id);

  const trabajo = trabajoConRelaciones(info.lastInsertRowid);
  res.status(201).json({ trabajo });
});

const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const trabajo = db.prepare('SELECT * FROM trabajos WHERE id = ?').get(id);
  if (!trabajo) throw new ApiError(404, 'Trabajo no encontrado.');

  const {
    cliente_id,
    impresora_id,
    pieza,
    descripcion,
    material,
    color,
    cantidad,
    prioridad,
    fecha_solicitud,
    fecha_estimada_entrega,
    peso_gramos,
    horas_estimadas,
    costo,
    archivo_referencia,
    imagen_modelo,
    notas,
  } = req.body;

  if (prioridad && !PRIORIDADES.includes(prioridad)) {
    throw new ApiError(400, `Prioridad invalida. Usa uno de: ${PRIORIDADES.join(', ')}`);
  }
  if (pieza !== undefined && !pieza.trim()) {
    throw new ApiError(400, 'El nombre de la pieza no puede estar vacio.');
  }
  if (cliente_id) {
    const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(cliente_id);
    if (!cliente) throw new ApiError(400, 'El cliente indicado no existe.');
  }
  if (impresora_id) {
    const impresora = db.prepare('SELECT id FROM impresoras WHERE id = ?').get(impresora_id);
    if (!impresora) throw new ApiError(400, 'La impresora indicada no existe.');
  }

  db.prepare(
    `UPDATE trabajos SET
      cliente_id = ?, impresora_id = ?, pieza = ?, descripcion = ?, material = ?, color = ?,
      cantidad = ?, prioridad = ?, fecha_solicitud = ?, fecha_estimada_entrega = ?,
      peso_gramos = ?, horas_estimadas = ?, costo = ?, archivo_referencia = ?, imagen_modelo = ?, notas = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    cliente_id !== undefined ? cliente_id : trabajo.cliente_id,
    impresora_id !== undefined ? (impresora_id || null) : trabajo.impresora_id,
    pieza !== undefined ? pieza.trim() : trabajo.pieza,
    descripcion !== undefined ? descripcion : trabajo.descripcion,
    material !== undefined ? material : trabajo.material,
    color !== undefined ? color : trabajo.color,
    cantidad !== undefined ? Number(cantidad) : trabajo.cantidad,
    prioridad || trabajo.prioridad,
    fecha_solicitud !== undefined ? fecha_solicitud : trabajo.fecha_solicitud,
    fecha_estimada_entrega !== undefined ? fecha_estimada_entrega : trabajo.fecha_estimada_entrega,
    peso_gramos !== undefined ? Number(peso_gramos) : trabajo.peso_gramos,
    horas_estimadas !== undefined ? Number(horas_estimadas) : trabajo.horas_estimadas,
    costo !== undefined ? Number(costo) : trabajo.costo,
    archivo_referencia !== undefined ? archivo_referencia : trabajo.archivo_referencia,
    imagen_modelo !== undefined ? imagen_modelo : trabajo.imagen_modelo,
    notas !== undefined ? notas : trabajo.notas,
    id
  );

  res.json({ trabajo: trabajoConRelaciones(id) });
});

const cambiarEstado = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { estado, nota } = req.body;

  const trabajo = db.prepare('SELECT * FROM trabajos WHERE id = ?').get(id);
  if (!trabajo) throw new ApiError(404, 'Trabajo no encontrado.');

  if (!estado || !ESTADOS.includes(estado)) {
    throw new ApiError(400, `Estado invalido. Usa uno de: ${ESTADOS.join(', ')}`);
  }

  const fechaEntregaReal =
    estado === 'entregado' ? new Date().toISOString().slice(0, 10) : trabajo.fecha_entrega_real;

  db.prepare(
    `UPDATE trabajos SET estado = ?, fecha_entrega_real = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(estado, fechaEntregaReal, id);

  db.prepare(
    `INSERT INTO trabajo_historial (trabajo_id, estado_anterior, estado_nuevo, usuario_id, nota)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, trabajo.estado, estado, req.usuario.id, nota || null);

  res.json({ trabajo: trabajoConRelaciones(id) });
});

const eliminar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const trabajo = db.prepare('SELECT * FROM trabajos WHERE id = ?').get(id);
  if (!trabajo) throw new ApiError(404, 'Trabajo no encontrado.');

  db.prepare('DELETE FROM trabajos WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar };
