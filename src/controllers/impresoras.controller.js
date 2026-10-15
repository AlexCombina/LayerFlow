const { db } = require('../db/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const ESTADOS_VALIDOS = ['disponible', 'ocupada', 'mantenimiento', 'fuera_de_servicio'];

const listar = asyncHandler(async (req, res) => {
  const impresoras = db.prepare('SELECT * FROM impresoras ORDER BY nombre COLLATE NOCASE ASC').all();

  const activos = db
    .prepare(
      `SELECT impresora_id, COUNT(*) AS total FROM trabajos
       WHERE impresora_id IS NOT NULL AND estado NOT IN ('entregado', 'cancelado')
       GROUP BY impresora_id`
    )
    .all();
  const activosMap = Object.fromEntries(activos.map((a) => [a.impresora_id, a.total]));

  res.json({
    impresoras: impresoras.map((i) => ({ ...i, trabajos_activos: activosMap[i.id] || 0 })),
  });
});

const obtener = asyncHandler(async (req, res) => {
  const impresora = db.prepare('SELECT * FROM impresoras WHERE id = ?').get(req.params.id);
  if (!impresora) {
    throw new ApiError(404, 'Impresora no encontrada.');
  }
  const trabajos = db
    .prepare('SELECT * FROM trabajos WHERE impresora_id = ? ORDER BY created_at DESC')
    .all(impresora.id);
  res.json({ impresora, trabajos });
});

const crear = asyncHandler(async (req, res) => {
  const { nombre, modelo, estado, notas } = req.body;
  if (!nombre || !nombre.trim()) {
    throw new ApiError(400, 'El nombre de la impresora es obligatorio.');
  }
  if (estado && !ESTADOS_VALIDOS.includes(estado)) {
    throw new ApiError(400, `Estado invalido. Usa uno de: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const info = db
    .prepare(
      `INSERT INTO impresoras (nombre, modelo, estado, notas) VALUES (?, ?, ?, ?)`
    )
    .run(nombre.trim(), modelo || null, estado || 'disponible', notas || null);

  const impresora = db.prepare('SELECT * FROM impresoras WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ impresora });
});

const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const impresora = db.prepare('SELECT * FROM impresoras WHERE id = ?').get(id);
  if (!impresora) {
    throw new ApiError(404, 'Impresora no encontrada.');
  }

  const { nombre, modelo, estado, notas } = req.body;
  if (estado && !ESTADOS_VALIDOS.includes(estado)) {
    throw new ApiError(400, `Estado invalido. Usa uno de: ${ESTADOS_VALIDOS.join(', ')}`);
  }
  if (nombre !== undefined && !nombre.trim()) {
    throw new ApiError(400, 'El nombre de la impresora no puede estar vacio.');
  }

  db.prepare(
    `UPDATE impresoras SET nombre = ?, modelo = ?, estado = ?, notas = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    nombre !== undefined ? nombre.trim() : impresora.nombre,
    modelo !== undefined ? modelo : impresora.modelo,
    estado || impresora.estado,
    notas !== undefined ? notas : impresora.notas,
    id
  );

  const actualizada = db.prepare('SELECT * FROM impresoras WHERE id = ?').get(id);
  res.json({ impresora: actualizada });
});

const eliminar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const impresora = db.prepare('SELECT * FROM impresoras WHERE id = ?').get(id);
  if (!impresora) {
    throw new ApiError(404, 'Impresora no encontrada.');
  }

  db.prepare('UPDATE trabajos SET impresora_id = NULL WHERE impresora_id = ?').run(id);
  db.prepare('DELETE FROM impresoras WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = { listar, obtener, crear, actualizar, eliminar };
