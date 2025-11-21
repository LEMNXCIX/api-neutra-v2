import ProductsModel from '../models/products.models';
import dbError from '../helpers/dbError.helpers';
import CartModelRef from '../models/cart.models';

export default class Products {
  async getAll() {
    try {
      const products = await ProductsModel.find();
      return {
        success: true,
        code: 200,
        message: "Products listed successfully",
        data: products
      };
    } catch (error: any) {
      return {
        success: false,
        code: 500,
        message: "Error listing products",
        errors: error.message || error
      };
    }
  }

  async create(data: any) {
    try {
      const product = await ProductsModel.create(data);
      return {
        success: true,
        code: 201,
        message: "Product created successfully",
        data: product
      };
    } catch (error: any) {
      const dbResult = dbError(error);
      return {
        success: false,
        code: error.code === 11000 ? 409 : 400,
        message: dbResult.message || "Error creating product",
        errors: dbResult.message ? [dbResult.message] : [error.message]
      };
    }
  }

  async getOne(idProduct: any) {
    try {
      const product = await ProductsModel.findById(idProduct);
      if (!product) {
        return {
          success: false,
          code: 404,
          message: "Product not found",
          data: null
        };
      }
      return {
        success: true,
        code: 200,
        message: "",
        data: product
      };
    } catch (error: any) {
      return {
        success: false,
        code: error.name === 'CastError' ? 400 : 500,
        message: "Error fetching product",
        errors: error.message || error
      };
    }
  }

  async getByName(name: any) {
    try {
      const products = await ProductsModel.find({
        name: { $regex: name, $options: 'i' }  // Case-insensitive search
      });
      return {
        success: true,
        code: 200,
        message: products.length ? "" : "No products found matching search",
        data: products
      };
    } catch (error: any) {
      return {
        success: false,
        code: 500,
        message: "Error searching products",
        errors: error.message || error
      };
    }
  }

  async update(id: any, data: any) {
    try {
      const product = await ProductsModel.findByIdAndUpdate(id, data, { new: true });
      if (!product) {
        return {
          success: false,
          code: 404,
          message: "Product not found",
          data: null
        };
      }
      return {
        success: true,
        code: 200,
        message: "Product updated successfully",
        data: product
      };
    } catch (error: any) {
      return {
        success: false,
        code: error.name === 'CastError' ? 400 : 500,
        message: "Error updating product",
        errors: error.message || error
      };
    }
  }

  async delete(id: any, idUser: any) {
    try {
      const product = await ProductsModel.findOneAndDelete({
        _id: id,
        owner: idUser
      });

      if (!product) {
        return {
          success: false,
          code: 404,
          message: "Product not found or not authorized",
          data: null
        };
      }

      // Remove product from all carts
      await CartModelRef.updateMany(
        { 'items._id': product.id },
        { $pull: { items: { _id: product.id } } }
      );

      return {
        success: true,
        code: 200,
        message: "Product deleted successfully",
        data: product
      };
    } catch (error: any) {
      return {
        success: false,
        code: error.name === 'CastError' ? 400 : 500,
        message: "Error deleting product",
        errors: error.message || error
      };
    }
  }

  async getProductsStats() {
    try {
      const today = new Date();
      const lastYear = new Date(today);
      lastYear.setFullYear(today.getFullYear() - 1);

      const data = await ProductsModel.aggregate([
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
        message: "Product statistics retrieved successfully",
        data: data
      };
    } catch (error: any) {
      return {
        success: false,
        code: 500,
        message: "Error fetching product statistics",
        errors: error.message || error
      };
    }
  }
}
