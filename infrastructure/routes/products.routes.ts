import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { ProductController } from '@/interface-adapters/controllers/product.controller';
import { PrismaProductRepository } from '@/infrastructure/database/prisma/product.prisma-repository';

function products(app: Application) {
    const router = Router();
    const productRepository = new PrismaProductRepository();
    const productController = new ProductController(productRepository);

    app.use('/api/products', router);

    // Public routes (no authentication required)
    router.get('/', productController.getAll);
    router.post('/search/', productController.search);
    router.get('/:id', productController.getOne);
    router.get('/one/:id', productController.getOne); // Alias

    // Protected routes with permission-based authorization
    router.post('/', authenticate, requirePermission('products:write'), productController.create);
    router.put('/:id', authenticate, requirePermission('products:write'), productController.update);
    router.delete('/:id', authenticate, requirePermission('products:delete'), productController.delete);
    router.get('/stats', authenticate, requirePermission('stats:read'), productController.getStats);
}

export default products;
