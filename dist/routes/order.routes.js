"use strict";
const OrderService = require('../services/order.services');
const authMiddleware = require('../middleware/auth.middleware');
function order(app) {
    const router = require('express').Router();
    const orderServ = new OrderService();
    app.use('/api/order', router);
    router.post('/', authMiddleware(1), async (req, res) => {
        const result = await orderServ.create(req.user.id);
        return res.status(result.error ? 400 : 200).json(result);
    });
    router.get('/', authMiddleware(1), async (req, res) => {
        const result = await orderServ.getAll(req.user.id);
        return res.status(result.error ? 400 : 200).json(result);
    });
    router.get('/all', authMiddleware(1), async (req, res) => {
        const result = await orderServ.getAll(req.user.id);
        return res.status(result.error ? 400 : 200).json(result);
    });
    router.get('/getOrder', authMiddleware(1), async (req, res) => {
        const { orderId } = req.body;
        const result = await orderServ.getOrderById(orderId);
        return res.status(result.error ? 400 : 200).json(result);
    });
    router.get('/getOrderByUser', authMiddleware(1), async (req, res) => {
        const { userId } = req.body;
        const result = await orderServ.getOrderByUser(userId);
        return res.status(result.error ? 400 : 200).json(result);
    });
    router.put('/changeStatus', authMiddleware(2), async (req, res) => {
        const { idOrder, status } = req.body;
        const result = await orderServ.changeStatus(idOrder, status);
        return res.status(result.error ? 400 : 200).json(result);
    });
    router.delete('/clear', authMiddleware(1), async (req, res) => {
        const result = await orderServ.clearCart(req.user.id);
        return res.status(result.error ? 400 : 200).json(result);
    });
}
module.exports = order;
