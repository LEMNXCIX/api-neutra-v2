const CartModel = require("../models/cart.models");
const UserModel = require("../models/user.models");
const isEmptyObject = require("../helpers/validateVariables");
const RESPONSE = { success: false, error: false, message: null, data: {}, errorDetails: null };
class Cart {
	/**
	 * Obtener productos del carrito
	 * @param {ObjectType} idUser Id del usuario del carrito
	 * @returns Objeto con los productos del carrito
	 */
	async getItems(idUser) {
        idUser = 'as'
		
		try {
            if (!Number.isInteger(idUser))
			{
				throw new Error ('No es un usuario valido');
			}
			const result = await CartModel.findById(idUser).populate(
				"items._id",
				"name price image"
			);
			result.items.map((product) => {
				RESPONSE.data =  {
					...product._id?._doc,
					amount: product.amount,
				};
			});
			RESPONSE.success = true
			RESPONSE.message = Object.is(RESPONSE.data)? 'Se realizo la consulta exitosmente' : 'No tienes items :('
		} catch (error) {
			RESPONSE.error = true
			RESPONSE.message = error
			RESPONSE.errorDetails = [error.message]
			//Los error stack podrian quedar unicamente como logs no es necesario pasar esa informacion al vista
		}
		
		return RESPONSE;
	}

	/**
	 * Anadir productos al carrito
	 * @param {string} idUser Id del usuario
	 * @param {string} idProduct
	 * @param {int} amount Total de los productos del carrito
	 * @returns Carrito actualizado con los nuevos productos
	 */
	async addToCart(idUser, idProduct, amount) {
		const product = await this.getItems(idUser);

		//Validamos su ya existe el producto en el carrito
		const productoExiste = product.some((producto) => {
			return producto._id == idProduct;
		});
		if (productoExiste) {
			return {
				success: true,
				message: "El producto ya se ha añadido al carrito",
			};
		}
		const result = await CartModel.findByIdAndUpdate(
			idUser,
			{
				$push: {
					items: {
						_id: idProduct,
						amount,
					},
				},
			},
			{ new: true }
		).populate("items._id", "name price image");
		const products = result.items.map((product) => {
			return {
				...product._id?._doc,
				amount: product.amount,
			};
		});
		return {
			success: true,
			message: "Se ha añadido el producto",
			products,
		};
	}

	/**
	 * Crear carrito de compras
	 * @param {*} idUser Id del usuario
	 * @returns Objeto del carrrito creado
	 */
	async create(idUser) {
		const cart = await CartModel.create({
			_id: idUser,
			items: [],
		});
		return cart;
	}

	/**
	 *  Funcion para remover un producto del carritp
	 * @param {string} idUser Id del usuario o del carrito
	 * @param {string} idProduct id del producto que se desea remover
	 * @returns Objeto de los productos sin el que se acaba de eliminar
	 */
	async removeFromCart(idUser, idProduct) {
		//TODO try catch con error personalizado
		const result = await CartModel.findByIdAndUpdate(
			idUser,
			{
				$pull: {
					items: {
						_id: idProduct,
					},
				},
			},
			{ new: true }
		).populate("items._id", "name price image");
		const products = result.items.map((product) => {
			return {
				...product._id?._doc,
				amount: product.amount,
			};
		});
		return {
			success: true,
			message: "Se ha retirado el producto del carrito",
			products,
		};
	}

	async changeAmount(idUser, idProduct, amount) {
		const result = await CartModel.findOneAndUpdate(
			{ _id: idUser },
			{ $set: { "items.$[el].amount": amount } },
			{
				arrayFilters: [{ "el._id": idProduct }],
				new: true,
			}
		).populate("items._id", "name price image");

		const products = result.items.map((product) => {
			return {
				...product._id?._doc,
				amount: product.amount,
			};
		});

		return products;
	}

	/**
	 * Funcion para eliminar todos los productos del carrito
	 * @param {string} cartId Id del carrito o del usuario
	 * @returns Carrito vacio
	 */
	async clearCart(cartId) {
		const user = await UserModel.findById(cartId);
		const cart = await CartModel.findByIdAndUpdate(
			user.id,
			{
				items: [],
			},
			{ new: true }
		);

		return cart;
	}
}
module.exports = Cart;
