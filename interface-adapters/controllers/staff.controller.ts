import type { Request, Response } from "express";
import type { AssignStaffServiceUseCase } from "@/core/application/booking/assign-staff-service.use-case";
import type { CreateStaffUseCase } from "@/core/application/booking/create-staff.use-case";
import type { DeleteStaffUseCase } from "@/core/application/booking/delete-staff.use-case";
import type { GetStaffUseCase } from "@/core/application/booking/get-staff.use-case";
import type { GetStaffByUserIdUseCase } from "@/core/application/booking/get-staff-by-user-id.use-case";
import type { SyncStaffServicesUseCase } from "@/core/application/booking/sync-staff-services.use-case";
import type { UpdateStaffUseCase } from "@/core/application/booking/update-staff.use-case";
import type {
    AssignStaffServiceDTO,
    CreateStaffDTO,
    SyncStaffServicesDTO,
    UpdateStaffDTO,
} from "@/core/application/dtos/requests/staff.request";
import { StaffResponse } from "@/core/application/dtos/responses/staff/staff.response";
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
            req.validatedBody as CreateStaffDTO,
        );
        return res.status(201).json(present(result, StaffResponse.fromEntity));
    }

    async getAll(req: Request, res: Response) {
        const tenantId = req.tenantId;

        const activeOnly = req.query.activeOnly !== "false";
        const result = await this.getStaffUseCase.execute(tenantId, activeOnly);
        return res
            .status(200)
            .json(
                present(result, (staffList) =>
                    Array.isArray(staffList)
                        ? staffList.map((s) => StaffResponse.fromEntity(s))
                        : [],
                ),
            );
    }

    async update(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateStaffUseCase.execute(
            tenantId,
            id,
            req.validatedBody as UpdateStaffDTO,
        );
        return res.status(200).json(present(result, StaffResponse.fromEntity));
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
        const { serviceId } = req.validatedBody as AssignStaffServiceDTO;

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
        const { serviceIds } = req.validatedBody as SyncStaffServicesDTO;

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

        if (!user?.id) {
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
        return res.status(200).json(present(result, StaffResponse.fromEntity));
    }
}
