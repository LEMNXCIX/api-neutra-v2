import { Request, Response } from 'express';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { GetFeaturesUseCase } from '@/core/application/feature/get-features.use-case';
import { CreateFeatureUseCase } from '@/core/application/feature/create-feature.use-case';
import { UpdateFeatureUseCase } from '@/core/application/feature/update-feature.use-case';
import { DeleteFeatureUseCase } from '@/core/application/feature/delete-feature.use-case';
import { ILogger } from '@/core/providers/logger.interface';

export class FeatureController {
    constructor(
        private getFeaturesUseCase: GetFeaturesUseCase,
        private createFeatureUseCase: CreateFeatureUseCase,
        private updateFeatureUseCase: UpdateFeatureUseCase,
        private deleteFeatureUseCase: DeleteFeatureUseCase,
        private logger: ILogger
    ) {
        this.getAll = this.getAll.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async getAll(req: Request, res: Response) {
        try {
            const features = await this.getFeaturesUseCase.execute();
            res.json({ success: true, data: features });
        } catch (error: any) {
            this.logger.error(`Error getting features: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const feature = await this.createFeatureUseCase.execute(req.body);
            res.status(201).json({ success: true, data: feature });
        } catch (error: any) {
            this.logger.error(`Error creating feature: ${error.message}`);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const feature = await this.updateFeatureUseCase.execute(req.params.id, req.body);
            res.json({ success: true, data: feature });
        } catch (error: any) {
            this.logger.error(`Error updating feature: ${error.message}`);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            await this.deleteFeatureUseCase.execute(req.params.id);
            res.json({ success: true, message: 'Feature deleted successfully' });
        } catch (error: any) {
            this.logger.error(`Error deleting feature: ${error.message}`);
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
