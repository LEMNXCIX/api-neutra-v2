import { Container } from "@/infrastructure/config/container";
import { createOptionalAuthenticateMiddleware } from "@/middleware/optional-authenticate.factory";

export { createOptionalAuthenticateMiddleware } from "@/middleware/optional-authenticate.factory";

/** Bound middleware for routes (composition root via Container). */
export const optionalAuthenticate = createOptionalAuthenticateMiddleware({
    resolveUser: Container.getResolveAuthenticatedUserUseCase(),
});
