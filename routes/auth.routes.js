const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  registro, login, obtenerPerfil, actualizarPerfil,
  cambiarPassword, eliminarCuenta
} = require('../controllers/auth.controller');
const { protegerRuta } = require('../middleware/auth.middleware');

// Validaciones
const validarRegistro = [
  body('nombre').trim().isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email no válido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
];

const validarLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Email no válido'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria')
];

const validarEliminarCuenta = [
  body('password').notEmpty().withMessage('Debes confirmar tu contraseña')
];

router.post('/registro',          validarRegistro,        registro);
router.post('/login',             validarLogin,           login);
router.get('/perfil',             protegerRuta,           obtenerPerfil);
router.put('/perfil',             protegerRuta,           actualizarPerfil);
router.put('/cambiar-password',   protegerRuta,           cambiarPassword);
router.delete('/cuenta',          protegerRuta, validarEliminarCuenta, eliminarCuenta);

module.exports = router;
