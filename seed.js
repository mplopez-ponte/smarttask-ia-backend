/**
 * ╔══════════════════════════════════════════════════════╗
 *  SmartTask IA — Script de Datos de Prueba
 *  Ejecutar desde la carpeta backend/:
 *  > node seed.js
 * ╚══════════════════════════════════════════════════════╝
 *
 *  Crea: 5 usuarios + 16 tareas (con subtareas, estados
 *  y prioridades variadas) para probar todas las vistas.
 *
 *  Contraseña de todos los usuarios: Password123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User.model');
const Tarea    = require('./models/Task.model');

// ─── Paleta de fechas relativas ──────────────────────────
const dias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const hace = (n) => dias(-n);

// ─── Main ────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n✅ Conectado a MongoDB:', process.env.MONGO_URI);

    // Limpiar colecciones
    await User.deleteMany({});
    await Tarea.deleteMany({});
    console.log('🗑️  Colecciones limpiadas\n');

    // ─── Crear usuarios ──────────────────────────────────
    const hash = await bcrypt.hash('Password123', 12);

    const [ana, carlos, laura, pedro, maria] = await User.insertMany([
      { nombre: 'Ana García López',       email: 'ana.garcia@smarttask.dev',     password: hash, rol: 'admin'  },
      { nombre: 'Carlos Martínez Ruiz',   email: 'carlos.martinez@smarttask.dev',password: hash, rol: 'usuario'},
      { nombre: 'Laura Sánchez Moreno',   email: 'laura.sanchez@smarttask.dev',  password: hash, rol: 'usuario'},
      { nombre: 'Pedro Fernández Torres', email: 'pedro.fernandez@smarttask.dev',password: hash, rol: 'usuario'},
      { nombre: 'María López Jiménez',    email: 'maria.lopez@smarttask.dev',    password: hash, rol: 'usuario', activo: false },
    ]);

    console.log('👥 Usuarios creados:');
    [ana, carlos, laura, pedro, maria].forEach(u =>
      console.log(`   • ${u.nombre.padEnd(28)} ${u.email}  (rol: ${u.rol}${!u.activo ? ', INACTIVO' : ''})`)
    );
    console.log('   🔑 Contraseña de todos: Password123\n');

    // ─── Función helper para subtareas ──────────────────
    const st = (titulo, descripcion, completada = false, orden = 1) =>
      ({ titulo, descripcion, completada, orden });

    // ─── Crear tareas ────────────────────────────────────
    const tareas = await Tarea.insertMany([

      // ── ANA (admin) ── 8 tareas
      {
        titulo: 'Diseñar la arquitectura del microservicio de pagos',
        descripcion: 'Definir la estructura de capas, endpoints REST, modelo de datos y estrategia de autenticación para el microservicio de pagos con Stripe. Incluir diagrama de flujo y documentación.',
        estado: 'en_progreso', prioridad: 'urgente', categoria: 'Trabajo',
        etiquetas: ['backend', 'microservicios', 'stripe', 'arquitectura'],
        fechaVencimiento: dias(8), usuario: ana._id,
        subtareasGeneradasPorIA: true,
        subtareas: [
          st('Definir endpoints REST en formato OpenAPI', 'Documentar cada endpoint con método, ruta, request body y response.', true, 1),
          st('Diseñar el modelo de base de datos', 'Crear schemas de MongoDB para Payment, Transaction y Refund.', true, 2),
          st('Configurar integración con Stripe SDK', 'Instalar SDK, configurar .env y crear servicio de abstracción.', true, 3),
          st('Implementar middleware de autenticación JWT', 'Adaptar el middleware existente para proteger los endpoints.', false, 4),
          st('Crear diagrama de arquitectura', 'Visualizar flujo entre cliente, API gateway y microservicio.', false, 5),
          st('Escribir documentación técnica inicial', 'Redactar README con instrucciones de instalación y uso.', false, 6),
          st('Revisión y aprobación del equipo', 'Presentar arquitectura al tech lead para obtener el visto bueno.', false, 7),
        ],
      },
      {
        titulo: 'Preparar presentación del proyecto final DAW',
        descripcion: 'Crear la presentación para la defensa del proyecto SmartTask IA ante el tribunal. Incluye demo en vivo, arquitectura técnica y conclusiones.',
        estado: 'en_progreso', prioridad: 'alta', categoria: 'Estudio',
        etiquetas: ['DAW', 'presentacion', 'proyecto-final', 'defensa'],
        fechaVencimiento: dias(21), usuario: ana._id,
        subtareasGeneradasPorIA: true,
        subtareas: [
          st('Definir el índice de la presentación', 'Estructurar: introducción, tecnologías, arquitectura, demo, conclusiones.', true, 1),
          st('Crear diapositivas de arquitectura técnica', 'Incluir diagrama de componentes y flujo JWT.', true, 2),
          st('Preparar el guion de la demo en vivo', 'Definir flujo: registro → crear tarea → IA → dashboard.', false, 3),
          st('Preparar entorno de demo con datos reales', 'Cargar seed, verificar API OpenAI y tener backup del estado.', false, 4),
          st('Ensayar la presentación completa', 'Practicar al menos 3 veces, ajustar tiempos.', false, 5),
        ],
      },
      {
        titulo: 'Implementar tests unitarios con Jest para el backend',
        descripcion: 'Escribir tests para los controllers de auth y tareas usando Jest y Supertest. Objetivo: cobertura mínima del 80%.',
        estado: 'pendiente', prioridad: 'media', categoria: 'Trabajo',
        etiquetas: ['testing', 'jest', 'backend', 'calidad'],
        fechaVencimiento: dias(35), usuario: ana._id,
        subtareasGeneradasPorIA: false, subtareas: [],
      },
      {
        titulo: 'Renovar el certificado SSL del servidor',
        descripcion: 'El certificado SSL de api.smarttask.dev expira en 5 días. Renovar usando Let\'s Encrypt con Certbot y reiniciar Nginx.',
        estado: 'completada', prioridad: 'urgente', categoria: 'Trabajo',
        etiquetas: ['devops', 'ssl', 'nginx', 'produccion'],
        fechaVencimiento: hace(2), fechaCompletada: hace(3), usuario: ana._id,
        subtareasGeneradasPorIA: true,
        subtareas: [
          st('Verificar fecha de expiración del certificado', 'openssl s_client -connect api.smarttask.dev:443 | openssl x509 -noout -dates', true, 1),
          st('Ejecutar Certbot con --dry-run primero', 'sudo certbot renew --nginx --dry-run para verificar sin cambios reales.', true, 2),
          st('Renovar y reiniciar Nginx', 'sudo certbot renew --nginx y sudo systemctl reload nginx.', true, 3),
        ],
      },
      {
        titulo: 'Estudiar para el examen de Bases de Datos',
        descripcion: 'Repasar normalización (1FN-BCNF), optimización de queries, índices, transacciones ACID y procedimientos almacenados en MySQL.',
        estado: 'completada', prioridad: 'alta', categoria: 'Estudio',
        etiquetas: ['BBDD', 'SQL', 'MySQL', 'examen', 'DAW'],
        fechaVencimiento: hace(30), fechaCompletada: hace(31), usuario: ana._id,
        subtareasGeneradasPorIA: true,
        subtareas: [
          st('Repasar normalización y formas normales', 'Ejercicios prácticos sobre 1FN, 2FN, 3FN y BCNF.', true, 1),
          st('Practicar queries con JOINs complejos', '10 ejercicios de INNER, LEFT, RIGHT y FULL OUTER JOIN.', true, 2),
          st('Estudiar índices y optimización', 'EXPLAIN ANALYZE, índices compuestos e impacto en rendimiento.', true, 3),
          st('Repasar transacciones ACID', 'COMMIT, ROLLBACK, SAVEPOINT y niveles de aislamiento.', true, 4),
        ],
      },
      {
        titulo: 'Hacer la declaración de la renta',
        descripcion: 'Acceder a la AEAT con Cl@ve PIN, revisar el borrador, añadir deducciones por alquiler de vivienda habitual y presentar.',
        estado: 'pendiente', prioridad: 'alta', categoria: 'Finanzas',
        etiquetas: ['IRPF', 'impuestos', 'AEAT'],
        fechaVencimiento: dias(160), usuario: ana._id,
        subtareasGeneradasPorIA: false, subtareas: [],
      },
      {
        titulo: 'Configurar pipeline CI/CD con GitHub Actions',
        descripcion: 'Crear workflows para tests automáticos en cada PR y despliegue automático a producción al hacer merge a main.',
        estado: 'cancelada', prioridad: 'media', categoria: 'Proyecto',
        etiquetas: ['devops', 'github-actions', 'CI/CD'],
        fechaVencimiento: dias(14), usuario: ana._id,
        subtareasGeneradasPorIA: false,
        subtareas: [
          st('Crear workflow de testing automático', 'Configurar .github/workflows/test.yml para ejecutar npm test.', true, 1),
          st('Configurar secrets de GitHub', 'Añadir MONGO_URI, JWT_SECRET y OPENAI_API_KEY como GitHub Secrets.', false, 2),
          st('Crear workflow de despliegue automático', 'Deploy a Railway/Render al hacer merge a main.', false, 3),
          st('Probar el pipeline completo', 'Crear rama test/ci-check y abrir PR para verificar checks.', false, 4),
        ],
      },
      {
        titulo: 'Revisar y refactorizar el módulo de autenticación',
        descripcion: 'Refactorizar para usar el patrón Repository, añadir refresh tokens y mejorar el manejo de errores.',
        estado: 'pendiente', prioridad: 'baja', categoria: 'Proyecto',
        etiquetas: ['refactoring', 'auth', 'refresh-token'],
        fechaVencimiento: dias(56), usuario: ana._id,
        subtareasGeneradasPorIA: false, subtareas: [],
      },

      // ── CARLOS ── 3 tareas
      {
        titulo: 'Migrar base de datos a MongoDB Atlas',
        descripcion: 'Mover la BD local a Atlas M10, configurar índices y seguridad por IP.',
        estado: 'completada', prioridad: 'alta', categoria: 'Trabajo',
        etiquetas: ['mongodb', 'atlas', 'migracion', 'cloud'],
        fechaVencimiento: hace(35), fechaCompletada: hace(36), usuario: carlos._id,
        subtareasGeneradasPorIA: true,
        subtareas: [
          st('Crear cluster M10 en MongoDB Atlas', 'Registrar cuenta y crear cluster en eu-west-1.', true, 1),
          st('Exportar datos con mongodump', 'mongodump --db smarttask_ia --out ./backup', true, 2),
          st('Importar datos con mongorestore', 'mongorestore --uri="mongodb+srv://..." ./backup/smarttask_ia', true, 3),
          st('Actualizar variables de entorno', 'Actualizar MONGO_URI en .env de producción.', true, 4),
        ],
      },
      {
        titulo: 'Aprender Docker y containerizar la aplicación',
        descripcion: 'Estudiar Docker, crear Dockerfile para backend y frontend, y configurar docker-compose.',
        estado: 'en_progreso', prioridad: 'media', categoria: 'Estudio',
        etiquetas: ['docker', 'devops', 'containerizacion'],
        fechaVencimiento: dias(42), usuario: carlos._id,
        subtareasGeneradasPorIA: true,
        subtareas: [
          st('Completar curso de Docker en Udemy', 'Ver al menos 6h cubriendo imágenes, contenedores y redes.', true, 1),
          st('Crear Dockerfile para el backend', 'Usar node:18-alpine con WORKDIR, COPY, RUN y CMD.', false, 2),
          st('Crear Dockerfile para el frontend', 'Multi-stage build: node para build y nginx:alpine para serve.', false, 3),
          st('Configurar docker-compose.yml', 'Servicios: mongo, backend y frontend con sus puertos y variables.', false, 4),
        ],
      },
      {
        titulo: 'Organizar el escritorio y zona de trabajo',
        descripcion: 'Limpiar y reorganizar el escritorio, ordenar cables, mejorar la iluminación y crear un espacio de trabajo más productivo.',
        estado: 'pendiente', prioridad: 'baja', categoria: 'Personal',
        etiquetas: ['hogar', 'organizacion', 'productividad'],
        fechaVencimiento: dias(90), usuario: carlos._id,
        subtareasGeneradasPorIA: false, subtareas: [],
      },

      // ── LAURA ── 3 tareas
      {
        titulo: 'Desarrollar componente DataTable reutilizable en React',
        descripcion: 'Crear componente genérico con paginación, ordenamiento por columnas, filtrado y soporte ARIA para accesibilidad.',
        estado: 'en_progreso', prioridad: 'alta', categoria: 'Trabajo',
        etiquetas: ['react', 'componente', 'frontend', 'accesibilidad'],
        fechaVencimiento: dias(13), usuario: laura._id,
        subtareasGeneradasPorIA: true,
        subtareas: [
          st('Definir la API del componente (props)', 'Especificar: columns, data, pageSize, onRowClick, actions, loading.', true, 1),
          st('Implementar la lógica de paginación', 'Crear hook usePagination con currentPage, totalPages y funciones.', true, 2),
          st('Implementar ordenamiento por columnas', 'Sort con indicadores visuales asc/desc para string y número.', false, 3),
          st('Añadir filtrado global con debounce', 'Búsqueda en tiempo real con debounce de 300ms.', false, 4),
          st('Añadir atributos ARIA', 'role=table, aria-sort en cabeceras y navegación por teclado.', false, 5),
          st('Escribir tests con React Testing Library', 'Cubrir: render, paginación, ordenamiento, filtrado y estado vacío.', false, 6),
        ],
      },
      {
        titulo: 'Completar el módulo de Inglés Técnico B2',
        descripcion: 'Estudiar vocabulario de programación en inglés, practicar listening y preparar presentación oral.',
        estado: 'completada', prioridad: 'media', categoria: 'Estudio',
        etiquetas: ['ingles', 'B2', 'DAW', 'idiomas'],
        fechaVencimiento: hace(48), fechaCompletada: hace(50), usuario: laura._id,
        subtareasGeneradasPorIA: false,
        subtareas: [
          st('Estudiar 50 palabras de vocabulario técnico', 'Flashcards con términos: deployment, merge, refactor, etc.', true, 1),
          st('Escuchar 5 episodios de Syntax.fm', 'Podcast técnico en inglés, tomar notas de expresiones nuevas.', true, 2),
          st('Preparar presentación oral sobre React Hooks', '5 minutos explicando useState, useEffect y useContext.', true, 3),
        ],
      },
      {
        titulo: 'Revisar el contrato de alquiler antes de la renovación',
        descripcion: 'Leer detenidamente el contrato. Revisar cláusulas de IPC, duración, fianza y condiciones de salida.',
        estado: 'pendiente', prioridad: 'urgente', categoria: 'Personal',
        etiquetas: ['alquiler', 'legal', 'contrato', 'vivienda'],
        fechaVencimiento: dias(5), usuario: laura._id,
        subtareasGeneradasPorIA: false, subtareas: [],
      },

      // ── PEDRO ── 2 tareas
      {
        titulo: 'Optimizar las consultas lentas de MongoDB',
        descripcion: 'El profiler muestra queries de >100ms. Analizar con explain(), añadir índices compuestos y medir el impacto.',
        estado: 'completada', prioridad: 'alta', categoria: 'Trabajo',
        etiquetas: ['mongodb', 'performance', 'indices', 'optimizacion'],
        fechaVencimiento: hace(7), fechaCompletada: hace(8), usuario: pedro._id,
        subtareasGeneradasPorIA: true,
        subtareas: [
          st('Identificar queries lentas con el profiler', 'Activar profiler nivel 2 y exportar queries con ms > 100.', true, 1),
          st('Analizar cada query con explain()', 'Revisar COLLSCAN vs IXSCAN y nReturned vs totalDocsExamined.', true, 2),
          st('Crear índices compuestos necesarios', 'Añadir {usuario:1, estado:1}, {usuario:1, prioridad:1}, etc.', true, 3),
          st('Documentar resultados de rendimiento', 'Comparar tiempos antes/después y añadir al informe técnico.', true, 4),
        ],
      },
      {
        titulo: 'Hacer revisión médica anual',
        descripcion: 'Solicitar cita con el médico para revisión anual. Incluir análisis de sangre, tensión arterial y vista.',
        estado: 'pendiente', prioridad: 'media', categoria: 'Salud',
        etiquetas: ['salud', 'medico', 'prevencion'],
        fechaVencimiento: dias(75), usuario: pedro._id,
        subtareasGeneradasPorIA: false, subtareas: [],
      },

    ]);

    // ─── Resumen ─────────────────────────────────────────
    console.log(`\n📋 Tareas creadas: ${tareas.length}`);

    const resumen = {};
    tareas.forEach(t => {
      if (!resumen[t.usuario.toString()]) resumen[t.usuario.toString()] = { total: 0, estados: {} };
      resumen[t.usuario.toString()].total++;
      resumen[t.usuario.toString()].estados[t.estado] = (resumen[t.usuario.toString()].estados[t.estado] || 0) + 1;
    });

    const usuarios = [ana, carlos, laura, pedro];
    usuarios.forEach(u => {
      const r = resumen[u._id.toString()] || { total: 0, estados: {} };
      console.log(`   • ${u.nombre.padEnd(28)} ${r.total} tareas → ${JSON.stringify(r.estados)}`);
    });

    const totalSubtareas = tareas.reduce((acc, t) => acc + t.subtareas.length, 0);
    const subtareasIA    = tareas.filter(t => t.subtareasGeneradasPorIA).length;
    console.log(`\n📊 Estadísticas:`);
    console.log(`   • Total subtareas: ${totalSubtareas}`);
    console.log(`   • Tareas con subtareas IA: ${subtareasIA}`);
    console.log(`   • Tareas urgentes: ${tareas.filter(t => t.prioridad === 'urgente').length}`);
    console.log(`   • Tareas completadas: ${tareas.filter(t => t.estado === 'completada').length}`);
    console.log(`   • Tareas pendientes: ${tareas.filter(t => t.estado === 'pendiente').length}`);

    console.log('\n🎉 Seed completado exitosamente');
    console.log('   Puedes iniciar sesión con cualquiera de los usuarios anteriores');
    console.log('   Contraseña: Password123\n');

  } catch (error) {
    console.error('\n❌ Error en el seed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

seed();
