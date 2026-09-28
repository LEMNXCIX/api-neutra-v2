import type { RequestHandler } from "express";
import {
    type Application,
    type NextFunction,
    type Request,
    type Response,
    Router,
} from "express";
import {
    CreateLoyaltyCampaignDto,
    UpdateLoyaltyCampaignDto,
} from "@/core/application/dtos/requests/loyalty.request";
import { ROLE_CONSTANTS } from "@/core/domain/constants";
import { ForbiddenError } from "@/core/domain/errors/domain-errors";
import type { LoyaltyController } from "@/interface-adapters/controllers/loyalty.controller";
import {
    requirePermission,
    requireSuperAdmin,
} from "@/middleware/authorization.middleware";
import {
    requireConcreteTenantContext,
    requireTenantType,
} from "@/middleware/tenant-feature.middleware";
import { validateDto } from "@/middleware/validation.middleware";

function requireActiveTenant(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    if (
        req.user?.role?.name !== ROLE_CONSTANTS.SUPER_ADMIN &&
        req.tenant?.active === false
    ) {
        next(new ForbiddenError("This tenant is inactive", "TENANT_INACTIVE"));
        return;
    }
    next();
}

export function loyaltyRoutes(
    app: Application,
    loyaltyController: LoyaltyController,
    authenticate: RequestHandler,
    requireTenantFeature: (featureKey: string) => RequestHandler,
): void {
    const router = Router();
    const tenantGates = [
        authenticate,
        requireConcreteTenantContext,
        requireActiveTenant,
        requireTenantType("STORE", "BOOKING", "HYBRID"),
        requireTenantFeature("LOYALTY"),
    ];
    app.use("/api/loyalty", router);

    router.get("/me", ...tenantGates, loyaltyController.getCustomerCampaigns);

    router.get(
        "/me/campaigns/:campaignId",
        ...tenantGates,
        loyaltyController.getCustomerCampaign,
    );

    router.post(
        "/me/campaigns/:campaignId/claim",
        ...tenantGates,
        loyaltyController.claimCustomerCampaign,
    );

    router.get(
        "/admin/summary",
        ...tenantGates,
        requirePermission("appointments:read"),
        loyaltyController.getTenantSummary,
    );

    router.get(
        "/admin/campaigns",
        ...tenantGates,
        requirePermission("appointments:read"),
        loyaltyController.getCampaigns,
    );

    router.post(
        "/admin/campaigns",
        ...tenantGates,
        requirePermission("appointments:write"),
        validateDto(CreateLoyaltyCampaignDto),
        loyaltyController.createCampaign,
    );

    router.get(
        "/admin/campaigns/:campaignId",
        ...tenantGates,
        requirePermission("appointments:read"),
        loyaltyController.getCampaign,
    );

    router.patch(
        "/admin/campaigns/:campaignId",
        ...tenantGates,
        requirePermission("appointments:write"),
        validateDto(UpdateLoyaltyCampaignDto),
        loyaltyController.updateCampaign,
    );

    router.delete(
        "/admin/campaigns/:campaignId",
        ...tenantGates,
        requirePermission("appointments:write"),
        loyaltyController.deleteCampaign,
    );

    router.post(
        "/admin/campaigns/:campaignId/activate",
        ...tenantGates,
        requirePermission("appointments:write"),
        loyaltyController.activateCampaign,
    );

    router.post(
        "/admin/campaigns/:campaignId/end",
        ...tenantGates,
        requirePermission("appointments:write"),
        loyaltyController.endCampaign,
    );

    router.post(
        "/admin/campaigns/:campaignId/archive",
        ...tenantGates,
        requirePermission("appointments:write"),
        loyaltyController.archiveCampaign,
    );

    router.get(
        "/admin/tenants",
        authenticate,
        requireSuperAdmin,
        loyaltyController.getAllTenants,
    );
}

export default loyaltyRoutes;
