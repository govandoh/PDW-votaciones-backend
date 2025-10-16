import express from 'express';
import { body } from 'express-validator';
import {
  registrarVoto,
  getUserVotes,
  obtenerResultadosCampaña as getCampaignResults
} from '../controllers/votoController.js';
import { verificarToken, isVoter, esAdmin } from '../middleware/auth';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(verificarToken);

// Registrar un voto (solo votantes)
router.post(
  '/',
  isVoter,
  [
    body('campaignId').notEmpty().withMessage('El ID de la campaña es obligatorio'),
    body('candidateId').notEmpty().withMessage('El ID del candidato es obligatorio')
  ],
  registrarVoto
);

// Obtener los votos del usuario actual para una campaña
router.get('/user/campaign/:campaignId', getUserVotes);

// Obtener los resultados de una campaña
router.get('/campaign/:campaignId/results', getCampaignResults);

export default router;