import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { CategoryController } from '@/interface-adapters/controllers/category.controller';
import { PrismaCategoryRepository } from '@/infrastructure/database/prisma/category.prisma-repository';

function categoryRoutes(app: Application) {
    const router = Router();
    const categoryRepository = new PrismaCategoryRepository();
    const categoryController = new CategoryController(categoryRepository);

    app.use('/api/categories', router);

    // Public routes
    router.get('/', categoryController.getAll);
    router.get('/:id', categoryController.getById);

    // Protected routes
    router.post('/', authenticate, requirePermission('categories:write'), categoryController.create);
    router.put('/:id', authenticate, requirePermission('categories:write'), categoryController.update);
    router.delete('/:id', authenticate, requirePermission('categories:delete'), categoryController.delete);
}

export default categoryRoutes;
