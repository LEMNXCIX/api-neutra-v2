const { mongoose } = require("../config/db.config");

const orderSchema = new mongoose.Schema(
  {
    idUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    items: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
        },
      },
    ],
    status: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const OrderModel = mongoose.model("order", orderSchema);

module.exports = OrderModel;
