import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';

// Rutas
import authRoutes from './routes/authRoutes.js';
import campaignRoutes from './routes/campaignsRoutes.js';
import candidateRoutes from './routes/candidatesRoutes.js';
import voteRoutes from './routes/votesRoutes.js';
import { setupSocketIO } from './config/socket.config.js';
import { socketService } from './services/socketService.js';

import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - ACTUALIZA ESTO
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://electoral-sys-frontend.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean); // Elimina valores undefined

app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sin origin (como mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Añade esto ANTES de las rutas
app.options('*', cors()); // Preflight para todas las rutas

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de Socket.IO

const server = http.createServer(app);
const io = setupSocketIO(server);
socketService.initialize(io);

// Socket.IO CORS - ACTUALIZA ESTO TAMBIÉN
io.engine.on("connection_error", (err) => {
  console.log('Socket.IO Connection Error:', err);
});

// Conexión a MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/votaciones-colegio';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);

// Swagger UI
try {
  // Busca swagger.yaml en la raíz del proyecto (funciona en Render y local)
  const swaggerPath = path.resolve(process.cwd(), 'swagger.yaml');
  const fileContents = fs.readFileSync(swaggerPath, 'utf8');
  const swaggerDocument = yaml.load(fileContents) as Record<string, unknown>;
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log(`✅ Swagger UI mounted at /api-docs usando ${swaggerPath}`);
} catch (err) {
  console.warn('⚠️ No se pudo cargar swagger.yaml:', err);
}

// Ruta base
app.get('/', (req, res) => {
  res.json({ 
    message: 'API del Sistema de Votación del Colegio de Ingenieros',
    status: 'online',
    endpoints: {
      docs: '/api-docs',
      auth: '/api/auth',
      campaigns: '/api/campaigns',
      candidates: '/api/candidates',
      votes: '/api/votes'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar el servidor
const PORT_SOCKET = process.env.PORT_SOCKET || PORT;
server.listen(PORT_SOCKET, () => {
  console.log(`✅ Servidor (HTTP + Socket.IO) corriendo en el puerto ${PORT_SOCKET}`);
});

export default app;