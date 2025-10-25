# Sistema de Votaciones Colegio de Ingenieros de Guatemala - BACKEND

## Descripción

Este proyecto corresponde al backend de una plataforma web para la gestión y realización de votaciones destinadas a la elección de la Junta Directiva del Colegio de Ingenieros de Guatemala.

El backend, desarrollado en **Node.js + Express** con **TypeScript** y **Mongoose**, es responsable de:
- Gestión segura de usuarios (administradores y votantes)
- Administración de campañas y candidatos
- Emisión y control de votos
- Almacenamiento en MongoDB
- Seguridad JWT (autenticación y autorización)
- Actualización de resultados en tiempo real vía **Socket.IO**
- Documentación de la API con **Swagger**

---

## Características Principales

- **Registro y autenticación** de votantes y administradores con validaciones robustas.
- **Gestión de campañas electorales:** CRUD, control de estado (activa/inactiva/finalizada), tiempo de duración.
- **Gestión de candidatos:** CRUD, asignación a campañas.
- **Emisión de votos segura:** cada votante puede votar solo dentro de los límites definidos.
- **Resultados en tiempo real** usando Socket.IO.
- **JWT obligatorio** en cada petición autenticada.
- **Swagger** para documentación interactiva de la API.
- **CORS flexible** para integración segura con frontend desplegado.

---

## Tecnologías

- Node.js 18+
- Express 4.x
- TypeScript
- MongoDB (Mongoose)
- JWT (jsonwebtoken)
- Socket.IO
- Swagger (swagger-ui-express, js-yaml)
- Helmet, CORS, dotenv

---

## Estructura de Carpetas

```
electoral-sys-api/
├── config/             # Configuración de sockets, middlewares
├── controllers/        # Lógica de negocio por recurso (auth, campañas, votos, candidatos)
├── middleware/         # Middlewares (auth, roles)
├── models/             # Esquemas Mongoose
├── routes/             # Definición de rutas REST
├── services/           # Lógica auxiliar (WebSockets, timers)
├── index.ts            # Entrada principal del servidor Express
├── swagger.yaml        # Documentación OpenAPI
├── .env                # Variables de entorno (no subir)
└── package.json
```

## Rutas y Endpoints

Las rutas siguen el estándar RESTful y están documentadas en Swagger `/api-docs`.

### Autenticación

- `POST /api/auth/register`  
  Registrar nuevo votante o admin.
- `POST /api/auth/login`  
  Iniciar sesión, obtener JWT.
- `GET /api/auth/verify`  
  Verificar token (requiere JWT).

### Campañas

- `GET /api/campaigns`  
  Listar campañas.
- `POST /api/campaigns`  
  Crear campaña (solo admin).
- `GET /api/campaigns/:id`  
  Detalle de campaña, candidatos, votos.
- `PUT /api/campaigns/:id`  
  Actualizar campaña (solo admin).
- `PATCH /api/campaigns/:id/estado`  
  Cambiar estado: activa/inactiva/finalizada.
- `DELETE /api/campaigns/:id`  
  Eliminar campaña (solo admin).
- `GET /api/campaigns/:id/report`  
  Reporte general de campaña.

### Candidatos

- `GET /api/candidates`  
  Listar candidatos.
- `GET /api/candidates/campaign/:campaignId`  
  Candidatos de una campaña.
- `POST /api/candidates`  
  Crear candidato (solo admin).
- `GET /api/candidates/:id`  
  Detalle candidato.
- `PUT /api/candidates/:id`  
  Actualizar candidato.
- `DELETE /api/candidates/:id`  
  Eliminar candidato.

### Votos

- `POST /api/votes`  
  Emitir voto (votante autenticado).
- `GET /api/votes/user/campaign/:campaignId`  
  Votos del usuario en campaña.
- `GET /api/votes/campaign/:campaignId/results`  
  Resultados de campaña.

---

## Autenticación y Seguridad

- **JWT**: Todas las rutas protegidas requieren el header:
  ```
  Authorization: Bearer <token>
  ```
- Si el token es inválido o ha expirado, la API responde 401 y el frontend debe forzar logout.
- El token se genera al registrar o iniciar sesión.

---

## Websockets y Resultados en Tiempo Real

- El backend expone Socket.IO en el mismo puerto que Express.
- Cuando un voto es registrado, se emite `voteUpdate` a todos los clientes conectados a la campaña.
- El frontend debe conectarse a Socket.IO con el mismo token JWT para autenticación:
  ```js
  import { io } from "socket.io-client";
  const socket = io("https://electoral-sys-api.onrender.com", {
    auth: { token: localStorage.getItem("token") }
  });
  socket.emit("joinCampaign", "<campaignId>");
  socket.on("voteUpdate", (data) => { /* actualizar gráfico */ });
  ```

---

## Documentación Swagger

- Disponible en:  
  ```
  https://electoral-sys-api.onrender.com/api-docs
  ```
- Permite probar todos los endpoints, ver ejemplos de request y response, y las validaciones.

---

## Pruebas con Postman/cURL

### Ejemplo: Registrar usuario
```bash
curl -X POST https://electoral-sys-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"numeroColegiado":"10001","nombres":"Juan","apellidos":"Pérez","correo":"juan@example.com","dpi":"1234567890123","fechaNacimiento":"01-01-1990","password":"Password123!"}'
```
### Ejemplo: Login
```bash
curl -X POST https://electoral-sys-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"numeroColegiado":"10001","dpi":"1234567890123","fechaNacimiento":"01-01-1990","password":"Password123!"}'
```

### Ejemplo: Crear campaña (requiere token de admin)
```bash
curl -X POST https://electoral-sys-api.onrender.com/api/campaigns \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Elección 2025","descripcion":"Directiva 2025","votosPorVotante":1,"fechaInicio":"2025-11-01T08:00:00.000Z","fechaFin":"2025-11-15T18:00:00.000Z"}'
```

---

## Consideraciones y Buenas Prácticas

- **Variables sensibles** como `JWT_SECRET` y `MONGODB_URI` nunca deben subirse a git.
- **CORS:** Actualiza siempre `CLIENT_URL` al dominio real de tu frontend.
- **Validaciones:** Todas las entradas son validadas en backend y frontend.
- **Roles:** El middleware de autenticación y roles asegura que solo administradores pueden crear, modificar o eliminar campañas y candidatos.
- **Socket.IO:** El token JWT es obligatorio al abrir la conexión de WebSocket.
- **Timeouts:** Render puede "dormir" el backend en el plan free. El frontend debe manejar posibles delays en la primera llamada.
- **Logs:** En producción, los logs son más concisos. En desarrollo se usa `morgan('dev')`.

---

**Autor:** govandoh  - Gerardo Antonio Ovando Hernandez - 9490-21-7
**Repositorio:** https://github.com/govandoh/PDW-votaciones-backend

---
