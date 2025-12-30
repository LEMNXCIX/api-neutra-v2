import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ConfigureWhatsAppUseCase } from '@/core/application/whatsapp/configure-whatsapp.use-case';
import { WhatsAppConfigPrismaRepository } from '@/infrastructure/database/prisma/whatsapp-config.prisma-repository';
import { PrismaFeatureRepository } from '@/infrastructure/database/prisma/feature.prisma-repository';

// Manual DI setup
const prisma = new PrismaClient();
const whatsappConfigRepo = new WhatsAppConfigPrismaRepository(prisma);
const featureRepo = new PrismaFeatureRepository();
const configureWhatsAppUseCase = new ConfigureWhatsAppUseCase(whatsappConfigRepo, featureRepo);

export class WhatsAppConfigController {

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

            const config = await whatsappConfigRepo.findByTenantId(tenantId);

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

            const updatedConfig = await configureWhatsAppUseCase.execute(tenantId, data);

            return res.status(200).json(updatedConfig);
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to update config' });
        }
    }
}
