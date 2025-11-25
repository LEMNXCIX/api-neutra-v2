import { JWTPayload } from './rbac';

declare global {
    namespace Express {
        // Augment the User interface which Request.user uses
        interface User extends JWTPayload { }
    }
}

export { };
