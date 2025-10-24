import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'nocreoterminarconesto';

// Interfaz para el usuario autenticado desde JWT
interface AuthenticatedUser {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Interfaz para datos de socket autenticado
interface AuthenticatedSocket {
  user: AuthenticatedUser;
  campaignRooms: string[];
}

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware para autenticar conexiones con JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Error de autenticación: Token requerido'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      
      // Guardar información del usuario en el socket
      (socket as any).user = decoded;
      (socket as any).campaignRooms = [];
      
      return next();
    } catch (error) {
      return next(new Error('Error de autenticación: Token inválido'));
    }
  });

  return io;
}