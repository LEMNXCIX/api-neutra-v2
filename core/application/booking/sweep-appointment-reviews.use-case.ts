import { canSystemFlagForReview } from "@/core/domain/appointment/appointment.policy";
import { AppointmentStatus } from "@/core/entities/appointment.entity";
import type { IConfigProvider } from "@/core/providers/config-provider.interface";
import type { ILogger } from "@/core/providers/logger.interface";
import type { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { formatInstantInTenantTimezone } from "@/core/utils/tenant-time";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 100;

export const APPOINTMENT_REVIEW_SYSTEM_REASON =
    "SYSTEM: appointment outcome unresolved after two-hour grace period";

/**
 * The optional lower bound on which appointments the sweep will look at.
 *
 * It was once the process start time, which was wrong in a way that looked
 * right: the comment said it kept appointments from "before this deployment" out
 * of a first-run mass update, but a process start is not a deployment boundary.
 * It moves on every restart, so each restart silently sealed off everything
 * older. An appointment that started before the last restart could never be
 * swept again, no matter how long it sat there, and the sweep reported zero
 * candidates without saying why.
 *
 * It is null by default now, which leaves the two-hour grace as the only
 * temporal rule, and it stays settable for a deployment that does want a floor.
 * It cannot default to "now minus the grace": the candidate query bounds start
 * from below and the grace bounds end from above, so those two would cancel into
 * a zero-width window and the sweep would find nothing at all.
 *
 * A per-tenant value is the shape this should take eventually. The repository
 * already receives the bound as a parameter rather than reading it, so that is a
 * query change and not a rewrite.
 */
export type AppointmentReviewActivationCutoff = {
    cutoff: Date | null;
    source: "environment" | "unbounded";
};

export function resolveAppointmentReviewActivationCutoff(
    configuredCutoff: string | undefined,
): AppointmentReviewActivationCutoff {
    const value = configuredCutoff?.trim();
    if (value && /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
        const cutoff = new Date(value);
        if (!Number.isNaN(cutoff.getTime())) {
            return { cutoff, source: "environment" };
        }
    }

    return { cutoff: null, source: "unbounded" };
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
    activationCutoff: Date | null;
    eligibleThrough: Date;
};

export class SweepAppointmentReviewsUseCase {
    private readonly now: () => Date;
    private readonly activationCutoff: Date | null;
    private readonly activationCutoffSource: "environment" | "unbounded";
    private readonly batchSize: number;

    constructor(
        private readonly appointmentRepository: IAppointmentRepository,
        private readonly logger: ILogger,
        private readonly configProvider: IConfigProvider,
        options: SweepAppointmentReviewsOptions = {},
    ) {
        this.now = options.now ?? (() => new Date());
        this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

        const configuredCutoff =
            options.activationCutoff &&
            Number.isFinite(options.activationCutoff.getTime())
                ? options.activationCutoff.toISOString()
                : this.configProvider.getAppointmentReviewSweepActivationCutoff();
        const resolvedCutoff =
            resolveAppointmentReviewActivationCutoff(configuredCutoff);

        this.activationCutoff = resolvedCutoff.cutoff;
        this.activationCutoffSource = resolvedCutoff.source;

        if (configuredCutoff && resolvedCutoff.source === "unbounded") {
            this.logger.warn(
                "Invalid appointment review activation cutoff; sweeping without a lower bound",
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
            // Held to the system half of the lifecycle, not the public one. The
            // sweep used to write NEEDS_REVIEW straight from the repository, so
            // no rule could object: the public graph forbids the transition
            // because a member of staff may not decide an outcome, and there was
            // no system rule to consult either. canSystemFlagForReview is that
            // rule, and it is the same one that keeps a sweep from re-flagging an
            // appointment already in review.
            if (!canSystemFlagForReview(candidate.status)) {
                conflicts += 1;
                this.logger.warn(
                    "Appointment review sweep refused an illegal flag",
                    {
                        appointmentId: candidate.id,
                        tenantId: candidate.tenantId,
                        from: candidate.status,
                        to: AppointmentStatus.NEEDS_REVIEW,
                    },
                );
                continue;
            }

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
                this.logger.info(
                    "Appointment review sweep skipped a conflict",
                    {
                        appointmentId: candidate.id,
                        tenantId: candidate.tenantId,
                        expectedStatus: candidate.status,
                        tenantEndTime: formatInstantInTenantTimezone(
                            candidate.endTime,
                            candidate.tenantTimezone,
                        ),
                        timezone: candidate.tenantTimezone ?? "UTC",
                    },
                );
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
            activationCutoff: result.activationCutoff?.toISOString() ?? null,
            eligibleThrough: result.eligibleThrough.toISOString(),
            activationCutoffSource: this.activationCutoffSource,
        });

        return result;
    }
}
