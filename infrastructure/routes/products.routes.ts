import { Application, Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware';
import { ProductController } from '../../interface-adapters/controllers/product.controller';
import { PrismaProductRepository } from '../database/prisma/product.prisma-repository';

function products(app: Application) {
    const router = Router();
    const productRepository = new PrismaProductRepository();
    const productController = new ProductController(productRepository);

    app.use('/api/products', router);

    router.get('/', productController.getAll);
    router.post('/', authMiddleware(1), productController.create);
    router.post('/search/', productController.search);
    router.get('/:id', productController.getOne);
    router.get('/one/:id', productController.getOne); // Alias
    router.delete('/:id', authMiddleware(1), productController.delete);
    router.put('/:id', authMiddleware(1), productController.update);
    router.get('/stats', authMiddleware(2), productController.getStats);
}

export default products;
