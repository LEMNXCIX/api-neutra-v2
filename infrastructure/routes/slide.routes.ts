import { Application, Router } from 'express';
import authValidation from '@/middleware/auth.middleware';
import { SlideController } from '@/interface-adapters/controllers/slide.controller';
import { PrismaSlideRepository } from '@/infrastructure/database/prisma/slide.prisma-repository';

function slide(app: Application) {
    const router = Router();
    const slideRepository = new PrismaSlideRepository();
    const slideController = new SlideController(slideRepository);

    app.use('/api/slide', router);

    router.post('/', authValidation(2), slideController.create);
    router.put('/:id', authValidation(2), slideController.update);
    router.get('/', slideController.getAll);
    router.delete('/:id', authValidation(2), slideController.delete);
}

export default slide;
