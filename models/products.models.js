const { mongoose } = require("../config/db.config");

const productSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Nombre es requerido"],
			trim: true,
			unique: [
				true,
				"Ya existe un producto registrado con ese nombre",
			],
		},
		description: {
			type: String,
			required: [true, "La descripción es requerida"],
		},
		categories: {
			type: Array,
			required: [true, "La categoría es requerida"],
		},
		price: {
			type: Number,
			required: [true, "El precio es requerido"],
		},
		image: {
			type: [String],
			required: [true, "La imagen es requerida"],
		},
		stock: {
			type: Number,
			required: [true, "El stock es requerido"],
		},
	},
	{ timestamps: true }
);

const ProductModel = mongoose.model("product", productSchema);

module.exports = ProductModel;
