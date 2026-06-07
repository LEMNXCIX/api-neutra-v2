import { Request, Response } from "express";
import { CreateStaffUseCase } from "@/core/application/booking/create-staff.use-case";
import { GetStaffUseCase } from "@/core/application/booking/get-staff.use-case";
import { GetStaffByUserIdUseCase } from "@/core/application/booking/get-staff-by-user-id.use-case";
import { UpdateStaffUseCase } from "@/core/application/booking/update-staff.use-case";
import { DeleteStaffUseCase } from "@/core/application/booking/delete-staff.use-case";
import { AssignStaffServiceUseCase } from "@/core/application/booking/assign-staff-service.use-case";
import { SyncStaffServicesUseCase } from "@/core/application/booking/sync-staff-services.use-case";
import { StaffPresenter } from "@/core/presenters/staff.presenter";
import { present } from "@/core/utils/use-case-result";
import { AppError } from "@/types/api-response";
import { AuthErrorCodes } from "@/types/error-codes";

export class StaffController {
    constructor(
        private createStaffUseCase: CreateStaffUseCase,
        private getStaffUseCase: GetStaffUseCase,
        private getStaffByUserIdUseCase: GetStaffByUserIdUseCase,
        private updateStaffUseCase: UpdateStaffUseCase,
        private deleteStaffUseCase: DeleteStaffUseCase,
        private assignStaffServiceUseCase: AssignStaffServiceUseCase,
        private syncStaffServicesUseCase: SyncStaffServicesUseCase,
    ) {}

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.createStaffUseCase.execute(
            tenantId,
            req.body,
        );
        return res.status(201).json(present(result, StaffPresenter.toResponse));
    }

    async getAll(req: Request, res: Response) {
        const tenantId = req.tenantId;

        const activeOnly = req.query.activeOnly !== "false";
        const result = await this.getStaffUseCase.execute(tenantId, activeOnly);
        return res
            .status(200)
            .json(present(result, StaffPresenter.toResponseList));
    }

    async update(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateStaffUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        return res.status(200).json(present(result, StaffPresenter.toResponse));
    }

    async delete(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteStaffUseCase.execute(tenantId, id);
        return res.status(200).json(result);
    }

    async assignService(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { staffId } = req.params;
        const { serviceId } = req.body;

        const result = await this.assignStaffServiceUseCase.execute(
            tenantId,
            staffId,
            serviceId,
        );
        return res.status(200).json(result);
    }

    async syncServices(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { staffId } = req.params;
        const { serviceIds } = req.body;

        const result = await this.syncStaffServicesUseCase.execute(
            tenantId,
            staffId,
            serviceIds,
        );
        return res.status(200).json(result);
    }

    async getMe(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const user = req.user!;

        if (!user || !user.id) {
            throw new AppError(
                "Unauthorized",
                401,
                AuthErrorCodes.UNAUTHORIZED,
            );
        }

        const result = await this.getStaffByUserIdUseCase.execute(
            tenantId,
            user.id,
        );
        return res.status(200).json(present(result, StaffPresenter.toResponse));
    }
}
