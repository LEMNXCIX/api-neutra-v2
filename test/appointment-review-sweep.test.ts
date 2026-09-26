import { prisma } from "@/config/db.config";
import { PrismaAppointmentRepository } from "@/infrastructure/database/prisma/appointment.prisma-repository";
import { SweepAppointmentReviewsUseCase } from "@/core/application/booking/sweep-appointment-reviews.use-case";
import { AppointmentStatus } from "@/core/entities/appointment.entity";
import type { ILogger } from "@/core/providers/logger.interface";
import type { IConfigProvider } from "@/core/providers/config-provider.interface";

/**
 * The sweep against a real database, because the failure this guards is one no
 * mocked unit test can see.
 *
 * The activation cutoff was made optional so the two-hour grace is the only
 * temporal rule. The candidate query was converted to omit the lower bound, and
 * the update was not: it kept passing `gte: activationCutoff` with a null, which
 * Prisma rejects with "Argument `gte` must not be null". Every unit suite stayed
 * green, because a mocked repository accepts whatever it is handed, and the
 * sweep only started failing once it ran for real, every five minutes.
 *
 * A method parameter narrowed from `Date | null` to `Date` also passes
 * `tsc`: method parameters are compared bivariantly, so the implementation was
 * free to keep the narrower type and nothing complained. Only the database
 * caught it.
 */

const noopLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    logRequest: () => {},
    logResponse: () => {},
} as unknown as ILogger;

const fixedNow = new Date("2030-06-15T12:00:00.000Z");
const yesterday = new Date("2030-06-14T10:00:00.000Z");

/** Reuses the seeded booking so only the appointment is created and removed. */
async function seedReferences(): Promise<{
    tenantId: string;
    userId: string;
    serviceId: string;
    staffId: string;
}> {
    const tenant = await prisma.tenant.findFirst({
        where: { active: true, type: { in: ["BOOKING", "HYBRID"] } },
        select: { id: true },
    });
    const appointment = await prisma.appointment.findFirst({
        select: { userId: true, serviceId: true, staffId: true },
    });
    if (!tenant || !appointment) {
        throw new Error(
            "this suite needs the seeded HYBRID tenant and one appointment to borrow references from",
        );
    }
    return {
        tenantId: tenant.id,
        userId: appointment.userId,
        serviceId: appointment.serviceId,
        staffId: appointment.staffId,
    };
}

async function createAppointment(
    references: { tenantId: string; userId: string; serviceId: string; staffId: string },
    status = AppointmentStatus.PENDING,
): Promise<string> {
    const created = await prisma.appointment.create({
        data: {
            tenantId: references.tenantId,
            userId: references.userId,
            serviceId: references.serviceId,
            staffId: references.staffId,
            startTime: yesterday,
            endTime: new Date(yesterday.getTime() + 30 * 60 * 1000),
            status,
        },
        select: { id: true },
    });
    return created.id;
}

function sweepWith(options: {
    activationCutoff?: Date;
    configuredCutoff?: string;
}) {
    return new SweepAppointmentReviewsUseCase(
        new PrismaAppointmentRepository(),
        noopLogger,
        {
            getAppointmentReviewSweepActivationCutoff: () =>
                options.configuredCutoff,
        } as unknown as IConfigProvider,
        {
            now: () => fixedNow,
            ...(options.activationCutoff
                ? { activationCutoff: options.activationCutoff }
                : {}),
        },
    );
}

async function readStatus(id: string): Promise<string | undefined> {
    const row = await prisma.appointment.findUnique({
        where: { id },
        select: { status: true },
    });
    return row?.status;
}

describe("appointment review sweep against the database", () => {
    let references: Awaited<ReturnType<typeof seedReferences>>;
    const created: string[] = [];

    beforeAll(async () => {
        references = await seedReferences();
    });

    afterEach(async () => {
        if (created.length > 0) {
            await prisma.appointment.deleteMany({
                where: { id: { in: created.splice(0) } },
            });
        }
    });

    test("flags an appointment from yesterday with no lower bound set", async () => {
        // The regression. With a null cutoff this reaches Prisma as
        // `startTime: { gte: null }` when the update forgets to omit the bound,
        // and Prisma throws instead of flagging the appointment.
        const id = await createAppointment(references);
        created.push(id);

        const result = await sweepWith({}).execute();

        expect(await readStatus(id)).toBe(AppointmentStatus.NEEDS_REVIEW);
        expect(result.transitioned).toBeGreaterThanOrEqual(1);
    });

    test("records why, and who did not", async () => {
        const id = await createAppointment(references);
        created.push(id);

        await sweepWith({}).execute();

        const row = await prisma.appointment.findUnique({
            where: { id },
            select: { statusChangeReason: true, statusChangedById: true },
        });
        expect(row?.statusChangeReason).toContain("unresolved");
        // A system flag, not a member of staff.
        expect(row?.statusChangedById).toBeNull();
    });

    test("an explicit cutoff still excludes appointments older than it", async () => {
        const id = await createAppointment(references);
        created.push(id);

        // The opt-in deployment floor, and the escape hatch that replaced the
        // process-start default.
        await sweepWith({
            activationCutoff: new Date("2030-06-15T00:00:00.000Z"),
        }).execute();

        expect(await readStatus(id)).toBe(AppointmentStatus.PENDING);
    });

    test("an invalid configured cutoff falls back to no lower bound", async () => {
        const id = await createAppointment(references);
        created.push(id);

        await sweepWith({ configuredCutoff: "not-an-absolute-instant" }).execute();

        expect(await readStatus(id)).toBe(AppointmentStatus.NEEDS_REVIEW);
    });

    test("does not re-flag an appointment already in review", async () => {
        const id = await createAppointment(
            references,
            AppointmentStatus.NEEDS_REVIEW,
        );
        created.push(id);

        const result = await sweepWith({}).execute();

        expect(await readStatus(id)).toBe(AppointmentStatus.NEEDS_REVIEW);
        expect(result.candidates).toBe(0);
    });
});
