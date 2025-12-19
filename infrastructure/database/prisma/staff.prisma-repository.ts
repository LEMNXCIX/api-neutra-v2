import { prisma } from '@/config/db.config';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { Staff, CreateStaffDTO, UpdateStaffDTO } from '@/core/entities/staff.entity';

/**
 * Prisma Staff Repository
 * Tenant-aware implementation for Staff persistence
 */
export class PrismaStaffRepository implements IStaffRepository {
    async create(tenantId: string, data: CreateStaffDTO): Promise<Staff> {
        const staff = await prisma.staff.create({
            data: {
                tenantId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                avatar: data.avatar,
                bio: data.bio,
                active: data.active ?? true,
                workingHours: data.workingHours as any,
            },
        });
        return this.mapToEntity(staff);
    }

    async findById(tenantId: string, id: string): Promise<Staff | null> {
        const staff = await prisma.staff.findFirst({
            where: { id, tenantId },
            include: {
                staffServices: {
                    select: { serviceId: true }
                }
            }
        });
        return staff ? this.mapToEntity(staff) : null;
    }

    async findAll(tenantId: string, activeOnly: boolean = false): Promise<Staff[]> {
        const staffList = await prisma.staff.findMany({
            where: {
                tenantId,
                ...(activeOnly && { active: true }),
            },
            include: {
                staffServices: {
                    select: { serviceId: true }
                }
            },
            orderBy: { name: 'asc' },
        });
        return staffList.map(this.mapToEntity);
    }

    async update(tenantId: string, id: string, data: UpdateStaffDTO): Promise<Staff> {
        const staff = await prisma.staff.update({
            where: { id, tenantId },
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                avatar: data.avatar,
                bio: data.bio,
                active: data.active,
                workingHours: data.workingHours as any,
            },
        });
        return this.mapToEntity(staff);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await prisma.staff.delete({
            where: { id, tenantId },
        });
    }

    async assignService(tenantId: string, staffId: string, serviceId: string): Promise<void> {
        await prisma.staffService.create({
            data: {
                tenantId,
                staffId,
                serviceId,
            },
        });
    }

    async removeService(tenantId: string, staffId: string, serviceId: string): Promise<void> {
        await prisma.staffService.delete({
            where: {
                staffId_serviceId: {
                    staffId,
                    serviceId,
                },
            },
        });
    }

    async getServices(tenantId: string, staffId: string): Promise<string[]> {
        const staffServices = await prisma.staffService.findMany({
            where: {
                tenantId,
                staffId,
            },
            select: {
                serviceId: true,
            },
        });
        return staffServices.map(ss => ss.serviceId);
    }

    private mapToEntity(staff: any): Staff {
        return {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            phone: staff.phone,
            avatar: staff.avatar,
            bio: staff.bio,
            active: staff.active,
            workingHours: staff.workingHours,
            serviceIds: staff.staffServices?.map((ss: any) => ss.serviceId) || [],
            tenantId: staff.tenantId,
            createdAt: staff.createdAt,
            updatedAt: staff.updatedAt,
        };
    }
}
