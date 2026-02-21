import { Application } from 'express';
import { LogController } from '@/interface-adapters/controllers/log.controller';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';

export default function logRoutes(app: Application, controller: LogController) {

    // Solo Super Admin debería tener acceso a los logs técnicos del sistema
    app.get(
        '/api/admin/logs',
        authenticate,
        requirePermission('features:read'), // Reusando permiso o podemos crear uno nuevo
        (req, res) => controller.getAll(req, res)
    );

    app.get(
        '/api/admin/logs/stats',
        authenticate,
        requirePermission('features:read'),
        (req, res) => controller.getStats(req, res)
    );
}
