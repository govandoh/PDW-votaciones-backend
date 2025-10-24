import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { socketService } from '../services/socketService.js';
import Voto from '../models/Voto.js';
import Campaña from '../models/Campaña.js';
import Candidato from '../models/Candidato.js';

// Registrar un voto
export const registrarVoto = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Aceptar tanto campaignId/candidateId (frontend) como campañaId/candidatoId
    const { campaignId, candidateId, campañaId, candidatoId } = req.body;
    const campaignIdFinal = campaignId || campañaId;
    const candidateIdFinal = candidateId || candidatoId;
    const votanteId = req.usuario?.userId;

    if (!campaignIdFinal || !candidateIdFinal) {
      return res.status(400).json({ message: 'Se requiere el ID de la campaña y del candidato.' });
    }

    // Verificar que la campaña exista y esté activa
    const campaña = await Campaña.findById(campaignIdFinal);
    if (!campaña) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    if (campaña.estado !== 'activa') {
      return res.status(400).json({ message: 'La campaña no está activa para votación.' });
    }

    // Verificar si la campaña está dentro del periodo de votación
    const now = new Date();
    if (now < campaña.fechaInicio || now > campaña.fechaFin) {
      return res.status(400).json({ message: 'La campaña está fuera del periodo de votación.' });
    }

    // Verificar que el candidato exista y pertenezca a la campaña
    const candidato = await Candidato.findById(candidateIdFinal);
    if (!candidato || candidato.campaña.toString() !== campaignIdFinal) {
      return res.status(404).json({ message: 'Candidato no encontrado en esta campaña.' });
    }

    // Verificar cuántos votos ha emitido el usuario en esta campaña
    const votosEmitidos = await Voto.countDocuments({
      votante: votanteId,
      campaña: campaignIdFinal
    });

    // Verificar si el usuario ya ha alcanzado el límite de votos permitidos
    if (votosEmitidos >= campaña.cantidadVotosPorVotante) {
      return res.status(400).json({ 
        message: `Ya has emitido el máximo de ${campaña.cantidadVotosPorVotante} votos permitidos para esta campaña.` 
      });
    }

    // Crear y guardar el voto
    const voto = new Voto({
      votante: votanteId,
      campaña: campaignIdFinal,
      candidato: candidateIdFinal
    });

    await voto.save();

    // Verificar cuántos votos le quedan al usuario
    const votosRestantes = campaña.cantidadVotosPorVotante - (votosEmitidos + 1);

    // Obtener resultados actualizados para emitir por WebSocket
    const resultadosActualizados = await obtenerResultadosParaWebSocket(campaignIdFinal);
    
    // Emitir actualización de votos por WebSocket
    socketService.emitVoteUpdate(campaignIdFinal, {
      results: resultadosActualizados,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Voto registrado exitosamente',
      votosRestantes: votosRestantes,
      voto: voto
    });
  } catch (error) {
    console.error('Error al registrar voto:', error);
    res.status(500).json({ message: 'Error en el servidor al registrar voto.' });
  }
};

// Función auxiliar para obtener resultados en formato WebSocket
async function obtenerResultadosParaWebSocket(campaignId: string) {
  const candidatos = await Candidato.find({ campaña: campaignId });
  const resultadosVotos = await Voto.aggregate([
    { $match: { campaña: campaignId as any } },
    { $group: { _id: '$candidato', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const results = candidatos.map((candidato) => {
    const result = resultadosVotos.find(
      (vote) => vote._id.toString() === candidato.id.toString()
    );
    
    return {
      candidateId: candidato._id.toString(),
      candidateName: candidato.nombre,
      votes: result ? result.count : 0
    };
  });

  return results.sort((a, b) => b.votes - a.votes);
}

// Obtener los votos de un usuario para una campaña
export const getUserVotes = async (req: Request, res: Response) => {
  try {
    const votanteId = req.usuario?.userId;
    const { campaignId } = req.params;

    // Verificar que la campaña exista
    const campaña = await Campaña.findById(campaignId);
    if (!campaña) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Obtener los votos del usuario en esta campaña
    const votos = await Voto.find({
      votante: votanteId,
      campaña: campaignId
    }).populate('candidato', 'nombre');

    // Calcular votos restantes
    const votosRestantes = campaña.cantidadVotosPorVotante - votos.length;

    res.json({
      votos,
      votesUsed: votos.length,
      votesRemaining: votosRestantes,
      votesPerVoter: campaña.cantidadVotosPorVotante
    });
  } catch (error) {
    console.error('Error al obtener votos del usuario:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener votos.' });
  }
};

// Obtener resultados de votación para una campaña
export const obtenerResultadosCampaña = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    // Verificar que la campaña exista
    const campaña = await Campaña.findById(campaignId);
    if (!campaña) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Obtener todos los candidatos de la campaña
    const candidatos = await Candidato.find({ campaña: campaignId });

    // Obtener conteo de votos por candidato
    const resultadosVotos = await Voto.aggregate([
      { $match: { campaña: campaña._id } },
      { $group: { _id: '$candidato', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Calcular total de votos
    const totalVotes = resultadosVotos.reduce((sum, result) => sum + result.count, 0);

    // Preparar resultados con información del candidato
    const results = candidatos.map((candidato) => {
      const result = resultadosVotos.find(
        (vote) => vote._id.toString() === candidato.id.toString()
      );
      
      const votes = result ? result.count : 0;
      const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(2) : '0.00';
      
      return {
        candidateId: candidato._id,
        candidateName: candidato.nombre,
        votes: votes,
        percentage: percentage + '%'
      };
    });

    // Ordenar por número de votos (mayor a menor)
    results.sort((a, b) => b.votes - a.votes);

    // Obtener estadísticas generales
    const uniqueVoters = await Voto.distinct('votante', { campaña: campaignId });

    res.json({
      campaign: {
        id: campaña._id,
        title: campaña.titulo,
        status: campaña.estado,
        votesPerVoter: campaña.cantidadVotosPorVotante,
        startDate: campaña.fechaInicio,
        endDate: campaña.fechaFin
      },
      statistics: {
        totalVotes: totalVotes,
        totalUniqueVoters: uniqueVoters.length,
        totalCandidates: candidatos.length
      },
      results
    });
  } catch (error) {
    console.error('Error al obtener resultados de la campaña:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener resultados.' });
  }
};