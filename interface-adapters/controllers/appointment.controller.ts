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
    AttentionAppointmentsQueryDto,
    AvailabilityQueryDto,
    ListAppointmentsQueryDto,
} from "@/core/application/dtos/requests/appointment.query";
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
import { parsePagination } from "@/core/utils/pagination";
import { present } from "@/core/utils/use-case-result";
import { currentUser, tenantIdOf } from "@/helpers/request-context.helpers";
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

/** One presenter for every list endpoint so the response shape cannot drift. */
function presentAppointmentList(appointments: unknown): unknown[] {
    return Array.isArray(appointments)
        ? appointments.map((a) => AppointmentListResponse.fromEntity(a))
        : [];
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
        const tenantId = tenantIdOf(req);
        const actor = getAppointmentActor(currentUser(req));
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
        const query = (req.validatedQuery ?? {}) as ListAppointmentsQueryDto;

        const filters: Record<string, unknown> = {};
        if (query.userId) filters.userId = query.userId;
        if (query.staffId) filters.staffId = query.staffId;
        if (query.serviceId) filters.serviceId = query.serviceId;
        if (query.status !== undefined) {
            assertAppointmentStatus(query.status);
            filters.status = query.status;
        }
        if (query.startDate) filters.startDate = new Date(query.startDate);
        if (query.endDate) filters.endDate = new Date(query.endDate);

        const { page, limit } = parsePagination(query);
        const hasPagination =
            query.page !== undefined || query.limit !== undefined;

        if (hasPagination) {
            const result = await this.getAppointmentsUseCase.executePaginated(
                tenantId,
                filters,
                page,
                limit,
            );
            return res.json(present(result, presentAppointmentList));
        }

        const result = await this.getAppointmentsUseCase.execute(
            tenantId,
            filters,
        );
        return res.json(present(result, presentAppointmentList));
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
        const { page, limit } = parsePagination(
            (req.validatedQuery ?? {}) as AttentionAppointmentsQueryDto,
        );

        const result = await this.getAppointmentsNeedingReviewUseCase.execute(
            tenantId,
            page,
            limit,
        );
        return res.json(present(result, presentAppointmentList));
    }

    async getById(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;

        const result = await this.getAppointmentByIdUseCase.execute(
            tenantId,
            id,
        );
        return res.json(present(result, AppointmentResponse.fromEntity));
    }

    async cancel(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        const { reason } = req.validatedBody as CancelAppointmentDTO;

        const result = await this.cancelAppointmentUseCase.execute(
            tenantId,
            id,
            getAppointmentActor(currentUser(req)),
            reason,
        );
        return res.json(present(result, AppointmentResponse.fromEntity));
    }

    async updateStatus(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        const { status, reason } =
            req.validatedBody as UpdateAppointmentStatusDto;

        const origin = resolveRequestOrigin(req);
        const result = await this.updateAppointmentStatusUseCase.execute(
            tenantId,
            id,
            status,
            getAppointmentActor(currentUser(req)),
            reason,
            origin,
        );
        return res.json(present(result, AppointmentResponse.fromEntity));
    }

    async getAvailability(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const { staffId, serviceId, date, timezoneOffset } =
            (req.validatedQuery ?? {}) as AvailabilityQueryDto;

        const result = await this.getAvailabilityUseCase.execute(tenantId, {
            staffId,
            serviceId,
            date,
            timezoneOffset,
        });

        return res.json(result);
    }

    async delete(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;

        const result = await this.deleteAppointmentUseCase.execute(
            tenantId,
            id,
            getAppointmentActor(currentUser(req)),
        );
        return res.json(result);
    }
}
