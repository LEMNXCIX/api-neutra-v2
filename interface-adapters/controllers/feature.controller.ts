import { Request, Response } from "express";
import { GetFeaturesUseCase } from "@/core/application/feature/get-features.use-case";
import { CreateFeatureUseCase } from "@/core/application/feature/create-feature.use-case";
import { UpdateFeatureUseCase } from "@/core/application/feature/update-feature.use-case";
import { DeleteFeatureUseCase } from "@/core/application/feature/delete-feature.use-case";
import { FeatureResponse } from "@/core/application/dtos/responses/feature/feature.response";
import { present } from "@/core/utils/use-case-result";

export class FeatureController {
    constructor(
        private getFeaturesUseCase: GetFeaturesUseCase,
        private createFeatureUseCase: CreateFeatureUseCase,
        private updateFeatureUseCase: UpdateFeatureUseCase,
        private deleteFeatureUseCase: DeleteFeatureUseCase,
    ) {
        // Route handlers are registered as bare method references
        this.getAll = this.getAll.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async getAll(req: Request, res: Response) {
        const result = await this.getFeaturesUseCase.execute();
        return res.json(
            present(result, (features) =>
                Array.isArray(features)
                    ? features.map((f) => FeatureResponse.fromEntity(f))
                    : [],
            ),
        );
    }

    async create(req: Request, res: Response) {
        const result = await this.createFeatureUseCase.execute(req.body);
        return res
            .status(201)
            .json(present(result, FeatureResponse.fromEntity));
    }

    async update(req: Request, res: Response) {
        const result = await this.updateFeatureUseCase.execute(
            req.params.id,
            req.body,
        );
        return res.json(present(result, FeatureResponse.fromEntity));
    }

    async delete(req: Request, res: Response) {
        const result = await this.deleteFeatureUseCase.execute(req.params.id);
        return res.json(result);
    }
}
