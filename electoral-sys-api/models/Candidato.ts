import mongoose, { Document } from "mongoose";

export interface ICandidato extends Document {
    nombre: string;
    descripcion: string;
    foto: string;
    campaña: mongoose.Types.ObjectId;
}

const candidatoSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    foto: { type: String, required: true, trim: true },
    campaña: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaña', required: true }
}, {
    timestamps: true    
});

// Índices para mejorar el rendimiento de las consultas
candidatoSchema.index({ campaña: 1 });

export default mongoose.model<ICandidato>('Candidato', candidatoSchema);