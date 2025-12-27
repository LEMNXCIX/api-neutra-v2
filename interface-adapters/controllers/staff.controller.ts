import { Request, Response } from 'express';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { CreateStaffUseCase } from '@/core/application/booking/create-staff.use-case';
import { GetStaffUseCase } from '@/core/application/booking/get-staff.use-case';
import { UpdateStaffUseCase } from '@/core/application/booking/update-staff.use-case';
import { DeleteStaffUseCase } from '@/core/application/booking/delete-staff.use-case';
import { ILogger } from '@/core/providers/logger.interface';

export class StaffController {
    private createStaffUseCase: CreateStaffUseCase;
    private getStaffUseCase: GetStaffUseCase;
    private updateStaffUseCase: UpdateStaffUseCase;
    private deleteStaffUseCase: DeleteStaffUseCase;

    constructor(
        private staffRepository: IStaffRepository,
        private logger: ILogger
    ) {
        this.createStaffUseCase = new CreateStaffUseCase(staffRepository, logger);
        this.getStaffUseCase = new GetStaffUseCase(staffRepository, logger);
        this.updateStaffUseCase = new UpdateStaffUseCase(staffRepository, logger);
        this.deleteStaffUseCase = new DeleteStaffUseCase(staffRepository, logger);
    }

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.createStaffUseCase.execute(tenantId, req.body);
        return res.status(result.code).json(result);
    }

    async getAll(req: Request, res: Response) {
        let tenantId = req.tenantId;
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

        const activeOnly = req.query.activeOnly !== 'false';
        const result = await this.getStaffUseCase.execute(tenantId!, activeOnly);
        return res.status(result.code).json(result);
    }

    async update(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateStaffUseCase.execute(tenantId, id, req.body);
        return res.status(result.code).json(result);
    }

    async delete(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteStaffUseCase.execute(tenantId, id);
        return res.status(result.code).json(result);
    }

    async assignService(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { staffId } = req.params;
        const { serviceId } = req.body;

        try {
            await this.staffRepository.assignService(tenantId, staffId, serviceId);
            return res.status(200).json({
                success: true,
                message: 'Service assigned to staff successfully',
            });
        } catch (error: any) {
            this.logger.error('Error assigning service to staff', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Error assigning service',
            });
        }
    }

    async syncServices(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { staffId } = req.params;
        const { serviceIds } = req.body;

        if (!Array.isArray(serviceIds)) {
            return res.status(400).json({
                success: false,
                message: 'serviceIds must be an array',
            });
        }

        try {
            await this.staffRepository.syncServices(tenantId, staffId, serviceIds);
            return res.status(200).json({
                success: true,
                message: 'Staff services synchronized successfully',
            });
        } catch (error: any) {
            this.logger.error('Error syncing staff services', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Error syncing services',
            });
        }
    }
}
