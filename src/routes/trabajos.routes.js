const { Router } = require('express');
const trabajosController = require('../controllers/trabajos.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.get('/', trabajosController.listar);
router.get('/:id', trabajosController.obtener);
router.post('/', trabajosController.crear);
router.put('/:id', trabajosController.actualizar);
router.patch('/:id/estado', trabajosController.cambiarEstado);
router.delete('/:id', trabajosController.eliminar);

module.exports = router;
