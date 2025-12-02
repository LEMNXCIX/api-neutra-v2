import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { SlideController } from '@/interface-adapters/controllers/slide.controller';
import { PrismaSlideRepository } from '@/infrastructure/database/prisma/slide.prisma-repository';

function slide(app: Application) {
    const router = Router();
    const slideRepository = new PrismaSlideRepository();
    const slideController = new SlideController(slideRepository);

    app.use('/api/slide', router);

    router.post('/', authenticate, requirePermission('slides:write'), slideController.create);
    router.put('/:id', authenticate, requirePermission('slides:write'), slideController.update);
    router.get('/', slideController.getAll);
    router.delete('/:id', authenticate, requirePermission('slides:delete'), slideController.delete);
}

export default slide;
