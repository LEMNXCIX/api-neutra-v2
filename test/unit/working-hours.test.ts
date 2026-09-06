import { GetAvailabilityUseCase } from "@/core/application/booking/get-availability.use-case";
import { CreateAppointmentUseCase } from "@/core/application/booking/create-appointment.use-case";
import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { IServiceRepository } from "@/core/repositories/service.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";

// 2030-01-04 is a Friday, 2030-01-06 is a Sunday. Local noon avoids TZ day shifts.
const FRIDAY = "2030-01-04T12:00:00";
const SUNDAY = "2030-01-06T12:00:00";

const makeDeps = (overrides: {
    staff?: Record<string, unknown>;
    tenant?: Record<string, unknown>;
    duration?: number;
    appointments?: Array<{ startTime: Date | string; endTime: Date | string; status: string }>;
}) => {
    const appointmentRepo = {
        findByStaff: jest.fn().mockResolvedValue(overrides.appointments || []),
        checkAvailability: jest.fn().mockResolvedValue(true),
        create: jest.fn().mockResolvedValue({ id: "a1" }),
    } as unknown as IAppointmentRepository;
    const staffRepo = {
        findById: jest.fn().mockResolvedValue({
            id: "s1",
            active: true,
            workingHours: null,
            ...overrides.staff,
        }),
        getServices: jest.fn().mockResolvedValue(["svc1"]),
    } as unknown as IStaffRepository;
    const serviceRepo = {
        findById: jest.fn().mockResolvedValue({
            id: "svc1",
            active: true,
            duration: overrides.duration ?? 30,
            price: 10,
        }),
    } as unknown as IServiceRepository;
    const tenantRepo = {
        findById: jest.fn().mockResolvedValue({
            id: "t1",
            config: { settings: overrides.tenant || {} },
        }),
    } as unknown as ITenantRepository;
    return { appointmentRepo, staffRepo, serviceRepo, tenantRepo };
};

describe("GetAvailabilityUseCase — working hours", () => {
    const base = { staffId: "s1", serviceId: "svc1", timezoneOffset: "0" };

    it("falls back to 9-17 when no schedule is defined anywhere", async () => {
        const uc = new GetAvailabilityUseCase(
            makeDeps({}).appointmentRepo,
            makeDeps({}).staffRepo,
            makeDeps({}).serviceRepo,
            makeDeps({}).tenantRepo,
        );
        const result = await uc.execute("t1", { ...base, date: FRIDAY });
        const slots = result.data as string[];
        expect(slots[0]).toBe("09:00");
        expect(slots[slots.length - 1]).toBe("16:30");
        expect(slots).toHaveLength(16);
    });

    it("returns [] on the staff member's day off", async () => {
        const deps = makeDeps({ staff: { workingHours: { sunday: null } } });
        const uc = new GetAvailabilityUseCase(
            deps.appointmentRepo,
            deps.staffRepo,
            deps.serviceRepo,
            deps.tenantRepo,
        );
        const result = await uc.execute("t1", { ...base, date: SUNDAY });
        expect(result.data).toEqual([]);
    });

    it("respects a late start (friday 14:00-20:00)", async () => {
        const deps = makeDeps({
            staff: { workingHours: { friday: { start: "14:00", end: "20:00" } } },
        });
        const uc = new GetAvailabilityUseCase(
            deps.appointmentRepo,
            deps.staffRepo,
            deps.serviceRepo,
            deps.tenantRepo,
        );
        const result = await uc.execute("t1", { ...base, date: FRIDAY });
        const slots = result.data as string[];
        expect(slots[0]).toBe("14:00");
        expect(slots[slots.length - 1]).toBe("19:30");
    });

    it("supports legacy single-range format", async () => {
        const deps = makeDeps({
            staff: { workingHours: { friday: { start: "10:00", end: "11:00" } } },
        });
        const uc = new GetAvailabilityUseCase(
            deps.appointmentRepo,
            deps.staffRepo,
            deps.serviceRepo,
            deps.tenantRepo,
        );
        const result = await uc.execute("t1", { ...base, date: FRIDAY });
        expect(result.data).toEqual(["10:00", "10:30"]);
    });

    it("never books across a lunch gap (multi-range day)", async () => {
        // 60-min service: 11:30 would end 12:30, crossing the gap → excluded
        const deps = makeDeps({
            staff: {
                workingHours: {
                    friday: [
                        { start: "09:00", end: "12:00" },
                        { start: "13:00", end: "17:00" },
                    ],
                },
            },
            duration: 60,
        });
        const uc = new GetAvailabilityUseCase(
            deps.appointmentRepo,
            deps.staffRepo,
            deps.serviceRepo,
            deps.tenantRepo,
        );
        const result = await uc.execute("t1", { ...base, date: FRIDAY });
        const slots = result.data as string[];
        expect(slots).toContain("11:00");
        expect(slots).not.toContain("11:30");
        expect(slots).toContain("13:00");
    });

    it("prevents cross-service overlaps (90min manicure blocks 30min haircut)", async () => {
        const deps = makeDeps({
            staff: { workingHours: { friday: { start: "09:00", end: "17:00" } } },
            appointments: [
                {
                    startTime: new Date("2030-01-04T10:00:00"),
                    endTime: new Date("2030-01-04T11:30:00"),
                    status: "CONFIRMED",
                },
            ],
        });
        const uc = new GetAvailabilityUseCase(
            deps.appointmentRepo,
            deps.staffRepo,
            deps.serviceRepo,
            deps.tenantRepo,
        );
        const result = await uc.execute("t1", { ...base, date: FRIDAY });
        const slots = result.data as string[];
        expect(slots).toContain("09:30"); // ends exactly at 10:00
        expect(slots).not.toContain("10:00");
        expect(slots).not.toContain("11:00");
        expect(slots).toContain("11:30");
    });

    it("intersects staff hours with tenant business hours", async () => {
        const deps = makeDeps({
            staff: { workingHours: { friday: { start: "09:00", end: "17:00" } } },
            tenant: { businessHours: { friday: { start: "10:00", end: "16:00" } } },
        });
        const uc = new GetAvailabilityUseCase(
            deps.appointmentRepo,
            deps.staffRepo,
            deps.serviceRepo,
            deps.tenantRepo,
        );
        const result = await uc.execute("t1", { ...base, date: FRIDAY });
        const slots = result.data as string[];
        expect(slots[0]).toBe("10:00");
        expect(slots[slots.length - 1]).toBe("15:30");
    });

    it("returns [] on tenant holidays", async () => {
        const deps = makeDeps({
            tenant: { holidays: ["2030-01-04"] },
        });
        const uc = new GetAvailabilityUseCase(
            deps.appointmentRepo,
            deps.staffRepo,
            deps.serviceRepo,
            deps.tenantRepo,
        );
        const result = await uc.execute("t1", { ...base, date: FRIDAY });
        expect(result.data).toEqual([]);
    });
});

describe("CreateAppointmentUseCase — schedule validation", () => {
    const makeUseCase = (overrides: {
        staff?: Record<string, unknown>;
        tenant?: Record<string, unknown>;
    }) => {
        const deps = makeDeps(overrides);
        return new CreateAppointmentUseCase(
            deps.appointmentRepo,
            deps.staffRepo,
            deps.serviceRepo,
            {} as never,
            { execute: jest.fn() } as never,
            { enqueue: jest.fn() } as never,
            {
                getTenantFeatureStatus: jest.fn().mockResolvedValue({}),
            } as never,
            deps.tenantRepo,
        );
    };

    it("rejects appointments outside working hours", async () => {
        const uc = makeUseCase({
            staff: { workingHours: { friday: { start: "14:00", end: "20:00" } } },
        });
        await expect(
            uc.execute("t1", {
                userId: "u1",
                serviceId: "svc1",
                staffId: "s1",
                startTime: new Date("2030-01-04T09:00:00").toISOString(),
            } as never),
        ).rejects.toThrow(BusinessRuleViolationError);
    });

    it("rejects appointments on holidays", async () => {
        const uc = makeUseCase({ tenant: { holidays: ["2030-01-04"] } });
        await expect(
            uc.execute("t1", {
                userId: "u1",
                serviceId: "svc1",
                staffId: "s1",
                startTime: new Date("2030-01-04T15:00:00").toISOString(),
            } as never),
        ).rejects.toThrow(BusinessRuleViolationError);
    });

    it("accepts appointments inside working hours", async () => {
        const uc = makeUseCase({
            staff: { workingHours: { friday: { start: "14:00", end: "20:00" } } },
        });
        const result = await uc.execute("t1", {
            userId: "u1",
            serviceId: "svc1",
            staffId: "s1",
            startTime: new Date("2030-01-04T15:00:00").toISOString(),
        } as never);
        expect(result.success).toBe(true);
    });
});
