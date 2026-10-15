const { db } = require('../db/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listar = asyncHandler(async (req, res) => {
  const { q } = req.query;

  let clientes;
  if (q) {
    clientes = db
      .prepare(
        `SELECT * FROM clientes
         WHERE nombre LIKE ? OR email LIKE ? OR telefono LIKE ?
         ORDER BY nombre COLLATE NOCASE ASC`
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else {
    clientes = db.prepare('SELECT * FROM clientes ORDER BY nombre COLLATE NOCASE ASC').all();
  }

  const conteo = db
    .prepare(
      `SELECT cliente_id, COUNT(*) AS total
       FROM trabajos GROUP BY cliente_id`
    )
    .all();
  const conteoMap = Object.fromEntries(conteo.map((c) => [c.cliente_id, c.total]));

  res.json({
    clientes: clientes.map((c) => ({ ...c, total_trabajos: conteoMap[c.id] || 0 })),
  });
});

const obtener = asyncHandler(async (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) {
    throw new ApiError(404, 'Cliente no encontrado.');
  }
  const trabajos = db
    .prepare('SELECT * FROM trabajos WHERE cliente_id = ? ORDER BY created_at DESC')
    .all(cliente.id);
  res.json({ cliente, trabajos });
});

const crear = asyncHandler(async (req, res) => {
  const { nombre, email, telefono, notas } = req.body;
  if (!nombre || !nombre.trim()) {
    throw new ApiError(400, 'El nombre del cliente es obligatorio.');
  }

  const info = db
    .prepare(
      `INSERT INTO clientes (nombre, email, telefono, notas) VALUES (?, ?, ?, ?)`
    )
    .run(nombre.trim(), email || null, telefono || null, notas || null);

  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ cliente });
});

const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  if (!cliente) {
    throw new ApiError(404, 'Cliente no encontrado.');
  }

  const { nombre, email, telefono, notas } = req.body;
  if (nombre !== undefined && !nombre.trim()) {
    throw new ApiError(400, 'El nombre del cliente no puede estar vacio.');
  }

  db.prepare(
    `UPDATE clientes SET nombre = ?, email = ?, telefono = ?, notas = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    nombre !== undefined ? nombre.trim() : cliente.nombre,
    email !== undefined ? email : cliente.email,
    telefono !== undefined ? telefono : cliente.telefono,
    notas !== undefined ? notas : cliente.notas,
    id
  );

  const actualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  res.json({ cliente: actualizado });
});

const eliminar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  if (!cliente) {
    throw new ApiError(404, 'Cliente no encontrado.');
  }

  const trabajosAsociados = db
    .prepare('SELECT COUNT(*) AS total FROM trabajos WHERE cliente_id = ?')
    .get(id).total;
  if (trabajosAsociados > 0) {
    throw new ApiError(409, 'No se puede eliminar un cliente con trabajos registrados.');
  }

  db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = { listar, obtener, crear, actualizar, eliminar };
