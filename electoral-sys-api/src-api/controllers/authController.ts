import { Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/Usuario.js';

// Configuración
const JWT_SECRET = process.env.JWT_SECRET || 'nocreoterminarconesto';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // Token válido por 1 hora

const isValidDPI = (dpi: string) => /^\d{13}$/.test(dpi);


// Registro de nuevos usuarios
export const register = async (req: Request, res: Response) => {
  // Validación de errores
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { numeroColegiado, nombres, apellidos, correo, dpi, fechaNacimiento, password, role } = req.body;

    // Verificar si ya existe un usuario con el mismo número de colegiado
    let user = await User.findOne({ numeroColegiado });
    if (user) {
      return res.status(400).json({ message: 'El número de colegiado ya está registrado.' });
    }

    // Verificar si ya existe un usuario con el mismo DPI
    user = await User.findOne({ dpi });
    if (user) {
      return res.status(400).json({ message: 'El DPI ya está registrado.' });
    }

    if (!isValidDPI(dpi)) {
      return res.status(400).json({ message: 'El DPI debe contener exactamente 13 dígitos.' });
    }

    // Verificar si ya existe un usuario con el mismo correo
    user = await User.findOne({ correo });
    if (user) {
      return res.status(400).json({ message: 'El correo ya está registrado.' });
    }

    // Convertir formato DD-MM-YYYY a objeto Date
    const [day, month, year] = fechaNacimiento.split('-');
    const birthDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ message: 'Formato de fecha inválido.' });
    }

    // Crear nuevo usuario
    user = new User({
      numeroColegiado,
      nombres,
      apellidos,
      correo,
      dpi,
      fechaNacimiento: birthDate,
      password,
      // Permitir especificar rol admin si se proporciona, de lo contrario usar 'votante'
      role: role === 'admin' ? 'admin' : 'votante'
    });

    // Guardar usuario en la base de datos
    await user.save();

    // Generar token JWT
    const payload = {
      userId: user.id,
      role: user.role
    };

    // Usar aserciones de tipo para evitar problemas de tipado
    const token = jwt.sign(
      payload, 
      JWT_SECRET as jwt.Secret, 
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.id,
        numeroColegiado: user.numeroColegiado,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        dpi: user.dpi,
        fechaNacimiento: user.fechaNacimiento,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error en el servidor al registrar usuario.' });
  }
};

// Login de usuarios
export const login = async (req: Request, res: Response) => {
  // Validación de errores
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { numeroColegiado, dpi, fechaNacimiento, password } = req.body;

    // Buscar usuario por número de colegiado
    const user = await User.findOne({ numeroColegiado });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas. 1' });
    }

    // Verificar DPI
    if (user.dpi !== dpi) {
      return res.status(400).json({ message: 'Credenciales inválidas. 2' });
    }

    if (!isValidDPI(dpi)) {
      return res.status(400).json({ message: 'El DPI debe contener exactamente 13 dígitos.' });
    }

    // Convertir formato DD-MM-YYYY a Date para comparación
    const [dayInput, monthInput, yearInput] = fechaNacimiento.split('-');
    const inputDate = new Date(`${yearInput}-${monthInput}-${dayInput}T00:00:00.000Z`);
    
    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({ message: 'Formato de fecha inválido.' });
    }
    
    // Obtener la fecha almacenada en la base de datos
    const userDate = new Date(user.fechaNacimiento);
    
    // Comparar año, mes y día
    const sameYear = userDate.getFullYear() === inputDate.getFullYear();
    const sameMonth = userDate.getMonth() === inputDate.getMonth();
    const sameDay = userDate.getDate() === inputDate.getDate();
    
    if (!sameYear || !sameMonth || !sameDay) {
      return res.status(400).json({ message: 'Credenciales inválidas. 3' });
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas. 4' });
    }

    // Generar token JWT
    const payload = {
      userId: user.id,
      role: user.role
    };

    // Usar aserciones de tipo para evitar problemas de tipado
    const token = jwt.sign(
      payload, 
      JWT_SECRET as jwt.Secret, 
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        numeroColegiado: user.numeroColegiado,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión.' });
  }
};

// Verificar el token del usuario actual
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.usuario?.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json({
      user: {
        id: user.id,
        numeroColegiado: user.numeroColegiado,
        nombres: user.nombres,
        correo: user.correo,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ message: 'Error en el servidor al verificar token.' });
  }
};