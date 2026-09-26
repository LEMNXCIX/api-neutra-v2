import { RegisterUseCase } from "@/core/application/auth/register.use-case";
import { DuplicateEntityError } from "@/core/domain/errors/domain-errors";
import {
    AuthErrorCodes,
} from "@/types/error-codes";

const EMAIL = "emelec_leo@outlook.com";
const BOOK_TENANT = {
    tenantId: "tenant-book",
    roleId: "role-book-user",
    role: { id: "role-book-user", name: "USER", level: 1 },
    tenant: { id: "tenant-book", slug: "book" },
};
const SUPERADMIN_TENANT = {
    tenantId: "tenant-superadmin",
    roleId: "role-superadmin-user",
    role: { id: "role-superadmin-user", name: "USER", level: 1 },
    tenant: { id: "tenant-superadmin", slug: "superadmin" },
};

const existingUser = {
    id: "user-1",
    name: "Leonardo",
    email: EMAIL,
    password: "hashed-password",
    active: true,
    tenants: [BOOK_TENANT],
};

const userWithSuperadminMembership = {
    ...existingUser,
    tenants: [BOOK_TENANT, SUPERADMIN_TENANT],
};

function setup(options?: {
    user?: typeof existingUser | null;
    passwordMatches?: boolean;
}) {
    const userRepository = {
        findByEmail: jest.fn().mockResolvedValue(
            options?.user === undefined ? existingUser : options.user,
        ),
        create: jest.fn(),
        findById: jest.fn().mockResolvedValue(userWithSuperadminMembership),
        addTenant: jest.fn().mockResolvedValue(undefined),
    };
    const passwordHasher = {
        hash: jest.fn().mockResolvedValue("new-password-hash"),
        compare: jest.fn().mockResolvedValue(options?.passwordMatches ?? true),
    };
    const tokenGenerator = {
        generate: jest.fn().mockReturnValue("signed-token"),
    };
    const queueProvider = {
        enqueue: jest.fn().mockResolvedValue(undefined),
    };
    const tenantRepository = {
        findBySlug: jest.fn(),
    };
    const roleRepository = {
        findByName: jest.fn().mockResolvedValue(SUPERADMIN_TENANT.role),
    };
    const logger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    };

    const useCase = new RegisterUseCase(
        userRepository as never,
        passwordHasher as never,
        tokenGenerator as never,
        queueProvider as never,
        tenantRepository as never,
        roleRepository as never,
        logger as never,
    );

    return {
        useCase,
        userRepository,
        passwordHasher,
        tokenGenerator,
        queueProvider,
        roleRepository,
    };
}

const registration = {
    name: "Leonardo",
    email: EMAIL,
    password: "same-password",
};

describe("RegisterUseCase tenant memberships", () => {
    test("adds an existing verified identity to another tenant", async () => {
        const { useCase, userRepository, passwordHasher, roleRepository } =
            setup();

        const result = await useCase.execute(
            SUPERADMIN_TENANT.tenantId,
            registration,
        );

        expect(passwordHasher.compare).toHaveBeenCalledWith(
            registration.password,
            existingUser.password,
        );
        expect(userRepository.create).not.toHaveBeenCalled();
        expect(roleRepository.findByName).toHaveBeenCalledWith(
            SUPERADMIN_TENANT.tenantId,
            "USER",
        );
        expect(userRepository.addTenant).toHaveBeenCalledWith(
            existingUser.id,
            SUPERADMIN_TENANT.tenantId,
            SUPERADMIN_TENANT.roleId,
        );
        expect(result).toEqual(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    id: existingUser.id,
                    token: "signed-token",
                }),
            }),
        );
    });

    test("does not attach an existing identity with a different password", async () => {
        const { useCase, userRepository } = setup({
            passwordMatches: false,
        });

        await expect(
            useCase.execute(SUPERADMIN_TENANT.tenantId, registration),
        ).rejects.toMatchObject({
            name: "BusinessRuleViolationError",
            code: AuthErrorCodes.USER_ALREADY_EXISTS,
        });
        expect(userRepository.addTenant).not.toHaveBeenCalled();
    });

    test("rejects registering the same identity twice in one tenant", async () => {
        const { useCase, userRepository } = setup({
            user: userWithSuperadminMembership,
        });

        await expect(
            useCase.execute(SUPERADMIN_TENANT.tenantId, registration),
        ).rejects.toBeInstanceOf(DuplicateEntityError);
        expect(userRepository.addTenant).not.toHaveBeenCalled();
    });
});
