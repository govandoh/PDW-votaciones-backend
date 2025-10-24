import mongoose, {Document} from 'mongoose';

export interface ICampaña extends Document {
  titulo: string;
  descripcion: string;
  cantidadVotosPorVotante: number;
  estado: 'activa' | 'inactiva' | 'finalizada';
  fechaInicio: Date;
  fechaFin: Date;
  createBy?: mongoose.Types.ObjectId;
}

const campañaSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: true,
    trim: true
  },
  descripcion: { 
    type: String, 
    required: true,
    trim: true
  },
  cantidadVotosPorVotante: { 
    type: Number, 
    required: true, 
    default: 1, 
    min: 1
  },
  estado: { 
    type: String, 
    enum: ['activa', 'inactiva', 'finalizada'], 
    default: 'inactiva' 
  },
  fechaInicio: { 
    type: Date, 
    required: true 
  },
  fechaFin: { 
    type: Date, 
    required: true 
  },
  createBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario', 
    required: true
  }
}, { 
  timestamps: true 
});

// Índice para búsquedas rápidas por estado
campañaSchema.index({ estado: 1 });

export default mongoose.model<ICampaña>('Campaña', campañaSchema);