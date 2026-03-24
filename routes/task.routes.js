const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  obtenerTareas, obtenerTarea, crearTarea, actualizarTarea,
  eliminarTarea, toggleSubtarea, agregarSubtareas, cambiarEstado
} = require('../controllers/task.controller');
const { protegerRuta } = require('../middleware/auth.middleware');

// Todas las rutas de tareas requieren autenticación
router.use(protegerRuta);

const validarTarea = [
  body('titulo').trim().isLength({ min: 3, max: 100 }).withMessage('El título debe tener entre 3 y 100 caracteres'),
  body('prioridad').optional().isIn(['baja', 'media', 'alta', 'urgente']).withMessage('Prioridad no válida'),
  body('fechaVencimiento').isISO8601().withMessage('Fecha de vencimiento no válida')
];

router.get('/', obtenerTareas);
router.get('/:id', obtenerTarea);
router.post('/', validarTarea, crearTarea);
router.put('/:id', actualizarTarea);
router.delete('/:id', eliminarTarea);
router.patch('/:id/estado', cambiarEstado);
router.patch('/:id/subtareas/:subtareaId/toggle', toggleSubtarea);
router.post('/:id/subtareas', agregarSubtareas);

module.exports = router;
