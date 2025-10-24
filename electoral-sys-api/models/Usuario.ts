import mongoose, {Document} from "mongoose";
import bcrypt from "bcrypt"; 

export interface IUsuario extends Document {
    numeroColegiado: string;
    nombres: string;
    apellidos: string;
    correo: string;
    dpi: string;
    fechaNacimiento: Date;
    password: string;
    role: 'admin' | 'votante';
    active?: boolean;
    comparePassword(candidatePassword: string): Promise<boolean>;
}


// Esquema del usuario
const usuarioSchema = new mongoose.Schema({
    numeroColegiado: { type: String, required: true, unique: true, trim: true},
    nombres: { type: String, required: true, trim: true },
    apellidos: { type: String, required: true, trim: true },
    correo: { type: String, unique: true, required: true, trim: true },
    dpi: { type: String, unique: true, required: true, trim: true },
    fechaNacimiento: { type: Date, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'votante'], default: 'votante' }, 
    active: { type: Boolean, default: true }
}, {
    timestamps: true
}); 

// Middleware para hashear la contraseña antes de guardar
usuarioSchema.pre('save', async function(next) {
    if(!this.isModified('password')) return next();

    try{
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Método para comparar contraseñas
usuarioSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
}

export default mongoose.model<IUsuario>('Usuario', usuarioSchema);