import express from 'express';
import { body } from 'express-validator';
import {
  createCandidate,
  getAllCandidates,
  getCandidatesByCampaign,
  getCandidateById,
  updateCandidate,
  deleteCandidate
} from '../controllers/candidatoController.js';
import { verificarToken, esAdmin } from '../middleware/auth.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(verificarToken);

// Obtener todos los candidatos
router.get('/', getAllCandidates);

// Obtener candidatos por campaña
router.get('/campaign/:campaignId', getCandidatesByCampaign);

// Obtener un candidato por ID
router.get('/:id', getCandidateById);

// Crear un candidato (solo admin)
router.post(
  '/',
  esAdmin,
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('descripcion').notEmpty().withMessage('La biografía es obligatoria'),
    body('campañaId').notEmpty().withMessage('La campaña es obligatoria')
  ],
  createCandidate
);

// Actualizar un candidato (solo admin)
router.put(
  '/:id',
  esAdmin,
  [
    body('nombre').optional(),
    body('descripcion').optional(),
    body('foto').optional(),
    body('campañaId').optional()
  ],
  updateCandidate
);

// Eliminar un candidato (solo admin)
router.delete('/:id', esAdmin, deleteCandidate);

export default router;