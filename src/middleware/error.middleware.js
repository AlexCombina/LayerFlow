const ApiError = require('../utils/ApiError');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let { statusCode, message } = err;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
  } else if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    message = 'El registro entra en conflicto con datos existentes.';
  } else {
    statusCode = statusCode || 500;
    message = message || 'Error interno del servidor.';
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: true,
    message,
    details: err.details || undefined,
  });
}

module.exports = { notFoundHandler, errorHandler };
