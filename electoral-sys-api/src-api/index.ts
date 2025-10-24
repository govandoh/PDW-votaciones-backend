import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose, { set } from 'mongoose';
import http from 'http';

// Rutas (importar los routers definidos en archivo routes)
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

// Configuración de variables de entorno (.env)
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS más segura
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL || ''].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200'];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (como aplicaciones móviles o Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Configuracion de Socket.IO
const server = http.createServer(app);
const io = setupSocketIO(server); 
socketService.initialize(io);

// Iniciar el servidor HTTP con Socket.IO
const PORT_SOCKET = process.env.PORT_SOCKET || 3000;
server.listen(PORT_SOCKET, () => {
  console.log(`Servidor - socket corriendo en el puerto ${PORT_SOCKET}`);
});

// Conexión a la base de datos MongoDB
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('MONGODB_URI no está definida en las variables de entorno');
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  });
  
// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);

// Swagger UI (YAML)
try {
  // Determinar directorio base de forma robusta (funciona en ESM y CommonJS)
  function getBaseDir(): string {
    // En ESM, import.meta.url está disponible
    try {
      // @ts-ignore: import.meta puede no estar permitido según la configuración de compilación
      const filename = fileURLToPath(import.meta.url);
      return path.dirname(filename);
    } catch (e) {
      // Fallback a __dirname (CommonJS) o process.cwd()
      // @ts-ignore
      if (typeof __dirname !== 'undefined') return __dirname;
      return process.cwd();
    }
  }

  const baseDir = getBaseDir();
  // Intentar varias ubicaciones posibles para swagger.yaml
  let swaggerPath = '';
  let fileContents = '';
  
  const possiblePaths = [
    path.join(baseDir, '..', 'swagger.yaml'),  // ../swagger.yaml
    path.join(baseDir, '..', '..', 'swagger.yaml'), // ../../swagger.yaml
    path.join(process.cwd(), 'swagger.yaml'),  // ./swagger.yaml
    path.join(process.cwd(), '..', 'swagger.yaml')  // ../swagger.yaml
  ];
  
  // Buscar el archivo en todas las ubicaciones posibles
  let foundFile = false;
  for (const testPath of possiblePaths) {
    try {
      fileContents = fs.readFileSync(testPath, 'utf8');
      swaggerPath = testPath;
      foundFile = true;
      console.log(`Swagger file found at: ${swaggerPath}`);
      break;
    } catch (e) {
      // Archivo no encontrado en esta ubicación, continuamos con la siguiente
    }
  }
  
  if (!foundFile) {
    throw new Error('swagger.yaml no encontrado en ninguna ubicación posible');
  }
  // parse YAML
  const swaggerDocument = yaml.load(fileContents) as Record<string, unknown>;

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log(`Swagger UI mounted at /api-docs (from ${swaggerPath})`);
} catch (err) {
  console.warn('No se pudo cargar swagger.yaml para /api-docs:', err);
}

// Ruta base
app.get('/', (req, res) => {
  res.json({ 
    message: 'API del Sistema de Votación del Colegio de Ingenieros',
    version: '1.0.0',
    status: 'running',
    docs: '/api-docs'
  });
});

// Manejo de errores global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;