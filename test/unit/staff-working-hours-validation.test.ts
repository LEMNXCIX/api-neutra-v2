import { CreateStaffUseCase } from "@/core/application/booking/create-staff.use-case";
import { UpdateStaffUseCase } from "@/core/application/booking/update-staff.use-case";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";
import { BusinessErrorCodes } from "@/types/error-codes";
import type { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import type { IUserRepository } from "@/core/repositories/user.repository.interface";
import type { IRoleRepository } from "@/core/repositories/role.repository.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";

function setup() {
    const staffRepository = {
        create: jest.fn().mockResolvedValue({ id: "staff-1" }),
        findById: jest.fn().mockResolvedValue({
            id: "staff-1",
            name: "Existing staff",
            userId: null,
            email: null,
        }),
        update: jest.fn().mockResolvedValue({ id: "staff-1" }),
    } as unknown as IStaffRepository;
    const userRepository = {
        findByEmail: jest.fn(),
        addTenant: jest.fn(),
    } as unknown as IUserRepository;
    const roleRepository = {
        findByName: jest.fn().mockResolvedValue(null),
    } as unknown as IRoleRepository;
    const tenantRepository = {
        findById: jest.fn().mockResolvedValue({
            config: {
                settings: {
                    businessHours: {
                        friday: null,
                        monday: { start: "09:00", end: "17:00" },
                    },
                },
            },
        }),
    } as unknown as ITenantRepository;

    return {
        createUseCase: new CreateStaffUseCase(
            staffRepository,
            userRepository,
            roleRepository,
            tenantRepository,
        ),
        updateUseCase: new UpdateStaffUseCase(
            staffRepository,
            userRepository,
            roleRepository,
            tenantRepository,
        ),
        staffRepository,
    };
}

describe("staff working-hours validation", () => {
    it("rejects creating a staff schedule on a closed business day", async () => {
        const { createUseCase, staffRepository } = setup();

        await expect(
            createUseCase.execute("tenant-1", {
                name: "Friday staff",
                workingHours: {
                    friday: { start: "09:00", end: "17:00" },
                },
            }),
        ).rejects.toMatchObject({
            name: "BusinessRuleViolationError",
            code: BusinessErrorCodes.STAFF_HOURS_CONFLICT,
            message: expect.stringContaining("closed business day"),
        });
        expect(staffRepository.create).not.toHaveBeenCalled();
    });

    it("allows creating a staff schedule on an open business day", async () => {
        const { createUseCase, staffRepository } = setup();

        const result = await createUseCase.execute("tenant-1", {
            name: "Monday staff",
            workingHours: {
                monday: { start: "10:00", end: "16:00" },
            },
        });

        expect(result.success).toBe(true);
        expect(staffRepository.create).toHaveBeenCalledWith(
            "tenant-1",
            expect.objectContaining({
                name: "Monday staff",
                workingHours: {
                    monday: { start: "10:00", end: "16:00" },
                },
            }),
        );
    });

    it("rejects updating a staff schedule on a closed business day", async () => {
        const { updateUseCase, staffRepository } = setup();

        await expect(
            updateUseCase.execute("tenant-1", "staff-1", {
                workingHours: {
                    friday: { start: "09:00", end: "17:00" },
                },
            }),
        ).rejects.toBeInstanceOf(BusinessRuleViolationError);
        expect(staffRepository.update).not.toHaveBeenCalled();
    });

    it("allows updating a staff schedule on an open business day", async () => {
        const { updateUseCase, staffRepository } = setup();

        const result = await updateUseCase.execute("tenant-1", "staff-1", {
            workingHours: {
                monday: { start: "11:00", end: "15:00" },
            },
        });

        expect(result.success).toBe(true);
        expect(staffRepository.update).toHaveBeenCalledWith(
            "tenant-1",
            "staff-1",
            expect.objectContaining({
                workingHours: {
                    monday: { start: "11:00", end: "15:00" },
                },
            }),
        );
    });
});
