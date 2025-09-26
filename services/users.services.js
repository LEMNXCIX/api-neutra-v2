const dbError = require("../helpers/dbError.helpers");
const UserModel = require("../models/user.models");
const CartService = require("../services/cart.services");
const uuid = require("uuid");

class User {
  /**
   * Obtener los datos de un usuario según su email
   * @param {email} email Email del usuario desde el body
   * @returns Objeto usuario \ error
   *
   */
  async getAll() {
    try {
      const users = await UserModel.find().sort({ createdAt: "desc" });
      //en esta parte obtenemos todos los datos
      return users; //array
    } catch (error) {
      return {
        error: true,
        error,
      };
    }
  }
  async getByEmail(email) {
    try {
      const user = await UserModel.findOne({ email });
      return user;
    } catch (error) {
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
    } catch (er) {
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
      } catch (error) {
        if (error.code === 11000 && error.keyValue.email) {
          // Duplicated entry
          const email = error.keyValue.email;
          const provider = "provider." + data.provider;
          const idProvider = "idProvider." + data.provider;
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

  /**
   * Crear Usuario
   * @param {data} data Datos del usuario del body
   * @returns Usuario creado o Error
   */
  async create(data) {
    try {
      const user = await UserModel.create(data);
      const cartServ = new CartService();
      const cart = await cartServ.create(user.id);
      return {
        created: true,
        user,
      };
    } catch (error) {
      return dbError(error);
    }
  }
  async getLastUsers() {}

  async getUsersStats() {
    try {
      // Obtener la fecha actual y la Fecha de hace un año
      const today = new Date();
      const lastYear = new Date(today);
      lastYear.setFullYear(today.getFullYear() - 1);

      // Agregación para contar usuarios creados por mes en el último año
      const data = await UserModel.aggregate([
        {
          // Filtrar usuarios creados desde hace un año hasta hoy
          $match: {
            createdAt: { $gte: lastYear, $lte: today },
          },
        },
        {
          // Proyectar el mes y el año de createdAt
          $project: {
            yearMonth: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
          },
        },
        {
          // Agrupar por año-mes y contar el total de usuarios
          $group: {
            _id: "$yearMonth",
            total: { $sum: 1 },
          },
        },
        {
          // Ordenar por año-mes ascendente
          $sort: { _id: 1 },
        },
      ]);

      console.log(data); // Ejemplo de salida: [{ _id: "2024-10", total: 50 }, { _id: "2024-11", total: 30 }, ...]
      return data;
    } catch (err) {
      console.error("Error fetching user stats:", err);
      //throw new Error('Failed to retrieve user statistics');
    }
  }
}

module.exports = User;
