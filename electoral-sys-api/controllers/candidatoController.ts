import {Request, Response} from 'express';
import { validationResult } from 'express-validator';
import Candidate  from '../models/Candidato.js'
import Campaign from '../models/Campaña.js';
import Vote from '../models/Voto.js';

// Obtener todos los candidatos
export const getAllCandidates = async (req: Request, res: Response) => {
  try {
    const candidates = await Candidate.find().sort({ nombre: 1 });
    res.json(candidates);
  } catch (error) {
    console.error('Error al obtener candidatos:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener candidatos.' });
  }
};

// Crear un nuevo candidato
export const createCandidate = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, descripcion, foto, campañaId } = req.body;

    try {
        // Verificar que la campaña existe
        const campaign = await Campaign.findById(campañaId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaña no encontrada' });
        }

        const candidate = new Candidate({ 
            nombre, 
            descripcion, 
            foto: foto || 'default-profile.jpg', 
            campaña: campañaId 
        });
        await candidate.save();

        res.status(201).json({ message: 'Candidato creado exitosamente', candidate });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Obtener todos los candidatos de una campaña
export const getCandidatesByCampaign = async (req: Request, res: Response) => {
  try {
    const campaignId = req.params.campaignId;
    
    // Verificar que la campaña exista
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaña no encontrada.' });
    }

    // Obtener candidatos
    const candidates = await Candidate.find({ campaña: campaignId })
      .populate('campaña', 'titulo estado')
      .sort({ nombre: 1 });
    
    res.json(candidates);
  } catch (error) {
    console.error('Error al obtener candidatos:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener candidatos.' });
  }
};

// Obtener un candidato por ID
export const getCandidateById = async (req: Request, res: Response) => {
  try {
    const candidato = await Candidate.findById(req.params.id);
    if (!candidato) {
      return res.status(404).json({ message: 'Candidato no encontrado.' });
    }

    // Obtener la campaña asociada
    const campaña = await Campaign.findById(candidato.campaña);

    // Obtener el número de votos recibidos
    const voteCount = await Vote.countDocuments({ candidate: candidato.id });

    res.json({
      candidate: candidato,
      campaign: campaña,
      voteCount
    });
  } catch (error) {
    console.error('Error al obtener candidato por ID:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener candidato.' });
  }
};

// Actualizar candidato
export const updateCandidate = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { nombre, descripcion, foto, campañaId } = req.body;

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidato no encontrado.' });
    }

    // Actualizar campos
    if (nombre) candidate.nombre = nombre;
    if (descripcion) candidate.descripcion = descripcion;
    if (foto) candidate.foto = foto;
    if (campañaId) candidate.campaña = campañaId;

    await candidate.save();

    res.json({
      message: 'Candidato actualizado exitosamente',
      candidate
    });
  } catch (error) {
    console.error('Error al actualizar candidato:', error);
    res.status(500).json({ message: 'Error en el servidor al actualizar candidato.' });
  }
};

// Eliminar candidato
export const deleteCandidate = async (req: Request, res: Response) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidato no encontrado.' });
    }

    // Verificar si hay votos para este candidato
    const voteCount = await Vote.countDocuments({ candidate: candidate.id });
    if (voteCount > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el candidato porque ya tiene votos registrados.' 
      });
    }

    await Candidate.findByIdAndDelete(req.params.id);

    res.json({ message: 'Candidato eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar candidato:', error);
    res.status(500).json({ message: 'Error en el servidor al eliminar candidato.' });
  }
};