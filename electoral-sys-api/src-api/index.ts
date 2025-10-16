import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Rutas (importar los routers definidos en archivo routes)
import authRoutes from './routes/authRoutes';
import campaignRoutes from './routes/campaignsRoutes';
import candidateRoutes from './routes/candidatesRoutes';
import voteRoutes from './routes/votesRoutes';

// Configuración de variables de entorno (.env)
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de seguridad y logging
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

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
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

export default app;