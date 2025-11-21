import { mongoose } from '../config/db.config';

const productsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'El precio es requerido'],
    },
    description: {
      type: String,
      required: [true, 'La descripción es requerida'],
      trim: true,
    },
    image: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
  },
  { timestamps: true }
);

const ProductsModel = mongoose.model('product', productsSchema);

export default ProductsModel;
