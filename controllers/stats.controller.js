const Tarea = require('../models/Task.model');

// ─── GET /api/stats/dashboard ────────────────────────────
const obtenerEstadisticasDashboard = async (req, res) => {
  try {
    const usuarioId = req.usuario._id;

    // Conteos por estado
    const porEstado = await Tarea.aggregate([
      { $match: { usuario: usuarioId } },
      { $group: { _id: '$estado', total: { $sum: 1 } } }
    ]);

    // Conteos por prioridad
    const porPrioridad = await Tarea.aggregate([
      { $match: { usuario: usuarioId, estado: { $ne: 'cancelada' } } },
      { $group: { _id: '$prioridad', total: { $sum: 1 } } }
    ]);

    // Tareas completadas por mes (últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const completadasPorMes = await Tarea.aggregate([
      {
        $match: {
          usuario: usuarioId,
          estado: 'completada',
          fechaCompletada: { $gte: seisMesesAtras }
        }
      },
      {
        $group: {
          _id: {
            año: { $year: '$fechaCompletada' },
            mes: { $month: '$fechaCompletada' }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { '_id.año': 1, '_id.mes': 1 } }
    ]);

    // Tareas por categoría
    const porCategoria = await Tarea.aggregate([
      { $match: { usuario: usuarioId } },
      { $group: { _id: '$categoria', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 8 }
    ]);

    // Tareas vencidas
    const tareasVencidas = await Tarea.countDocuments({
      usuario: usuarioId,
      estado: { $in: ['pendiente', 'en_progreso'] },
      fechaVencimiento: { $lt: new Date() }
    });

    // Tareas próximas a vencer (7 días)
    const en7Dias = new Date();
    en7Dias.setDate(en7Dias.getDate() + 7);
    const tareasProximas = await Tarea.countDocuments({
      usuario: usuarioId,
      estado: { $in: ['pendiente', 'en_progreso'] },
      fechaVencimiento: { $gte: new Date(), $lte: en7Dias }
    });

    // Total general
    const totalTareas = await Tarea.countDocuments({ usuario: usuarioId });

    // Tasa de completado
    const completadas = porEstado.find(e => e._id === 'completada')?.total || 0;
    const tasaCompletado = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

    // Progreso promedio de tareas en progreso
    const progresoPromedio = await Tarea.aggregate([
      { $match: { usuario: usuarioId, estado: 'en_progreso' } },
      { $group: { _id: null, promedio: { $avg: '$progreso' } } }
    ]);

    res.json({
      resumen: {
        total: totalTareas,
        completadas,
        tasaCompletado,
        vencidas: tareasVencidas,
        proximasAVencer: tareasProximas,
        progresoPromedio: Math.round(progresoPromedio[0]?.promedio || 0)
      },
      porEstado,
      porPrioridad,
      completadasPorMes,
      porCategoria
    });
  } catch (error) {
    console.error('Error en estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas.' });
  }
};

// ─── GET /api/stats/productividad ───────────────────────
const obtenerProductividad = async (req, res) => {
  try {
    const usuarioId = req.usuario._id;
    const dias = parseInt(req.query.dias) || 30;
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);

    // Tareas creadas vs completadas por día
    const creadasPorDia = await Tarea.aggregate([
      { $match: { usuario: usuarioId, createdAt: { $gte: fechaInicio } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          creadas: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const completadasPorDia = await Tarea.aggregate([
      {
        $match: {
          usuario: usuarioId,
          estado: 'completada',
          fechaCompletada: { $gte: fechaInicio }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$fechaCompletada' } },
          completadas: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ creadasPorDia, completadasPorDia });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos de productividad.' });
  }
};

module.exports = { obtenerEstadisticasDashboard, obtenerProductividad };
