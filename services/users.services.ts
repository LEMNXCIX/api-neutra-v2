export {};
const dbError = require('../helpers/dbError.helpers');
const UserModel = require('../models/user.models');
const CartService = require('../services/cart.services');
const uuid = require('uuid');
const logger = require('../helpers/logger.helpers');

class User {
  async getAll(): Promise<ServiceResult<any[]>> {
    try {
      const users = await UserModel.find().sort({ createdAt: 'desc' });
      logger.info({ action: 'getAllUsers', count: users.length });
      return { success: true, code: 200, message: '', data: users };
    } catch (error: any) {
      logger.error({ action: 'getAllUsersError', error });
      return { success: false, code: 500, message: 'Error fetching users', errors: error };
    }
  }
  async getByEmail(email: string): Promise<ServiceResult<any | null>> {
    try {
      const user = await UserModel.findOne({ email });
      return { success: true, code: 200, message: '', data: user };
    } catch (error: any) {
      return { success: false, code: 500, message: 'Error fetching user by email', errors: error };
    }
  }
  async getById(id: string): Promise<ServiceResult<any | null>> {
    try {
      const user = await UserModel.findById(id);
      return { success: true, code: 200, message: '', data: user };
    } catch (er: any) {
      return { success: false, code: 500, message: 'Error fetching user by id', errors: er };
    }
  }

  async getOrCreateByProvider(data: any) {
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
        logger.info({ action: 'createUserByProvider', provider: data.provider, userId: user.id });
      } catch (error: any) {
        logger.error({ action: 'createUserByProviderError', error });
        if (error.code === 11000 && error.keyValue.email) {
          const email = error.keyValue.email;
          const provider = 'provider.' + data.provider;
          const idProvider = 'idProvider.' + data.provider;
          user = await UserModel.updateOne(
            {
              email,
            },
            {
              [provider]: true,
              [idProvider]: data.idProvider,
            },
            { new: true }
          );
          return { success: true, code: 201, message: 'User linked to provider', data: { created: true, user } };
        }
        // normalize db errors to ServiceResult shape
        const dbPayload = dbError(error);
        const msg = dbPayload && dbPayload.message ? (Array.isArray(dbPayload.message) ? dbPayload.message.map((m: any) => m.message).join(', ') : String(dbPayload.message)) : 'Error creating user by provider';
        return { success: false, code: 400, message: msg, errors: dbPayload.message || dbPayload };
      }
    }
    return { success: true, code: 200, message: '', data: { created: true, user } };
  }

  async create(data: CreateUserDto) {
    try {
      const user = await UserModel.create(data);
      const cartServ = new CartService();
      const cart = await cartServ.create(user.id);
      logger.info({ action: 'createUser', userId: user.id });
      return { success: true, code: 201, message: 'User created', data: { created: true, user } };
    } catch (error: any) {
      logger.error({ action: 'createUserError', error });
      // normalize db errors to ServiceResult shape
      const dbPayload = dbError(error);
      const msg = dbPayload && dbPayload.message ? (Array.isArray(dbPayload.message) ? dbPayload.message.map((m: any) => m.message).join(', ') : String(dbPayload.message)) : 'Error creating user';
      return { success: false, code: 400, message: msg, errors: dbPayload.message || dbPayload };
    }
  }
  async getLastUsers() {}

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
      return { success: true, code: 200, message: '', data };
    } catch (err: any) {
      console.error('Error fetching user stats:', err);
    }
  }
}

module.exports = User;
