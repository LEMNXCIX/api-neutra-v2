import { Request, Response } from "express";
import { CreateServiceUseCase } from "@/core/application/booking/create-service.use-case";
import { GetServicesUseCase } from "@/core/application/booking/get-services.use-case";
import { UpdateServiceUseCase } from "@/core/application/booking/update-service.use-case";
import { DeleteServiceUseCase } from "@/core/application/booking/delete-service.use-case";
import { ServiceResponse } from "@/core/application/dtos/responses/service/service.response";
import { present } from "@/core/utils/use-case-result";
import {
    CreateServiceDTO,
    UpdateServiceDTO,
} from "@/core/application/dtos/requests/service.request";

export class ServiceController {
    constructor(
        private createServiceUseCase: CreateServiceUseCase,
        private getServicesUseCase: GetServicesUseCase,
        private updateServiceUseCase: UpdateServiceUseCase,
        private deleteServiceUseCase: DeleteServiceUseCase,
    ) {}

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.createServiceUseCase.execute(
            tenantId,
            req.validatedBody as CreateServiceDTO,
        );
        return res
            .status(201)
            .json(present(result, ServiceResponse.fromEntity));
    }

    async getAll(req: Request, res: Response) {
        const tenantId = req.tenantId;

        const activeOnly = req.query.activeOnly !== "false";
        const result = await this.getServicesUseCase.execute(
            tenantId,
            activeOnly,
        );
        return res.status(200).json(
            present(result, (services) =>
                Array.isArray(services)
                    ? services.map((s) => ServiceResponse.fromEntity(s))
                    : [],
            ),
        );
    }

    async update(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateServiceUseCase.execute(
            tenantId,
            id,
            req.validatedBody as UpdateServiceDTO,
        );
        return res.status(200).json(present(result, ServiceResponse.fromEntity));
    }

    async delete(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteServiceUseCase.execute(tenantId, id);
        return res.status(200).json(result);
    }
}
