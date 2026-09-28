import { prisma } from "@/config/db.config";
import {
    APPOINTMENT_REVIEW_SYSTEM_REASON,
    resolveAppointmentReviewActivationCutoff,
} from "@/core/application/booking/sweep-appointment-reviews.use-case";
import { canSystemFlagForReview } from "@/core/domain/appointment/appointment.policy";
import { AppointmentStatus } from "@/core/entities/appointment.entity";
import { PrismaAppointmentRepository } from "@/infrastructure/database/prisma/appointment.prisma-repository";

/**
 * The regression: the activation cutoff was made optional so the two-hour grace
 * is the only temporal rule, and the update was left passing `gte: null` to
 * Prisma, which rejects it with "Argument `gte` must not be null". Every unit
 * suite stayed green, because a mocked repository accepts whatever it is handed,
 * and a method parameter narrowed from `Date | null` to `Date` passes `tsc`
 * because method parameters are compared bivariantly. Only the database caught
 * it, and only when the sweep actually ran.
 *
 * This suite exercises the repository against the real database for that
 * reason, and it deliberately does NOT call the use case's `execute()`. That
 * resolves candidates across every active BOOKING and HYBRID tenant rather than
 * one, so running it here with any clock would write to appointments that are
 * not this suite's. An earlier draft of this file did exactly that, with a
 * synthetic 2030 clock, and moved a real appointment to NEEDS_REVIEW stamped
 * with a timestamp four years in the future. The methods under test are called
 * directly instead: a single-row update, and a read.
 */

const repository = new PrismaAppointmentRepository();
const tag = `sweep-probe-${Date.now()}`;
const now = new Date();
const startedAt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
const endedAt = new Date(now.getTime() - 2.5 * 60 * 60 * 1000);
const eligibleThrough = new Date(now.getTime() - 2 * 60 * 60 * 1000);

const created: string[] = [];
let references: { userId: string; serviceId: string; staffId: string };

async function createAppointment(
    status = AppointmentStatus.PENDING,
): Promise<string> {
    const created_ = await prisma.appointment.create({
        data: {
            tenantId: (await prisma.tenant.findFirst({
                where: { active: true, type: { in: ["BOOKING", "HYBRID"] } },
                select: { id: true },
            }))!.id,
            userId: references.userId,
            serviceId: references.serviceId,
            staffId: references.staffId,
            startTime: startedAt,
            endTime: endedAt,
            status,
        },
        select: { id: true },
    });
    created.push(created_.id);
    return created_.id;
}

async function readStatus(id: string): Promise<string | undefined> {
    const row = await prisma.appointment.findUnique({
        where: { id },
        select: { status: true },
    });
    return row?.status;
}

describe("the review sweep's optional lower bound, against a real database", () => {
    beforeAll(async () => {
        // Builds its own references rather than borrowing an existing
        // appointment. The seed creates a HYBRID tenant, one user, and no
        // services, no staff and no appointments, so a suite that reads an
        // appointment to get a serviceId and a staffId passes on a development
        // database that has accumulated them and fails on the fresh one the ci
        // job creates. That is what this did.
        const tenant = await prisma.tenant.findFirst({
            where: { active: true, type: { in: ["BOOKING", "HYBRID"] } },
            select: { id: true },
        });
        if (!tenant) {
            throw new Error(
                "this suite needs an active BOOKING or HYBRID tenant, which the seed creates",
            );
        }
        const user = await prisma.user.create({
            data: {
                name: "Sweep Probe",
                email: `${tag}-user@example.invalid`,
                password: "probe-not-a-real-password",
            },
            select: { id: true },
        });
        const service = await prisma.service.create({
            data: {
                name: "Sweep Probe Service",
                duration: 30,
                price: 0,
                tenantId: tenant.id,
            },
            select: { id: true },
        });
        const staff = await prisma.staff.create({
            data: { name: "Sweep Probe Staff", tenantId: tenant.id },
            select: { id: true },
        });
        references = {
            userId: user.id,
            serviceId: service.id,
            staffId: staff.id,
        };
    });

    afterAll(async () => {
        if (references) {
            await prisma.staff.deleteMany({
                where: { id: references.staffId },
            });
            await prisma.service.deleteMany({
                where: { id: references.serviceId },
            });
            await prisma.user.deleteMany({ where: { id: references.userId } });
        }
    });

    afterEach(async () => {
        if (created.length > 0) {
            await prisma.appointment.deleteMany({
                where: { id: { in: created.splice(0) } },
            });
        }
    });

    test("has no lower bound by default", () => {
        // Cannot default to a rolling value: the candidate query bounds start
        // from below and the two-hour grace bounds end from above, so
        // "now minus the grace" would make the window zero-width and the sweep
        // would find nothing.
        expect(resolveAppointmentReviewActivationCutoff(undefined)).toEqual({
            cutoff: null,
            source: "unbounded",
        });
        expect(
            resolveAppointmentReviewActivationCutoff("not-an-absolute-instant"),
        ).toEqual({ cutoff: null, source: "unbounded" });
        expect(
            resolveAppointmentReviewActivationCutoff(
                "2030-01-01T09:00:00+02:00",
            ),
        ).toEqual({
            cutoff: new Date("2030-01-01T07:00:00.000Z"),
            source: "environment",
        });
    });

    test("flags an appointment with no lower bound set", async () => {
        // The regression. With a null cutoff this reaches Prisma as
        // `startTime: { gte: null }` when the update forgets to omit the bound,
        // and Prisma throws instead of flagging the appointment.
        const id = await createAppointment();

        const updated = await repository.markNeedsReview(
            await tenantIdOf(id),
            id,
            AppointmentStatus.PENDING,
            null,
            eligibleThrough,
            now,
            APPOINTMENT_REVIEW_SYSTEM_REASON,
        );

        expect(updated).toBe(true);
        expect(await readStatus(id)).toBe(AppointmentStatus.NEEDS_REVIEW);
    });

    test("an explicit cutoff still excludes appointments older than it", async () => {
        const id = await createAppointment();

        const updated = await repository.markNeedsReview(
            await tenantIdOf(id),
            id,
            AppointmentStatus.PENDING,
            new Date(now.getTime() - 60 * 60 * 1000),
            eligibleThrough,
            now,
            APPOINTMENT_REVIEW_SYSTEM_REASON,
        );

        expect(updated).toBe(false);
        expect(await readStatus(id)).toBe(AppointmentStatus.PENDING);
    });

    test("a read with no lower bound finds the appointment", async () => {
        const id = await createAppointment();

        const candidates = await repository.findReviewCandidates({
            activationCutoff: null,
            eligibleThrough: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            limit: 100,
        });

        expect(candidates.map((candidate) => candidate.id)).toContain(id);
    });

    test("the sweep may not re-flag one already in review", async () => {
        // Guarded by the domain rule, not the query: an appointment already in
        // review is not a candidate, so the rule is what a second sweep relies on.
        expect(canSystemFlagForReview(AppointmentStatus.PENDING)).toBe(true);
        expect(canSystemFlagForReview(AppointmentStatus.NEEDS_REVIEW)).toBe(
            false,
        );

        const id = await createAppointment(AppointmentStatus.NEEDS_REVIEW);
        expect(await readStatus(id)).toBe(AppointmentStatus.NEEDS_REVIEW);
    });
});

/** The tenant this suite's appointment belongs to, read back rather than assumed. */
async function tenantIdOf(appointmentId: string): Promise<string> {
    const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { tenantId: true },
    });
    return row!.tenantId;
}
