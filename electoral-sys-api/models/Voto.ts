import mongoose, {Document} from "mongoose";

export interface IVoto extends Document {
    votante: mongoose.Types.ObjectId;
    campaña: mongoose.Types.ObjectId;
    candidato: mongoose.Types.ObjectId;
    fechaVoto: Date;
}

const votoSchema = new mongoose.Schema({
    votante: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true 
    },
    campaña: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Campaña', 
        required: true 
    },
    candidato: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Candidato', 
        required: true 
    },
    fechaVoto: { 
        type: Date, 
        default: Date.now 
    }
}, { 
    timestamps: true 
});

// Índice para facilitar búsquedas por campaña
votoSchema.index({ campaña: 1 });

// Índice para facilitar búsquedas de votos por usuario y campaña
votoSchema.index({ votante: 1, campaña: 1 });

// Índice para facilitar recuentos de votos por candidato
votoSchema.index({ candidato: 1, campaña: 1 });

export default mongoose.model<IVoto>('Voto', votoSchema);