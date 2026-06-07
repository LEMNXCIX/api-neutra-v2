import { Request, Response } from "express";
import { GetFeaturesUseCase } from "@/core/application/feature/get-features.use-case";
import { CreateFeatureUseCase } from "@/core/application/feature/create-feature.use-case";
import { UpdateFeatureUseCase } from "@/core/application/feature/update-feature.use-case";
import { DeleteFeatureUseCase } from "@/core/application/feature/delete-feature.use-case";
import { FeaturePresenter } from "@/core/presenters/feature.presenter";
import { present } from "@/core/utils/use-case-result";

export class FeatureController {
    constructor(
        private getFeaturesUseCase: GetFeaturesUseCase,
        private createFeatureUseCase: CreateFeatureUseCase,
        private updateFeatureUseCase: UpdateFeatureUseCase,
        private deleteFeatureUseCase: DeleteFeatureUseCase,
    ) {}

    async getAll(req: Request, res: Response) {
        const result = await this.getFeaturesUseCase.execute();
        return res.json(present(result, FeaturePresenter.toResponseList));
    }

    async create(req: Request, res: Response) {
        const result = await this.createFeatureUseCase.execute(req.body);
        return res
            .status(201)
            .json(present(result, FeaturePresenter.toResponse));
    }

    async update(req: Request, res: Response) {
        const result = await this.updateFeatureUseCase.execute(
            req.params.id,
            req.body,
        );
        return res.json(present(result, FeaturePresenter.toResponse));
    }

    async delete(req: Request, res: Response) {
        const result = await this.deleteFeatureUseCase.execute(req.params.id);
        return res.json(result);
    }
}
