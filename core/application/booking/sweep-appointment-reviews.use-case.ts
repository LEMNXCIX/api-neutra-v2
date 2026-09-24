import { AppointmentStatus } from "@/core/entities/appointment.entity";
import { ILogger } from "@/core/providers/logger.interface";
import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { formatInstantInTenantTimezone } from "@/core/utils/tenant-time";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 100;

export const APPOINTMENT_REVIEW_SYSTEM_REASON =
    "SYSTEM: appointment outcome unresolved after two-hour grace period";

export type AppointmentReviewActivationCutoff = {
    cutoff: Date;
    source: "environment" | "process-start";
};

export function resolveAppointmentReviewActivationCutoff(
    configuredCutoff: string | undefined,
    processStartedAt: Date = new Date(),
): AppointmentReviewActivationCutoff {
    const value = configuredCutoff?.trim();
    if (value && /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
        const cutoff = new Date(value);
        if (!Number.isNaN(cutoff.getTime())) {
            return { cutoff, source: "environment" };
        }
    }

    return {
        cutoff: new Date(processStartedAt.getTime()),
        source: "process-start",
    };
}

export type SweepAppointmentReviewsOptions = {
    now?: () => Date;
    activationCutoff?: Date;
    processStartedAt?: Date;
    batchSize?: number;
};

export type SweepAppointmentReviewsResult = {
    candidates: number;
    transitioned: number;
    conflicts: number;
    activationCutoff: Date;
    eligibleThrough: Date;
};

export class SweepAppointmentReviewsUseCase {
    private readonly now: () => Date;
    private readonly activationCutoff: Date;
    private readonly activationCutoffSource: "environment" | "process-start";
    private readonly batchSize: number;

    constructor(
        private readonly appointmentRepository: IAppointmentRepository,
        private readonly logger: ILogger,
        options: SweepAppointmentReviewsOptions = {},
    ) {
        this.now = options.now ?? (() => new Date());
        this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

        const configuredCutoff =
            options.activationCutoff &&
            Number.isFinite(options.activationCutoff.getTime())
                ? options.activationCutoff.toISOString()
                : process.env.APPOINTMENT_REVIEW_SWEEP_ACTIVATION_CUTOFF;
        const resolvedCutoff = resolveAppointmentReviewActivationCutoff(
            configuredCutoff,
            options.processStartedAt ?? new Date(),
        );

        // The process-start lower bound intentionally excludes appointments that
        // started before this deployment, avoiding a first-run historical mass update.
        this.activationCutoff = resolvedCutoff.cutoff;
        this.activationCutoffSource = resolvedCutoff.source;

        if (configuredCutoff && resolvedCutoff.source === "process-start") {
            this.logger.warn(
                "Invalid appointment review activation cutoff; using process start",
            );
        }
    }

    async execute(): Promise<SweepAppointmentReviewsResult> {
        const changedAt = this.now();
        const eligibleThrough = new Date(changedAt.getTime() - TWO_HOURS_MS);
        const candidates =
            await this.appointmentRepository.findReviewCandidates({
                activationCutoff: this.activationCutoff,
                eligibleThrough,
                limit: this.batchSize,
            });

        let transitioned = 0;
        let conflicts = 0;

        for (const candidate of candidates) {
            const updated = await this.appointmentRepository.markNeedsReview(
                candidate.tenantId,
                candidate.id,
                candidate.status,
                this.activationCutoff,
                eligibleThrough,
                changedAt,
                APPOINTMENT_REVIEW_SYSTEM_REASON,
            );

            if (!updated) {
                conflicts += 1;
                this.logger.info("Appointment review sweep skipped a conflict", {
                    appointmentId: candidate.id,
                    tenantId: candidate.tenantId,
                    expectedStatus: candidate.status,
                    tenantEndTime: formatInstantInTenantTimezone(
                        candidate.endTime,
                        candidate.tenantTimezone,
                    ),
                    timezone: candidate.tenantTimezone ?? "UTC",
                });
                continue;
            }

            transitioned += 1;
            this.logger.info("Appointment moved to needs review", {
                appointmentId: candidate.id,
                tenantId: candidate.tenantId,
                previousStatus: candidate.status,
                status: AppointmentStatus.NEEDS_REVIEW,
                tenantEndTime: formatInstantInTenantTimezone(
                    candidate.endTime,
                    candidate.tenantTimezone,
                ),
                timezone: candidate.tenantTimezone ?? "UTC",
            });
        }

        const result: SweepAppointmentReviewsResult = {
            candidates: candidates.length,
            transitioned,
            conflicts,
            activationCutoff: this.activationCutoff,
            eligibleThrough,
        };

        this.logger.info("Appointment review sweep completed", {
            ...result,
            activationCutoff: result.activationCutoff.toISOString(),
            eligibleThrough: result.eligibleThrough.toISOString(),
            activationCutoffSource: this.activationCutoffSource,
        });

        return result;
    }
}
