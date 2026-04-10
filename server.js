const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('./config/swagger.config');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const aiRoutes = require('./routes/ai.routes');
const statsRoutes = require('./routes/stats.routes');

const app = express();

// CORS
app.use(cors({
  origin: 'https://smarttask-ia-frontend-production.up.railway.app',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// AÑADE ESTA LÍNEA AQUÍ (Crucial para Railway)
app.set('trust proxy', 1);

// Helmet configurado para permitir assets de Swagger UI
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
        connectSrc: [
          "'self'",
          'https://smarttask-ia-frontend-production.up.railway.app'
        ],
      },
    },
  })
);
app.use(morgan('dev'));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, inténtalo más tarde.' }
});
app.use('/api/', limiter);

// Rate limiting estricto para IA
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Límite de solicitudes IA alcanzado, espera un momento.' }
});

// Body Parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Swagger UI ─────────────────────────────────────────
const swaggerUiOptions = {
  customSiteTitle: 'SmartTask IA — API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'list',
    tagsSorter: 'alpha',
  },
  customCss: `
    body { background: #0d0f14 !important; }
    .swagger-ui { font-family: 'Inter', -apple-system, sans-serif !important; }
    .swagger-ui .topbar { background: #151820 !important; border-bottom: 1px solid #262b3d !important; padding: 10px 0; }
    .swagger-ui .topbar .download-url-wrapper { display: none !important; }
    .swagger-ui .topbar-wrapper::before { content: '\u26A1 SmartTask IA \u2014 API Docs'; color: #e2e8f0; font-size: 1.1rem; font-weight: 700; }
    .swagger-ui .info .title { color: #6366f1 !important; font-size: 2rem !important; }
    .swagger-ui .info .description p { color: #94a3b8 !important; }
    .swagger-ui .info .description table td, .swagger-ui .info .description table th { border: 1px solid #262b3d !important; padding: 6px 12px !important; color: #cbd5e1 !important; }
    .swagger-ui .info .description table th { background: #1c2030 !important; }
    .swagger-ui .scheme-container { background: #151820 !important; border: 1px solid #262b3d !important; }
    .swagger-ui .opblock-tag { color: #e2e8f0 !important; border-bottom: 1px solid #262b3d !important; }
    .swagger-ui .opblock { border-radius: 8px !important; margin-bottom: 8px !important; border: 1px solid #262b3d !important; }
    .swagger-ui .opblock.opblock-get .opblock-summary { background: rgba(59,130,246,0.08) !important; border-color: rgba(59,130,246,0.3) !important; }
    .swagger-ui .opblock.opblock-post .opblock-summary { background: rgba(16,185,129,0.08) !important; border-color: rgba(16,185,129,0.3) !important; }
    .swagger-ui .opblock.opblock-put .opblock-summary { background: rgba(245,158,11,0.08) !important; border-color: rgba(245,158,11,0.3) !important; }
    .swagger-ui .opblock.opblock-patch .opblock-summary { background: rgba(99,102,241,0.08) !important; border-color: rgba(99,102,241,0.3) !important; }
    .swagger-ui .opblock.opblock-delete .opblock-summary { background: rgba(239,68,68,0.08) !important; border-color: rgba(239,68,68,0.3) !important; }
    .swagger-ui .opblock-summary-path { color: #e2e8f0 !important; }
    .swagger-ui .opblock-summary-description { color: #94a3b8 !important; }
    .swagger-ui .opblock-body, .swagger-ui .opblock-section { background: #151820 !important; }
    .swagger-ui .parameter__name { color: #e2e8f0 !important; }
    .swagger-ui .parameter__type { color: #22d3ee !important; }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #94a3b8 !important; border-bottom: 1px solid #262b3d !important; }
    .swagger-ui table tbody tr td { color: #cbd5e1 !important; border-bottom: 1px solid #1c2030 !important; }
    .swagger-ui .response-col_status { color: #10b981 !important; }
    .swagger-ui .btn.authorize { background: #6366f1 !important; border-color: #6366f1 !important; color: #fff !important; border-radius: 8px !important; }
    .swagger-ui .btn.execute { background: #6366f1 !important; border-color: #6366f1 !important; color: #fff !important; border-radius: 6px !important; }
    .swagger-ui input[type=text], .swagger-ui textarea, .swagger-ui select { background: #1c2030 !important; border: 1px solid #262b3d !important; color: #e2e8f0 !important; border-radius: 6px !important; }
    .swagger-ui .model-box { background: #1c2030 !important; border-radius: 8px !important; }
    .swagger-ui .model { color: #e2e8f0 !important; }
    .swagger-ui .prop-type { color: #22d3ee !important; }
    .swagger-ui section.models { background: #151820 !important; border: 1px solid #262b3d !important; border-radius: 8px !important; }
    .swagger-ui section.models h4 { color: #e2e8f0 !important; }
    .swagger-ui .curl-command { background: #0d0f14 !important; color: #10b981 !important; }
    .swagger-ui .microlight { background: #0d0f14 !important; color: #22d3ee !important; }
    .swagger-ui .modal-ux-content, .swagger-ui .dialog-ux .modal-ux { background: #151820 !important; border: 1px solid #262b3d !important; }
    .swagger-ui .auth-container h4, .swagger-ui .auth-wrapper { color: #e2e8f0 !important; }
  `,
};

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition, swaggerUiOptions));

// OpenAPI spec raw JSON
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDefinition);
});

// ─── Rutas ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'SmartTask IA API funcionando correctamente',
    timestamp: new Date(),
    docs: `http://localhost:${process.env.PORT || 5000}/api/docs`,
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// ─── Conexión MongoDB ────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV}`);
      console.log(`📚 Swagger UI:   http://localhost:${PORT}/api/docs`);
      console.log(`📄 OpenAPI JSON: http://localhost:${PORT}/api/docs.json`);
    });
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
