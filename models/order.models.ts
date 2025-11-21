import { mongoose } from '../config/db.config';

const orderSchema = new mongoose.Schema(
  {
    idUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    items: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'product',
        },
      },
    ],
    status: {
      type: String,
      default: 'Pendiente',
      enum: ['Pendiente', 'Pagado', 'Enviado', 'Entregado'],
    },
  },
  { timestamps: true }
);

const OrderModel = mongoose.model('order', orderSchema);

export default OrderModel;
