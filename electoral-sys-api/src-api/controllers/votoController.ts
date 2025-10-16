import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { socketService } from '../services/socketService';
import Voto from '../models/Voto';
import Campaña from '../models/Campaña';
import Candidato from '../models/Candidato';

// Registrar un voto
export const registrarVoto = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { campañaId, candidatoId } = req.body;
    const votanteId = req.usuario?.id;

    // Verificar que la campaña exista y esté activa
    const campaña = await Campaña.findById(campañaId);
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
    const candidato = await Candidato.findById(candidatoId);
    if (!candidato || candidato.campaña.toString() !== campañaId) {
      return res.status(404).json({ message: 'Candidato no encontrado en esta campaña.' });
    }

    // Verificar cuántos votos ha emitido el usuario en esta campaña
    const votosEmitidos = await Voto.countDocuments({
      votante: votanteId,
      campaña: campañaId
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
      campaña: campañaId,
      candidato: candidatoId
    });

    await voto.save();

    // Verificar cuántos votos le quedan al usuario
    const votosRestantes = campaña.cantidadVotosPorVotante - (votosEmitidos + 1);

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

// Obtener los votos de un usuario para una campaña
export const getUserVotes = async (req: Request, res: Response) => {
  try {
    const votanteId = req.usuario?.id;
    const { campañaId } = req.params;

    // Verificar que la campaña exista
    const campaña = await Campaña.findById(campañaId);
    if (!campaña) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Obtener los votos del usuario en esta campaña
    const votos = await Voto.find({
      votante: votanteId,
      campaña: campañaId
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
    const { campañaId } = req.params;

    // Verificar que la campaña exista
    const campaña = await Campaña.findById(campañaId);
    if (!campaña) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Obtener todos los candidatos de la campaña
    const candidatos = await Candidato.find({ campaña: campañaId });

    // Obtener conteo de votos por candidato
    const resultadosVotos = await Voto.aggregate([
      { $match: { campaña: campaña._id } },
      { $group: { _id: '$candidato', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Preparar resultados con información del candidato
    const results = await Promise.all(
      candidatos.map(async (candidato) => {
        const result = resultadosVotos.find(
          (vote) => vote._id.toString() === candidato.id.toString()
        );
        
        return {
          candidateId: candidato._id,
          candidateName: candidato.nombre,
          votes: result ? result.count : 0
        };
      })
    );

    // Ordenar por número de votos (mayor a menor)
    results.sort((a, b) => b.votes - a.votes);

    // Obtener estadísticas generales
    const totalVotes = await Voto.countDocuments({ campaña: campañaId });
    const uniqueVoters = await Voto.distinct('votante', { campaña: campañaId });

    res.json({
      campaña: {
        id: campaña._id,
        title: campaña.titulo,
        status: campaña.estado,
        votesPerVoter: campaña.cantidadVotosPorVotante,
        startDate: campaña.fechaInicio,
        endDate: campaña.fechaFin
      },
      statistics: {
        totalVotes,
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