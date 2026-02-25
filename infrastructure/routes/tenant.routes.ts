
import { Application, Router } from 'express';
import { TenantController } from '../../interface-adapters/controllers/tenant.controller';
import { authenticate } from '@/middleware/authenticate.middleware';

function tenants(app: Application, tenantController: TenantController) {
    const router = Router();

    // Debug route
    router.get('/test-debug', (req, res) => res.json({ message: 'Tenants router is working' }));

    // Basic CRUD
    router.get('/config/:slug', (req, res) => tenantController.getBySlug(req, res));
    router.get('/', authenticate, (req, res) => tenantController.getAll(req, res));
    router.post('/', authenticate, (req, res) => tenantController.create(req, res));
    router.get('/:id/features', (req, res) => tenantController.getFeatures(req, res));
    router.put('/:id/features', authenticate, (req, res) => tenantController.updateFeatures(req, res));
    router.get('/:id', authenticate, (req, res) => tenantController.getById(req, res));
    router.put('/:id', authenticate, (req, res) => tenantController.update(req, res));
    router.delete('/:id', authenticate, (req, res) => tenantController.delete(req, res));

    app.use('/api/tenants', router);
}


export default tenants;

