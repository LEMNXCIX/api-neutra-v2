import { Schema, model } from 'mongoose';  // Asume import correcto

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      minlength: [3, 'El nombre no debe ser menor a 3 caracteres'],
      maxlength: [100, 'El nombre no debe ser mayor a 100 caracteres'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      trim: true,
      unique: [true, 'Email ya registrado'],
      match: [/^[\w\.-]+@[\w]+\.[\.\w]+$/, 'Email no válido'],
      lowercase: true,  // Mejora: normalizar
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      select: false,  // Seguridad: no en queries por default
    },
    role: {
      type: Number,
      default: 1,
      enum: [1, 2],  // Mejora: enum para roles
    },
    profilePic: String,
    provider: {
      local: { type: Boolean, default: true },
      facebook: { type: Boolean, default: false },
      google: { type: Boolean, default: false },
      twitter: { type: Boolean, default: false },
      github: { type: Boolean, default: false },
    },
    idProvider: {
      facebook: String,
      google: String,
      twitter: String,
      github: String,
    },
  },
  { timestamps: true }
);

// Método estático funcional para queries comunes
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email }).select('+password');  // Incluye password si needed
};

const UserModel = model('user', userSchema);
export default UserModel;