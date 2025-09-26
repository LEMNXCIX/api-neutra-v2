"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dbError = require('../helpers/dbError.helpers');
const UserModel = require('../models/user.models');
const CartService = require('../services/cart.services');
const uuid = require('uuid');
class User {
    async getAll() {
        try {
            const users = await UserModel.find().sort({ createdAt: 'desc' });
            return users;
        }
        catch (error) {
            return {
                error: true,
                message: error,
            };
        }
    }
    async getByEmail(email) {
        try {
            const user = await UserModel.findOne({ email });
            return user;
        }
        catch (error) {
            return {
                error: true,
                message: error,
            };
        }
    }
    async getById(id) {
        try {
            const user = await UserModel.findById(id);
            return user;
        }
        catch (er) {
            return {
                error: true,
                er,
            };
        }
    }
    async getOrCreateByProvider(data) {
        const userData = {
            provider: {
                [data.provider]: true,
            },
            idProvider: {
                [data.provider]: data.idProvider,
            },
        };
        let user = await UserModel.findOne(userData);
        if (!user) {
            data.password = uuid.v4();
            const newData = {
                ...data,
                ...userData,
            };
            try {
                user = await UserModel.create(newData);
                const cartServ = new CartService();
                const cart = await cartServ.create(user.id);
            }
            catch (error) {
                if (error.code === 11000 && error.keyValue.email) {
                    const email = error.keyValue.email;
                    const provider = 'provider.' + data.provider;
                    const idProvider = 'idProvider.' + data.provider;
                    user = await UserModel.updateOne({
                        email,
                    }, {
                        [provider]: true,
                        [idProvider]: data.idProvider,
                    }, { new: true });
                    return {
                        created: true,
                        user,
                    };
                }
                return dbError(error);
            }
        }
        return {
            created: true,
            user,
        };
    }
    async create(data) {
        try {
            const user = await UserModel.create(data);
            const cartServ = new CartService();
            const cart = await cartServ.create(user.id);
            return {
                created: true,
                user,
            };
        }
        catch (error) {
            return dbError(error);
        }
    }
    async getLastUsers() { }
    async getUsersStats() {
        try {
            const today = new Date();
            const lastYear = new Date(today);
            lastYear.setFullYear(today.getFullYear() - 1);
            const data = await UserModel.aggregate([
                {
                    $match: {
                        createdAt: { $gte: lastYear, $lte: today },
                    },
                },
                {
                    $project: {
                        yearMonth: {
                            $dateToString: { format: '%Y-%m', date: '$createdAt' },
                        },
                    },
                },
                {
                    $group: {
                        _id: '$yearMonth',
                        total: { $sum: 1 },
                    },
                },
                {
                    $sort: { _id: 1 },
                },
            ]);
            console.log(data);
            return data;
        }
        catch (err) {
            console.error('Error fetching user stats:', err);
        }
    }
}
module.exports = User;
