import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'nocreoterminarconesto';

interface AuthenticatedUser {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://electoral-sys-frontend.vercel.app',
    process.env.CLIENT_URL
  ].filter((origin): origin is string => typeof origin === 'string');

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins as string[],
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling']
  });

  // Middleware para autenticar conexiones con JWT
  io.use((socket, next) => {
    console.log('Auth handshake:', socket.handshake.auth); // <-- Verifica el contenido
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log('⚠️ Socket connection without token');
      return next(new Error('Error de autenticación: Token requerido'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      (socket as any).user = decoded;
      (socket as any).campaignRooms = [];
      console.log('✅ Socket authenticated:', decoded.userId);
      return next();
    } catch (error) {
      console.log('❌ Invalid token:', error);
      return next(new Error('Error de autenticación: Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 New socket connection:', socket.data.userId);
  });

  return io;
}