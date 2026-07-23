import { Staff as PrismaStaff, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    IStaffRepository,
    CreateStaffData,
    UpdateStaffData,
} from "@/core/repositories/staff.repository.interface";
import { Staff, WorkingHours } from "@/core/entities/staff.entity";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

type StaffWithServices = Prisma.StaffGetPayload<{
    include: { staffServices: { select: { serviceId: true } } };
}>;

function parseWorkingHours(
    value: Prisma.JsonValue | null,
): WorkingHours | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "object" && !Array.isArray(value))
        return value as WorkingHours;
    return undefined;
}

export class PrismaStaffRepository implements IStaffRepository {
    private mapToEntity(staff: StaffWithServices): Staff {
        return {
            id: staff.id,
            userId: staff.userId ?? undefined,
            name: staff.name,
            email: staff.email ?? undefined,
            phone: staff.phone ?? undefined,
            avatar: staff.avatar ?? undefined,
            bio: staff.bio ?? undefined,
            active: staff.active,
            workingHours: parseWorkingHours(staff.workingHours),
            serviceIds: staff.staffServices?.map((ss) => ss.serviceId) || [],
            tenantId: staff.tenantId,
            createdAt: staff.createdAt,
            updatedAt: staff.updatedAt,
        };
    }

    async create(tenantId: string, data: CreateStaffData): Promise<Staff> {
        try {
            const staff = await prisma.staff.create({
                data: {
                    tenantId,
                    userId: data.userId,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    avatar: data.avatar,
                    bio: data.bio,
                    active: data.active ?? true,
                    workingHours: data.workingHours as Prisma.InputJsonValue,
                },
                include: { staffServices: { select: { serviceId: true } } },
            });
            return this.mapToEntity(staff);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "email";
                throw new DuplicateEntityError(
                    "Staff",
                    target,
                    data.email ?? data.name,
                );
            }
            throw error;
        }
    }

    async findById(tenantId: string, id: string): Promise<Staff | null> {
        const staff = await prisma.staff.findFirst({
            where: { id, tenantId },
            include: { staffServices: { select: { serviceId: true } } },
        });
        return staff ? this.mapToEntity(staff) : null;
    }

    async findByEmail(tenantId: string, email: string): Promise<Staff | null> {
        const staff = await prisma.staff.findFirst({
            where: { email, tenantId },
            include: { staffServices: { select: { serviceId: true } } },
        });
        return staff ? this.mapToEntity(staff) : null;
    }

    async findByUserId(
        tenantId: string,
        userId: string,
    ): Promise<Staff | null> {
        const staff = await prisma.staff.findFirst({
            where: { userId, tenantId },
            include: { staffServices: { select: { serviceId: true } } },
        });
        return staff ? this.mapToEntity(staff) : null;
    }

    async findAll(
        tenantId: string | undefined,
        activeOnly: boolean = false,
    ): Promise<Staff[]> {
        const staffList = await prisma.staff.findMany({
            where: {
                ...(tenantId && { tenantId }),
                ...(activeOnly && { active: true }),
            },
            include: { staffServices: { select: { serviceId: true } } },
            orderBy: { name: "asc" },
        });
        return staffList.map((s) => this.mapToEntity(s));
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateStaffData,
    ): Promise<Staff> {
        try {
            const staff = await prisma.staff.update({
                where: { id, tenantId },
                data: {
                    userId: data.userId,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    avatar: data.avatar,
                    bio: data.bio,
                    active: data.active,
                    workingHours: data.workingHours as Prisma.InputJsonValue,
                },
                include: { staffServices: { select: { serviceId: true } } },
            });
            return this.mapToEntity(staff);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Staff", id);
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "email";
                throw new DuplicateEntityError(
                    "Staff",
                    target,
                    data.email ?? "",
                );
            }
            throw error;
        }
    }

    async delete(tenantId: string, id: string): Promise<void> {
        try {
            await prisma.staff.delete({
                where: { id, tenantId },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Staff", id);
            }
            throw error;
        }
    }

    async assignService(
        tenantId: string,
        staffId: string,
        serviceId: string,
    ): Promise<void> {
        await prisma.staffService.create({
            data: { tenantId, staffId, serviceId },
        });
    }

    async removeService(
        tenantId: string,
        staffId: string,
        serviceId: string,
    ): Promise<void> {
        await prisma.staffService.delete({
            where: { staffId_serviceId: { staffId, serviceId } },
        });
    }

    async getServices(tenantId: string, staffId: string): Promise<string[]> {
        const staffServices = await prisma.staffService.findMany({
            where: { tenantId, staffId },
            select: { serviceId: true },
        });
        return staffServices.map((ss) => ss.serviceId);
    }

    async syncServices(
        tenantId: string,
        staffId: string,
        serviceIds: string[],
    ): Promise<void> {
        await prisma.$transaction(async (tx) => {
            await tx.staffService.deleteMany({
                where: { tenantId, staffId },
            });

            if (serviceIds.length > 0) {
                await tx.staffService.createMany({
                    data: serviceIds.map((serviceId) => ({
                        tenantId,
                        staffId,
                        serviceId,
                    })),
                });
            }
        });
    }
}
