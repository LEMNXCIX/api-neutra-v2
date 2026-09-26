import { OrderResponse } from "@/core/application/dtos/responses/order/order.response";
import { UserMinimalResponse } from "@/core/application/dtos/responses/shared/user-minimal.response";
import { StaffMinimalResponse } from "@/core/application/dtos/responses/shared/staff-minimal.response";
import type { Order } from "@/core/entities/order.entity";
import type { Product } from "@/core/entities/product.entity";

/**
 * These three DTOs had no test, so every `?? null` and every conditional
 * projection in them was unverified. They are the last thing between a stored
 * row and what a client actually receives, and the nullability rework on this
 * branch made that boundary load-bearing: an absent field and a stored null
 * now mean different things on the wire.
 */
const DATES = {
    createdAt: new Date("2024-01-02T03:04:05.000Z"),
    updatedAt: new Date("2024-02-03T04:05:06.000Z"),
};

function order(overrides: Partial<Order> = {}): Order {
    return {
        id: "order-1",
        userId: "user-1",
        status: "PENDIENTE",
        items: [],
        subtotal: 100,
        total: 100,
        discountAmount: 0,
        createdAt: DATES.createdAt,
        updatedAt: DATES.updatedAt,
        ...overrides,
    };
}

function product(overrides: Partial<Product> = {}): Product {
    return {
        id: "p1",
        name: "Widget",
        description: "A widget",
        image: null,
        price: 100,
        stock: 5,
        active: true,
        ownerId: "user-1",
        tenantId: "tenant-1",
        ...overrides,
    };
}

describe("OrderResponse.fromEntity", () => {
    it("normalises absent optionals to null so the key is always present", () => {
        const response = OrderResponse.fromEntity(order());

        expect(response.couponId).toBeNull();
        expect(response.trackingNumber).toBeNull();
        expect(response.user).toBeUndefined();
    });

    it("keeps a stored null distinct from an absent value", () => {
        const response = OrderResponse.fromEntity(
            order({ couponId: null, trackingNumber: null }),
        );

        expect(response.couponId).toBeNull();
        expect(response.trackingNumber).toBeNull();
        expect("couponId" in response).toBe(true);
        expect("trackingNumber" in response).toBe(true);
    });

    it("passes through real values when present", () => {
        const response = OrderResponse.fromEntity(
            order({
                couponId: "coupon-1",
                trackingNumber: "TRACK-1",
                user: { name: "Ada", email: "ada@example.com" },
            }),
        );

        expect(response.couponId).toBe("coupon-1");
        expect(response.trackingNumber).toBe("TRACK-1");
        expect(response.user).toEqual({ name: "Ada", email: "ada@example.com" });
    });

    it("reduces the user projection to name and email only", () => {
        const response = OrderResponse.fromEntity(
            order({
                user: {
                    id: "user-1",
                    name: "Ada",
                    email: "ada@example.com",
                    roleId: "r1",
                },
            } as unknown as Partial<Order>),
        );

        expect(response.user).toEqual({ name: "Ada", email: "ada@example.com" });
    });

    it("tolerates a missing items array", () => {
        const response = OrderResponse.fromEntity(
            order({ items: undefined as unknown as Order["items"] }),
        );

        expect(response.items).toBeUndefined();
    });

    it("maps items and keeps an item without a product as undefined", () => {
        const response = OrderResponse.fromEntity(
            order({
                items: [
                    {
                        id: "item-1",
                        orderId: "order-1",
                        productId: "p1",
                        amount: 2,
                        price: 50,
                    },
                ],
            }),
        );

        expect(response.items).toEqual([
            {
                id: "item-1",
                orderId: "order-1",
                productId: "p1",
                amount: 2,
                price: 50,
                product: undefined,
            },
        ]);
    });

    it("projects only name, image and price from a product", () => {
        const response = OrderResponse.fromEntity(
            order({
                items: [
                    {
                        id: "item-1",
                        orderId: "order-1",
                        productId: "p1",
                        amount: 1,
                        price: 100,
                        product: product(),
                    },
                ],
            }),
        );

        expect(response.items?.[0]?.product).toEqual({
            name: "Widget",
            image: null,
            price: 100,
        });
    });

    it("carries a real product image through instead of nulling it", () => {
        const response = OrderResponse.fromEntity(
            order({
                items: [
                    {
                        id: "item-1",
                        orderId: "order-1",
                        productId: "p1",
                        amount: 1,
                        price: 100,
                        product: product({ image: "https://cdn.test/w.png" }),
                    },
                ],
            }),
        );

        expect(response.items?.[0]?.product?.image).toBe(
            "https://cdn.test/w.png",
        );
    });
});

describe("UserMinimalResponse.fromEntity", () => {
    const base = { id: "u1", name: "Ada", email: "ada@example.com" };

    it("normalises absent phone and picture to null", () => {
        expect(UserMinimalResponse.fromEntity(base)).toEqual({
            ...base,
            phone: null,
            profilePic: null,
        });
    });

    it("passes real values through and does not leak the push token", () => {
        const response = UserMinimalResponse.fromEntity({
            ...base,
            phone: "+34123456789",
            profilePic: "https://cdn.test/a.png",
            pushToken: "secret-push-token",
        });

        expect(response.phone).toBe("+34123456789");
        expect(response.profilePic).toBe("https://cdn.test/a.png");
        expect("pushToken" in response).toBe(false);
    });
});

describe("StaffMinimalResponse.fromEntity", () => {
    const base = { id: "s1", name: "Grace" };

    it("normalises absent email and avatar to null", () => {
        expect(StaffMinimalResponse.fromEntity(base)).toEqual({
            ...base,
            email: null,
            avatar: null,
        });
    });

    it("passes real values through", () => {
        const response = StaffMinimalResponse.fromEntity({
            ...base,
            email: "grace@example.com",
            avatar: "https://cdn.test/g.png",
        });

        expect(response.email).toBe("grace@example.com");
        expect(response.avatar).toBe("https://cdn.test/g.png");
    });
});
