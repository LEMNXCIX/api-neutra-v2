import { Container } from "@/infrastructure/config/container";
import { createAuthenticateMiddleware } from "@/middleware/authenticate.factory";

export { createAuthenticateMiddleware } from "@/middleware/authenticate.factory";

/** Bound middleware for routes (composition root via Container). */
export const authenticate = createAuthenticateMiddleware({
    resolveUser: Container.getResolveAuthenticatedUserUseCase(),
});
