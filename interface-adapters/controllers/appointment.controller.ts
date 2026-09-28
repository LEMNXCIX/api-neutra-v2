import type { Request, Response } from "express";
import type { CancelAppointmentUseCase } from "@/core/application/booking/cancel-appointment.use-case";
import type { CreateAppointmentUseCase } from "@/core/application/booking/create-appointment.use-case";
import type { DeleteAppointmentUseCase } from "@/core/application/booking/delete-appointment.use-case";
import type { GetAppointmentByIdUseCase } from "@/core/application/booking/get-appointment-by-id.use-case";
import type { GetAppointmentsUseCase } from "@/core/application/booking/get-appointments.use-case";
import type { GetAppointmentsNeedingReviewUseCase } from "@/core/application/booking/get-appointments-needing-review.use-case";
import type { GetAvailabilityUseCase } from "@/core/application/booking/get-availability.use-case";
import type { UpdateAppointmentStatusUseCase } from "@/core/application/booking/update-appointment-status.use-case";
import type {
    AppointmentMutationActor,
    CancelAppointmentDTO,
    CreateAppointmentDTO,
    CreateAppointmentDto,
    UpdateAppointmentStatusDto,
} from "@/core/application/dtos/requests/appointment.request";
import { AppointmentResponse } from "@/core/application/dtos/responses/appointment/appointment.response";
import { AppointmentListResponse } from "@/core/application/dtos/responses/appointment/appointment-list.response";
import { assertAppointmentStatus } from "@/core/domain/appointment/appointment.policy";
import { hasAnyRole, hasPermission } from "@/core/domain/rbac/access-policy";
import { present } from "@/core/utils/use-case-result";
import { resolveRequestOrigin } from "@/helpers/request-origin.helpers";
import { APPOINTMENT_OPERATIONAL_ROLES } from "@/middleware/authorization.middleware";
import { AppError } from "@/types/api-response";
import { TenantErrorCodes } from "@/types/error-codes";
import type { AuthenticatedUser } from "@/types/rbac";

function getAppointmentActor(
    user: AuthenticatedUser,
): AppointmentMutationActor {
    const isOperational = hasAnyRole(user, APPOINTMENT_OPERATIONAL_ROLES);

    return {
        id: user.id,
        canManage: isOperational && hasPermission(user, "appointments:write"),
        canDelete: isOperational && hasPermission(user, "appointments:delete"),
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
        const body = req.validatedBody as CreateAppointmentDto;
        // The body may carry `userId`, and it is honoured only when the actor
        // holds `appointments:write` and can manage. The override order is not
        // what protects this: the computed value always wins over the spread,
        // so the protection is the `canManage` test, not the ordering.
        const requestedUserId = body.userId;
        const userId =
            actor.canManage && typeof requestedUserId === "string"
                ? requestedUserId
                : actor.id;
        const result = await this.createAppointmentUseCase.execute(
            tenantId,
            { ...body, userId } as CreateAppointmentDTO,
            origin,
            actor.id,
        );
        return res
            .status(201)
            .json(present(result, AppointmentResponse.fromEntity));
    }

    async getAll(req: Request, res: Response) {
        const tenantId = req.tenantId;

        const filters: Record<string, unknown> = {};

        if (req.query.userId) filters.userId = req.query.userId as string;
        if (req.query.staffId) filters.staffId = req.query.staffId as string;
        if (req.query.serviceId)
            filters.serviceId = req.query.serviceId as string;
        if (req.query.status !== undefined) {
            assertAppointmentStatus(req.query.status);
            filters.status = req.query.status;
        }
        if (req.query.startDate)
            filters.startDate = new Date(req.query.startDate as string);
        if (req.query.endDate)
            filters.endDate = new Date(req.query.endDate as string);

        const page = req.query.page
            ? parseInt(req.query.page as string, 10)
            : undefined;
        const limit = req.query.limit
            ? parseInt(req.query.limit as string, 10)
            : undefined;

        if (page || limit) {
            const result = await this.getAppointmentsUseCase.executePaginated(
                tenantId,
                filters,
                page || 1,
                limit || 10,
            );
            return res.json(
                present(result, (appointments) =>
                    Array.isArray(appointments)
                        ? appointments.map((a) =>
                              AppointmentListResponse.fromEntity(a),
                          )
                        : [],
                ),
            );
        }

        const result = await this.getAppointmentsUseCase.execute(
            tenantId,
            filters,
        );
        return res.json(
            present(result, (appointments) =>
                Array.isArray(appointments)
                    ? appointments.map((a) =>
                          AppointmentListResponse.fromEntity(a),
                      )
                    : [],
            ),
        );
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
        const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
        const limit = Number.isFinite(parsedLimit)
            ? Math.min(100, Math.max(1, parsedLimit))
            : 10;

        const result = await this.getAppointmentsNeedingReviewUseCase.execute(
            tenantId,
            page,
            limit,
        );
        return res.json(
            present(result, (appointments) =>
                Array.isArray(appointments)
                    ? appointments.map((a) =>
                          AppointmentListResponse.fromEntity(a),
                      )
                    : [],
            ),
        );
    }

    async getById(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;

        const result = await this.getAppointmentByIdUseCase.execute(
            tenantId,
            id,
        );
        return res.json(present(result, AppointmentResponse.fromEntity));
    }

    async cancel(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const { reason } = req.validatedBody as CancelAppointmentDTO;

        const result = await this.cancelAppointmentUseCase.execute(
            tenantId,
            id,
            getAppointmentActor(req.user!),
            reason,
        );
        return res.json(present(result, AppointmentResponse.fromEntity));
    }

    async updateStatus(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const { status, reason } =
            req.validatedBody as UpdateAppointmentStatusDto;

        const origin = resolveRequestOrigin(req);
        const result = await this.updateAppointmentStatusUseCase.execute(
            tenantId,
            id,
            status,
            getAppointmentActor(req.user!),
            reason,
            origin,
        );
        return res.json(present(result, AppointmentResponse.fromEntity));
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
