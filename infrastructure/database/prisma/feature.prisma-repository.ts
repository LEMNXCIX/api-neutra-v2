import { prisma } from '@/config/db.config';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { Feature, CreateFeatureDTO } from '@/core/entities/feature.entity';

export class PrismaFeatureRepository implements IFeatureRepository {
    async findAll(): Promise<Feature[]> {
        const features = await prisma.feature.findMany({
            orderBy: { name: 'asc' }
        });
        return features.map(f => this.mapToEntity(f));
    }

    async findById(id: string): Promise<Feature | null> {
        const feature = await prisma.feature.findUnique({
            where: { id }
        });
        return feature ? this.mapToEntity(feature) : null;
    }

    async findByKey(key: string): Promise<Feature | null> {
        const feature = await prisma.feature.findUnique({
            where: { key }
        });
        return feature ? this.mapToEntity(feature) : null;
    }

    async create(data: CreateFeatureDTO): Promise<Feature> {
        const feature = await prisma.feature.create({
            data: {
                key: data.key,
                name: data.name,
                description: data.description,
                category: data.category,
                price: data.price || 0
            }
        });
        return this.mapToEntity(feature);
    }

    async update(id: string, data: Partial<Feature>): Promise<Feature> {
        const feature = await prisma.feature.update({
            where: { id },
            data: {
                key: data.key,
                name: data.name,
                description: data.description,
                category: data.category,
                price: data.price
            }
        });
        return this.mapToEntity(feature);
    }

    private mapToEntity(data: any): Feature {
        return {
            id: data.id,
            key: data.key,
            name: data.name,
            description: data.description || undefined,
            category: data.category || undefined,
            price: data.price,
            createdAt: data.createdAt
        };
    }

    async delete(id: string): Promise<void> {
        await prisma.feature.delete({
            where: { id }
        });
    }

    async getTenantFeatureStatus(tenantId: string): Promise<Record<string, boolean>> {
        const tenantFeatures = await prisma.tenantFeature.findMany({
            where: { tenantId },
            include: { feature: true }
        });

        const statusMap: Record<string, boolean> = {};
        tenantFeatures.forEach(tf => {
            statusMap[tf.feature.key] = tf.enabled;
        });

        return statusMap;
    }

    async updateTenantFeatures(tenantId: string, features: Record<string, boolean>): Promise<void> {
        const updates = Object.entries(features).map(([featureId, enabled]) => {
            return prisma.tenantFeature.upsert({
                where: {
                    tenantId_featureId: {
                        tenantId,
                        featureId
                    }
                },
                update: { enabled },
                create: {
                    tenantId,
                    featureId,
                    enabled
                }
            });
        });

        if (updates.length > 0) {
            await prisma.$transaction(updates);
        }
    }
}
