const ProductsModel = require("../models/products.models");
const dbError = require("../helpers/dbError.helpers");
const CartModel = require("../models/cart.models");

class Products {
	/**
	 * Obtener todos los productos
	 * @returns Objeto con todos los productos
	 */
	//    async getAll(limit=20,page=1){
	//     const products = await paginate("/api/products",limit,page,ProductModel)

	//     return products
	// }

	// async getAllByUser(limit=20,page=1,ownerId){
	//     console.log(ownerId)
	//     const products = await paginate("/api/products",limit,page,ProductModel,{owner:ownerId})

	//     return products
	// }

	async getAll() {
		try {
			const products = await ProductsModel.find();
			return products;
		} catch (error) {
			return {
				error: true,
				message: error,
			};
		}
	}

	/**
	 * Crear nuevo producto
	 * @param {Object} data Datos del producto
	 * @returns Objeto con el producto creado
	 */
	// async create(data){
	//     const product = await ProductModel.create(data)

	//     return product
	// }
	async create(data) {
		try {
			const products = await ProductsModel.create(data);
			return products;
		} catch (error) {
			return dbError(error);
		}
	}

	async getOne(idProduct) {
		try {
			const product = await ProductsModel.findById(idProduct);

			return product;
		} catch (error) {
			return {
				error: true,
				success: false,
				message: "No se pudo realizar la búsqueda del producto",
			};
		}
	}
	async getByName(name) {
		try {
			const product = await ProductsModel.find({
				name: { $regex: ".*" + name + ".*" },
			});

			return product;
		} catch (error) {
			return {
				error: true,
				success: false,
				message: "No se pudo realizar la búsqueda  por nombre del producto",
			};
		}
	}
	async update(id, data) {
		try {
			const user = await ProductsModel.findByIdAndUpdate(
				id,
				data
			);
			// Ya tenemos disponibles los datos

			return user; // Objeto
		} catch (error) {
			return {
				error: true,
				success: false,
				message: "No se pudo actualizar el producto",
			};
		}
	}

	async delete(id, idUser) {
		// const product = await ProductModel.findById(id)
		// if(product.owner===idUser){
		//     await ProductModel.deleteOne({
		//         id:id
		//     })
		// }
		try {
			const product = await ProductsModel.findOneAndDelete({
				_id: id,
				owner: idUser,
			});
			await CartModel.updateMany({
				$pull: {
					items: {
						_id: product.id,
					},
				},
			});

			return {
				success: true,
				product,
				message: "Se ha borrado el producto",
			};
		} catch (error) {
			return {
				success: false,
				message: "A ocurrido un error al borrar el producto",
			};
		}
	}
}
module.exports = Products;
