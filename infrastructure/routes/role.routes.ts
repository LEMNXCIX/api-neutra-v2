import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { RoleController } from '@/interface-adapters/controllers/role.controller';
import { PrismaRoleRepository } from '@/infrastructure/database/prisma/role.prisma-repository';
import { PrismaUserRepository } from '@/infrastructure/database/prisma/user.prisma-repository';

function roleRoutes(app: Application) {
    const router = Router();
    const roleRepository = new PrismaRoleRepository();
    const userRepository = new PrismaUserRepository();
    const roleController = new RoleController(roleRepository, userRepository);

    app.use('/api/roles', router);

    // Protected routes (Admin only usually)
    router.get('/', authenticate, requirePermission('roles:read'), roleController.getAll);
    router.get('/:id', authenticate, requirePermission('roles:read'), roleController.getById);
    router.post('/', authenticate, requirePermission('roles:write'), roleController.create);
    router.put('/:id', authenticate, requirePermission('roles:write'), roleController.update);
    router.delete('/:id', authenticate, requirePermission('roles:delete'), roleController.delete);
}

export default roleRoutes;
