"use strict";
const authValidation = require('../middleware/auth.middleware');
const UserService = require('../services/users.services');
function users(app) {
    const userServ = new UserService();
    const router = require('express').Router();
    app.use('/api/users', router);
    router.get('/', authValidation(2), async (req, res) => {
        const users = await userServ.getAll();
        return res.status(users.error ? 400 : 200).json(users);
    });
    router.get('/find/:id', authValidation(2), async (req, res) => {
        const users = await userServ.getById(req.params.id);
        return res.status(users.error ? 400 : 200).json(users);
    });
    router.get('/stats', authValidation(2), async (req, res) => {
        const users = await userServ.getUsersStats(req.params.id);
        console.log(users);
        return res.status(users.error ? 400 : 200).json(users);
    });
}
module.exports = users;
