import { AppointmentStatus } from "@/core/entities/appointment.entity";
import type { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetAppointmentsNeedingReviewUseCase {
    constructor(
        private readonly appointmentRepository: IAppointmentRepository,
    ) {}

    async execute(
        tenantId: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<UseCaseResult> {
        const { appointments, total } =
            await this.appointmentRepository.findAllPaginated(
                tenantId,
                { status: AppointmentStatus.NEEDS_REVIEW },
                page,
                limit,
            );

        return Success(
            appointments,
            "Appointments needing review retrieved successfully",
            {
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        );
    }
}
