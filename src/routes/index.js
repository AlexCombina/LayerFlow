const { Router } = require('express');

const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
const clientesRoutes = require('./clientes.routes');
const impresorasRoutes = require('./impresoras.routes');
const trabajosRoutes = require('./trabajos.routes');
const dashboardRoutes = require('./dashboard.routes');
const modelos3dRoutes = require('./modelos3d.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/clientes', clientesRoutes);
router.use('/impresoras', impresorasRoutes);
router.use('/trabajos', trabajosRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/modelos3d', modelos3dRoutes);

module.exports = router;
