export {};
const ProductsModel = require('../models/products.models');
const dbError = require('../helpers/dbError.helpers');
const CartModelRef = require('../models/cart.models');

class Products {
  async getAll() {
    try {
      const products = await ProductsModel.find();
      return products;
    } catch (error: any) {
      return {
        error: true,
        message: error,
      };
    }
  }

  async create(data: any) {
    try {
      const products = await ProductsModel.create(data);
      return products;
    } catch (error: any) {
      return dbError(error);
    }
  }

  async getOne(idProduct: any) {
    try {
      const product = await ProductsModel.findById(idProduct);

      return product;
    } catch (error: any) {
      return {
        error: true,
        success: false,
        message: 'No se pudo realizar la búsqueda del producto',
      };
    }
  }

  async getByName(name: any) {
    try {
      const product = await ProductsModel.find({
        name: { $regex: '.*' + name + '.*' },
      });

      return product;
    } catch (error: any) {
      return {
        error: true,
        success: false,
        message: 'No se pudo realizar la búsqueda  por nombre del producto',
      };
    }
  }

  async update(id: any, data: any) {
    try {
      const user = await ProductsModel.findByIdAndUpdate(id, data);
      return user;
    } catch (error: any) {
      return {
        error: true,
        success: false,
        message: 'No se pudo actualizar el producto',
      };
    }
  }

  async delete(id: any, idUser: any) {
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
    } catch (error: any) {
      return {
        success: false,
        message: 'A ocurrido un error al borrar el producto',
      };
    }
  }
}
module.exports = Products;
