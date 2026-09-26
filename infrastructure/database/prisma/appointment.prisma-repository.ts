import {
    Appointment as PrismaAppointment,
    AppointmentStatus as PrismaAppointmentStatus,
    Prisma,
} from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    IAppointmentRepository,
    AppointmentCreateData,
    AppointmentUpdateData,
    AppointmentFilters,
    AppointmentStatusUpdate,
    AppointmentReviewCandidate,
    AppointmentReviewCandidateQuery,
} from "@/core/repositories/appointment.repository.interface";
import {
    Appointment,
    AppointmentStatus,
} from "@/core/entities/appointment.entity";
import {
    assertCouponRedeemable,
    assertCouponsFeatureEnabled,
    toRedeemableCoupon,
} from "@/core/domain/coupon/coupon.policy";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyLedgerEntryType,
    LoyaltySourceType,
} from "@/core/entities/loyalty.entity";
import {
    getLoyaltyCampaignContributionValue,
    getLoyaltyCampaignSource,
} from "@/core/domain/loyalty/loyalty.policy";
import {
    BusinessRuleViolationError,
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";
import { extractTenantTimezone } from "@/core/utils/tenant-time";

type AppointmentStatusAuditFields = {
    statusChangedAt?: Date | null;
    statusChangeReason?: string | null;
    statusChangedById?: string | null;
};

type AppointmentWithIncludes = Prisma.AppointmentGetPayload<{
    include: { user: true; service: true; staff: true; coupon: true; tenant: true };
}> &
    AppointmentStatusAuditFields;

type AppointmentWithCoupon = Prisma.AppointmentGetPayload<{
    include: { coupon: true };
}> &
    AppointmentStatusAuditFields;

type AppointmentBase = PrismaAppointment & AppointmentStatusAuditFields;

export class PrismaAppointmentRepository implements IAppointmentRepository {
    private mapToEntity(
        appointment:
            | AppointmentWithIncludes
            | AppointmentWithCoupon
            | AppointmentBase,
    ): Appointment {
        const included = appointment as AppointmentWithIncludes;
        return {
            id: appointment.id,
            userId: appointment.userId,
            serviceId: appointment.serviceId,
            staffId: appointment.staffId,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status as AppointmentStatus,
            statusChangedAt: appointment.statusChangedAt ?? undefined,
            statusChangeReason: appointment.statusChangeReason ?? undefined,
            statusChangedById: appointment.statusChangedById ?? undefined,
            notes: appointment.notes ?? undefined,
            cancellationReason: appointment.cancellationReason ?? undefined,
            confirmationSent: appointment.confirmationSent,
            reminderSent: appointment.reminderSent,
            tenantId: appointment.tenantId,
            createdAt: appointment.createdAt,
            updatedAt: appointment.updatedAt,
            couponId: appointment.couponId ?? undefined,
            discountAmount: appointment.discountAmount ?? 0,
            subtotal: appointment.subtotal ?? 0,
            total: appointment.total ?? 0,
            user: included.user
                ? {
                      id: included.user.id,
                      name: included.user.name,
                      email: included.user.email,
                      phone: included.user.phone ?? undefined,
                      pushToken: included.user.pushToken ?? undefined,
                  }
                : undefined,
            service: included.service
                ? {
                      id: included.service.id,
                      name: included.service.name,
                      duration: included.service.duration,
                      price: included.service.price,
                  }
                : undefined,
            staff: included.staff
                ? {
                      id: included.staff.id,
                      name: included.staff.name,
                      email: included.staff.email ?? undefined,
                      avatar: included.staff.avatar ?? undefined,
                  }
                : undefined,
            tenant: included.tenant
                ? {
                      id: included.tenant.id,
                      name: included.tenant.name,
                      slug: included.tenant.slug,
                  }
                : undefined,
            coupon:
                included.coupon || (appointment as AppointmentWithCoupon).coupon
                    ? {
                          id: (included.coupon ||
                              (appointment as AppointmentWithCoupon).coupon)!
                              .id,
                          code: (included.coupon ||
                              (appointment as AppointmentWithCoupon).coupon)!
                              .code,
                          type: (included.coupon ||
                              (appointment as AppointmentWithCoupon).coupon)!
                              .type as string,
                          value: (included.coupon ||
                              (appointment as AppointmentWithCoupon).coupon)!
                              .value,
                      }
                    : undefined,
        };
    }

    async create(
        tenantId: string,
        data: AppointmentCreateData,
    ): Promise<Appointment> {
        const service = await prisma.service.findUnique({
            where: { id: data.serviceId },
            select: { duration: true },
        });

        if (!service) {
            throw new EntityNotFoundError("Service", data.serviceId);
        }

        const endTime = new Date(data.startTime);
        endTime.setMinutes(endTime.getMinutes() + service.duration);

        const baseAppointmentData = {
            tenantId,
            userId: data.userId,
            serviceId: data.serviceId,
            staffId: data.staffId,
            startTime: data.startTime,
            endTime,
            notes: data.notes,
            status: "PENDING" as PrismaAppointmentStatus,
            statusChangedAt: new Date(),
            statusChangedById: data.statusChangedById,
            couponId: data.couponId,
            discountAmount: data.discountAmount ?? 0,
            subtotal: data.subtotal ?? 0,
            total: data.total ?? 0,
        };
        const createAppointment = (
            client: Pick<Prisma.TransactionClient, "appointment">,
            values: typeof baseAppointmentData = baseAppointmentData,
        ) => client.appointment.create({ data: values });

        const couponId = data.couponId;
        try {
            const appointment = couponId
                ? await prisma.$transaction(async (tx) => {
                      const coupon = await tx.coupon.findFirst({
                          where: { id: couponId, tenantId },
                      });
                      if (!coupon) {
                          throw new EntityNotFoundError("Coupon", couponId);
                      }
                      assertCouponRedeemable(
                          toRedeemableCoupon(coupon),
                          data.userId,
                      );
                      if (
                          coupon.applicableServices.length > 0 &&
                          !coupon.applicableServices.includes(data.serviceId)
                      ) {
                          throw new BusinessRuleViolationError(
                              "Coupon not applicable to this service",
                          );
                      }
                      if (
                          coupon.applicableServices.length === 0 &&
                          (coupon.applicableProducts.length > 0 ||
                              coupon.applicableCategories.length > 0)
                      ) {
                          throw new BusinessRuleViolationError(
                              "Coupon is only applicable to products",
                          );
                      }

                      const service = await tx.service.findFirst({
                          where: { id: data.serviceId, tenantId },
                          select: { price: true },
                      });
                      if (!service) {
                          throw new EntityNotFoundError(
                              "Service",
                              data.serviceId,
                          );
                      }
                      const subtotal = new Prisma.Decimal(service.price);
                      if (
                          coupon.minPurchaseAmount !== null &&
                          subtotal.lessThan(coupon.minPurchaseAmount)
                      ) {
                          throw new BusinessRuleViolationError(
                              `Minimum purchase amount of $${coupon.minPurchaseAmount} required`,
                          );
                      }

                      let discountAmount =
                          coupon.type === "PERCENT"
                              ? subtotal.mul(coupon.value).div(100)
                              : new Prisma.Decimal(coupon.value);
                      if (
                          coupon.maxDiscountAmount !== null &&
                          discountAmount.greaterThan(coupon.maxDiscountAmount)
                      ) {
                          discountAmount = new Prisma.Decimal(
                              coupon.maxDiscountAmount,
                          );
                      }
                      if (discountAmount.greaterThan(subtotal)) {
                          discountAmount = subtotal;
                      }
                      const total = subtotal.minus(discountAmount);
                      const appointmentData = {
                          ...baseAppointmentData,
                          discountAmount: discountAmount.toNumber(),
                          subtotal: subtotal.toNumber(),
                          total: total.toNumber(),
                      };

                      const couponsEnabled =
                          await tx.tenantFeature.findFirst({
                              where: {
                                  tenantId,
                                  enabled: true,
                                  feature: { key: "COUPONS" },
                              },
                              select: { id: true },
                          });
                      assertCouponsFeatureEnabled(couponsEnabled !== null);

                      const usage = await tx.coupon.updateMany({
                          where: {
                              id: coupon.id,
                              tenantId,
                              usageCount: coupon.usageCount,
                              usageLimit: coupon.usageLimit,
                              updatedAt: coupon.updatedAt,
                              active: true,
                              expiresAt: { gt: new Date() },
                              isLoyaltyTemplate: false,
                              ...(coupon.isReward
                                  ? {
                                        ownerId: data.userId,
                                        isReward: true,
                                    }
                                  : {
                                        isReward: false,
                                        OR: [
                                            { ownerId: null },
                                            { ownerId: data.userId },
                                        ],
                                    }),
                          },
                          data: { usageCount: { increment: 1 } },
                      });
                      if (usage.count === 0) {
                          throw new BusinessRuleViolationError(
                              "The coupon is not available for this appointment",
                              "COUPON_UNAVAILABLE",
                          );
                      }
                      return createAppointment(tx, appointmentData);
                  })
                : await createAppointment(prisma);

            return this.mapToEntity(appointment);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "id";
                throw new DuplicateEntityError("Appointment", target, "");
            }
            throw error;
        }
    }

    async findById(
        tenantId: string,
        id: string,
        includeRelations: boolean = false,
    ): Promise<Appointment | null> {
        const appointment = await prisma.appointment.findFirst({
            where: { id, tenantId },
            include: includeRelations
                ? {
                      user: true,
                      service: true,
                      staff: true,
                      coupon: true,
                  }
                : undefined,
        });

        return appointment ? this.mapToEntity(appointment) : null;
    }

    async findAll(
        tenantId: string | undefined,
        filters?: AppointmentFilters,
    ): Promise<Appointment[]> {
        const appointments = await prisma.appointment.findMany({
            where: this.buildWhere(tenantId, filters),
            include: {
                user: true,
                service: true,
                staff: true,
                coupon: true,
                tenant: true,
            },
            orderBy: { startTime: "asc" },
        });

        return appointments.map((a) => this.mapToEntity(a));
    }

    async findAllPaginated(
        tenantId: string | undefined,
        filters: AppointmentFilters | undefined,
        page: number,
        limit: number,
    ): Promise<{ appointments: Appointment[]; total: number }> {
        const where = this.buildWhere(tenantId, filters);
        const [appointments, total] = await Promise.all([
            prisma.appointment.findMany({
                where,
                include: {
                    user: true,
                    service: true,
                    staff: true,
                    coupon: true,
                    tenant: true,
                },
                orderBy: { startTime: "asc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.appointment.count({ where }),
        ]);

        return { appointments: appointments.map((a) => this.mapToEntity(a)), total };
    }

    private buildWhere(
        tenantId: string | undefined,
        filters?: AppointmentFilters,
    ): Prisma.AppointmentWhereInput {
        return {
            ...(tenantId && { tenantId }),
            ...(filters?.userId && { userId: filters.userId }),
            ...(filters?.staffId && { staffId: filters.staffId }),
            ...(filters?.serviceId && { serviceId: filters.serviceId }),
            ...(filters?.status && {
                status: filters.status as PrismaAppointmentStatus,
            }),
            ...(filters?.startDate &&
                filters?.endDate && {
                    startTime: {
                        gte: filters.startDate,
                        lte: filters.endDate,
                    },
                }),
        };
    }

    async findByUser(tenantId: string, userId: string): Promise<Appointment[]> {
        return this.findAll(tenantId, { userId });
    }

    async findByStaff(
        tenantId: string,
        staffId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<Appointment[]> {
        return this.findAll(tenantId, { staffId, startDate, endDate });
    }

    async update(
        tenantId: string,
        id: string,
        data: AppointmentUpdateData,
    ): Promise<Appointment> {
        const updateData: Prisma.AppointmentUpdateInput = {};

        if (data.startTime !== undefined) updateData.startTime = data.startTime;
        if (data.serviceId !== undefined)
            updateData.service = { connect: { id: data.serviceId } };
        if (data.staffId !== undefined)
            updateData.staff = { connect: { id: data.staffId } };
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.cancellationReason !== undefined)
            updateData.cancellationReason = data.cancellationReason;

        if (data.startTime || data.serviceId) {
            const serviceId =
                data.serviceId ||
                (
                    await prisma.appointment.findUnique({
                        where: { id },
                        select: { serviceId: true },
                    })
                )?.serviceId;

            if (serviceId) {
                const service = await prisma.service.findUnique({
                    where: { id: serviceId },
                    select: { duration: true },
                });

                if (service) {
                    const startTime =
                        data.startTime ||
                        (
                            await prisma.appointment.findUnique({
                                where: { id },
                                select: { startTime: true },
                            })
                        )?.startTime;

                    if (startTime) {
                        const endTime = new Date(startTime);
                        endTime.setMinutes(
                            endTime.getMinutes() + service.duration,
                        );
                        updateData.endTime = endTime;
                    }
                }
            }
        }

        try {
            const appointment = await prisma.appointment.update({
                where: { id, tenantId },
                data: updateData,
                include: { coupon: true },
            });

            return this.mapToEntity(appointment);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Appointment", id);
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "id";
                throw new DuplicateEntityError("Appointment", target, "");
            }
            throw error;
        }
    }

    async updateStatus(
        tenantId: string,
        id: string,
        data: AppointmentStatusUpdate,
    ): Promise<Appointment | null> {
        return prisma.$transaction(async (tx) => {
            const eventAt = new Date();
            const result = await tx.appointment.updateMany({
                where: {
                    id,
                    tenantId,
                    status: data.expectedStatus as PrismaAppointmentStatus,
                },
                data: {
                    status: data.status as PrismaAppointmentStatus,
                    statusChangedAt: eventAt,
                    statusChangeReason: data.reason ?? null,
                    statusChangedById: data.actorId ?? null,
                    ...(data.cancellationReason !== undefined && {
                        cancellationReason: data.cancellationReason,
                    }),
                },
            });

            if (result.count === 0) {
                return null;
            }

            const appointment = await tx.appointment.findFirst({
                where: {
                    id,
                    tenantId,
                    status: data.status as PrismaAppointmentStatus,
                },
                include: { coupon: true },
            });

            if (
                appointment &&
                data.status === AppointmentStatus.COMPLETED &&
                data.qualifyLoyalty
            ) {
                const loyaltyEnabled =
                    (await tx.tenantFeature.findFirst({
                        where: {
                            tenantId,
                            enabled: true,
                            feature: { key: "LOYALTY" },
                        },
                        select: { id: true },
                    })) !== null;
                const campaign = loyaltyEnabled
                    ? await tx.loyaltyCampaign.findFirst({
                          where: {
                              tenantId,
                              status: "ACTIVE",
                              source: {
                                  in: [
                                      getLoyaltyCampaignSource(
                                          LoyaltySourceType.APPOINTMENT,
                                      ),
                                      LoyaltyCampaignSource.ALL,
                                  ],
                              },
                              startsAt: { lte: eventAt },
                              endsAt: { gt: eventAt },
                          },
                          orderBy: { startsAt: "desc" },
                          select: { id: true, metric: true },
                      })
                    : null;

                if (campaign) {
                    const value = getLoyaltyCampaignContributionValue({
                        metric: campaign.metric as LoyaltyCampaignMetric,
                        netTotal: new Prisma.Decimal(
                            appointment.total,
                        ).toFixed(2),
                    });
                    await tx.loyaltyLedgerEntry.upsert({
                        where: {
                            campaignId_sourceType_sourceId_entryType: {
                                campaignId: campaign.id,
                                sourceType: LoyaltySourceType.APPOINTMENT,
                                sourceId: id,
                                entryType: LoyaltyLedgerEntryType.ACCRUAL,
                            },
                        },
                        create: {
                            tenantId,
                            campaignId: campaign.id,
                            userId: appointment.userId,
                            sourceType: LoyaltySourceType.APPOINTMENT,
                            sourceId: id,
                            value,
                            entryType: LoyaltyLedgerEntryType.ACCRUAL,
                            reason: "appointment.completed",
                            createdAt: eventAt,
                        },
                        update: {},
                    });
                }
            }

            return appointment ? this.mapToEntity(appointment) : null;
        });
    }

    async findReviewCandidates({
        activationCutoff,
        eligibleThrough,
        limit,
    }: AppointmentReviewCandidateQuery): Promise<AppointmentReviewCandidate[]> {
        const appointments = await prisma.appointment.findMany({
            where: {
                tenant: {
                    is: {
                        active: true,
                        type: { in: ["BOOKING", "HYBRID"] },
                    },
                },
                status: {
                    in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
                },
                // The lower bound excludes appointments that started before this
                // deployment; the upper bound is the absolute grace deadline.
                startTime: { gte: activationCutoff },
                endTime: { lte: eligibleThrough },
            },
            select: {
                id: true,
                tenantId: true,
                status: true,
                endTime: true,
                tenant: { select: { config: true } },
            },
            orderBy: { endTime: "asc" },
            take: limit,
        });

        return appointments.map((appointment) => ({
            id: appointment.id,
            tenantId: appointment.tenantId,
            status: appointment.status as AppointmentStatus,
            endTime: appointment.endTime,
            tenantTimezone: extractTenantTimezone(appointment.tenant.config),
        }));
    }

    async markNeedsReview(
        tenantId: string,
        id: string,
        expectedStatus: AppointmentStatus,
        activationCutoff: Date,
        eligibleThrough: Date,
        changedAt: Date,
        reason: string,
    ): Promise<boolean> {
        const result = await prisma.appointment.updateMany({
            where: {
                id,
                tenantId,
                status: expectedStatus as PrismaAppointmentStatus,
                startTime: { gte: activationCutoff },
                endTime: { lte: eligibleThrough },
            },
            data: {
                status: "NEEDS_REVIEW" as PrismaAppointmentStatus,
                statusChangedAt: changedAt,
                statusChangeReason: reason,
                statusChangedById: null,
            },
        });

        return result.count === 1;
    }

    async delete(tenantId: string, id: string): Promise<void> {
        try {
            await prisma.appointment.delete({
                where: { id, tenantId },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Appointment", id);
            }
            throw error;
        }
    }

    async checkAvailability(
        tenantId: string,
        staffId: string,
        startTime: Date,
        endTime: Date,
        excludeAppointmentId?: string,
    ): Promise<boolean> {
        const conflictingAppointments = await prisma.appointment.findMany({
            where: {
                tenantId,
                staffId,
                status: {
                    notIn: [
                        "CANCELLED" as PrismaAppointmentStatus,
                        "NO_SHOW" as PrismaAppointmentStatus,
                    ],
                },
                OR: [
                    {
                        AND: [
                            { startTime: { lte: startTime } },
                            { endTime: { gt: startTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { lt: endTime } },
                            { endTime: { gte: endTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { gte: startTime } },
                            { endTime: { lte: endTime } },
                        ],
                    },
                ],
                ...(excludeAppointmentId && {
                    id: { not: excludeAppointmentId },
                }),
            },
        });

        return conflictingAppointments.length === 0;
    }
}
