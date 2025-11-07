export {};
const CartModel = require('../models/cart.models');
const UserModel = require('../models/user.models');
const { isEmptyObject } = require('../helpers/validateVariables');
const { isValidObjectId } = require('mongoose');

// Response shape will be { success, code, message, data?, errors? }

class Cart {
  async getItems(idUser: any) {
    try {
      if (!isValidObjectId(idUser)) {
        return {
          success: false,
          code: 400,
          message: "Invalid user ID format",
          errors: ["Invalid ObjectId"]
        };
      }

      const cart = await CartModel.findById(idUser).populate('items._id', 'name price image');
      
      if (!cart) {
        return {
          success: false,
          code: 404,
          message: "Cart not found",
          data: null
        };
      }

      const products = cart.items.map((product: any) => ({
        ...product._id?._doc,
        amount: product.amount,
      }));

      return {
        success: true,
        code: 200,
        message: products.length ? "Cart items retrieved successfully" : "Cart is empty",
        data: products
      };
    } catch (error: any) {
      return {
        success: false,
        code: 500,
        message: "Error retrieving cart items",
        errors: [error.message]
      };
    }
  }

  async addToCart(idUser: any, idProduct: any, amount: any) {
    try {
      if (!isValidObjectId(idUser) || !isValidObjectId(idProduct)) {
        return {
          success: false,
          code: 400,
          message: "Invalid ID format",
          errors: ["Invalid ObjectId for user or product"]
        };
      }

      const cart = await CartModel.findById(idUser).populate('items._id', 'name price image');
      if (!cart) {
        return {
          success: false,
          code: 404,
          message: "Cart not found",
          data: null
        };
      }

      const productExists = cart.items.some((item: any) => item._id.toString() === idProduct);
      if (productExists) {
        return {
          success: false,
          code: 409,
          message: "Product already exists in cart",
          data: null
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
      ).populate('items._id', 'name price image');

      const products = result.items.map((product: any) => ({
        ...product._id?._doc,
        amount: product.amount,
      }));

      return {
        success: true,
        code: 200,
        message: "Product added to cart successfully",
        data: products
      };
    } catch (error: any) {
      return {
        success: false,
        code: 500,
        message: "Error adding product to cart",
        errors: [error.message]
      };
    }
  }

  async create(idUser: any) {
    try {
      if (!isValidObjectId(idUser)) {
        return {
          success: false,
          code: 400,
          message: "Invalid user ID format",
          errors: ["Invalid ObjectId"]
        };
      }

      const cart = await CartModel.create({ _id: idUser, items: [] });
      return {
        success: true,
        code: 201,
        message: "Cart created successfully",
        data: cart
      };
    } catch (error: any) {
      return {
        success: false,
        code: error.code === 11000 ? 409 : 500,
        message: error.code === 11000 ? "Cart already exists for this user" : "Error creating cart",
        errors: [error.message]
      };
    }
  }

  async removeFromCart(idUser: any, idProduct: any) {
    try {
      if (!isValidObjectId(idUser) || !isValidObjectId(idProduct)) {
        return {
          success: false,
          code: 400,
          message: "Invalid ID format",
          errors: ["Invalid ObjectId for user or product"]
        };
      }

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
      ).populate('items._id', 'name price image');

      if (!result) {
        return {
          success: false,
          code: 404,
          message: "Cart not found",
          data: null
        };
      }

      const products = result.items.map((product: any) => ({
        ...product._id?._doc,
        amount: product.amount,
      }));

      return {
        success: true,
        code: 200,
        message: "Product removed from cart successfully",
        data: products
      };
    } catch (error: any) {
      return {
        success: false,
        code: 500,
        message: "Error removing product from cart",
        errors: [error.message]
      };
    }
  }

  async changeAmount(idUser: any, idProduct: any, amount: any) {
    try {
      if (!isValidObjectId(idUser) || !isValidObjectId(idProduct)) {
        return {
          success: false,
          code: 400,
          message: "Invalid ID format",
          errors: ["Invalid ObjectId for user or product"]
        };
      }

      if (typeof amount !== 'number' || amount < 1) {
        return {
          success: false,
          code: 400,
          message: "Invalid amount",
          errors: ["Amount must be a positive number"]
        };
      }

      const result = await CartModel.findOneAndUpdate(
        { _id: idUser },
        { $set: { 'items.$[el].amount': amount } },
        {
          arrayFilters: [{ 'el._id': idProduct }],
          new: true,
        }
      ).populate('items._id', 'name price image');

      if (!result) {
        return {
          success: false,
          code: 404,
          message: "Cart not found",
          data: null
        };
      }

      const products = result.items.map((product: any) => ({
        ...product._id?._doc,
        amount: product.amount,
      }));

      return {
        success: true,
        code: 200,
        message: "Product amount updated successfully",
        data: products
      };
    } catch (error: any) {
      return {
        success: false,
        code: 500,
        message: "Error updating product amount",
        errors: [error.message]
      };
    }
  }

  async clearCart(cartId: any) {
    try {
      if (!isValidObjectId(cartId)) {
        return {
          success: false,
          code: 400,
          message: "Invalid cart ID format",
          errors: ["Invalid ObjectId"]
        };
      }

      const user = await UserModel.findById(cartId);
      if (!user) {
        return {
          success: false,
          code: 404,
          message: "User not found",
          data: null
        };
      }

      const cart = await CartModel.findByIdAndUpdate(
        user.id,
        { items: [] },
        { new: true }
      );

      if (!cart) {
        return {
          success: false,
          code: 404,
          message: "Cart not found",
          data: null
        };
      }

      return {
        success: true,
        code: 200,
        message: "Cart cleared successfully",
        data: cart
      };
    } catch (error: any) {
      return {
        success: false,
        code: 500,
        message: "Error clearing cart",
        errors: [error.message]
      };
    }
  }

  async getCartsStats() {
    try {
      const today = new Date();
      const lastYear = new Date(today);
      lastYear.setFullYear(today.getFullYear() - 1);

      const data = await CartModel.aggregate([
        {
          $match: {
            createdAt: { $gte: lastYear, $lte: today },
          },
        },
        {
          $project: {
            yearMonth: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
          },
        },
        {
          $group: {
            _id: "$yearMonth",
            total: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return {
        success: true,
        code: 200,
        message: "Cart statistics retrieved successfully",
        data: data
      };
    } catch (error: any) {
      return {
        success: false,
        code: 500,
        message: "Error fetching cart statistics",
        errors: [error.message]
      };
    }
  }
}
module.exports = Cart;
