// Envuelve controladores async para propagar errores al middleware de errores
// sin tener que repetir try/catch en cada controlador.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
