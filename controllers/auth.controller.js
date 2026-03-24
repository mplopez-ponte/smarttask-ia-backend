const { validationResult } = require('express-validator');
const User = require('../models/User.model');
const { generarToken } = require('../middleware/auth.middleware');

// ─── POST /api/auth/registro ─────────────────────────────
const registro = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, email, password } = req.body;

    // Verificar si el email ya existe
    const usuarioExiste = await User.findOne({ email: email.toLowerCase() });
    if (usuarioExiste) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    }

    // Crear usuario
    const usuario = await User.create({ nombre, email, password });
    const token = generarToken(usuario._id);

    res.status(201).json({
      mensaje: '¡Cuenta creada correctamente!',
      token,
      usuario: usuario.toPublicJSON()
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al crear la cuenta.' });
  }
};

// ─── POST /api/auth/login ────────────────────────────────
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario con password
    const usuario = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    // Comparar password
    const passwordCorrecta = await usuario.compararPassword(password);
    if (!passwordCorrecta) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const token = generarToken(usuario._id);

    res.json({
      mensaje: `¡Bienvenido de nuevo, ${usuario.nombre}!`,
      token,
      usuario: usuario.toPublicJSON()
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
};

// ─── GET /api/auth/perfil ────────────────────────────────
const obtenerPerfil = async (req, res) => {
  try {
    res.json({ usuario: req.usuario.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el perfil.' });
  }
};

// ─── PUT /api/auth/perfil ────────────────────────────────
const actualizarPerfil = async (req, res) => {
  try {
    const { nombre } = req.body;
    const usuario = await User.findByIdAndUpdate(
      req.usuario._id,
      { nombre },
      { new: true, runValidators: true }
    );
    res.json({ mensaje: 'Perfil actualizado.', usuario: usuario.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el perfil.' });
  }
};

// ─── PUT /api/auth/cambiar-password ──────────────────────
const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const usuario = await User.findById(req.usuario._id).select('+password');

    const correcta = await usuario.compararPassword(passwordActual);
    if (!correcta) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }

    usuario.password = passwordNueva;
    await usuario.save();

    res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
};


// ─── DELETE /api/auth/cuenta ─────────────────────────────
// Elimina la cuenta del usuario autenticado y todo su histórico
// de tareas. Requiere confirmar la contraseña actual.
const eliminarCuenta = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Debes confirmar tu contraseña para eliminar la cuenta.' });
    }

    // Verificar contraseña
    const usuario = await User.findById(req.usuario._id).select('+password');
    const correcta = await usuario.compararPassword(password);
    if (!correcta) {
      return res.status(401).json({ error: 'Contraseña incorrecta. No se puede eliminar la cuenta.' });
    }

    // Obtener estadísticas antes de borrar (para el resumen de respuesta)
    const Tarea = require('../models/Task.model');
    const totalTareas = await Tarea.countDocuments({ usuario: req.usuario._id });

    // Eliminar todo el histórico de tareas del usuario
    const resultadoTareas = await Tarea.deleteMany({ usuario: req.usuario._id });

    // Eliminar el usuario
    await User.findByIdAndDelete(req.usuario._id);

    console.log(`🗑️  Cuenta eliminada: ${usuario.email} | Tareas eliminadas: ${resultadoTareas.deletedCount}`);

    res.json({
      mensaje: 'Cuenta y todos los datos asociados eliminados correctamente.',
      resumen: {
        email: usuario.email,
        tareasEliminadas: resultadoTareas.deletedCount,
        totalTareas,
      },
    });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    res.status(500).json({ error: 'Error al eliminar la cuenta.' });
  }
};

module.exports = { registro, login, obtenerPerfil, actualizarPerfil, cambiarPassword, eliminarCuenta };
