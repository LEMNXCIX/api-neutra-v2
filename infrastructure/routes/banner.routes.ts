import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { BannerController } from '@/interface-adapters/controllers/banner.controller';
import { PrismaBannerRepository } from '@/infrastructure/database/prisma/banner.prisma-repository';

function bannerRoutes(app: Application) {
    const router = Router();
    const bannerRepository = new PrismaBannerRepository();
    const bannerController = new BannerController(bannerRepository);

    app.use('/api/banners', router);

    // Public routes
    router.get('/', bannerController.getActive);
    router.get('/:id', bannerController.getById);
    router.post('/:id/impression', bannerController.trackImpression);
    router.post('/:id/click', bannerController.trackClick);

    // Admin routes
    router.get('/all/list', authenticate, requirePermission('banners:read'), bannerController.getAll);
    router.post('/', authenticate, requirePermission('banners:write'), bannerController.create);
    router.put('/:id', authenticate, requirePermission('banners:write'), bannerController.update);
    router.delete('/:id', authenticate, requirePermission('banners:delete'), bannerController.delete);
}

export default bannerRoutes;
