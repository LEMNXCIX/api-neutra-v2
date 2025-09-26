"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProductsModel = require('../models/products.models');
const dbError = require('../helpers/dbError.helpers');
const CartModelRef = require('../models/cart.models');
class Products {
    async getAll() {
        try {
            const products = await ProductsModel.find();
            return products;
        }
        catch (error) {
            return {
                error: true,
                message: error,
            };
        }
    }
    async create(data) {
        try {
            const products = await ProductsModel.create(data);
            return products;
        }
        catch (error) {
            return dbError(error);
        }
    }
    async getOne(idProduct) {
        try {
            const product = await ProductsModel.findById(idProduct);
            return product;
        }
        catch (error) {
            return {
                error: true,
                success: false,
                message: 'No se pudo realizar la búsqueda del producto',
            };
        }
    }
    async getByName(name) {
        try {
            const product = await ProductsModel.find({
                name: { $regex: '.*' + name + '.*' },
            });
            return product;
        }
        catch (error) {
            return {
                error: true,
                success: false,
                message: 'No se pudo realizar la búsqueda  por nombre del producto',
            };
        }
    }
    async update(id, data) {
        try {
            const user = await ProductsModel.findByIdAndUpdate(id, data);
            return user;
        }
        catch (error) {
            return {
                error: true,
                success: false,
                message: 'No se pudo actualizar el producto',
            };
        }
    }
    async delete(id, idUser) {
        try {
            const product = await ProductsModel.findOneAndDelete({
                _id: id,
                owner: idUser,
            });
            await CartModelRef.updateMany({
                $pull: {
                    items: {
                        _id: product.id,
                    },
                },
            });
            return {
                success: true,
                product,
                message: 'Se ha borrado el producto',
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'A ocurrido un error al borrar el producto',
            };
        }
    }
}
module.exports = Products;
