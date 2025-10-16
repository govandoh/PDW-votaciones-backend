import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Campaign from '../models/Campaña';
import Candidate from '../models/Candidato';
import Vote from '../models/Voto';

// Crear nueva campaña
export const createCampaign = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { titulo, descripcion, votosPorVotante, fechaInicio, fechaFin } = req.body;

    // Crear nueva campaña
    const campaign = new Campaign({
      title: titulo,
      description: descripcion,
      votesPorVotante: votosPorVotante,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      createdBy: req.usuario?.id
    });

    await campaign.save();

    res.status(201).json({
      message: 'Campaña creada exitosamente',
      campaign
    });
  } catch (error) {
    console.error('Error al crear campaña:', error);
    res.status(500).json({ message: 'Error en el servidor al crear campaña.' });
  }
};

// Obtener todas las campañas
export const getAllCampaigns = async (req: Request, res: Response) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    console.error('Error al obtener campañas:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener campañas.' });
  }
};

// Obtener campaña por ID
export const getCampaignById = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Obtener los candidatos asociados a esta campaña
    const candidates = await Candidate.find({ campaign: campaign.id });

    // Si el usuario es votante, verificar cuántos votos ha emitido
    let userVotesCount = 0;
    if (req.usuario?.rol === 'votante') {
      userVotesCount = await Vote.countDocuments({
        votante: req.usuario.id,
        campaña: campaign.id
      });
    }

    // Obtener conteo de votos por candidato
    const voteResults = await Vote.aggregate([
      { $match: { campaign: campaign._id } },
      { $group: { _id: '$candidate', count: { $sum: 1 } } }
    ]);

    // Formatear los resultados para incluir nombres de candidatos
    const formattedResults = await Promise.all(
      voteResults.map(async (result) => {
        const candidate = await Candidate.findById(result._id);
        return {
          candidateId: result._id,
          candidateName: candidate ? candidate.nombre : 'Candidato desconocido',
          votes: result.count
        };
      })
    );

    res.json({
      campaign,
      candidates,
      votesRemaining: campaign.cantidadVotosPorVotante - userVotesCount,
      votesUsed: userVotesCount,
      results: formattedResults
    });
  } catch (error) {
    console.error('Error al obtener campaña por ID:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener campaña.' });
  }
};

// Actualizar campaña
export const updateCampaign = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, votesPerVoter, status, startDate, endDate } = req.body;

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Actualizar campos
    if (title) campaign.titulo = title;
    if (description) campaign.descripcion = description;
    if (votesPerVoter) campaign.cantidadVotosPorVotante = votesPerVoter;
    if (status) campaign.estado = status;
    if (startDate) campaign.fechaInicio = new Date(startDate);
    if (endDate) campaign.fechaFin = new Date(endDate);

    await campaign.save();

    res.json({
      message: 'Campaña actualizada exitosamente',
      campaign
    });
  } catch (error) {
    console.error('Error al actualizar campaña:', error);
    res.status(500).json({ message: 'Error en el servidor al actualizar campaña.' });
  }
};

// Eliminar campaña
export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Verificar si hay votos asociados
    const votesCount = await Vote.countDocuments({ campaign: campaign.id });
    if (votesCount > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar la campaña porque ya tiene votos registrados.' 
      });
    }

    // Eliminar candidatos asociados
    await Candidate.deleteMany({ campaign: campaign.id });

    // Eliminar campaña
    await Campaign.findByIdAndDelete(req.params.id);

    res.json({ message: 'Campaña eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar campaña:', error);
    res.status(500).json({ message: 'Error en el servidor al eliminar campaña.' });
  }
};

// Generar reporte de campaña
export const generateCampaignReport = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Obtener candidatos
    const candidates = await Candidate.find({ campaign: campaign.id });
    
    // Obtener conteo total de votantes únicos
    const uniqueVoters = await Vote.distinct('voter', { campaign: campaign.id });
    
    // Obtener resultados detallados por candidato
    const results = await Vote.aggregate([
      { $match: { campaign: campaign._id } },
      { $group: { _id: '$candidate', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Formatear resultados
    const detailedResults = await Promise.all(
      results.map(async (result) => {
        const candidate = await Candidate.findById(result._id);
        return {
          candidateId: result._id,
          candidateName: candidate ? candidate.nombre : 'Candidato desconocido',
          votes: result.count,
          percentage: ((result.count / uniqueVoters.length) * 100).toFixed(2) + '%'
        };
      })
    );

    res.json({
      campaign: {
        id: campaign.id,
        title: campaign.titulo,
        description: campaign.descripcion,
        status: campaign.estado,
        votesPerVoter: campaign.cantidadVotosPorVotante,
        startDate: campaign.fechaInicio,
        endDate: campaign.fechaFin
      },
      statistics: {
        totalCandidates: candidates.length,
        totalUniqueVoters: uniqueVoters.length,
        totalVotesCast: await Vote.countDocuments({ campaign: campaign.id }),
        results: detailedResults
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de campaña:', error);
    res.status(500).json({ message: 'Error en el servidor al generar reporte.' });
  }
};