import express from 'express';
import { body } from 'express-validator';
import {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  generateCampaignReport
} from '../controllers/campañaController.js';
import { verificarToken, esAdmin } from '../middleware/auth.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(verificarToken);

// Obtener todas las campañas
router.get('/', getAllCampaigns);

// Obtener una campaña por ID
router.get('/:id', getCampaignById);

// Crear una campaña (solo admin)
router.post(
  '/',
  esAdmin,
  [
    body('titulo').notEmpty().withMessage('El título es obligatorio'),
    body('descripcion').notEmpty().withMessage('La descripción es obligatoria'),
    body('votosPorVotante')
      .isInt({ min: 1 }).toInt()
      .withMessage('La cantidad de votos por votante debe ser al menos 1'),
    body('fechaInicio').isISO8601().withMessage('La fecha de inicio debe ser válida'),
    body('fechaFin').isISO8601().withMessage('La fecha de fin debe ser válida')
  ],
  createCampaign
);

// Actualizar una campaña (solo admin)
router.put(
  '/:id',
  esAdmin,
  [
    body('titulo').optional(),
    body('descripcion').optional(),
    body('votosPorVotante').optional().isInt({ min: 1 }).toInt(),
    body('estado').optional().isIn(['activa', 'inactiva', 'finalizada']),
    body('fechaInicio').optional().isISO8601(),
    body('fechaFin').optional().isISO8601()
  ],
  updateCampaign
);

// Eliminar una campaña (solo admin)
router.delete('/:id', esAdmin, deleteCampaign);

// Actualizar estado de una campaña (solo admin)
router.patch(
  '/:id/estado',
  esAdmin,
  [
    body('estado')
      .notEmpty().withMessage('El estado es obligatorio')
      .isIn(['activa', 'inactiva', 'finalizada']).withMessage('Estado inválido, debe ser "activa", "inactiva" o "finalizada"')
  ],
  updateCampaignStatus
);

// Generar reporte de una campaña (solo admin)
router.get('/:id/report', esAdmin, generateCampaignReport);

export default router;