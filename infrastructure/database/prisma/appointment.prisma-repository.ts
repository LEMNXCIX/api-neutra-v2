import {
    Appointment as PrismaAppointment,
    AppointmentStatus as PrismaAppointmentStatus,
    Prisma,
} from "@prisma/client";
import { prisma } from "@/config/db.config";
import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import {
    Appointment,
    AppointmentStatus,
} from "@/core/entities/appointment.entity";
import {
    CreateAppointmentDTO,
    UpdateAppointmentDTO,
    AppointmentFilters,
} from "@/core/application/dtos/requests/appointment.request";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

type AppointmentWithIncludes = Prisma.AppointmentGetPayload<{
    include: { user: true; service: true; staff: true; coupon: true };
}>;

type AppointmentWithCoupon = Prisma.AppointmentGetPayload<{
    include: { coupon: true };
}>;

type AppointmentBase = PrismaAppointment;

export class PrismaAppointmentRepository implements IAppointmentRepository {
    private mapToEntity(
        appointment:
            | AppointmentWithIncludes
            | AppointmentWithCoupon
            | AppointmentBase,
    ): Appointment {
        const included = appointment as AppointmentWithIncludes;
        return {
            id: appointment.id,
            userId: appointment.userId,
            serviceId: appointment.serviceId,
            staffId: appointment.staffId,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status as AppointmentStatus,
            notes: appointment.notes ?? undefined,
            cancellationReason: appointment.cancellationReason ?? undefined,
            confirmationSent: appointment.confirmationSent,
            reminderSent: appointment.reminderSent,
            tenantId: appointment.tenantId,
            createdAt: appointment.createdAt,
            updatedAt: appointment.updatedAt,
            couponId: appointment.couponId ?? undefined,
            discountAmount: appointment.discountAmount ?? 0,
            subtotal: appointment.subtotal ?? 0,
            total: appointment.total ?? 0,
            user: included.user
                ? {
                      id: included.user.id,
                      name: included.user.name,
                      email: included.user.email,
                      phone: included.user.phone ?? undefined,
                      pushToken: included.user.pushToken ?? undefined,
                  }
                : undefined,
            service: included.service
                ? {
                      id: included.service.id,
                      name: included.service.name,
                      duration: included.service.duration,
                      price: included.service.price,
                  }
                : undefined,
            staff: included.staff
                ? {
                      id: included.staff.id,
                      name: included.staff.name,
                      email: included.staff.email ?? undefined,
                      avatar: included.staff.avatar ?? undefined,
                  }
                : undefined,
            coupon:
                included.coupon || (appointment as AppointmentWithCoupon).coupon
                    ? {
                          id: (included.coupon ||
                              (appointment as AppointmentWithCoupon).coupon)!
                              .id,
                          code: (included.coupon ||
                              (appointment as AppointmentWithCoupon).coupon)!
                              .code,
                          type: (included.coupon ||
                              (appointment as AppointmentWithCoupon).coupon)!
                              .type as string,
                          value: (included.coupon ||
                              (appointment as AppointmentWithCoupon).coupon)!
                              .value,
                      }
                    : undefined,
        };
    }

    async create(
        tenantId: string,
        data: CreateAppointmentDTO,
    ): Promise<Appointment> {
        const service = await prisma.service.findUnique({
            where: { id: data.serviceId },
            select: { duration: true },
        });

        if (!service) {
            throw new EntityNotFoundError("Service", data.serviceId);
        }

        const endTime = new Date(data.startTime);
        endTime.setMinutes(endTime.getMinutes() + service.duration);

        try {
            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    userId: data.userId,
                    serviceId: data.serviceId,
                    staffId: data.staffId,
                    startTime: data.startTime,
                    endTime,
                    notes: data.notes,
                    status: "PENDING" as PrismaAppointmentStatus,
                    couponId: data.couponCode ? undefined : undefined,
                    discountAmount: 0,
                    subtotal: 0,
                    total: 0,
                },
            });

            return this.mapToEntity(appointment);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "id";
                throw new DuplicateEntityError("Appointment", target, "");
            }
            throw error;
        }
    }

    async findById(
        tenantId: string,
        id: string,
        includeRelations: boolean = false,
    ): Promise<Appointment | null> {
        const appointment = await prisma.appointment.findFirst({
            where: { id, tenantId },
            include: includeRelations
                ? {
                      user: true,
                      service: true,
                      staff: true,
                      coupon: true,
                  }
                : undefined,
        });

        return appointment ? this.mapToEntity(appointment) : null;
    }

    async findAll(
        tenantId: string | undefined,
        filters?: AppointmentFilters,
    ): Promise<Appointment[]> {
        const where: Prisma.AppointmentWhereInput = {
            ...(tenantId && { tenantId }),
            ...(filters?.userId && { userId: filters.userId }),
            ...(filters?.staffId && { staffId: filters.staffId }),
            ...(filters?.serviceId && { serviceId: filters.serviceId }),
            ...(filters?.status && {
                status: filters.status as PrismaAppointmentStatus,
            }),
            ...(filters?.startDate &&
                filters?.endDate && {
                    startTime: {
                        gte: filters.startDate,
                        lte: filters.endDate,
                    },
                }),
        };

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                user: true,
                service: true,
                staff: true,
                coupon: true,
            },
            orderBy: { startTime: "asc" },
        });

        return appointments.map((a) => this.mapToEntity(a));
    }

    async findByUser(tenantId: string, userId: string): Promise<Appointment[]> {
        return this.findAll(tenantId, { userId });
    }

    async findByStaff(
        tenantId: string,
        staffId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<Appointment[]> {
        return this.findAll(tenantId, { staffId, startDate, endDate });
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateAppointmentDTO,
    ): Promise<Appointment> {
        const updateData: Prisma.AppointmentUpdateInput = {};

        if (data.startTime !== undefined) updateData.startTime = data.startTime;
        if (data.serviceId !== undefined)
            updateData.service = { connect: { id: data.serviceId } };
        if (data.staffId !== undefined)
            updateData.staff = { connect: { id: data.staffId } };
        if (data.status !== undefined)
            updateData.status = data.status as PrismaAppointmentStatus;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.cancellationReason !== undefined)
            updateData.cancellationReason = data.cancellationReason;

        if (data.startTime || data.serviceId) {
            const serviceId =
                data.serviceId ||
                (
                    await prisma.appointment.findUnique({
                        where: { id },
                        select: { serviceId: true },
                    })
                )?.serviceId;

            if (serviceId) {
                const service = await prisma.service.findUnique({
                    where: { id: serviceId },
                    select: { duration: true },
                });

                if (service) {
                    const startTime =
                        data.startTime ||
                        (
                            await prisma.appointment.findUnique({
                                where: { id },
                                select: { startTime: true },
                            })
                        )?.startTime;

                    if (startTime) {
                        const endTime = new Date(startTime);
                        endTime.setMinutes(
                            endTime.getMinutes() + service.duration,
                        );
                        updateData.endTime = endTime;
                    }
                }
            }
        }

        try {
            const appointment = await prisma.appointment.update({
                where: { id, tenantId },
                data: updateData,
                include: { coupon: true },
            });

            return this.mapToEntity(appointment);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Appointment", id);
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "id";
                throw new DuplicateEntityError("Appointment", target, "");
            }
            throw error;
        }
    }

    async updateStatus(
        tenantId: string,
        id: string,
        status: AppointmentStatus,
    ): Promise<Appointment> {
        try {
            const appointment = await prisma.appointment.update({
                where: { id, tenantId },
                data: { status: status as PrismaAppointmentStatus },
                include: { coupon: true },
            });

            return this.mapToEntity(appointment);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Appointment", id);
            }
            throw error;
        }
    }

    async delete(tenantId: string, id: string): Promise<void> {
        try {
            await prisma.appointment.delete({
                where: { id, tenantId },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Appointment", id);
            }
            throw error;
        }
    }

    async checkAvailability(
        tenantId: string,
        staffId: string,
        startTime: Date,
        endTime: Date,
        excludeAppointmentId?: string,
    ): Promise<boolean> {
        const conflictingAppointments = await prisma.appointment.findMany({
            where: {
                tenantId,
                staffId,
                status: {
                    notIn: [
                        "CANCELLED" as PrismaAppointmentStatus,
                        "NO_SHOW" as PrismaAppointmentStatus,
                    ],
                },
                OR: [
                    {
                        AND: [
                            { startTime: { lte: startTime } },
                            { endTime: { gt: startTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { lt: endTime } },
                            { endTime: { gte: endTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { gte: startTime } },
                            { endTime: { lte: endTime } },
                        ],
                    },
                ],
                ...(excludeAppointmentId && {
                    id: { not: excludeAppointmentId },
                }),
            },
        });

        return conflictingAppointments.length === 0;
    }
}
