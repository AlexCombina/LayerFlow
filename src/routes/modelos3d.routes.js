const { Router } = require('express');
const modelos3dController = require('../controllers/modelos3d.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.get('/buscar', modelos3dController.buscar);

module.exports = router;
