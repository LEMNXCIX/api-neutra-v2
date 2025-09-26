const { mongoose } = require('../config/db.config');

const cartSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    items: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'product',
        },
        amount: Number,
      },
    ],
  },
  { timestamps: true }
);

const CartModel = mongoose.model('cart', cartSchema);

export = CartModel;
