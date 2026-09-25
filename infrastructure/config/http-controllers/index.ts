import { createBookingControllers } from "./booking.controllers";
import { createCatalogControllers } from "./catalog.controllers";
import { createCommerceControllers } from "./commerce.controllers";
import { createIdentityControllers } from "./identity.controllers";
import { createMessagingControllers } from "./messaging.controllers";
import { createOperationsControllers } from "./operations.controllers";
import type { Runtime } from "../runtime";

export function createHttpControllers(runtime: Runtime) {
    return {
        ...createIdentityControllers(runtime),
        ...createCatalogControllers(runtime),
        ...createCommerceControllers(runtime),
        ...createBookingControllers(runtime),
        ...createMessagingControllers(runtime),
        ...createOperationsControllers(runtime),
    };
}

export type HttpControllers = ReturnType<typeof createHttpControllers>;
