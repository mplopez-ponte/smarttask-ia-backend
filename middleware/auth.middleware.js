const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// ─── Middleware de autenticación JWT ─────────────────────
const protegerRuta = async (req, res, next) => {
  try {
    let token;

    // Obtener token del header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario en la BD (por si fue eliminado/desactivado)
    const usuario = await User.findById(decoded.id).select('-password');
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Token inválido o usuario no encontrado.' });
    }

    // Adjuntar usuario al request
    req.usuario = usuario;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Inicia sesión de nuevo.' });
    }
    return res.status(500).json({ error: 'Error de autenticación.' });
  }
};

// ─── Middleware de autorización por rol ──────────────────
const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido a administradores.' });
  }
  next();
};

// ─── Generar token JWT ───────────────────────────────────
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

module.exports = { protegerRuta, soloAdmin, generarToken };
