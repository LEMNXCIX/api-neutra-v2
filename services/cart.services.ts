export {};
const CartModel = require('../models/cart.models');
const UserModel = require('../models/user.models');
const { isEmptyObject } = require('../helpers/validateVariables');
const { isValidObjectId } = require('mongoose');

const RESPONSE: any = {
  success: false,
  error: false,
  message: null,
  data: {},
  errorDetails: null,
};

class Cart {
  async getItems(idUser: any) {
    try {
      if (!isValidObjectId(idUser)) {
        throw new Error('No es un usuario valido');
      }
      const result = await CartModel.findById(idUser).populate('items._id', 'name price image');
      result.items.map((product: any) => {
        RESPONSE.data = {
          ...product._id?._doc,
          amount: product.amount,
        };
      });

      RESPONSE.success = true;
      RESPONSE.message = isEmptyObject(RESPONSE.data)
        ? 'Se realizo la consulta exitosmente'
        : 'No tienes items :(';
    } catch (error: any) {
      RESPONSE.error = true;
      RESPONSE.message = error;
      RESPONSE.errorDetails = [error.message];
    }

    return RESPONSE;
  }

  async addToCart(idUser: any, idProduct: any, amount: any) {
    const product = await this.getItems(idUser);

    const productoExiste = product.some((producto: any) => {
      return producto._id == idProduct;
    });
    if (productoExiste) {
      return {
        success: true,
        message: 'El producto ya se ha añadido al carrito',
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
    const products = result.items.map((product: any) => {
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

  async create(idUser: any) {
    const cart = await CartModel.create({ _id: idUser, items: [] });
    return cart;
  }

  async removeFromCart(idUser: any, idProduct: any) {
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
    const products = result.items.map((product: any) => {
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

  async changeAmount(idUser: any, idProduct: any, amount: any) {
    const result = await CartModel.findOneAndUpdate(
      { _id: idUser },
      { $set: { 'items.$[el].amount': amount } },
      {
        arrayFilters: [{ 'el._id': idProduct }],
        new: true,
      }
    ).populate('items._id', 'name price image');

    const products = result.items.map((product: any) => {
      return {
        ...product._id?._doc,
        amount: product.amount,
      };
    });

    return products;
  }

  async clearCart(cartId: any) {
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
