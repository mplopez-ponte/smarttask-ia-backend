# 🚀 SmartTask IA

**Gestor de Tareas Inteligente con IA**  
Proyecto Final — Ciclo Formativo de Grado Superior de Desarrollo de Aplicaciones Web

---

## 📋 Descripción

SmartTask IA es una aplicación web full-stack para la gestión de tareas con inteligencia artificial integrada. Permite a los usuarios organizar sus tareas, generar subtareas automáticamente con el módulo de la IA de Duck.ia según la prioridad y fecha de vencimiento, y visualizar estadísticas de productividad en un dashboard interactivo.

---

## 🛠️ Stack Tecnológico

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | ≥18 | Entorno de ejecución |
| Express | 4.18 | Framework API REST |
| MongoDB | 6+ | Base de datos NoSQL |
| Mongoose | 8 | ODM para MongoDB |
| JWT (jsonwebtoken) | 9 | Autenticación stateless |
| bcryptjs | 2.4 | Hash de contraseñas |
| Duck.ai | DuckDuckGo AI 
| Helmet | 7 | Headers de seguridad HTTP |
| express-rate-limit | 7 | Protección contra abuso |
| express-validator | 7 | Validación de datos |

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 | Librería UI |
| React Router | 6 | Enrutamiento SPA |
| Bootstrap | 5.3 | Framework CSS |
| Chart.js + react-chartjs-2 | 4.4 | Gráficos estadísticos |
| Axios | 1.6 | Cliente HTTP |
| React Toastify | 10 | Notificaciones |

---

## 🏗️ Arquitectura del Proyecto

```
smarttask-ia/
├── backend/
│   ├── config/              # Configuración (futuro)
│   ├── controllers/
│   │   ├── auth.controller.js    # Registro, login, perfil
│   │   ├── task.controller.js    # CRUD de tareas
│   │   ├── ai.controller.js      # Integración DuckDuckGo AI
│   │   └── stats.controller.js   # Estadísticas con aggregation
│   ├── middleware/
│   │   └── auth.middleware.js    # JWT verification
│   ├── models/
│   │   ├── User.model.js         # Schema usuario + bcrypt
│   │   └── Task.model.js         # Schema tarea + subtareas
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── task.routes.js
│   │   ├── ai.routes.js
│   │   └── stats.routes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js                 # Entry point + conexión MongoDB
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── Layout.jsx        # Sidebar + Topbar móvil
    │   │   └── tasks/
    │   │       └── ModalCrearTarea.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx       # Estado global de autenticación
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx     # Dashboard con Chart.js
    │   │   ├── TareasPage.jsx        # Lista + Kanban
    │   │   ├── TareaDetallePage.jsx  # Detalle + IA subtareas
    │   │   └── PerfilPage.jsx
    │   ├── services/
    │   │   └── api.service.js        # Axios + interceptors
    │   ├── App.jsx                   # Router + rutas protegidas
    │   ├── index.css                 # Design system tokens
    │   └── index.js
    ├── .env.example
    └── package.json
```

---

## 📡 API REST — Endpoints

### 🔐 Autenticación (`/api/auth`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/registro` | ❌ | Crea nueva cuenta |
| POST | `/login` | ❌ | Inicia sesión, devuelve JWT |
| GET | `/perfil` | ✅ | Obtiene datos del usuario |
| PUT | `/perfil` | ✅ | Actualiza nombre |
| PUT | `/cambiar-password` | ✅ | Cambia contraseña |

### ✅ Tareas (`/api/tasks`)
> Todos los endpoints requieren JWT

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Listar tareas (filtros: estado, prioridad, buscar, page) |
| GET | `/:id` | Obtener tarea por ID |
| POST | `/` | Crear nueva tarea |
| PUT | `/:id` | Actualizar tarea completa |
| DELETE | `/:id` | Eliminar tarea |
| PATCH | `/:id/estado` | Cambiar solo el estado |
| PATCH | `/:id/subtareas/:subtareaId/toggle` | Marcar subtarea como completada |
| POST | `/:id/subtareas` | Añadir subtareas manualmente |

### 🤖 Inteligencia Artificial (`/api/ai`)
> Rate limit: 10 req/min por IP

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/generar-subtareas` | Genera subtareas con GPT-4o-mini según prioridad y fecha |
| GET | `/analizar-carga` | Analiza todas las tareas pendientes y da recomendaciones |
| POST | `/sugerir-descripcion` | Sugiere descripción para el título dado |

### 📊 Estadísticas (`/api/stats`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard` | KPIs, conteos por estado/prioridad/categoría, historial mensual |
| GET | `/productividad?dias=30` | Tareas creadas vs completadas por día |

---

## ⚙️ Instalación y Configuración

### Prerrequisitos
- Node.js ≥ 18
- MongoDB local o cuenta en [MongoDB Atlas](https://cloud.mongodb.com)
- API Key de [OpenAI](https://platform.openai.com)

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/smarttask-ia.git
cd smarttask-ia
```

### 2. Configurar el Backend
```bash
cd backend
npm install
cp .env.example .env
```

Edita el archivo `.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smarttask_ia
JWT_SECRET=tu_secreto_muy_largo_y_seguro_aqui
JWT_EXPIRE=7d
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
CLIENT_URL=http://localhost:3000
```

### 3. Configurar el Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```

El `.env` del frontend:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Ejecutar en desarrollo
```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm start
```

La app estará disponible en **http://localhost:3000**

---

## 🔒 Seguridad Implementada

| Medida | Descripción |
|---|---|
| **JWT Stateless** | Tokens firmados, expiración configurable (7d por defecto) |
| **Bcrypt (cost 12)** | Hash de contraseñas con sal aleatoria |
| **Helmet.js** | Cabeceras HTTP seguras (XSS, CSRF, clickjacking) |
| **Rate Limiting** | 100 req/15min global; 10 req/min en endpoints IA |
| **express-validator** | Validación y saneamiento de todos los inputs |
| **CORS restringido** | Solo acepta peticiones del origen configurado |
| **Aislamiento por usuario** | Todas las queries filtran por `usuario: req.usuario._id` |
| **select: false** | El campo password nunca se incluye en queries por defecto |

---

## 🤖 Funcionalidades de IA

### Generación de Subtareas
La IA analiza:
- **Título y descripción** de la tarea
- **Prioridad** (baja/media/alta/urgente)
- **Días restantes** hasta el vencimiento

Y genera entre 2-7 subtareas accionables adaptadas al tiempo disponible, junto con un **consejo personalizado**.

### Análisis de Carga de Trabajo
Evalúa todas las tareas pendientes del usuario y devuelve:
- Nivel de carga actual
- Las 3 tareas más urgentes
- Consejo de productividad personalizado

### Sugerencia de Descripción
Genera automáticamente una descripción profesional y accionable a partir del título de la tarea.

---

## 📊 Dashboard - Gráficos Chart.js

| Gráfico | Tipo | Datos |
|---|---|---|
| Por Estado | Doughnut | Pendiente / En Progreso / Completada / Cancelada |
| Por Prioridad | Bar | Baja / Media / Alta / Urgente |
| Por Categoría | Lista | Top 8 categorías |
| Completadas por Mes | Line | Últimos 6 meses |
| Productividad | Line (doble) | Creadas vs Completadas (últimos 30 días) |

---

## 📚 Diagrama de Base de Datos

### Colección `users`
```json
{
  "_id": "ObjectId",
  "nombre": "String (2-50)",
  "email": "String (único, lowercase)",
  "password": "String (hash bcrypt, select: false)",
  "rol": "String (usuario | admin)",
  "activo": "Boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Colección `tareas`
```json
{
  "_id": "ObjectId",
  "titulo": "String (3-100)",
  "descripcion": "String (max 1000)",
  "estado": "String (pendiente | en_progreso | completada | cancelada)",
  "prioridad": "String (baja | media | alta | urgente)",
  "categoria": "String",
  "etiquetas": ["String"],
  "fechaVencimiento": "Date",
  "fechaCompletada": "Date",
  "progreso": "Number (0-100, calculado auto)",
  "subtareasGeneradasPorIA": "Boolean",
  "subtareas": [{
    "_id": "ObjectId",
    "titulo": "String",
    "descripcion": "String",
    "completada": "Boolean",
    "orden": "Number"
  }],
  "usuario": "ObjectId (ref: User)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## 🌐 Vistas de la Aplicación

| Vista | Ruta | Descripción |
|---|---|---|
| Login | `/login` | Formulario de inicio de sesión |
| Registro | `/registro` | Formulario de creación de cuenta |
| Dashboard | `/dashboard` | KPIs + 5 gráficos + Análisis IA |
| Tareas | `/tareas` | Lista con filtros / Vista Kanban |
| Detalle Tarea | `/tareas/:id` | Info completa + subtareas IA + cambio de estado |
| Perfil | `/perfil` | Editar nombre y contraseña |

---

## 🚀 Despliegue en Producción

### Backend (Railway / Render / VPS)
```bash
npm start
```
Variables de entorno requeridas: `PORT`, `MONGO_URI`, `JWT_SECRET`, `OPENAI_API_KEY`, `CLIENT_URL`

### Frontend (Vercel / Netlify)
```bash
npm run build
```
Variable de entorno: `REACT_APP_API_URL=https://tu-api.com/api`

---

## 👨‍💻 Autor

Proyecto desarrollado para el **CFGS de Desarrollo de Aplicaciones Web (DAW)**  
Módulo: Desarrollo Web en Entorno Cliente / Servidor

---

## 📄 Licencia

MIT License — Libre para uso educativo
