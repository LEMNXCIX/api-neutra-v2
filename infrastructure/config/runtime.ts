import { checkDatabaseConnection, prisma } from "@/config/db.config";
import { ResolveAuthenticatedUserUseCase } from "@/core/application/auth/resolve-authenticated-user.use-case";
import { SweepAppointmentReviewsUseCase } from "@/core/application/booking/sweep-appointment-reviews.use-case";
import { SendNotificationUseCase } from "@/core/application/whatsapp/send-notification.use-case";
import { PrismaAppointmentRepository } from "../database/prisma/appointment.prisma-repository";
import { PrismaBannerRepository } from "../database/prisma/banner.prisma-repository";
import { PrismaCartRepository } from "../database/prisma/cart.prisma-repository";
import { PrismaCategoryRepository } from "../database/prisma/category.prisma-repository";
import { PrismaCouponRepository } from "../database/prisma/coupon.prisma-repository";
import { PrismaFeatureRepository } from "../database/prisma/feature.prisma-repository";
import { PrismaLogRepository } from "../database/prisma/log.prisma-repository";
import { PrismaLoyaltyRepository } from "../database/prisma/loyalty.prisma-repository";
import { PrismaOrderRepository } from "../database/prisma/order.prisma-repository";
import { PrismaPermissionRepository } from "../database/prisma/permission.prisma-repository";
import { PrismaProductRepository } from "../database/prisma/product.prisma-repository";
import { PrismaRoleRepository } from "../database/prisma/role.prisma-repository";
import { PrismaServiceRepository } from "../database/prisma/service.prisma-repository";
import { PrismaSlideRepository } from "../database/prisma/slide.prisma-repository";
import { PrismaStaffRepository } from "../database/prisma/staff.prisma-repository";
import { TenantPrismaRepository } from "../database/prisma/tenant.prisma-repository";
import { PrismaUserRepository } from "../database/prisma/user.prisma-repository";
import { WhatsAppConfigPrismaRepository } from "../database/prisma/whatsapp-config.prisma-repository";
import { WhatsAppConversationPrismaRepository } from "../database/prisma/whatsapp-conversation.prisma-repository";
import { WhatsAppMessagePrismaRepository } from "../database/prisma/whatsapp-message.prisma-repository";
import { BcryptProvider } from "../providers/bcrypt.provider";
import { BullMQQueueProvider } from "../providers/bullmq-queue.provider";
import { EmailProvider } from "../providers/email.notification.provider";
import { EnvConfigProvider } from "../providers/env-config.provider";
import { JwtProvider } from "../providers/jwt.provider";
import { NodeCryptoProvider } from "../providers/node-crypto.provider";
import { PinoLoggerProvider } from "../providers/pino-logger.provider";
import { PushProvider } from "../providers/push.provider";
import { RedisProvider } from "../providers/redis.provider";
import { UuidProvider } from "../providers/uuid.provider";
import { WhatsAppProvider } from "../providers/whatsapp.provider";
import { createEmailService } from "../services/email.service";
import { HealthService } from "../services/health.service";
import { createNotificationService } from "../services/notification.service";
import {
    createMaintenanceQueue,
    createNotificationQueue,
    redisOptions,
} from "../services/queue.service";
import { WhatsAppService } from "../services/whatsapp.service";
import { WhatsAppBotService } from "../services/whatsapp-bot.service";

/** Build the concrete application runtime as one explicit composition graph. */
export function createRuntime() {
    const repositories = {
        user: new PrismaUserRepository(),
        cart: new PrismaCartRepository(),
        role: new PrismaRoleRepository(),
        staff: new PrismaStaffRepository(),
        product: new PrismaProductRepository(),
        category: new PrismaCategoryRepository(),
        order: new PrismaOrderRepository(),
        coupon: new PrismaCouponRepository(),
        loyalty: new PrismaLoyaltyRepository(),
        feature: new PrismaFeatureRepository(),
        banner: new PrismaBannerRepository(),
        slide: new PrismaSlideRepository(),
        appointment: new PrismaAppointmentRepository(),
        service: new PrismaServiceRepository(),
        permission: new PrismaPermissionRepository(),
        tenant: new TenantPrismaRepository(),
        log: new PrismaLogRepository(prisma),
        whatsappConfig: new WhatsAppConfigPrismaRepository(prisma),
        whatsappMessage: new WhatsAppMessagePrismaRepository(prisma),
        whatsappConversation: new WhatsAppConversationPrismaRepository(prisma),
    };

    const connection = redisOptions;
    const queues = {
        notification: createNotificationQueue(connection),
        maintenance: createMaintenanceQueue(connection),
    };

    const logger = new PinoLoggerProvider();
    const providers = {
        config: new EnvConfigProvider(),
        logger,
        passwordHasher: new BcryptProvider(),
        tokenGenerator: new JwtProvider(),
        queue: new BullMQQueueProvider(queues.notification),
        cache: new RedisProvider(logger),
        uid: new UuidProvider(),
        crypto: new NodeCryptoProvider(),
    };

    const useCases = {
        resolveAuthenticatedUser: new ResolveAuthenticatedUserUseCase(
            providers.tokenGenerator,
            repositories.user,
            providers.cache,
        ),
        sweepAppointmentReviews: new SweepAppointmentReviewsUseCase(
            repositories.appointment,
            providers.logger,
            providers.config,
        ),
    };

    const email = createEmailService(providers.logger);
    const whatsapp = new WhatsAppService(
        repositories.whatsappConfig,
        repositories.whatsappMessage,
        providers.logger,
    );
    // Channel providers are wired explicitly and share the runtime graph.
    const notification = createNotificationService([
        new EmailProvider(email, providers.logger),
        new WhatsAppProvider(
            whatsapp,
            new SendNotificationUseCase(whatsapp),
            providers.logger,
        ),
        new PushProvider(),
    ]);
    const services = {
        email,
        notification,
        whatsapp,
        whatsappBot: new WhatsAppBotService(
            repositories.whatsappConversation,
            repositories.whatsappMessage,
            whatsapp,
            providers.logger,
        ),
    };

    const healthService = new HealthService(checkDatabaseConnection, () =>
        providers.cache.ping(),
    );

    return {
        database: { prisma, checkDatabaseConnection },
        connections: { redis: connection },
        queues,
        repositories,
        providers,
        services,
        useCases,
        healthService,
    };
}

export type Runtime = ReturnType<typeof createRuntime>;
