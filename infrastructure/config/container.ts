import { PrismaUserRepository } from '../database/prisma/user.prisma-repository';
import { PrismaCartRepository } from '../database/prisma/cart.prisma-repository';
import { PrismaRoleRepository } from '../database/prisma/role.prisma-repository';
import { PrismaStaffRepository } from '../database/prisma/staff.prisma-repository';
import { PrismaProductRepository } from '../database/prisma/product.prisma-repository';
import { PrismaCategoryRepository } from '../database/prisma/category.prisma-repository';
import { PrismaOrderRepository } from '../database/prisma/order.prisma-repository';
import { PrismaCouponRepository } from '../database/prisma/coupon.prisma-repository';
import { PrismaFeatureRepository } from '../database/prisma/feature.prisma-repository';
import { PrismaBannerRepository } from '../database/prisma/banner.prisma-repository';
import { PrismaSlideRepository } from '../database/prisma/slide.prisma-repository';
import { PrismaAppointmentRepository } from '../database/prisma/appointment.prisma-repository';
import { PrismaServiceRepository } from '../database/prisma/service.prisma-repository';
import { PrismaPermissionRepository } from '../database/prisma/permission.prisma-repository';
import { TenantPrismaRepository } from '../database/prisma/tenant.prisma-repository';
import { PrismaLogRepository } from '../database/prisma/log.prisma-repository';
import { WhatsAppConfigPrismaRepository } from '../database/prisma/whatsapp-config.prisma-repository';
import { WhatsAppMessagePrismaRepository } from '../database/prisma/whatsapp-message.prisma-repository';
import { WhatsAppConversationPrismaRepository } from '../database/prisma/whatsapp-conversation.prisma-repository';

import { UserController } from '@/interface-adapters/controllers/user.controller';
import { AuthController } from '@/interface-adapters/controllers/auth.controller';
import { ProductController } from '@/interface-adapters/controllers/product.controller';
import { CategoryController } from '@/interface-adapters/controllers/category.controller';
import { OrderController } from '@/interface-adapters/controllers/order.controller';
import { CartController } from '@/interface-adapters/controllers/cart.controller';
import { BannerController } from '@/interface-adapters/controllers/banner.controller';
import { CouponController } from '@/interface-adapters/controllers/coupon.controller';
import { FeatureController } from '@/interface-adapters/controllers/feature.controller';
import { SlideController } from '@/interface-adapters/controllers/slide.controller';
import { AppointmentController } from '@/interface-adapters/controllers/appointment.controller';
import { StaffController } from '@/interface-adapters/controllers/staff.controller';
import { ServiceController } from '@/interface-adapters/controllers/service.controller';
import { RoleController } from '@/interface-adapters/controllers/role.controller';
import { PermissionController } from '@/interface-adapters/controllers/permission.controller';
import { TenantController } from '@/interface-adapters/controllers/tenant.controller';
import { LogController } from '@/interface-adapters/controllers/log.controller';
import { WhatsAppWebhookController } from '@/infrastructure/webhooks/whatsapp-webhook.controller';
import { WhatsAppConfigController } from '@/interface-adapters/controllers/whatsapp-config.controller';
import { WhatsAppController } from '@/interface-adapters/controllers/whatsapp.controller';

// Use Cases - Users
import { GetAllUsersUseCase } from '@/core/application/users/get-all-users.use-case';
import { GetUserByIdUseCase } from '@/core/application/users/get-user-by-id.use-case';
import { GetUserByEmailUseCase } from '@/core/application/users/get-user-by-email.use-case';
import { GetUsersStatsUseCase } from '@/core/application/users/get-users-stats.use-case';
import { GetUsersSummaryStatsUseCase } from '@/core/application/users/get-users-summary-stats.use-case';
import { CreateUserUseCase } from '@/core/application/users/create-user.use-case';
import { GetOrCreateByProviderUseCase } from '@/core/application/users/get-or-create-by-provider.use-case';
import { UpdateUserUseCase } from '@/core/application/users/update-user.use-case';
import { DeleteUserUseCase } from '@/core/application/users/delete-user.use-case';
import { AssignRoleToUserUseCase } from '@/core/application/users/assign-role.use-case';

// Use Cases - Auth
import { LoginUseCase } from '@/core/application/auth/login.use-case';
import { RegisterUseCase } from '@/core/application/auth/register.use-case';
import { SocialLoginUseCase } from '@/core/application/auth/social-login.use-case';
import { ForgotPasswordUseCase } from '@/core/application/auth/forgot-password.use-case';
import { ResetPasswordUseCase } from '@/core/application/auth/reset-password.use-case';

// Use Cases - Products
import { GetAllProductsUseCase } from '@/core/application/products/get-all-products.use-case';
import { GetProductUseCase } from '@/core/application/products/get-product.use-case';
import { CreateProductUseCase } from '@/core/application/products/create-product.use-case';
import { UpdateProductUseCase } from '@/core/application/products/update-product.use-case';
import { DeleteProductUseCase } from '@/core/application/products/delete-product.use-case';
import { SearchProductsUseCase } from '@/core/application/products/search-products.use-case';
import { GetProductStatsUseCase } from '@/core/application/products/get-product-stats.use-case';
import { GetProductSummaryStatsUseCase } from '@/core/application/products/get-product-summary-stats.use-case';

// Use Cases - Order
import { CreateOrderUseCase } from '@/core/application/order/create-order.use-case';
import { GetOrderUseCase } from '@/core/application/order/get-order.use-case';
import { GetUserOrdersUseCase } from '@/core/application/order/get-user-orders.use-case';
import { GetAllOrdersUseCase } from '@/core/application/order/get-all-orders.use-case';
import { GetOrdersPaginatedUseCase } from '@/core/application/order/get-orders-paginated.use-case';
import { ChangeOrderStatusUseCase } from '@/core/application/order/change-order-status.use-case';
import { UpdateOrderUseCase } from '@/core/application/order/update-order.use-case';
import { GetOrderStatusesUseCase } from '@/core/application/order/get-order-statuses.use-case';
import { GetOrderStatsUseCase } from '@/core/application/order/get-order-stats.use-case';

// Use Cases - Cart
import { GetCartUseCase } from '@/core/application/cart/get-cart.use-case';
import { AddToCartUseCase } from '@/core/application/cart/add-to-cart.use-case';
import { CreateCartUseCase } from '@/core/application/cart/create-cart.use-case';
import { RemoveFromCartUseCase } from '@/core/application/cart/remove-from-cart.use-case';
import { ChangeAmountUseCase } from '@/core/application/cart/change-amount.use-case';
import { ClearCartUseCase } from '@/core/application/cart/clear-cart.use-case';
import { GetCartStatsUseCase } from '@/core/application/cart/get-cart-stats.use-case';

// Use Cases - Categories
import { CreateCategoryUseCase } from '@/core/application/categories/create-category.use-case';
import { GetCategoriesUseCase } from '@/core/application/categories/get-categories.use-case';
import { UpdateCategoryUseCase } from '@/core/application/categories/update-category.use-case';
import { DeleteCategoryUseCase } from '@/core/application/categories/delete-category.use-case';
import { GetCategoryStatsUseCase } from '@/core/application/categories/get-category-stats.use-case';

// Use Cases - Banners
import { CreateBannerUseCase } from '@/core/application/banners/create-banner.use-case';
import { GetBannersUseCase } from '@/core/application/banners/get-banners.use-case';
import { UpdateBannerUseCase } from '@/core/application/banners/update-banner.use-case';
import { DeleteBannerUseCase } from '@/core/application/banners/delete-banner.use-case';
import { TrackBannerAnalyticsUseCase } from '@/core/application/banners/track-banner-analytics.use-case';
import { GetBannerStatsUseCase } from '@/core/application/banners/get-banner-stats.use-case';

// Use Cases - Coupons
import { CreateCouponUseCase } from '@/core/application/coupons/create-coupon.use-case';
import { GetCouponsUseCase } from '@/core/application/coupons/get-coupons.use-case';
import { GetCouponsPaginatedUseCase } from '@/core/application/coupons/get-coupons-paginated.use-case';
import { UpdateCouponUseCase } from '@/core/application/coupons/update-coupon.use-case';
import { DeleteCouponUseCase } from '@/core/application/coupons/delete-coupon.use-case';
import { ValidateCouponUseCase } from '@/core/application/coupons/validate-coupon.use-case';
import { GetCouponStatsUseCase } from '@/core/application/coupons/get-coupon-stats.use-case';

// Use Cases - Feature
import { GetFeaturesUseCase } from '@/core/application/feature/get-features.use-case';
import { CreateFeatureUseCase } from '@/core/application/feature/create-feature.use-case';
import { UpdateFeatureUseCase } from '@/core/application/feature/update-feature.use-case';
import { DeleteFeatureUseCase } from '@/core/application/feature/delete-feature.use-case';

// Use Cases - Slide
import { CreateSlideUseCase } from '@/core/application/slide/create-slide.use-case';
import { UpdateSlideUseCase } from '@/core/application/slide/update-slide.use-case';
import { GetSlidesUseCase } from '@/core/application/slide/get-slides.use-case';
import { DeleteSlideUseCase } from '@/core/application/slide/delete-slide.use-case';
import { GetSliderStatsUseCase } from '@/core/application/slide/get-slider-stats.use-case';

// Use Cases - Booking
import { CreateAppointmentUseCase } from '@/core/application/booking/create-appointment.use-case';
import { GetAppointmentsUseCase } from '@/core/application/booking/get-appointments.use-case';
import { GetAvailabilityUseCase } from '@/core/application/booking/get-availability.use-case';
import { UpdateAppointmentStatusUseCase } from '@/core/application/booking/update-appointment-status.use-case';
import { DeleteAppointmentUseCase } from '@/core/application/booking/delete-appointment.use-case';
import { CreateServiceUseCase } from '@/core/application/booking/create-service.use-case';
import { GetServicesUseCase } from '@/core/application/booking/get-services.use-case';
import { UpdateServiceUseCase } from '@/core/application/booking/update-service.use-case';
import { DeleteServiceUseCase } from '@/core/application/booking/delete-service.use-case';
import { CreateStaffUseCase } from '@/core/application/booking/create-staff.use-case';
import { GetStaffUseCase } from '@/core/application/booking/get-staff.use-case';
import { UpdateStaffUseCase } from '@/core/application/booking/update-staff.use-case';
import { DeleteStaffUseCase } from '@/core/application/booking/delete-staff.use-case';

// Use Cases - Role
import { CreateRoleUseCase } from '@/core/application/roles/create-role.use-case';
import { GetRolesUseCase } from '@/core/application/roles/get-roles.use-case';
import { UpdateRoleUseCase } from '@/core/application/roles/update-role.use-case';
import { DeleteRoleUseCase } from '@/core/application/roles/delete-role.use-case';
import { GetRolesPaginatedUseCase } from '@/core/application/roles/get-roles-paginated.use-case';

// Use Cases - Permission
import { CreatePermissionUseCase } from '@/core/application/permissions/create-permission.use-case';
import { GetPermissionsUseCase } from '@/core/application/permissions/get-permissions.use-case';
import { UpdatePermissionUseCase } from '@/core/application/permissions/update-permission.use-case';
import { DeletePermissionUseCase } from '@/core/application/permissions/delete-permission.use-case';
import { GetPermissionsPaginatedUseCase } from '@/core/application/permissions/get-permissions-paginated.use-case';

// Use Cases - Tenant
import { CreateTenantUseCase } from '@/core/application/tenant/create-tenant.use-case';
import { GetTenantsUseCase } from '@/core/application/tenant/get-tenants.use-case';
import { GetTenantByIdUseCase } from '@/core/application/tenant/get-tenant-by-id.use-case';
import { GetTenantBySlugUseCase } from '@/core/application/tenant/get-tenant-by-slug.use-case';
import { UpdateTenantUseCase } from '@/core/application/tenant/update-tenant.use-case';
import { DeleteTenantUseCase } from '@/core/application/tenant/delete-tenant.use-case';
import { GetTenantFeaturesUseCase } from '@/core/application/tenant/get-tenant-features.use-case';
import { UpdateTenantFeaturesUseCase } from '@/core/application/tenant/update-tenant-features.use-case';

// Use Cases - WhatsApp
import { ProcessIncomingMessageUseCase } from '@/core/application/whatsapp/process-incoming-message.use-case';
import { ConfigureWhatsAppUseCase } from '@/core/application/whatsapp/configure-whatsapp.use-case';
import { SendNotificationUseCase } from '@/core/application/whatsapp/send-notification.use-case';

import { BcryptProvider } from '../providers/bcrypt.provider';
import { JwtProvider } from '../providers/jwt.provider';
import { PinoLoggerProvider } from '../providers/pino-logger.provider';
import { BullMQQueueProvider } from '../providers/bullmq-queue.provider';
import { emailService } from '../services/email.service';
import { prisma } from '@/config/db.config';
import { WhatsAppService } from '../services/whatsapp.service';
import { WhatsAppBotService } from '../services/whatsapp-bot.service';

/**
 * Container is the Composition Root for the application.
 */
export class Container {
  // Repositories (Singletons)
  private static userRepository = new PrismaUserRepository();
  private static cartRepository = new PrismaCartRepository();
  private static roleRepository = new PrismaRoleRepository();
  private static staffRepository = new PrismaStaffRepository();
  private static productRepository = new PrismaProductRepository();
  private static categoryRepository = new PrismaCategoryRepository();
  private static orderRepository = new PrismaOrderRepository();
  private static couponRepository = new PrismaCouponRepository();
  private static featureRepository = new PrismaFeatureRepository();
  private static bannerRepository = new PrismaBannerRepository();
  private static slideRepository = new PrismaSlideRepository();
  private static appointmentRepository = new PrismaAppointmentRepository();
  private static serviceRepository = new PrismaServiceRepository();
  private static permissionRepository = new PrismaPermissionRepository();
  private static tenantRepository = new TenantPrismaRepository();
  private static logRepository = new PrismaLogRepository(prisma);
  private static whatsappConfigRepo = new WhatsAppConfigPrismaRepository(prisma);
  private static whatsappMessageRepo = new WhatsAppMessagePrismaRepository(prisma);
  private static whatsappConversationRepo = new WhatsAppConversationPrismaRepository(prisma);

  // Providers (Singletons)
  private static passwordHasher = new BcryptProvider();
  private static tokenGenerator = new JwtProvider();
  private static logger = new PinoLoggerProvider();
  private static queueProvider = new BullMQQueueProvider();

  // Shared Services
  private static whatsappService = new WhatsAppService(this.whatsappConfigRepo, this.whatsappMessageRepo);
  private static whatsappBotService = new WhatsAppBotService(this.whatsappConversationRepo, this.whatsappMessageRepo, this.whatsappService);

  // Controllers (Factory methods)
  public static getUserController(): UserController {
    return new UserController(
      new GetAllUsersUseCase(this.userRepository),
      new GetUserByIdUseCase(this.userRepository),
      new GetUserByEmailUseCase(this.userRepository),
      new GetUsersStatsUseCase(this.userRepository),
      new GetUsersSummaryStatsUseCase(this.userRepository),
      new CreateUserUseCase(this.userRepository, this.cartRepository),
      new GetOrCreateByProviderUseCase(this.userRepository, this.cartRepository),
      new UpdateUserUseCase(this.userRepository),
      new DeleteUserUseCase(this.userRepository),
      new AssignRoleToUserUseCase(this.userRepository, this.roleRepository, this.staffRepository)
    );
  }

  public static getAuthController(): AuthController {
    return new AuthController(
      new LoginUseCase(this.userRepository, this.passwordHasher, this.tokenGenerator, this.logger),
      new RegisterUseCase(this.userRepository, this.passwordHasher, this.tokenGenerator, this.logger, this.queueProvider),
      new SocialLoginUseCase(this.userRepository, this.tokenGenerator),
      new ForgotPasswordUseCase(this.userRepository, this.logger, this.queueProvider),
      new ResetPasswordUseCase(this.userRepository, this.passwordHasher, this.logger)
    );
  }

  public static getProductController(): ProductController {
    return new ProductController(
      new GetAllProductsUseCase(this.productRepository),
      new GetProductUseCase(this.productRepository),
      new CreateProductUseCase(this.productRepository),
      new UpdateProductUseCase(this.productRepository),
      new DeleteProductUseCase(this.productRepository),
      new SearchProductsUseCase(this.productRepository),
      new GetProductStatsUseCase(this.productRepository),
      new GetProductSummaryStatsUseCase(this.productRepository)
    );
  }

  public static getCategoryController(): CategoryController {
    return new CategoryController(
      new CreateCategoryUseCase(this.categoryRepository),
      new GetCategoriesUseCase(this.categoryRepository),
      new UpdateCategoryUseCase(this.categoryRepository),
      new DeleteCategoryUseCase(this.categoryRepository),
      new GetCategoryStatsUseCase(this.categoryRepository)
    );
  }

  public static getOrderController(): OrderController {
    return new OrderController(
      new CreateOrderUseCase(
        this.orderRepository,
        new GetCartUseCase(this.cartRepository),
        new ClearCartUseCase(this.cartRepository),
        this.productRepository,
        this.couponRepository,
        this.userRepository,
        this.logger,
        emailService,
        this.featureRepository
      ),
      new GetOrderUseCase(this.orderRepository),
      new GetUserOrdersUseCase(this.orderRepository),
      new GetAllOrdersUseCase(this.orderRepository),
      new GetOrdersPaginatedUseCase(this.orderRepository),
      new ChangeOrderStatusUseCase(this.orderRepository, this.logger),
      new UpdateOrderUseCase(this.orderRepository, this.logger),
      new GetOrderStatusesUseCase(),
      new GetOrderStatsUseCase(this.orderRepository),
      this.logger
    );
  }

  public static getCartController(): CartController {
    return new CartController(
      new GetCartUseCase(this.cartRepository),
      new AddToCartUseCase(this.cartRepository, this.productRepository),
      new CreateCartUseCase(this.cartRepository),
      new RemoveFromCartUseCase(this.cartRepository),
      new ChangeAmountUseCase(this.cartRepository),
      new ClearCartUseCase(this.cartRepository),
      new GetCartStatsUseCase(this.cartRepository)
    );
  }

  public static getBannerController(): BannerController {
    return new BannerController(
      new CreateBannerUseCase(this.bannerRepository),
      new GetBannersUseCase(this.bannerRepository),
      new UpdateBannerUseCase(this.bannerRepository),
      new DeleteBannerUseCase(this.bannerRepository),
      new TrackBannerAnalyticsUseCase(this.bannerRepository),
      new GetBannerStatsUseCase(this.bannerRepository)
    );
  }

  public static getCouponController(): CouponController {
    return new CouponController(
      new CreateCouponUseCase(this.couponRepository),
      new GetCouponsUseCase(this.couponRepository),
      new GetCouponsPaginatedUseCase(this.couponRepository),
      new UpdateCouponUseCase(this.couponRepository),
      new DeleteCouponUseCase(this.couponRepository),
      new ValidateCouponUseCase(this.couponRepository),
      new GetCouponStatsUseCase(this.couponRepository)
    );
  }

  public static getFeatureController(): FeatureController {
    return new FeatureController(
      new GetFeaturesUseCase(this.featureRepository),
      new CreateFeatureUseCase(this.featureRepository, this.logger),
      new UpdateFeatureUseCase(this.featureRepository, this.logger),
      new DeleteFeatureUseCase(this.featureRepository, this.logger),
      this.logger
    );
  }

  public static getSlideController(): SlideController {
    return new SlideController(
      new CreateSlideUseCase(this.slideRepository),
      new UpdateSlideUseCase(this.slideRepository),
      new GetSlidesUseCase(this.slideRepository),
      new DeleteSlideUseCase(this.slideRepository),
      new GetSliderStatsUseCase(this.slideRepository)
    );
  }

  public static getAppointmentController(): AppointmentController {
    return new AppointmentController(
      new CreateAppointmentUseCase(
        this.appointmentRepository,
        this.staffRepository,
        this.serviceRepository,
        this.couponRepository,
        this.logger,
        this.queueProvider,
        this.featureRepository
      ),
      new GetAppointmentsUseCase(this.appointmentRepository, this.logger),
      new GetAvailabilityUseCase(
        this.appointmentRepository,
        this.staffRepository,
        this.serviceRepository,
        this.logger
      ),
      new UpdateAppointmentStatusUseCase(this.appointmentRepository, this.logger, this.queueProvider, this.featureRepository),
      new DeleteAppointmentUseCase(this.appointmentRepository, this.logger),
      this.appointmentRepository,
      this.featureRepository,
      this.queueProvider,
      this.logger
    );
  }

  public static getStaffController(): StaffController {
    return new StaffController(
      new CreateStaffUseCase(this.staffRepository, this.userRepository, this.logger),
      new GetStaffUseCase(this.staffRepository, this.logger),
      new UpdateStaffUseCase(this.staffRepository, this.userRepository, this.logger),
      new DeleteStaffUseCase(this.staffRepository, this.logger),
      this.staffRepository,
      this.logger
    );
  }

  public static getServiceController(): ServiceController {
    return new ServiceController(
      new CreateServiceUseCase(this.serviceRepository, this.categoryRepository, this.logger),
      new GetServicesUseCase(this.serviceRepository, this.logger),
      new UpdateServiceUseCase(this.serviceRepository, this.categoryRepository, this.logger),
      new DeleteServiceUseCase(this.serviceRepository, this.logger)
    );
  }

  public static getRoleController(): RoleController {
    return new RoleController(
      new CreateRoleUseCase(this.roleRepository),
      new GetRolesUseCase(this.roleRepository),
      new UpdateRoleUseCase(this.roleRepository, this.userRepository),
      new DeleteRoleUseCase(this.roleRepository),
      new GetRolesPaginatedUseCase(this.roleRepository)
    );
  }

  public static getPermissionController(): PermissionController {
    return new PermissionController(
      new CreatePermissionUseCase(this.permissionRepository),
      new GetPermissionsUseCase(this.permissionRepository),
      new UpdatePermissionUseCase(this.permissionRepository),
      new DeletePermissionUseCase(this.permissionRepository),
      new GetPermissionsPaginatedUseCase(this.permissionRepository)
    );
  }

  public static getTenantController(): TenantController {
    return new TenantController(
      new CreateTenantUseCase(this.tenantRepository, this.userRepository, this.logger),
      new GetTenantsUseCase(this.tenantRepository, this.logger),
      new GetTenantByIdUseCase(this.tenantRepository, this.logger),
      new GetTenantBySlugUseCase(this.tenantRepository, this.logger),
      new UpdateTenantUseCase(this.tenantRepository, this.logger),
      new DeleteTenantUseCase(this.tenantRepository, this.logger),
      new GetTenantFeaturesUseCase(this.featureRepository),
      new UpdateTenantFeaturesUseCase(this.featureRepository)
    );
  }

  public static getLogController(): LogController {
    return new LogController(this.logRepository, this.logger);
  }

  public static getWhatsAppWebhookController(): WhatsAppWebhookController {
    return new WhatsAppWebhookController(
      new ProcessIncomingMessageUseCase(this.whatsappBotService, this.whatsappConfigRepo),
      this.whatsappMessageRepo
    );
  }

  public static getWhatsAppConfigController(): WhatsAppConfigController {
    return new WhatsAppConfigController(
      new ConfigureWhatsAppUseCase(this.whatsappConfigRepo, this.featureRepository),
      this.whatsappConfigRepo
    );
  }

  public static getWhatsAppController(): WhatsAppController {
    return new WhatsAppController(
      new SendNotificationUseCase(this.whatsappService)
    );
  }
}
