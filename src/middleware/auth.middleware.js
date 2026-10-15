const { verificarToken } = require('../utils/jwt');
const { db } = require('../db/database');
const ApiError = require('../utils/ApiError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'No autenticado. Falta el token de acceso.'));
  }

  try {
    const payload = verificarToken(token);
    const usuario = db
      .prepare('SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ?')
      .get(payload.sub);

    if (!usuario || !usuario.activo) {
      return next(new ApiError(401, 'La sesion ya no es valida.'));
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    return next(new ApiError(401, 'Token invalido o expirado.'));
  }
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(new ApiError(403, 'No tienes permisos para realizar esta accion.'));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
