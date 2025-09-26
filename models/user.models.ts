const { mongoose } = require('../config/db.config');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      minlength: [3, 'El nombre no debe ser menor a 3 caracteres'],
      maxlength: [100, 'El nombre no deber ser mayor a 100 caracteres'],
      trim: true,
      // Quita los espacios antes o despues de la palabra
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      trim: true,
      unique: [true, 'Email ya registrado'],
      match: [/^[\w\.-]+@[\w]+\.[\.\w]+$/, 'Email no valido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
    },
    role: {
      type: Number,
      default: 1,
    },
    profilePic: String,
    provider: {
      local: Boolean,
      facebook: Boolean,
      google: Boolean,
      twitter: Boolean,
      github: Boolean,
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

const UserModel = mongoose.model('user', userSchema);
export = UserModel;
