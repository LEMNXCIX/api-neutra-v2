import { Request, Response } from "express";
import { CreateAppointmentUseCase } from "@/core/application/booking/create-appointment.use-case";
import { GetAppointmentsUseCase } from "@/core/application/booking/get-appointments.use-case";
import { GetAppointmentsNeedingReviewUseCase } from "@/core/application/booking/get-appointments-needing-review.use-case";
import { GetAppointmentByIdUseCase } from "@/core/application/booking/get-appointment-by-id.use-case";
import { CancelAppointmentUseCase } from "@/core/application/booking/cancel-appointment.use-case";
import { GetAvailabilityUseCase } from "@/core/application/booking/get-availability.use-case";
import { UpdateAppointmentStatusUseCase } from "@/core/application/booking/update-appointment-status.use-case";
import { DeleteAppointmentUseCase } from "@/core/application/booking/delete-appointment.use-case";
import { isAppointmentStatus } from "@/core/domain/appointment/appointment.policy";
import { AppointmentMutationActor } from "@/core/application/dtos/requests/appointment.request";
import { AuthenticatedUser } from "@/types/rbac";
import {
    APPOINTMENT_OPERATIONAL_ROLES,
    hasAnyRole,
    hasPermission,
} from "@/middleware/authorization.middleware";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";
import { AppError } from "@/types/api-response";
import { TenantErrorCodes } from "@/types/error-codes";
import { AppointmentPresenter } from "@/core/presenters/appointment.presenter";
import { present } from "@/core/utils/use-case-result";
import { resolveRequestOrigin } from "@/helpers/request-origin.helpers";

function getAppointmentActor(user: AuthenticatedUser): AppointmentMutationActor {
    const isOperational = hasAnyRole(
        user,
        APPOINTMENT_OPERATIONAL_ROLES,
    );

    return {
        id: user.id,
        canManage:
            isOperational && hasPermission(user, "appointments:write"),
        canDelete:
            isOperational && hasPermission(user, "appointments:delete"),
    };
}

export class AppointmentController {
    constructor(
        private createAppointmentUseCase: CreateAppointmentUseCase,
        private getAppointmentsUseCase: GetAppointmentsUseCase,
        private getAppointmentsNeedingReviewUseCase: GetAppointmentsNeedingReviewUseCase,
        private getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        private cancelAppointmentUseCase: CancelAppointmentUseCase,
        private getAvailabilityUseCase: GetAvailabilityUseCase,
        private updateAppointmentStatusUseCase: UpdateAppointmentStatusUseCase,
        private deleteAppointmentUseCase: DeleteAppointmentUseCase,
    ) {}

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const actor = getAppointmentActor(req.user!);
        const origin = resolveRequestOrigin(req);
        const requestedUserId = req.body.userId;
        const userId =
            actor.canManage && typeof requestedUserId === "string"
                ? requestedUserId
                : actor.id;
        const result = await this.createAppointmentUseCase.execute(
            tenantId,
            { ...req.body, userId },
            origin,
            actor.id,
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
        if (req.query.status !== undefined) {
            if (!isAppointmentStatus(req.query.status)) {
                throw new BusinessRuleViolationError(
                    "Invalid appointment status",
                    "INVALID_APPOINTMENT_STATUS",
                );
            }
            filters.status = req.query.status;
        }
        if (req.query.startDate)
            filters.startDate = new Date(req.query.startDate as string);
        if (req.query.endDate)
            filters.endDate = new Date(req.query.endDate as string);

        const page = req.query.page
            ? parseInt(req.query.page as string)
            : undefined;
        const limit = req.query.limit
            ? parseInt(req.query.limit as string)
            : undefined;

        if (page || limit) {
            const result = await this.getAppointmentsUseCase.executePaginated(
                tenantId,
                filters,
                page || 1,
                limit || 10,
            );
            return res.json(
                present(result, AppointmentPresenter.toResponseList),
            );
        }

        const result = await this.getAppointmentsUseCase.execute(
            tenantId,
            filters,
        );
        return res.json(present(result, AppointmentPresenter.toResponseList));
    }

    async getAttention(req: Request, res: Response) {
        if (
            typeof req.tenantId !== "string" ||
            req.tenantId.trim().length === 0 ||
            req.tenantId.trim().toLowerCase() === "all"
        ) {
            throw new AppError(
                "A concrete tenant context is required",
                400,
                TenantErrorCodes.TENANT_REQUIRED,
            );
        }
        const tenantId = req.tenantId.trim();

        const parsedPage = Number.parseInt(req.query.page as string, 10);
        const parsedLimit = Number.parseInt(req.query.limit as string, 10);
        const page = Number.isFinite(parsedPage)
            ? Math.max(1, parsedPage)
            : 1;
        const limit = Number.isFinite(parsedLimit)
            ? Math.min(100, Math.max(1, parsedLimit))
            : 10;

        const result = await this.getAppointmentsNeedingReviewUseCase.execute(
            tenantId,
            page,
            limit,
        );
        return res.json(
            present(result, AppointmentPresenter.toResponseList),
        );
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
            getAppointmentActor(req.user!),
            reason,
        );
        return res.json(present(result, AppointmentPresenter.toResponse));
    }

    async updateStatus(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const { status, reason } = req.body;

        const origin = resolveRequestOrigin(req);
        const result = await this.updateAppointmentStatusUseCase.execute(
            tenantId,
            id,
            status,
            getAppointmentActor(req.user!),
            reason,
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
            getAppointmentActor(req.user!),
        );
        return res.json(result);
    }
}
