const mongoose = require('mongoose');

const subtareaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  completada: {
    type: Boolean,
    default: false
  },
  orden: {
    type: Number,
    default: 0
  }
}, { _id: true, timestamps: true });

const tareaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true,
    minlength: [3, 'El título debe tener al menos 3 caracteres'],
    maxlength: [100, 'El título no puede superar 100 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede superar 1000 caracteres']
  },
  estado: {
    type: String,
    enum: ['pendiente', 'en_progreso', 'completada', 'cancelada'],
    default: 'pendiente'
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'urgente'],
    default: 'media'
  },
  categoria: {
    type: String,
    trim: true,
    default: 'General'
  },
  etiquetas: [{
    type: String,
    trim: true
  }],
  fechaVencimiento: {
    type: Date,
    required: [true, 'La fecha de vencimiento es obligatoria']
  },
  fechaCompletada: {
    type: Date,
    default: null
  },
  subtareas: [subtareaSchema],
  subtareasGeneradasPorIA: {
    type: Boolean,
    default: false
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  progreso: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

// ─── Índices para mejor rendimiento ─────────────────────
tareaSchema.index({ usuario: 1, estado: 1 });
tareaSchema.index({ usuario: 1, prioridad: 1 });
tareaSchema.index({ usuario: 1, fechaVencimiento: 1 });

// ─── Middleware: calcular progreso automáticamente ──────
tareaSchema.pre('save', function(next) {
  if (this.subtareas && this.subtareas.length > 0) {
    const completadas = this.subtareas.filter(s => s.completada).length;
    this.progreso = Math.round((completadas / this.subtareas.length) * 100);
  }
  // Marcar fecha de completado
  if (this.estado === 'completada' && !this.fechaCompletada) {
    this.fechaCompletada = new Date();
  }
  if (this.estado !== 'completada') {
    this.fechaCompletada = null;
  }
  next();
});

// ─── Virtual: días restantes ────────────────────────────
tareaSchema.virtual('diasRestantes').get(function() {
  if (!this.fechaVencimiento) return null;
  const hoy = new Date();
  const diff = this.fechaVencimiento - hoy;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

tareaSchema.set('toJSON', { virtuals: true });
tareaSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tarea', tareaSchema);
