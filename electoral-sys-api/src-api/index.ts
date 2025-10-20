import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose, { set } from 'mongoose';

// Rutas (importar los routers definidos en archivo routes)
import authRoutes from './routes/authRoutes';
import campaignRoutes from './routes/campaignsRoutes';
import candidateRoutes from './routes/candidatesRoutes';
import voteRoutes from './routes/votesRoutes';
import { setupSocketIO } from './config/socket.config';
import { socketService } from './services/socketService';

// Configuración de variables de entorno (.env)
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de seguridad y logging
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Configuracion de Socket.IO
const server = require('http').createServer(app);
const io = setupSocketIO(server); 
socketService.initialize(io);

// Iniciar el servidor HTTP con Socket.IO
const PORT_SOCKET = process.env.PORT_SOCKET || 3000;
server.listen(PORT_SOCKET, () => {
  console.log(`Servidor - socket corriendo en el puerto ${PORT_SOCKET}`);
});

// Conexión a la base de datos MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://govandoh_db_user:ycDb91DD2OVXPmG4@dev-cluster.2ypdqtm.mongodb.net/?retryWrites=true&w=majority&appName=Dev-Cluster';
mongoose.connect(mongoURI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));
  
// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.json({ message: 'API del Sistema de Votación del Colegio de Ingenieros' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto  ${PORT}`);
});

export default app;