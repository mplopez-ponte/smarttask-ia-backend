const express = require('express');
const router = express.Router();
const { obtenerEstadisticasDashboard, obtenerProductividad } = require('../controllers/stats.controller');
const { protegerRuta } = require('../middleware/auth.middleware');

router.use(protegerRuta);

router.get('/dashboard', obtenerEstadisticasDashboard);
router.get('/productividad', obtenerProductividad);

module.exports = router;
