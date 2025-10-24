import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

interface IPayload {
  userId: string;
  role: string
  iat: number;
  exp: number;
}

declare global {
    namespace Express {
        interface Request {
            usuario?: IPayload;
        }
    }
}

export const verificarToken = (req: Request, res: Response, next: NextFunction) => {
    try{
        // Obtener el token del encabezado Authorization
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if(!token){
            return res.status(401).json({message: 'Acceso denegado. Token no proporcionado. 1'});
        }
        
        const jwtSecret = process.env.JWT_SECRET || 'nocreoterminarconesto';
        if (!jwtSecret) {
            console.error('Error: JWT_SECRET no está definido en las variables de entorno');
            return res.status(500).json({message: 'Error de configuración del servidor'});
        }

        const decode = jwt.verify(token, jwtSecret) as IPayload;
        req.usuario = decode; 
        next();
    }catch(error){
        console.error('Error de autenticación:', error);
        return res.status(401).json({message: 'Token inválido o expirado. Iniciar sesión nuevamente.'});
    }
};

//Middleware para verificar si el usuario es admin
export const esAdmin = (req: Request, res: Response, next: NextFunction) => {
    if(!req.usuario) {
        return res.status(401).json({message: 'Acceso denegado. Usuario no autenticado. 2'});
    }
    
    if(req.usuario.role === 'admin'){
        next();
    }else{
        return res.status(403).json({message: 'Acceso denegado. Requiere rol de administrador.'});
    }
}


//Middleware para verificar si el usuario es votante
export const isVoter = (req: Request, res: Response, next: NextFunction) => {
  if (req.usuario?.role !== 'votante') {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de votante.' });
  }
  next();
};