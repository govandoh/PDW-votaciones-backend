import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, verifyToken } from '../controllers/authController';
import { verificarToken } from '../middleware/auth';


const router = Router();

router.post(
  '/register',
  [
    body('numeroColegiado').notEmpty().withMessage('El número de colegiado es obligatorio'),
    body('nombres').notEmpty().withMessage('Nombres son obligatorios'),
    body('apellidos').notEmpty().withMessage('Apellidos son obligatorios'),
    body('correo').isEmail().withMessage('Debe ser un correo electrónico válido'),
    body('dpi').notEmpty().withMessage('El DPI es obligatorio'),
    body('fechaNacimiento').isDate().withMessage('La fecha de nacimiento debe ser válida'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
  ],
  register
);

// Ruta de login
router.post(
  '/login',
  [
    body('numeroColegiado').notEmpty().withMessage('El número de colegiado es obligatorio'),
    body('dpi').notEmpty().withMessage('El DPI es obligatorio'),
    body('fechaNacimiento').isDate().withMessage('La fecha de nacimiento debe ser válida'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria')
  ],
  login
);

// Ruta para verificar el token
router.get('/verify', verificarToken, verifyToken);

export default router;