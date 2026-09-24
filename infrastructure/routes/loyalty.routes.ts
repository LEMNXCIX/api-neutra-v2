import {
    Application,
    NextFunction,
    Request,
    Response,
    Router,
} from "express";
import { authenticate } from "@/middleware/authenticate.middleware";
import {
    requireConcreteTenantContext,
    requireTenantFeature,
    requireTenantType,
} from "@/middleware/tenant-feature.middleware";
import { requirePermission } from "@/middleware/authorization.middleware";
import { LoyaltyController } from "@/interface-adapters/controllers/loyalty.controller";
import { UpdateLoyaltyConfigDto } from "@/core/application/dtos/requests/loyalty.request";
import { validateDto } from "@/middleware/validation.middleware";
import { ROLE_CONSTANTS } from "@/core/domain/constants";
import {
    ForbiddenError,
    UnauthorizedError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";

function requireSuperAdmin(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    if (!req.user?.role) {
        return next(new UnauthorizedError());
    }
    if (req.user.role.name !== ROLE_CONSTANTS.SUPER_ADMIN) {
        return next(
            new ForbiddenError(
                "Super administrator access is required",
                "FORBIDDEN",
            ),
        );
    }
    return next();
}

function requireActiveTenant(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    if (
        req.user?.role?.name !== ROLE_CONSTANTS.SUPER_ADMIN &&
        req.tenant?.active === false
    ) {
        return next(
            new ForbiddenError(
                "This tenant is inactive",
                "TENANT_INACTIVE",
            ),
        );
    }
    return next();
}

function requireConcreteTenantParam(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    const rawTenantId = req.params?.tenantId;
    const tenantId =
        typeof rawTenantId === "string" ? rawTenantId.trim() : "";
    if (!tenantId || tenantId.toLowerCase() === "all") {
        return next(
            new ValidationError(
                "A concrete tenant path is required",
                "TENANT_REQUIRED",
            ),
        );
    }
    return next();
}

export function loyaltyRoutes(
    app: Application,
    loyaltyController: LoyaltyController,
): void {
    const router = Router();
    app.use("/api/loyalty", router);

    router.get(
        "/me",
        authenticate,
        requireConcreteTenantContext,
        requireActiveTenant,
        requireTenantType("BOOKING", "HYBRID"),
        requireTenantFeature("LOYALTY"),
        loyaltyController.getCustomerSummary,
    );

    router.post(
        "/me/claim",
        authenticate,
        requireConcreteTenantContext,
        requireActiveTenant,
        requireTenantType("BOOKING", "HYBRID"),
        requireTenantFeature("LOYALTY"),
        loyaltyController.claimReward,
    );

    router.get(
        "/admin/summary",
        authenticate,
        requireConcreteTenantContext,
        requireActiveTenant,
        requireTenantType("BOOKING", "HYBRID"),
        requireTenantFeature("LOYALTY"),
        requirePermission("appointments:read"),
        loyaltyController.getTenantSummary,
    );

    router.get(
        "/admin/config",
        authenticate,
        requireConcreteTenantContext,
        requireActiveTenant,
        requireTenantType("BOOKING", "HYBRID"),
        requireTenantFeature("LOYALTY"),
        requirePermission("appointments:read"),
        loyaltyController.getConfig,
    );

    router.put(
        "/admin/config",
        authenticate,
        requireConcreteTenantContext,
        requireActiveTenant,
        requireTenantType("BOOKING", "HYBRID"),
        requireTenantFeature("LOYALTY"),
        requirePermission("appointments:write"),
        validateDto(UpdateLoyaltyConfigDto),
        loyaltyController.updateConfig,
    );

    router.get(
        "/admin/tenants",
        authenticate,
        requireSuperAdmin,
        loyaltyController.getAllTenants,
    );

    router.get(
        "/admin/tenants/:tenantId/config",
        authenticate,
        requireSuperAdmin,
        requireConcreteTenantParam,
        loyaltyController.getTenantConfig,
    );

    router.put(
        "/admin/tenants/:tenantId/config",
        authenticate,
        requireSuperAdmin,
        requireConcreteTenantParam,
        validateDto(UpdateLoyaltyConfigDto),
        loyaltyController.updateTenantConfig,
    );
}

export default loyaltyRoutes;
