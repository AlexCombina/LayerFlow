const { Router } = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', usuariosController.listar);
router.post('/', usuariosController.crear);
router.put('/:id', usuariosController.actualizar);
router.post('/:id/resetear-password', usuariosController.resetearPassword);
router.delete('/:id', usuariosController.eliminar);

module.exports = router;
