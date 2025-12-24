import { Request, Response } from 'express';
import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { CreateAppointmentUseCase } from '@/core/application/booking/create-appointment.use-case';
import { GetAppointmentsUseCase } from '@/core/application/booking/get-appointments.use-case';
import { GetAvailabilityUseCase } from '@/core/application/booking/get-availability.use-case';
import { UpdateAppointmentStatusUseCase } from '@/core/application/booking/update-appointment-status.use-case';
import { AppointmentStatus } from '@/core/entities/appointment.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { IQueueProvider } from '@/core/providers/queue-provider.interface';

export class AppointmentController {
    private createAppointmentUseCase: CreateAppointmentUseCase;
    private getAppointmentsUseCase: GetAppointmentsUseCase;
    private getAvailabilityUseCase: GetAvailabilityUseCase;
    private updateAppointmentStatusUseCase: UpdateAppointmentStatusUseCase;

    constructor(
        private appointmentRepository: IAppointmentRepository,
        private staffRepository: IStaffRepository,
        private serviceRepository: IServiceRepository,
        private logger: ILogger,
        private queueProvider: IQueueProvider
    ) {
        this.createAppointmentUseCase = new CreateAppointmentUseCase(
            appointmentRepository,
            staffRepository,
            serviceRepository,
            logger,
            queueProvider
        );
        this.getAppointmentsUseCase = new GetAppointmentsUseCase(appointmentRepository, logger);
        this.getAvailabilityUseCase = new GetAvailabilityUseCase(
            appointmentRepository,
            staffRepository,
            serviceRepository,
            logger
        );
        this.updateAppointmentStatusUseCase = new UpdateAppointmentStatusUseCase(appointmentRepository, logger, queueProvider);
    }


    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.createAppointmentUseCase.execute(tenantId, req.body);
        return res.status(result.code).json(result);
    }

    async getAll(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const filters: any = {};

        if (req.query.userId) filters.userId = req.query.userId as string;
        if (req.query.staffId) filters.staffId = req.query.staffId as string;
        if (req.query.serviceId) filters.serviceId = req.query.serviceId as string;
        if (req.query.status) filters.status = req.query.status as AppointmentStatus;
        if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
        if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

        const result = await this.getAppointmentsUseCase.execute(tenantId, filters);
        return res.status(result.code).json(result);
    }

    async getById(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;

        try {
            const appointment = await this.appointmentRepository.findById(tenantId, id, true);

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found',
                });
            }

            return res.status(200).json({
                success: true,
                data: appointment,
            });
        } catch (error: any) {
            this.logger.error('Error retrieving appointment', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Error retrieving appointment',
            });
        }
    }

    async cancel(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const { reason } = req.body;

        try {
            const appointment = await this.appointmentRepository.update(tenantId, id, {
                status: AppointmentStatus.CANCELLED,
                cancellationReason: reason,
            });

            // Enqueue notification
            await this.queueProvider.enqueue('notifications', {
                type: 'CANCELLED',
                appointmentId: id,
                tenantId: tenantId,
                reason: reason
            });

            return res.status(200).json({
                success: true,
                message: 'Appointment cancelled successfully',
                data: appointment,
            });
        } catch (error: any) {
            this.logger.error('Error cancelling appointment', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Error cancelling appointment',
            });
        }
    }

    async updateStatus(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required',
            });
        }

        try {
            const result = await this.updateAppointmentStatusUseCase.execute(tenantId, id, status as AppointmentStatus);
            return res.status(result.code).json(result);
        } catch (error: any) {
            this.logger.error('Error updating appointment status in controller', {
                tenantId,
                id,
                status,
                error: error.message
            });
            return res.status(500).json({
                success: false,
                message: 'Error updating appointment status',
                error: error.message
            });
        }
    }
    async getAvailability(req: Request, res: Response) {
        // Tenant is handled by middleware but this is public maybe?
        // If public, we still need tenantId. Middleware gets it from domain.
        const tenantId = req.tenantId!;
        const { staffId, serviceId, date, timezoneOffset } = req.query;

        if (!staffId || !serviceId || !date) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: staffId, serviceId, date'
            });
        }

        const result = await this.getAvailabilityUseCase.execute(tenantId, {
            staffId: staffId as string,
            serviceId: serviceId as string,
            date: date as string,
            timezoneOffset: timezoneOffset as string
        });

        return res.status(result.code).json(result);
    }
}
