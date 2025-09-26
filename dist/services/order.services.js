"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OrderModel = require('../models/order.models');
const CartService = require('../services/cart.services');
class Order {
    async getItems(idUser) {
        const result = await OrderModel.findById(idUser).populate('items._id', 'name price image');
        const products = result.items.map((product) => {
            return {
                ...product._id?._doc,
                amount: product.amount,
            };
        });
        return products;
    }
    async create(idUser) {
        const cartServ = new CartService();
        const cart = await cartServ.getItems(idUser);
        if (cart.length == 0) {
            return {
                succes: false,
                message: 'Tu carrito esta vacío, no puedes generar una orden.',
            };
        }
        const order = await OrderModel.create({
            idUser: idUser,
            status: 'Pendiente',
        });
        cart.map((producto) => {
            this.addToOrder(order._id, producto._id);
        });
        await cartServ.clearCart(idUser);
        const orderFinal = this.getOrderById(order._id);
        return { message: 'Se ha generado su orden', orderFinal };
    }
    async addToOrder(idUser, idProduct) {
        const result = await OrderModel.findByIdAndUpdate(idUser, {
            $push: {
                items: {
                    _id: idProduct,
                },
            },
        }, { new: true }).populate('items._id', 'name price image');
        const products = result.items.map((product) => {
            return {
                ...product._id?._doc,
            };
        });
        return products;
    }
    async getAll() {
        try {
            const orders = await OrderModel.find()
                .populate('items._id', 'name price image')
                .populate('idUser', 'name')
                .sort({ createdAt: 'desc' });
            return orders;
        }
        catch (error) {
            return {
                error: true,
                message: error,
            };
        }
    }
    async getOrderById(idOrder) {
        try {
            const orders = await OrderModel.findById(idOrder).populate('items._id', 'name price image');
            return orders;
        }
        catch (error) {
            return {
                error: true,
                message: error,
            };
        }
    }
    async getOrderByIUser(userId) {
        try {
            const orders = await OrderModel.findOne({
                idUser: userId,
            }).populate('items._id', 'name price image');
            return orders;
        }
        catch (error) {
            return {
                error: true,
                message: error,
            };
        }
    }
}
module.exports = Order;
