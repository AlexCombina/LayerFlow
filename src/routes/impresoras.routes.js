const { Router } = require('express');
const impresorasController = require('../controllers/impresoras.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.get('/', impresorasController.listar);
router.get('/:id', impresorasController.obtener);
router.post('/', impresorasController.crear);
router.put('/:id', impresorasController.actualizar);
router.delete('/:id', impresorasController.eliminar);

module.exports = router;
