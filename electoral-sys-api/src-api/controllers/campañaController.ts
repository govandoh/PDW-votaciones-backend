import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Campaign from '../models/Campaña.js';
import Candidate from '../models/Candidato.js';
import Vote from '../models/Voto.js';

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
      titulo: titulo,
      descripcion: descripcion,
      cantidadVotosPorVotante: Number(votosPorVotante),
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      createBy: req.usuario?.userId
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

// Obtener campaña por ID - CORREGIDO
export const getCampaignById = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // CORRECCIÓN: usar campaña en lugar de campaign en la consulta
    const candidates = await Candidate.find({ campaña: campaign._id });

    // Si el usuario es votante, verificar cuántos votos ha emitido
    let userVotesCount = 0;
    if (req.usuario?.role === 'votante') {
      userVotesCount = await Vote.countDocuments({
        votante: req.usuario.userId,
        campaña: campaign._id
      });
    }

    // Obtener conteo de votos por candidato
    const voteResults = await Vote.aggregate([
      { $match: { campaña: campaign._id } },
      { $group: { _id: '$candidato', count: { $sum: 1 } } }
    ]);

    // Crear un mapa para búsqueda rápida
    const voteMap = new Map(voteResults.map(r => [r._id.toString(), r.count]));

    // Formatear los resultados incluyendo candidatos sin votos
    const formattedResults = candidates.map(candidate => ({
      candidateId: candidate._id,
      candidateName: candidate.nombre,
      votes: voteMap.get(candidate._id.toString()) || 0
    }));

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
    const { titulo, descripcion, votosPorVotante, estado, fechaInicio, fechaFin } = req.body;

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Actualizar campos
    if (titulo) campaign.titulo = titulo;
    if (descripcion) campaign.descripcion = descripcion;
    if (votosPorVotante) campaign.cantidadVotosPorVotante = Number(votosPorVotante);
    if (estado && ['activa', 'inactiva', 'finalizada'].includes(estado)) campaign.estado = estado;
    if (fechaInicio) campaign.fechaInicio = new Date(fechaInicio);
    if (fechaFin) campaign.fechaFin = new Date(fechaFin);

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
    const votesCount = await Vote.countDocuments({ campaña: campaign._id });
    if (votesCount > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar la campaña porque ya tiene votos registrados.' 
      });
    }

    // Eliminar candidatos asociados
    await Candidate.deleteMany({ campaña: campaign._id });

    // Eliminar campaña
    await Campaign.findByIdAndDelete(req.params.id);

    res.json({ message: 'Campaña eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar campaña:', error);
    res.status(500).json({ message: 'Error en el servidor al eliminar campaña.' });
  }
};

// Actualizar estado de campaña
export const updateCampaignStatus = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { estado } = req.body;
    
    if (!estado || !['activa', 'inactiva', 'finalizada'].includes(estado)) {
      return res.status(400).json({ message: 'El estado proporcionado no es válido. Debe ser "activa", "inactiva" o "finalizada".' });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Actualizar solo el estado
    campaign.estado = estado;
    await campaign.save();

    res.json({
      message: `Estado de campaña actualizado a "${estado}"`,
      campaign
    });
  } catch (error) {
    console.error('Error al actualizar estado de campaña:', error);
    res.status(500).json({ message: 'Error en el servidor al actualizar estado de campaña.' });
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
    const candidates = await Candidate.find({ campaña: campaign._id });
    
    // Obtener conteo total de votos
    const totalVotes = await Vote.countDocuments({ campaña: campaign._id });
    
    // Obtener conteo de votantes únicos
    const uniqueVoters = await Vote.distinct('votante', { campaña: campaign._id });
    
    // Obtener resultados detallados por candidato
    const results = await Vote.aggregate([
      { $match: { campaña: campaign._id } },
      { $group: { _id: '$candidato', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Crear un mapa para búsqueda rápida
    const voteMap = new Map(results.map(r => [r._id.toString(), r.count]));

    // Formatear resultados con todos los candidatos
    const detailedResults = candidates.map(candidate => {
      const votes = voteMap.get(candidate._id.toString()) || 0;
      const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(2) : '0.00';
      
      return {
        candidateId: candidate._id,
        candidateName: candidate.nombre,
        votes: votes,
        percentage: percentage + '%'
      };
    });

    // Ordenar por votos (mayor a menor)
    detailedResults.sort((a, b) => b.votes - a.votes);

    res.json({
      campaign: {
        id: campaign._id,
        title: campaign.titulo,
        descripcion: campaign.descripcion,
        status: campaign.estado,
        votesPerVoter: campaign.cantidadVotosPorVotante,
        startDate: campaign.fechaInicio,
        endDate: campaign.fechaFin
      },
      statistics: {
        totalCandidates: candidates.length,
        totalUniqueVoters: uniqueVoters.length,
        totalVotesCast: totalVotes,
        results: detailedResults
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de campaña:', error);
    res.status(500).json({ message: 'Error en el servidor al generar reporte.' });
  }
};