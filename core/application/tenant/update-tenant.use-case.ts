import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    DuplicateEntityError,
} from "@/core/domain/errors/domain-errors";
import { UpdateTenantDTO } from "@/core/application/dtos/requests/tenant.request";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import {
    assertTenantFeatureDependencies,
    isLoyaltyOrCouponsDisabling,
} from "@/core/entities/feature.entity";

export class UpdateTenantUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
        private loyaltyRepository: ILoyaltyRepository,
    ) {}

    async execute(id: string, data: UpdateTenantDTO): Promise<UseCaseResult> {
        const existing = await this.tenantRepository.findById(id);
        if (!existing) {
            throw new EntityNotFoundError("Tenant", id);
        }

        // If slug is changing, check for duplicates
        if (data.slug && data.slug !== existing.slug) {
            const slugExists = await this.tenantRepository.findBySlug(
                data.slug,
            );
            if (slugExists) {
                throw new DuplicateEntityError("Tenant", "slug", data.slug);
            }
        }

        const featureChanges = data.config?.features;
        let nextData = data;
        let mergedTenantFeatures: Record<string, boolean> | undefined;

        if (featureChanges) {
            const storedFeatures =
                await this.featureRepository.getTenantFeatureStatus(id);
            const currentFeatures =
                storedFeatures ?? existing.config?.features ?? {};
            const mergedFeatures = {
                ...currentFeatures,
                ...featureChanges,
            };
            mergedTenantFeatures = mergedFeatures;

            assertTenantFeatureDependencies(mergedFeatures);
            if (
                isLoyaltyOrCouponsDisabling(
                    currentFeatures,
                    featureChanges,
                ) &&
                (await this.loyaltyRepository.hasLiveLoyaltyObligations(id))
            ) {
                throw new BusinessRuleViolationError(
                    "LOYALTY and COUPONS cannot be disabled while live loyalty obligations remain",
                    "LOYALTY_OBLIGATIONS_EXIST",
                );
            }

            nextData = {
                ...data,
                config: {
                    ...(data.config || {}),
                    features: mergedFeatures,
                },
            };
        }

        // Merge config if present
        if (nextData.config) {
            nextData = {
                ...nextData,
                config: {
                    ...existing.config,
                    ...(nextData.config || {}),
                    branding: {
                        ...(existing.config?.branding || {}),
                        ...(nextData.config?.branding || {}),
                    },
                    settings: {
                        ...(existing.config?.settings || {}),
                        ...(nextData.config?.settings || {}),
                    },
                    features:
                        mergedTenantFeatures ?? {
                            ...(existing.config?.features || {}),
                            ...(nextData.config?.features || {}),
                        },
                },
            };
        }

        const updated = await this.tenantRepository.update(id, nextData);

        // Keep the tenantFeature table (source of truth for server-side
        // enforcement) in sync with config.features from the payload.
        if (featureChanges && updated.config?.features) {
            await this.featureRepository.updateTenantFeatures(
                id,
                updated.config.features,
            );
        }

        return Success(updated, "Tenant updated successfully");
    }
}
