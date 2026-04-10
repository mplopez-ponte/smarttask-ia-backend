const { validationResult } = require('express-validator');
const Tarea = require('../models/Task.model');

// ─── GET /api/tasks ──────────────────────────────────────
const obtenerTareas = async (req, res) => {
  try {
    const { estado, prioridad, categoria, buscar, page = 1, limit = 20, orden = '-createdAt' } = req.query;

    const filtro = { usuario: req.usuario._id };
    if (estado) filtro.estado = estado;
    if (prioridad) filtro.prioridad = prioridad;
    if (categoria) filtro.categoria = categoria;
    if (buscar) {
      filtro.$or = [
        { titulo: { $regex: buscar, $options: 'i' } },
        { descripcion: { $regex: buscar, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Tarea.countDocuments(filtro);
    const tareas = await Tarea.find(filtro)
      .sort(orden)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      tareas,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las tareas.' });
  }
};

// ─── GET /api/tasks/:id ──────────────────────────────────
const obtenerTarea = async (req, res) => {
  try {
    const tarea = await Tarea.findOne({ _id: req.params.id, usuario: req.usuario._id });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });
    res.json({ tarea });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la tarea.' });
  }
};

// ─── POST /api/tasks ─────────────────────────────────────
const crearTarea = async (req, res) => {
  try {
    // 1. Verificación de Express-Validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // 2. Extraer con valores por defecto para evitar errores de Mongoose
    const { 
      titulo, 
      descripcion = "", 
      prioridad = "media", 
      categoria = "General", 
      etiquetas = [], 
      fechaVencimiento 
    } = req.body;

    // 3. Crear tarea vinculada al usuario
    const tarea = await Tarea.create({
      titulo: titulo.trim(),
      descripcion,
      prioridad,
      categoria,
      etiquetas,
      fechaVencimiento: fechaVencimiento || new Date(Date.now() + 86400000), // Mañana por defecto
      usuario: req.usuario._id
    });

    res.status(201).json({ mensaje: 'Tarea creada correctamente.', tarea });
  } catch (error) {
    console.error(" [BACKEND ERROR]:", error);
    res.status(500).json({ error: 'Error al crear la tarea en la base de datos.' });
  }
};

// ─── PUT /api/tasks/:id ──────────────────────────────────
const actualizarTarea = async (req, res) => {
  try {
    const tarea = await Tarea.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });
    res.json({ mensaje: 'Tarea actualizada.', tarea });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la tarea.' });
  }
};

// ─── DELETE /api/tasks/:id ───────────────────────────────
const eliminarTarea = async (req, res) => {
  try {
    const tarea = await Tarea.findOneAndDelete({ _id: req.params.id, usuario: req.usuario._id });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });
    res.json({ mensaje: 'Tarea eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la tarea.' });
  }
};

// ─── PATCH /api/tasks/:id/subtareas/:subtareaId ──────────
const toggleSubtarea = async (req, res) => {
  try {
    const tarea = await Tarea.findOne({ _id: req.params.id, usuario: req.usuario._id });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const subtarea = tarea.subtareas.id(req.params.subtareaId);
    if (!subtarea) return res.status(404).json({ error: 'Subtarea no encontrada.' });

    subtarea.completada = !subtarea.completada;
    await tarea.save();
    res.json({ mensaje: 'Subtarea actualizada.', tarea });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la subtarea.' });
  }
};

// ─── POST /api/tasks/:id/subtareas ───────────────────────
const agregarSubtareas = async (req, res) => {
  try {
    const { subtareas } = req.body;
    const tarea = await Tarea.findOne({ _id: req.params.id, usuario: req.usuario._id });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

    tarea.subtareas.push(...subtareas);
    tarea.subtareasGeneradasPorIA = req.body.generadoPorIA || false;
    await tarea.save();
    res.json({ mensaje: 'Subtareas añadidas correctamente.', tarea });
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir subtareas.' });
  }
};

// ─── PATCH /api/tasks/:id/estado ────────────────────────
const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const tarea = await Tarea.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario._id },
      { estado },
      { new: true, runValidators: true }
    );
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });
    res.json({ mensaje: 'Estado actualizado.', tarea });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar el estado.' });
  }
};

module.exports = {
  obtenerTareas, obtenerTarea, crearTarea, actualizarTarea,
  eliminarTarea, toggleSubtarea, agregarSubtareas, cambiarEstado
};
