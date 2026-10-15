const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const thingiverseService = require('../services/thingiverse.service');

const buscar = asyncHandler(async (req, res) => {
  const { q, page } = req.query;

  if (!q || !q.trim()) {
    throw new ApiError(400, 'Indica un termino de busqueda.');
  }

  const resultado = await thingiverseService.buscarModelos({
    q: q.trim(),
    page: page ? Number(page) : 1,
  });

  res.json(resultado);
});

module.exports = { buscar };
