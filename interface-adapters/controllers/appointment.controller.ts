import { Request, Response } from "express";
import { CreateAppointmentUseCase } from "@/core/application/booking/create-appointment.use-case";
import { GetAppointmentsUseCase } from "@/core/application/booking/get-appointments.use-case";
import { GetAppointmentByIdUseCase } from "@/core/application/booking/get-appointment-by-id.use-case";
import { CancelAppointmentUseCase } from "@/core/application/booking/cancel-appointment.use-case";
import { GetAvailabilityUseCase } from "@/core/application/booking/get-availability.use-case";
import { UpdateAppointmentStatusUseCase } from "@/core/application/booking/update-appointment-status.use-case";
import { DeleteAppointmentUseCase } from "@/core/application/booking/delete-appointment.use-case";
import { AppointmentStatus } from "@/core/entities/appointment.entity";
import { AppointmentPresenter } from "@/core/presenters/appointment.presenter";
import { present } from "@/core/utils/use-case-result";

export class AppointmentController {
    constructor(
        private createAppointmentUseCase: CreateAppointmentUseCase,
        private getAppointmentsUseCase: GetAppointmentsUseCase,
        private getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        private cancelAppointmentUseCase: CancelAppointmentUseCase,
        private getAvailabilityUseCase: GetAvailabilityUseCase,
        private updateAppointmentStatusUseCase: UpdateAppointmentStatusUseCase,
        private deleteAppointmentUseCase: DeleteAppointmentUseCase,
    ) {}

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const origin =
            (req.headers["x-original-origin"] as string) ||
            req.headers.origin ||
            `${req.protocol}://${req.get("host")}`;
        const result = await this.createAppointmentUseCase.execute(
            tenantId,
            req.body,
            origin,
        );
        return res
            .status(201)
            .json(present(result, AppointmentPresenter.toResponse));
    }

    async getAll(req: Request, res: Response) {
        const tenantId = req.tenantId;

        const filters: Record<string, unknown> = {};

        if (req.query.userId) filters.userId = req.query.userId as string;
        if (req.query.staffId) filters.staffId = req.query.staffId as string;
        if (req.query.serviceId)
            filters.serviceId = req.query.serviceId as string;
        if (req.query.status)
            filters.status = req.query.status as AppointmentStatus;
        if (req.query.startDate)
            filters.startDate = new Date(req.query.startDate as string);
        if (req.query.endDate)
            filters.endDate = new Date(req.query.endDate as string);

        const result = await this.getAppointmentsUseCase.execute(
            tenantId,
            filters,
        );
        return res.json(present(result, AppointmentPresenter.toResponseList));
    }

    async getById(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;

        const result = await this.getAppointmentByIdUseCase.execute(
            tenantId,
            id,
        );
        return res.json(present(result, AppointmentPresenter.toResponse));
    }

    async cancel(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const { reason } = req.body;

        const result = await this.cancelAppointmentUseCase.execute(
            tenantId,
            id,
            reason,
        );
        return res.json(present(result, AppointmentPresenter.toResponse));
    }

    async updateStatus(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const { status } = req.body;

        const origin =
            (req.headers["x-original-origin"] as string) ||
            req.headers.origin ||
            `${req.protocol}://${req.get("host")}`;
        const result = await this.updateAppointmentStatusUseCase.execute(
            tenantId,
            id,
            status as AppointmentStatus,
            origin,
        );
        return res.json(present(result, AppointmentPresenter.toResponse));
    }

    async getAvailability(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { staffId, serviceId, date, timezoneOffset } = req.query;

        const result = await this.getAvailabilityUseCase.execute(tenantId, {
            staffId: staffId as string,
            serviceId: serviceId as string,
            date: date as string,
            timezoneOffset: timezoneOffset as string,
        });

        return res.json(result);
    }

    async delete(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;

        const result = await this.deleteAppointmentUseCase.execute(
            tenantId,
            id,
        );
        return res.json(result);
    }
}
