import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { CouponController } from '@/interface-adapters/controllers/coupon.controller';
import { PrismaCouponRepository } from '@/infrastructure/database/prisma/coupon.prisma-repository';

function couponRoutes(app: Application) {
    const router = Router();
    const couponRepository = new PrismaCouponRepository();
    const couponController = new CouponController(couponRepository);

    app.use('/api/coupons', router);

    // Authenticated user routes
    router.post('/validate', authenticate, couponController.validate);

    // Admin routes
    router.get('/', authenticate, requirePermission('coupons:read'), couponController.getAll);
    router.get('/:id', authenticate, requirePermission('coupons:read'), couponController.getById);
    router.get('/code/:code', authenticate, requirePermission('coupons:read'), couponController.getByCode);
    router.post('/', authenticate, requirePermission('coupons:write'), couponController.create);
    router.put('/:id', authenticate, requirePermission('coupons:write'), couponController.update);
    router.delete('/:id', authenticate, requirePermission('coupons:delete'), couponController.delete);
}

export default couponRoutes;
