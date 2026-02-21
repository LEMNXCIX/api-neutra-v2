import { Request, Response } from 'express';
import { ISlideRepository } from '@/core/repositories/slide.repository.interface';
import { CreateSlideUseCase } from '@/core/application/slide/create-slide.use-case';
import { UpdateSlideUseCase } from '@/core/application/slide/update-slide.use-case';
import { GetSlidesUseCase } from '@/core/application/slide/get-slides.use-case';
import { DeleteSlideUseCase } from '@/core/application/slide/delete-slide.use-case';
import { GetSliderStatsUseCase } from '@/core/application/slide/get-slider-stats.use-case';

export class SlideController {
    constructor(
        private createSlideUseCase: CreateSlideUseCase,
        private updateSlideUseCase: UpdateSlideUseCase,
        private getSlidesUseCase: GetSlidesUseCase,
        private deleteSlideUseCase: DeleteSlideUseCase,
        private getSliderStatsUseCase: GetSliderStatsUseCase
    ) {
        // Bind methods
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.getAll = this.getAll.bind(this);
        this.delete = this.delete.bind(this);
        this.getById = this.getById.bind(this);
        this.getStats = this.getStats.bind(this);
    }

    async getById(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const id = req.params.id;
        const result = await this.getSlidesUseCase.executeById(tenantId, id);
        return res.json(result);
    }

    async getStats(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const result = await this.getSliderStatsUseCase.execute(tenantId);
        return res.json(result);
    }

    async create(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const result = await this.createSlideUseCase.execute(tenantId, req.body);
        return res.status(201).json(result);
    }

    async update(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const id = req.params.id;
        const result = await this.updateSlideUseCase.execute(tenantId, id, req.body);
        return res.json(result);
    }

    async getAll(req: Request, res: Response) {
        let tenantId = (req as any).tenantId;
        const user = (req as any).user;

        // Super Admin Bypass
        if (user && user.role && user.role.name === 'SUPER_ADMIN') {
            if (req.query.tenantId) {
                tenantId = req.query.tenantId as string;
                if (tenantId === 'all') tenantId = undefined;
            }
        } else if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant ID required" });
        }

        const result = await this.getSlidesUseCase.execute(tenantId);
        return res.json(result);
    }

    async delete(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const id = req.params.id;
        const result = await this.deleteSlideUseCase.execute(tenantId, id);
        return res.json(result);
    }
}
