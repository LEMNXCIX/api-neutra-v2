import { Request, Response } from "express";
import { CreateSlideUseCase } from "@/core/application/slide/create-slide.use-case";
import { UpdateSlideUseCase } from "@/core/application/slide/update-slide.use-case";
import { GetSlidesUseCase } from "@/core/application/slide/get-slides.use-case";
import { DeleteSlideUseCase } from "@/core/application/slide/delete-slide.use-case";
import { GetSliderStatsUseCase } from "@/core/application/slide/get-slider-stats.use-case";
import { SlideResponse } from "@/core/application/dtos/responses/slide/slide.response";
import { present } from "@/core/utils/use-case-result";
import {
    CreateSlideshowDTO,
    UpdateSlideshowDTO,
} from "@/core/application/dtos/requests/slide.request";

export class SlideController {
    constructor(
        private createSlideUseCase: CreateSlideUseCase,
        private updateSlideUseCase: UpdateSlideUseCase,
        private getSlidesUseCase: GetSlidesUseCase,
        private deleteSlideUseCase: DeleteSlideUseCase,
        private getSliderStatsUseCase: GetSliderStatsUseCase,
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
        const tenantId = req.tenantId!;
        const id = req.params.id;
        const result = await this.getSlidesUseCase.executeById(tenantId, id);
        return res.json(present(result, SlideResponse.fromEntity));
    }

    async getStats(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.getSliderStatsUseCase.execute(tenantId);
        return res.json(result);
    }

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.createSlideUseCase.execute(
            tenantId,
            req.validatedBody as CreateSlideshowDTO,
        );
        return res.status(201).json(present(result, SlideResponse.fromEntity));
    }

    async update(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const id = req.params.id;
        const result = await this.updateSlideUseCase.execute(
            tenantId,
            id,
            req.validatedBody as UpdateSlideshowDTO,
        );
        return res.json(present(result, SlideResponse.fromEntity));
    }

    async getAll(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const activeOnly = req.query.activeOnly === "true";

        const result = await this.getSlidesUseCase.execute(tenantId, {
            activeOnly,
        });
        return res.json(
            present(result, (slides) =>
                Array.isArray(slides)
                    ? slides.map((s) => SlideResponse.fromEntity(s))
                    : [],
            ),
        );
    }

    async delete(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const id = req.params.id;
        const result = await this.deleteSlideUseCase.execute(tenantId, id);
        return res.json(result);
    }
}
