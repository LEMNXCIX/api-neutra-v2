import {
    IAppointmentRepository,
    AppointmentFilters as RepoFilters,
} from "@/core/repositories/appointment.repository.interface";
import { AppointmentFilters } from "@/core/application/dtos/requests/appointment.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetAppointmentsUseCase {
    constructor(private appointmentRepository: IAppointmentRepository) {}

    async execute(
        tenantId: string | undefined,
        filters?: AppointmentFilters,
    ): Promise<UseCaseResult> {
        const mappedFilters: RepoFilters = { ...(filters ?? {}) };
        const appointments = await this.appointmentRepository.findAll(
            tenantId,
            mappedFilters,
        );
        return Success(appointments, "Appointments retrieved successfully");
    }

    async executePaginated(
        tenantId: string | undefined,
        filters: RepoFilters,
        page: number,
        limit: number,
    ): Promise<UseCaseResult> {
        const { appointments, total } =
            await this.appointmentRepository.findAllPaginated(
                tenantId,
                filters,
                page,
                limit,
            );
        return Success(appointments, "Appointments retrieved successfully", {
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
}
