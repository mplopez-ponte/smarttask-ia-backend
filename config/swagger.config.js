/**
 * ╔══════════════════════════════════════════════════════════╗
 *   SmartTask IA — Especificación OpenAPI 3.0 (Swagger)
 *   Documentación completa de todos los endpoints de la API
 * ╚══════════════════════════════════════════════════════════╝
 */

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'SmartTask IA API',
    version: '1.0.0',
    description: `
## ⚡ SmartTask IA — API REST

Gestor de tareas inteligente con integración de IA (OpenAI GPT-4o-mini).

### Autenticación
La mayoría de endpoints requieren un **JWT Bearer Token**. Obtén el token
con \`POST /api/auth/login\` o \`POST /api/auth/registro\` y pásalo en la cabecera:

\`\`\`
Authorization: Bearer <tu_token>
\`\`\`

### Rate Limiting
| Ámbito | Límite |
|---|---|
| API general | 100 peticiones / 15 minutos |
| Endpoints \`/api/ai/*\` | 10 peticiones / minuto |

### Códigos de estado HTTP usados
| Código | Significado |
|---|---|
| 200 | OK — operación exitosa |
| 201 | Created — recurso creado |
| 400 | Bad Request — validación fallida |
| 401 | Unauthorized — token inválido o ausente |
| 403 | Forbidden — sin permisos suficientes |
| 404 | Not Found — recurso no encontrado |
| 409 | Conflict — recurso duplicado (ej. email ya registrado) |
| 429 | Too Many Requests — rate limit superado |
| 500 | Internal Server Error — error del servidor |
    `,
    contact: {
      name: 'SmartTask IA — Proyecto DAW',
      email: 'smarttask@daw.dev',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: '🖥️ Servidor de desarrollo local',
    },
    {
      url: 'https://tu-backend.up.railway.app/api',
      description: '🚀 Railway — Producción (actualizar con la URL real)',
    },
  ],

  // ─── Seguridad global ─────────────────────────────────
  security: [],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtenido en login o registro. Expira en 7 días.',
      },
    },

    // ─── Schemas reutilizables ────────────────────────
    schemas: {

      // ── Subtarea ──
      Subtarea: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6758b1c2d3e4f50102030410', description: 'ID único de la subtarea' },
          titulo: { type: 'string', example: 'Definir los endpoints REST', description: 'Título descriptivo de la subtarea' },
          descripcion: { type: 'string', example: 'Documentar cada endpoint en formato OpenAPI/Swagger.', description: 'Descripción detallada de la subtarea' },
          completada: { type: 'boolean', example: false, description: 'Estado de completado de la subtarea' },
          orden: { type: 'integer', example: 1, description: 'Orden de presentación dentro de la tarea' },
          createdAt: { type: 'string', format: 'date-time', example: '2025-01-10T09:00:00.000Z' },
        },
      },

      // ── Tarea ──
      Tarea: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6758b1c2d3e4f50102030401' },
          titulo: { type: 'string', example: 'Diseñar la arquitectura del microservicio de pagos', maxLength: 100 },
          descripcion: { type: 'string', example: 'Definir la estructura de capas, endpoints REST y modelo de datos.', maxLength: 1000 },
          estado: {
            type: 'string',
            enum: ['pendiente', 'en_progreso', 'completada', 'cancelada'],
            example: 'en_progreso',
            description: 'Estado actual de la tarea',
          },
          prioridad: {
            type: 'string',
            enum: ['baja', 'media', 'alta', 'urgente'],
            example: 'alta',
          },
          categoria: { type: 'string', example: 'Trabajo', description: 'Categoría libre de la tarea' },
          etiquetas: {
            type: 'array',
            items: { type: 'string' },
            example: ['backend', 'arquitectura', 'stripe'],
          },
          fechaVencimiento: { type: 'string', format: 'date-time', example: '2025-02-15T23:59:00.000Z' },
          fechaCompletada: { type: 'string', format: 'date-time', nullable: true, example: null },
          progreso: { type: 'integer', minimum: 0, maximum: 100, example: 57, description: 'Porcentaje calculado automáticamente según subtareas completadas' },
          subtareasGeneradasPorIA: { type: 'boolean', example: true },
          subtareas: {
            type: 'array',
            items: { $ref: '#/components/schemas/Subtarea' },
          },
          usuario: { type: 'string', example: '6758a1b2c3d4e5f601020304', description: 'ID del usuario propietario' },
          diasRestantes: { type: 'integer', example: 12, description: 'Virtual calculado: días hasta la fecha de vencimiento (negativo si ha vencido)' },
          createdAt: { type: 'string', format: 'date-time', example: '2025-01-10T09:00:00.000Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T11:30:00.000Z' },
        },
      },

      // ── Tarea Input (crear) ──
      TareaInput: {
        type: 'object',
        required: ['titulo', 'fechaVencimiento'],
        properties: {
          titulo: { type: 'string', minLength: 3, maxLength: 100, example: 'Implementar autenticación OAuth2' },
          descripcion: { type: 'string', maxLength: 1000, example: 'Integrar login con Google usando Passport.js y gestionar el callback correctamente.' },
          prioridad: { type: 'string', enum: ['baja', 'media', 'alta', 'urgente'], default: 'media', example: 'alta' },
          categoria: { type: 'string', default: 'General', example: 'Trabajo' },
          etiquetas: { type: 'array', items: { type: 'string' }, example: ['oauth', 'google', 'auth'] },
          fechaVencimiento: { type: 'string', format: 'date', example: '2025-03-01' },
        },
      },

      // ── Usuario público ──
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6758a1b2c3d4e5f601020304' },
          nombre: { type: 'string', example: 'Ana García López' },
          email: { type: 'string', format: 'email', example: 'ana.garcia@smarttask.dev' },
          avatar: { type: 'string', nullable: true, example: null },
          rol: { type: 'string', enum: ['usuario', 'admin'], example: 'usuario' },
          createdAt: { type: 'string', format: 'date-time', example: '2024-09-01T08:00:00.000Z' },
        },
      },

      // ── Auth response ──
      AuthResponse: {
        type: 'object',
        properties: {
          mensaje: { type: 'string', example: '¡Bienvenido de nuevo, Ana!' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NThhMWIyYzNkNGU1ZjYwMTAyMDMwNCIsImlhdCI6MTcwNjE4MjQwMCwiZXhwIjoxNzA2Nzg3MjAwfQ.abc123' },
          usuario: { $ref: '#/components/schemas/Usuario' },
        },
      },

      // ── Paginación de tareas ──
      TareasPaginadas: {
        type: 'object',
        properties: {
          tareas: { type: 'array', items: { $ref: '#/components/schemas/Tarea' } },
          total: { type: 'integer', example: 42, description: 'Total de tareas que coinciden con los filtros' },
          pagina: { type: 'integer', example: 1 },
          totalPaginas: { type: 'integer', example: 3 },
        },
      },

      // ── Subtarea input ──
      SubtareaInput: {
        type: 'object',
        required: ['titulo'],
        properties: {
          titulo: { type: 'string', example: 'Configurar Passport.js con estrategia Google' },
          descripcion: { type: 'string', example: 'Instalar passport, passport-google-oauth20 y configurar clientID y clientSecret.' },
          orden: { type: 'integer', example: 1 },
        },
      },

      // ── Dashboard Stats ──
      DashboardStats: {
        type: 'object',
        properties: {
          resumen: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 24 },
              completadas: { type: 'integer', example: 9 },
              tasaCompletado: { type: 'integer', example: 37, description: 'Porcentaje de tareas completadas sobre el total' },
              vencidas: { type: 'integer', example: 2 },
              proximasAVencer: { type: 'integer', example: 4, description: 'Tareas que vencen en los próximos 7 días' },
              progresoPromedio: { type: 'integer', example: 45, description: 'Progreso medio de las tareas en_progreso' },
            },
          },
          porEstado: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string', enum: ['pendiente', 'en_progreso', 'completada', 'cancelada'], example: 'pendiente' },
                total: { type: 'integer', example: 10 },
              },
            },
          },
          porPrioridad: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string', enum: ['baja', 'media', 'alta', 'urgente'], example: 'alta' },
                total: { type: 'integer', example: 6 },
              },
            },
          },
          completadasPorMes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: {
                  type: 'object',
                  properties: {
                    año: { type: 'integer', example: 2025 },
                    mes: { type: 'integer', example: 1, description: '1 = Enero, 12 = Diciembre' },
                  },
                },
                total: { type: 'integer', example: 5 },
              },
            },
          },
          porCategoria: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string', example: 'Trabajo' },
                total: { type: 'integer', example: 8 },
              },
            },
          },
        },
      },

      // ── Error genérico ──
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Descripción del error' },
        },
      },

      // ── Error de validación ──
      ErrorValidacion: {
        type: 'object',
        properties: {
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                msg: { type: 'string', example: 'Email no válido' },
                value: { type: 'string', example: 'no-es-email' },
              },
            },
          },
        },
      },
    },

    // ─── Respuestas reutilizables ─────────────────────
    responses: {
      Unauthorized: {
        description: '🔒 Token JWT no proporcionado, inválido o expirado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            examples: {
              sinToken: { summary: 'Sin token', value: { error: 'Acceso denegado. Token no proporcionado.' } },
              tokenInvalido: { summary: 'Token inválido', value: { error: 'Token inválido.' } },
              tokenExpirado: { summary: 'Token expirado', value: { error: 'Token expirado. Inicia sesión de nuevo.' } },
            },
          },
        },
      },
      NotFound: {
        description: '❌ Recurso no encontrado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Tarea no encontrada.' },
          },
        },
      },
      ValidationError: {
        description: '⚠️ Error de validación en los datos enviados',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorValidacion' },
          },
        },
      },
      RateLimit: {
        description: '⏱️ Rate limit superado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Demasiadas solicitudes, inténtalo más tarde.' },
          },
        },
      },
      ServerError: {
        description: '💥 Error interno del servidor',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Error interno del servidor' },
          },
        },
      },
    },

    // ─── Parámetros reutilizables ─────────────────────
    parameters: {
      tareaId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'ID único de la tarea (MongoDB ObjectId)',
        schema: { type: 'string', example: '6758b1c2d3e4f50102030401' },
      },
      subtareaId: {
        name: 'subtareaId',
        in: 'path',
        required: true,
        description: 'ID único de la subtarea (MongoDB ObjectId)',
        schema: { type: 'string', example: '6758b1c2d3e4f50102030410' },
      },
    },
  },

  // ─── Tags (grupos de endpoints) ───────────────────────
  tags: [
    { name: 'Health', description: 'Estado del servidor' },
    { name: 'Auth', description: '🔐 Registro, login y gestión del perfil de usuario' },
    { name: 'Tareas', description: '✅ CRUD completo de tareas, subtareas y cambios de estado' },
    { name: 'IA', description: '🤖 Endpoints de inteligencia artificial (OpenAI GPT-4o-mini) — Rate limit: 10 req/min' },
    { name: 'Estadísticas', description: '📊 Dashboard y datos de productividad calculados con aggregation pipelines de MongoDB' },
  ],

  // ─── PATHS (endpoints) ────────────────────────────────
  paths: {

    // ══════════════════════════════════════════
    //  HEALTH
    // ══════════════════════════════════════════
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Comprobar el estado del servidor',
        description: 'Endpoint público para verificar que la API está activa y funcionando correctamente.',
        operationId: 'healthCheck',
        responses: {
          200: {
            description: '✅ Servidor operativo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'OK' },
                    message: { type: 'string', example: 'SmartTask IA API funcionando correctamente' },
                    timestamp: { type: 'string', format: 'date-time', example: '2025-01-20T10:30:00.000Z' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ══════════════════════════════════════════
    //  AUTH
    // ══════════════════════════════════════════
    '/auth/registro': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar un nuevo usuario',
        description: 'Crea una nueva cuenta de usuario. La contraseña se hashea automáticamente con **bcrypt (cost 12)**. Devuelve el usuario creado y un JWT listo para usar.',
        operationId: 'registro',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'email', 'password'],
                properties: {
                  nombre: { type: 'string', minLength: 2, maxLength: 50, example: 'Ana García López' },
                  email: { type: 'string', format: 'email', example: 'ana.garcia@smarttask.dev' },
                  password: { type: 'string', minLength: 6, example: 'Password123', description: 'Mínimo 6 caracteres' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: '✅ Cuenta creada correctamente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
                example: {
                  mensaje: '¡Cuenta creada correctamente!',
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  usuario: { id: '6758a1b2c3d4e5f601020304', nombre: 'Ana García López', email: 'ana.garcia@smarttask.dev', rol: 'usuario', createdAt: '2025-01-20T10:00:00.000Z' },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          409: {
            description: '⚠️ El email ya está registrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Ya existe una cuenta con ese email.' },
              },
            },
          },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        description: 'Autentica al usuario con email y contraseña. Devuelve un **JWT válido durante 7 días** que debe incluirse en todas las peticiones protegidas como `Authorization: Bearer <token>`.',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'ana.garcia@smarttask.dev' },
                  password: { type: 'string', example: 'Password123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '✅ Login exitoso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
                example: {
                  mensaje: '¡Bienvenido de nuevo, Ana!',
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  usuario: { id: '6758a1b2c3d4e5f601020304', nombre: 'Ana García López', email: 'ana.garcia@smarttask.dev', rol: 'admin', createdAt: '2024-09-01T08:00:00.000Z' },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: {
            description: '❌ Credenciales incorrectas',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Credenciales incorrectas.' },
              },
            },
          },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/auth/perfil': {
      get: {
        tags: ['Auth'],
        summary: 'Obtener perfil del usuario autenticado',
        description: 'Devuelve los datos públicos del usuario cuyo JWT está en la cabecera.',
        operationId: 'obtenerPerfil',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: '✅ Perfil del usuario',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { usuario: { $ref: '#/components/schemas/Usuario' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      put: {
        tags: ['Auth'],
        summary: 'Actualizar nombre del perfil',
        description: 'Actualiza el nombre del usuario autenticado. El email no es modificable.',
        operationId: 'actualizarPerfil',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  nombre: { type: 'string', minLength: 2, maxLength: 50, example: 'Ana García Ruiz' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '✅ Perfil actualizado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Perfil actualizado.' },
                    usuario: { $ref: '#/components/schemas/Usuario' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/auth/cambiar-password': {
      put: {
        tags: ['Auth'],
        summary: 'Cambiar contraseña',
        description: 'Cambia la contraseña del usuario autenticado. Requiere verificar la contraseña actual.',
        operationId: 'cambiarPassword',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['passwordActual', 'passwordNueva'],
                properties: {
                  passwordActual: { type: 'string', example: 'Password123', description: 'Contraseña actual del usuario' },
                  passwordNueva: { type: 'string', minLength: 6, example: 'NuevaPassword456', description: 'Nueva contraseña (mínimo 6 caracteres)' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '✅ Contraseña actualizada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { mensaje: { type: 'string', example: 'Contraseña actualizada correctamente.' } },
                },
              },
            },
          },
          400: {
            description: '❌ Contraseña actual incorrecta',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'La contraseña actual es incorrecta.' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ══════════════════════════════════════════
    //  ELIMINAR CUENTA
    // ══════════════════════════════════════════
    '/auth/cuenta': {
      delete: {
        tags: ['Auth'],
        summary: 'Eliminar cuenta y todos los datos del usuario',
        description: 'Elimina **permanentemente** la cuenta del usuario autenticado y **todo su histórico de tareas** (incluyendo subtareas). Esta acción es **irreversible**. Se requiere confirmar la contraseña actual como medida de seguridad.',
        operationId: 'eliminarCuenta',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', example: 'Password123', description: 'Contraseña actual del usuario para confirmar la eliminación' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '✅ Cuenta y datos eliminados correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Cuenta y todos los datos asociados eliminados correctamente.' },
                    resumen: {
                      type: 'object',
                      properties: {
                        email: { type: 'string', example: 'ana.garcia@smarttask.dev' },
                        tareasEliminadas: { type: 'integer', example: 16 },
                        totalTareas: { type: 'integer', example: 16 },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: {
            description: '❌ Contraseña incorrecta',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Contraseña incorrecta. No se puede eliminar la cuenta.' },
              },
            },
          },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },


    // ══════════════════════════════════════════
    //  TAREAS
    // ══════════════════════════════════════════
    '/tasks': {
      get: {
        tags: ['Tareas'],
        summary: 'Listar tareas del usuario',
        description: 'Devuelve las tareas del usuario autenticado con soporte para **filtros, búsqueda y paginación**. Solo se devuelven las tareas del usuario del JWT.',
        operationId: 'obtenerTareas',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'estado', in: 'query', schema: { type: 'string', enum: ['pendiente', 'en_progreso', 'completada', 'cancelada'] }, description: 'Filtrar por estado', example: 'pendiente' },
          { name: 'prioridad', in: 'query', schema: { type: 'string', enum: ['baja', 'media', 'alta', 'urgente'] }, description: 'Filtrar por prioridad', example: 'alta' },
          { name: 'categoria', in: 'query', schema: { type: 'string' }, description: 'Filtrar por categoría exacta', example: 'Trabajo' },
          { name: 'buscar', in: 'query', schema: { type: 'string' }, description: 'Búsqueda por texto en título y descripción (regex case-insensitive)', example: 'microservicio' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 }, description: 'Número de página', example: 1 },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }, description: 'Resultados por página', example: 15 },
          { name: 'orden', in: 'query', schema: { type: 'string', default: '-createdAt' }, description: 'Campo de ordenación (prefijo `-` para descendente)', example: '-fechaVencimiento' },
        ],
        responses: {
          200: {
            description: '✅ Lista de tareas paginada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TareasPaginadas' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      post: {
        tags: ['Tareas'],
        summary: 'Crear una nueva tarea',
        description: 'Crea una nueva tarea asociada al usuario autenticado. El campo `titulo` y `fechaVencimiento` son obligatorios.',
        operationId: 'crearTarea',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TareaInput' },
              example: {
                titulo: 'Implementar la autenticación OAuth2 con Google',
                descripcion: 'Integrar login con Google usando Passport.js y gestionar el callback de redirección correctamente.',
                prioridad: 'alta',
                categoria: 'Trabajo',
                etiquetas: ['oauth', 'google', 'auth'],
                fechaVencimiento: '2025-03-01',
              },
            },
          },
        },
        responses: {
          201: {
            description: '✅ Tarea creada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Tarea creada correctamente.' },
                    tarea: { $ref: '#/components/schemas/Tarea' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/tasks/{id}': {
      parameters: [{ $ref: '#/components/parameters/tareaId' }],
      get: {
        tags: ['Tareas'],
        summary: 'Obtener una tarea por ID',
        description: 'Devuelve el detalle completo de una tarea incluyendo todas sus subtareas. Solo accesible si la tarea pertenece al usuario autenticado.',
        operationId: 'obtenerTarea',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: '✅ Detalle de la tarea',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { tarea: { $ref: '#/components/schemas/Tarea' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      put: {
        tags: ['Tareas'],
        summary: 'Actualizar una tarea completa',
        description: 'Actualiza los campos de una tarea existente. Solo el propietario puede editarla. Admite actualización parcial (solo los campos enviados se modifican).',
        operationId: 'actualizarTarea',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TareaInput' },
            },
          },
        },
        responses: {
          200: {
            description: '✅ Tarea actualizada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Tarea actualizada.' },
                    tarea: { $ref: '#/components/schemas/Tarea' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      delete: {
        tags: ['Tareas'],
        summary: 'Eliminar una tarea',
        description: 'Elimina permanentemente una tarea y todas sus subtareas. Esta acción **no tiene vuelta atrás**.',
        operationId: 'eliminarTarea',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: '✅ Tarea eliminada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { mensaje: { type: 'string', example: 'Tarea eliminada correctamente.' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/tasks/{id}/estado': {
      parameters: [{ $ref: '#/components/parameters/tareaId' }],
      patch: {
        tags: ['Tareas'],
        summary: 'Cambiar solo el estado de una tarea',
        description: 'Actualiza únicamente el estado de la tarea. Al pasar a `completada`, se registra automáticamente la `fechaCompletada`. Al salir de `completada`, se limpia dicha fecha.',
        operationId: 'cambiarEstado',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['estado'],
                properties: {
                  estado: { type: 'string', enum: ['pendiente', 'en_progreso', 'completada', 'cancelada'], example: 'completada' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '✅ Estado actualizado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Estado actualizado.' },
                    tarea: { $ref: '#/components/schemas/Tarea' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/tasks/{id}/subtareas': {
      parameters: [{ $ref: '#/components/parameters/tareaId' }],
      post: {
        tags: ['Tareas'],
        summary: 'Añadir subtareas a una tarea',
        description: 'Agrega un array de subtareas a la tarea indicada. Útil para añadir subtareas manualmente (sin IA). Para las generadas por IA usa `POST /api/ai/generar-subtareas`.',
        operationId: 'agregarSubtareas',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subtareas'],
                properties: {
                  subtareas: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/components/schemas/SubtareaInput' },
                  },
                  generadoPorIA: { type: 'boolean', default: false, description: 'Marca si las subtareas fueron generadas por IA' },
                },
              },
              example: {
                subtareas: [
                  { titulo: 'Instalar passport y passport-google-oauth20', descripcion: 'npm install passport passport-google-oauth20', orden: 1 },
                  { titulo: 'Configurar clientID y clientSecret en .env', orden: 2 },
                ],
                generadoPorIA: false,
              },
            },
          },
        },
        responses: {
          200: {
            description: '✅ Subtareas añadidas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Subtareas añadidas correctamente.' },
                    tarea: { $ref: '#/components/schemas/Tarea' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/tasks/{id}/subtareas/{subtareaId}/toggle': {
      parameters: [
        { $ref: '#/components/parameters/tareaId' },
        { $ref: '#/components/parameters/subtareaId' },
      ],
      patch: {
        tags: ['Tareas'],
        summary: 'Marcar / desmarcar una subtarea como completada',
        description: 'Invierte el estado `completada` de la subtarea. El **progreso** de la tarea padre se recalcula automáticamente mediante el middleware `pre-save` de Mongoose.',
        operationId: 'toggleSubtarea',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: '✅ Estado de la subtarea alternado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Subtarea actualizada.' },
                    tarea: { $ref: '#/components/schemas/Tarea' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ══════════════════════════════════════════
    //  IA
    // ══════════════════════════════════════════
    '/ai/generar-subtareas': {
      post: {
        tags: ['IA'],
        summary: 'Generar subtareas inteligentes con OpenAI',
        description: `Envía la tarea a **GPT-4o-mini** y genera subtareas adaptadas automáticamente según:
- La **prioridad** de la tarea (urgente → más subtareas, más concretas)
- Los **días restantes** hasta la fecha de vencimiento
- El **título y descripción** de la tarea

Las subtareas generadas **reemplazan** las existentes en la tarea y se persisten en MongoDB.
También devuelve un **consejo de productividad** personalizado.

> ⏱️ **Rate limit:** 10 peticiones por minuto`,
        operationId: 'generarSubtareas',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tareaId'],
                properties: {
                  tareaId: { type: 'string', example: '6758b1c2d3e4f50102030401', description: 'ID de la tarea para la que generar subtareas' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '✅ Subtareas generadas y guardadas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Subtareas generadas por IA correctamente.' },
                    subtareas: { type: 'array', items: { $ref: '#/components/schemas/Subtarea' } },
                    consejo: { type: 'string', example: 'Con solo 8 días y prioridad urgente, enfócate en los 3 primeros puntos críticos antes de entrar en detalles de documentación.' },
                    tokensUsados: { type: 'integer', example: 487, description: 'Tokens consumidos en la llamada a OpenAI' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          429: { $ref: '#/components/responses/RateLimit' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/ai/analizar-carga': {
      get: {
        tags: ['IA'],
        summary: 'Analizar la carga de trabajo con IA',
        description: `Recopila todas las tareas **pendientes y en progreso** del usuario y las envía a GPT-4o-mini para obtener:
1. Una evaluación del nivel de carga de trabajo actual
2. Las 3 tareas más urgentes en las que enfocarse
3. Un consejo de productividad personalizado

> ⏱️ **Rate limit:** 10 peticiones por minuto`,
        operationId: 'analizarCargaTrabajo',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: '✅ Análisis generado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    analisis: { type: 'string', example: 'Tienes una carga de trabajo elevada con 3 tareas urgentes. Prioriza el certificado SSL (vence hoy), la arquitectura del microservicio (8 días) y la presentación DAW (21 días). Consejo: usa la técnica Pomodoro para las tareas técnicas largas.' },
                    totalTareasPendientes: { type: 'integer', example: 7 },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimit' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/ai/sugerir-descripcion': {
      post: {
        tags: ['IA'],
        summary: 'Sugerir descripción para una tarea',
        description: `A partir del **título**, categoría y prioridad de una tarea, genera automáticamente una descripción profesional y accionable de 2-3 oraciones usando GPT-4o-mini.

Ideal para completar rápidamente el formulario de creación de tareas.

> ⏱️ **Rate limit:** 10 peticiones por minuto`,
        operationId: 'sugerirDescripcion',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['titulo'],
                properties: {
                  titulo: { type: 'string', example: 'Implementar autenticación OAuth2 con Google' },
                  categoria: { type: 'string', example: 'Trabajo' },
                  prioridad: { type: 'string', enum: ['baja', 'media', 'alta', 'urgente'], example: 'alta' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '✅ Descripción generada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    descripcion: { type: 'string', example: 'Integrar el sistema de autenticación de Google mediante Passport.js, configurando el callback de redirección y gestionando el token de sesión de forma segura. El objetivo es permitir a los usuarios acceder con su cuenta de Google sin necesidad de registro manual.' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimit' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ══════════════════════════════════════════
    //  ESTADÍSTICAS
    // ══════════════════════════════════════════
    '/stats/dashboard': {
      get: {
        tags: ['Estadísticas'],
        summary: 'Obtener estadísticas del dashboard',
        description: `Devuelve todos los datos necesarios para renderizar el dashboard personal del usuario. Calculados mediante **aggregation pipelines de MongoDB** directamente en el servidor para máximo rendimiento.

Incluye:
- **KPIs**: total, completadas, vencidas, próximas a vencer, tasa de éxito, progreso medio
- **Por estado**: distribución para el gráfico de anillo (Doughnut Chart)
- **Por prioridad**: distribución para el gráfico de barras
- **Por categoría**: top 8 categorías
- **Historial mensual**: tareas completadas en los últimos 6 meses (Line Chart)`,
        operationId: 'obtenerEstadisticasDashboard',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: '✅ Estadísticas del dashboard',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DashboardStats' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/stats/productividad': {
      get: {
        tags: ['Estadísticas'],
        summary: 'Obtener datos de productividad diaria',
        description: 'Devuelve las tareas **creadas** y **completadas** por día en el período indicado. Usado para renderizar el gráfico de productividad de doble línea en el dashboard.',
        operationId: 'obtenerProductividad',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'dias',
            in: 'query',
            schema: { type: 'integer', default: 30, minimum: 7, maximum: 365 },
            description: 'Número de días hacia atrás desde hoy',
            example: 30,
          },
        ],
        responses: {
          200: {
            description: '✅ Datos de productividad',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    creadasPorDia: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          _id: { type: 'string', example: '2025-01-15', description: 'Fecha en formato YYYY-MM-DD' },
                          creadas: { type: 'integer', example: 3 },
                        },
                      },
                    },
                    completadasPorDia: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          _id: { type: 'string', example: '2025-01-15' },
                          completadas: { type: 'integer', example: 2 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
  },
};

module.exports = swaggerDefinition;
