import type { Request, Response } from "express";
import type {
    CreateFeatureDTO,
    UpdateFeatureDTO,
} from "@/core/application/dtos/requests/feature.request";
import { FeatureResponse } from "@/core/application/dtos/responses/feature/feature.response";
import type { CreateFeatureUseCase } from "@/core/application/feature/create-feature.use-case";
import type { DeleteFeatureUseCase } from "@/core/application/feature/delete-feature.use-case";
import type { GetFeaturesUseCase } from "@/core/application/feature/get-features.use-case";
import type { UpdateFeatureUseCase } from "@/core/application/feature/update-feature.use-case";
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
        // `feature.routes.ts` carries no `validateDto`, so `req.body` is
        // whatever the client sent. Reading the five fields a catalog create
        // accepts keeps the body equal to `FeatureCreateData`, the repository's
        // own allowlist: a `tenantId` in the body is not what scopes a
        // `Feature` row (the table has no such column), and any other key is
        // one the repository never copies, so forwarding it only widens the
        // set of things that can reach a future column. Same shape as
        // RoleController.create.
        const data: CreateFeatureDTO = {
            key: req.body?.key,
            name: req.body?.name,
            description: req.body?.description,
            category: req.body?.category,
            price: req.body?.price,
        };
        const result = await this.createFeatureUseCase.execute(data);
        return res
            .status(201)
            .json(present(result, FeatureResponse.fromEntity));
    }

    async update(req: Request, res: Response) {
        // No `key`: it is the join key every tenant's `TenantFeature` row and
        // every stored `config.features` map is written by, and
        // `UpdateFeatureDTO` never declared it. `IFeatureRepository.update`
        // states the same immutability.
        const data: UpdateFeatureDTO = {
            name: req.body?.name,
            description: req.body?.description,
            category: req.body?.category,
            price: req.body?.price,
        };
        const result = await this.updateFeatureUseCase.execute(
            req.params.id,
            data,
        );
        return res.json(present(result, FeatureResponse.fromEntity));
    }

    async delete(req: Request, res: Response) {
        const result = await this.deleteFeatureUseCase.execute(req.params.id);
        return res.json(result);
    }
}
