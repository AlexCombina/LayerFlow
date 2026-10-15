const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { firmarToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function sanitizarUsuario(usuario) {
  const { password_hash, ...resto } = usuario;
  return resto;
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email y contraseña son obligatorios.');
  }

  const usuario = db
    .prepare('SELECT * FROM usuarios WHERE email = ?')
    .get(String(email).toLowerCase().trim());

  if (!usuario || !usuario.activo) {
    throw new ApiError(401, 'Credenciales invalidas.');
  }

  const passwordValida = bcrypt.compareSync(password, usuario.password_hash);
  if (!passwordValida) {
    throw new ApiError(401, 'Credenciales invalidas.');
  }

  const token = firmarToken({ sub: usuario.id, rol: usuario.rol });
  res.json({ token, usuario: sanitizarUsuario(usuario) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ usuario: req.usuario });
});

const cambiarPassword = asyncHandler(async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;

  if (!passwordActual || !passwordNueva) {
    throw new ApiError(400, 'Debes indicar la contraseña actual y la nueva.');
  }
  if (String(passwordNueva).length < 6) {
    throw new ApiError(400, 'La nueva contraseña debe tener al menos 6 caracteres.');
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  const passwordValida = bcrypt.compareSync(passwordActual, usuario.password_hash);
  if (!passwordValida) {
    throw new ApiError(401, 'La contraseña actual no es correcta.');
  }

  const nuevoHash = bcrypt.hashSync(passwordNueva, 10);
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(nuevoHash, usuario.id);

  res.json({ message: 'Contraseña actualizada correctamente.' });
});

module.exports = { login, me, cambiarPassword };
