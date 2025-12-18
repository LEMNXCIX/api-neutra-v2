import { prisma } from '@/config/db.config';
import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { Appointment, CreateAppointmentDTO, UpdateAppointmentDTO, AppointmentFilters, AppointmentStatus } from '@/core/entities/appointment.entity';

/**
 * Prisma Appointment Repository
 * Tenant-aware implementation for Appointment persistence
 */
export class PrismaAppointmentRepository implements IAppointmentRepository {
    async create(tenantId: string, data: CreateAppointmentDTO): Promise<Appointment> {
        // Get service to calculate endTime based on duration
        const service = await prisma.service.findUnique({
            where: { id: data.serviceId },
            select: { duration: true },
        });

        if (!service) {
            throw new Error('Service not found');
        }

        const endTime = new Date(data.startTime);
        endTime.setMinutes(endTime.getMinutes() + service.duration);

        const appointment = await prisma.appointment.create({
            data: {
                tenantId,
                userId: data.userId,
                serviceId: data.serviceId,
                staffId: data.staffId,
                startTime: data.startTime,
                endTime,
                notes: data.notes,
                status: 'PENDING',
            },
        });

        return this.mapToEntity(appointment);
    }

    async findById(tenantId: string, id: string, includeRelations: boolean = false): Promise<Appointment | null> {
        const appointment = await prisma.appointment.findFirst({
            where: { id, tenantId },
            include: includeRelations ? {
                user: true,
                service: true,
                staff: true,
            } : undefined,
        });

        return appointment ? this.mapToEntity(appointment) : null;
    }

    async findAll(tenantId: string, filters?: AppointmentFilters): Promise<Appointment[]> {
        const appointments = await prisma.appointment.findMany({
            where: {
                tenantId,
                ...(filters?.userId && { userId: filters.userId }),
                ...(filters?.staffId && { staffId: filters.staffId }),
                ...(filters?.serviceId && { serviceId: filters.serviceId }),
                ...(filters?.status && { status: filters.status }),
                ...(filters?.startDate && filters?.endDate && {
                    startTime: {
                        gte: filters.startDate,
                        lte: filters.endDate,
                    },
                }),
            },
            include: {
                user: true,
                service: true,
                staff: true,
            },
            orderBy: { startTime: 'asc' },
        });

        return appointments.map(this.mapToEntity);
    }

    async findByUser(tenantId: string, userId: string): Promise<Appointment[]> {
        return this.findAll(tenantId, { userId });
    }

    async findByStaff(tenantId: string, staffId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]> {
        return this.findAll(tenantId, { staffId, startDate, endDate });
    }

    async update(tenantId: string, id: string, data: UpdateAppointmentDTO): Promise<Appointment> {
        const updateData: any = {
            startTime: data.startTime,
            serviceId: data.serviceId,
            staffId: data.staffId,
            status: data.status,
            notes: data.notes,
            cancellationReason: data.cancellationReason,
        };

        // If startTime or serviceId changed, recalculate endTime
        if (data.startTime || data.serviceId) {
            const serviceId = data.serviceId || (await prisma.appointment.findUnique({
                where: { id },
                select: { serviceId: true },
            }))?.serviceId;

            if (serviceId) {
                const service = await prisma.service.findUnique({
                    where: { id: serviceId },
                    select: { duration: true },
                });

                if (service) {
                    const startTime = data.startTime || (await prisma.appointment.findUnique({
                        where: { id },
                        select: { startTime: true },
                    }))?.startTime;

                    if (startTime) {
                        const endTime = new Date(startTime);
                        endTime.setMinutes(endTime.getMinutes() + service.duration);
                        updateData.endTime = endTime;
                    }
                }
            }
        }

        const appointment = await prisma.appointment.update({
            where: { id, tenantId },
            data: updateData,
        });

        return this.mapToEntity(appointment);
    }

    async updateStatus(tenantId: string, id: string, status: AppointmentStatus): Promise<Appointment> {
        const appointment = await prisma.appointment.update({
            where: { id, tenantId },
            data: { status },
        });

        return this.mapToEntity(appointment);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await prisma.appointment.delete({
            where: { id, tenantId },
        });
    }

    async checkAvailability(
        tenantId: string,
        staffId: string,
        startTime: Date,
        endTime: Date,
        excludeAppointmentId?: string
    ): Promise<boolean> {
        const conflictingAppointments = await prisma.appointment.findMany({
            where: {
                tenantId,
                staffId,
                status: {
                    notIn: ['CANCELLED', 'NO_SHOW'],
                },
                OR: [
                    {
                        // New appointment starts during existing appointment
                        AND: [
                            { startTime: { lte: startTime } },
                            { endTime: { gt: startTime } },
                        ],
                    },
                    {
                        // New appointment ends during existing appointment
                        AND: [
                            { startTime: { lt: endTime } },
                            { endTime: { gte: endTime } },
                        ],
                    },
                    {
                        // New appointment encompasses existing appointment
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

    private mapToEntity(appointment: any): Appointment {
        return {
            id: appointment.id,
            userId: appointment.userId,
            serviceId: appointment.serviceId,
            staffId: appointment.staffId,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status as AppointmentStatus,
            notes: appointment.notes,
            cancellationReason: appointment.cancellationReason,
            confirmationSent: appointment.confirmationSent,
            reminderSent: appointment.reminderSent,
            tenantId: appointment.tenantId,
            createdAt: appointment.createdAt,
            updatedAt: appointment.updatedAt,
            user: appointment.user,
            service: appointment.service,
            staff: appointment.staff,
        };
    }
}
