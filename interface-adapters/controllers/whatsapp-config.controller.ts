import { Request, Response } from 'express';
import { ConfigureWhatsAppUseCase } from '@/core/application/whatsapp/configure-whatsapp.use-case';
import { IWhatsAppConfigRepository } from '@/core/repositories/whatsapp-config.repository.interface';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';

export class WhatsAppConfigController {
    constructor(
        private configureWhatsAppUseCase: ConfigureWhatsAppUseCase,
        private whatsappConfigRepo: IWhatsAppConfigRepository
    ) { }

    /**
     * Get Config
     * GET /api/admin/whatsapp/config
     */
    async getConfig(req: Request, res: Response) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant ID is required' });
            }

            const config = await this.whatsappConfigRepo.findByTenantId(tenantId);

            // Mask sensitive data
            if (config) {
                config.accessToken = '********';
                config.webhookVerifyToken = '********';
            }

            return res.status(200).json(config || {});
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to fetch config' });
        }
    }

    /**
     * Update Config
     * POST /api/admin/whatsapp/config
     */
    async updateConfig(req: Request, res: Response) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const data = req.body;

            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant ID is required' });
            }

            const updatedConfig = await this.configureWhatsAppUseCase.execute(tenantId, data);

            return res.status(200).json(updatedConfig);
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to update config' });
        }
    }
}
