import { AddToCartUseCase } from "@/core/application/cart/add-to-cart.use-case";
import { ChangeAmountUseCase } from "@/core/application/cart/change-amount.use-case";
import { ClearCartUseCase } from "@/core/application/cart/clear-cart.use-case";
import { CreateCartUseCase } from "@/core/application/cart/create-cart.use-case";
import { GetCartUseCase } from "@/core/application/cart/get-cart.use-case";
import { GetCartStatsUseCase } from "@/core/application/cart/get-cart-stats.use-case";
import { RemoveFromCartUseCase } from "@/core/application/cart/remove-from-cart.use-case";
import { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import { ClaimLoyaltyRewardUseCase } from "@/core/application/loyalty/claim-loyalty-reward.use-case";
import { CreateLoyaltyCampaignUseCase } from "@/core/application/loyalty/create-loyalty-campaign.use-case";
import { GetAllTenantsLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-all-tenants-loyalty-overview.use-case";
import { GetCustomerLoyaltySummaryUseCase } from "@/core/application/loyalty/get-customer-loyalty-summary.use-case";
import { GetLoyaltyCampaignsUseCase } from "@/core/application/loyalty/get-loyalty-campaigns.use-case";
import { GetTenantLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-tenant-loyalty-overview.use-case";
import { TransitionLoyaltyCampaignUseCase } from "@/core/application/loyalty/transition-loyalty-campaign.use-case";
import { UpdateLoyaltyCampaignUseCase } from "@/core/application/loyalty/update-loyalty-campaign.use-case";
import { ChangeOrderStatusUseCase } from "@/core/application/order/change-order-status.use-case";
import { CreateOrderUseCase } from "@/core/application/order/create-order.use-case";
import { GetOrderUseCase } from "@/core/application/order/get-order.use-case";
import { GetOrderStatsUseCase } from "@/core/application/order/get-order-stats.use-case";
import { GetOrderStatusesUseCase } from "@/core/application/order/get-order-statuses.use-case";
import { GetOrdersPaginatedUseCase } from "@/core/application/order/get-orders-paginated.use-case";
import { GetUserOrdersUseCase } from "@/core/application/order/get-user-orders.use-case";
import { UpdateOrderUseCase } from "@/core/application/order/update-order.use-case";
import { CartController } from "@/interface-adapters/controllers/cart.controller";
import { LoyaltyController } from "@/interface-adapters/controllers/loyalty.controller";
import { OrderController } from "@/interface-adapters/controllers/order.controller";
import type { Runtime } from "../runtime";

export function createCommerceControllers(runtime: Runtime) {
    const r = runtime.repositories;
    const p = runtime.providers;
    const s = runtime.services;
    const changeOrderStatusUseCase = new ChangeOrderStatusUseCase(
        r.order,
        r.feature,
    );

    return {
        order: new OrderController(
            new CreateOrderUseCase(
                r.order,
                new GetCartUseCase(r.cart),
                new ClearCartUseCase(r.cart),
                new ValidateCouponUseCase(r.coupon),
                r.product,
                r.user,
                s.email,
                r.feature,
                p.config,
                p.logger,
            ),
            new GetOrderUseCase(r.order),
            new GetUserOrdersUseCase(r.order),
            new GetOrdersPaginatedUseCase(r.order),
            changeOrderStatusUseCase,
            new UpdateOrderUseCase(r.order, changeOrderStatusUseCase),
            new GetOrderStatusesUseCase(),
            new GetOrderStatsUseCase(r.order),
        ),
        cart: new CartController(
            new GetCartUseCase(r.cart),
            new AddToCartUseCase(r.cart, r.product),
            new CreateCartUseCase(r.cart),
            new RemoveFromCartUseCase(r.cart, p.logger),
            new ChangeAmountUseCase(r.cart),
            new ClearCartUseCase(r.cart),
            new GetCartStatsUseCase(r.cart),
        ),
        loyalty: new LoyaltyController(
            new GetCustomerLoyaltySummaryUseCase(
                r.loyalty,
                r.tenant,
                r.feature,
            ),
            new ClaimLoyaltyRewardUseCase(r.loyalty, r.tenant, r.feature),
            new GetLoyaltyCampaignsUseCase(r.loyalty, r.tenant, r.feature),
            new CreateLoyaltyCampaignUseCase(r.loyalty, r.tenant, r.feature),
            new UpdateLoyaltyCampaignUseCase(r.loyalty, r.tenant, r.feature),
            new TransitionLoyaltyCampaignUseCase(
                r.loyalty,
                r.tenant,
                r.feature,
            ),
            new GetTenantLoyaltyOverviewUseCase(r.loyalty, r.tenant, r.feature),
            new GetAllTenantsLoyaltyOverviewUseCase(r.loyalty, r.tenant),
        ),
    };
}
