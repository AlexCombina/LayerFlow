const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function sanitizarUsuario(usuario) {
  const { password_hash, ...resto } = usuario;
  return resto;
}

const listar = asyncHandler(async (req, res) => {
  const usuarios = db
    .prepare('SELECT * FROM usuarios ORDER BY created_at DESC')
    .all()
    .map(sanitizarUsuario);
  res.json({ usuarios });
});

const crear = asyncHandler(async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password) {
    throw new ApiError(400, 'Nombre, email y contraseña son obligatorios.');
  }
  if (String(password).length < 6) {
    throw new ApiError(400, 'La contraseña debe tener al menos 6 caracteres.');
  }
  if (rol && !['admin', 'operador'].includes(rol)) {
    throw new ApiError(400, 'El rol debe ser "admin" u "operador".');
  }

  const existente = db
    .prepare('SELECT id FROM usuarios WHERE email = ?')
    .get(String(email).toLowerCase().trim());
  if (existente) {
    throw new ApiError(409, 'Ya existe un usuario con ese email.');
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
       VALUES (?, ?, ?, ?, 1)`
    )
    .run(nombre.trim(), String(email).toLowerCase().trim(), hash, rol || 'operador');

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ usuario: sanitizarUsuario(usuario) });
});

const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, rol, activo } = req.body;

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) {
    throw new ApiError(404, 'Usuario no encontrado.');
  }

  if (rol && !['admin', 'operador'].includes(rol)) {
    throw new ApiError(400, 'El rol debe ser "admin" u "operador".');
  }

  if (Number(id) === req.usuario.id && (rol === 'operador' || activo === false || activo === 0)) {
    throw new ApiError(400, 'No puedes quitarte a ti mismo el rol de administrador o desactivar tu propia cuenta.');
  }

  db.prepare(
    `UPDATE usuarios SET nombre = ?, rol = ?, activo = ? WHERE id = ?`
  ).run(
    nombre !== undefined ? nombre.trim() : usuario.nombre,
    rol || usuario.rol,
    activo !== undefined ? (activo ? 1 : 0) : usuario.activo,
    id
  );

  const actualizado = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  res.json({ usuario: sanitizarUsuario(actualizado) });
});

const resetearPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { passwordNueva } = req.body;

  if (!passwordNueva || String(passwordNueva).length < 6) {
    throw new ApiError(400, 'La nueva contraseña debe tener al menos 6 caracteres.');
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) {
    throw new ApiError(404, 'Usuario no encontrado.');
  }

  const hash = bcrypt.hashSync(passwordNueva, 10);
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, id);

  res.json({ message: 'Contraseña restablecida correctamente.' });
});

const eliminar = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.usuario.id) {
    throw new ApiError(400, 'No puedes eliminar tu propia cuenta.');
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) {
    throw new ApiError(404, 'Usuario no encontrado.');
  }

  db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = { listar, crear, actualizar, resetearPassword, eliminar };
