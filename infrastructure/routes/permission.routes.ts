import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { PermissionController } from '@/interface-adapters/controllers/permission.controller';
import { PrismaPermissionRepository } from '@/infrastructure/database/prisma/permission.prisma-repository';

function permissionRoutes(app: Application) {
    const router = Router();
    const permissionRepository = new PrismaPermissionRepository();
    const permissionController = new PermissionController(permissionRepository);

    app.use('/api/permissions', router);

    // Protected routes (Admin only usually)
    router.get('/', authenticate, requirePermission('permissions:read'), permissionController.getAll);
    router.get('/:id', authenticate, requirePermission('permissions:read'), permissionController.getById);
    router.post('/', authenticate, requirePermission('permissions:write'), permissionController.create);
    router.put('/:id', authenticate, requirePermission('permissions:write'), permissionController.update);
    router.delete('/:id', authenticate, requirePermission('permissions:delete'), permissionController.delete);
}

export default permissionRoutes;
