"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CartModel = require('../models/cart.models');
const UserModel = require('../models/user.models');
const { isEmptyObject } = require('../helpers/validateVariables');
const { isValidObjectId } = require('mongoose');
const RESPONSE = {
    success: false,
    error: false,
    message: null,
    data: {},
    errorDetails: null,
};
class Cart {
    async getItems(idUser) {
        try {
            if (!isValidObjectId(idUser)) {
                throw new Error('No es un usuario valido');
            }
            const result = await CartModel.findById(idUser).populate('items._id', 'name price image');
            result.items.map((product) => {
                RESPONSE.data = {
                    ...product._id?._doc,
                    amount: product.amount,
                };
            });
            RESPONSE.success = true;
            RESPONSE.message = isEmptyObject(RESPONSE.data)
                ? 'Se realizo la consulta exitosmente'
                : 'No tienes items :(';
        }
        catch (error) {
            RESPONSE.error = true;
            RESPONSE.message = error;
            RESPONSE.errorDetails = [error.message];
        }
        return RESPONSE;
    }
    async addToCart(idUser, idProduct, amount) {
        const product = await this.getItems(idUser);
        const productoExiste = product.some((producto) => {
            return producto._id == idProduct;
        });
        if (productoExiste) {
            return {
                success: true,
                message: 'El producto ya se ha añadido al carrito',
            };
        }
        const result = await CartModel.findByIdAndUpdate(idUser, {
            $push: {
                items: {
                    _id: idProduct,
                    amount,
                },
            },
        }, { new: true }).populate('items._id', 'name price image');
        const products = result.items.map((product) => {
            return {
                ...product._id?._doc,
                amount: product.amount,
            };
        });
        return {
            success: true,
            message: 'Se ha añadido el producto',
            products,
        };
    }
    async create(idUser) {
        const cart = await CartModel.create({ _id: idUser, items: [] });
        return cart;
    }
    async removeFromCart(idUser, idProduct) {
        const result = await CartModel.findByIdAndUpdate(idUser, {
            $pull: {
                items: {
                    _id: idProduct,
                },
            },
        }, { new: true }).populate('items._id', 'name price image');
        const products = result.items.map((product) => {
            return {
                ...product._id?._doc,
                amount: product.amount,
            };
        });
        return {
            success: true,
            message: 'Se ha retirado el producto del carrito',
            products,
        };
    }
    async changeAmount(idUser, idProduct, amount) {
        const result = await CartModel.findOneAndUpdate({ _id: idUser }, { $set: { 'items.$[el].amount': amount } }, {
            arrayFilters: [{ 'el._id': idProduct }],
            new: true,
        }).populate('items._id', 'name price image');
        const products = result.items.map((product) => {
            return {
                ...product._id?._doc,
                amount: product.amount,
            };
        });
        return products;
    }
    async clearCart(cartId) {
        const user = await UserModel.findById(cartId);
        const cart = await CartModel.findByIdAndUpdate(user.id, {
            items: [],
        }, { new: true });
        return cart;
    }
}
module.exports = Cart;
