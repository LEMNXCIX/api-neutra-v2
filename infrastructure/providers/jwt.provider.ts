import jwt from "jsonwebtoken";
import config from "@/config/index.config";
import {
    ITokenGenerator,
    TokenPayload,
    DecodedToken,
} from "@/core/providers/auth-providers.interface";
import { JWT_CONSTANTS } from "@/core/domain/constants";

export class JwtProvider implements ITokenGenerator {
    private secret: string;

    constructor() {
        if (!config.jwtSecret) {
            throw new Error(
                "JWT_SECRET is not defined in environment variables",
            );
        }
        this.secret = config.jwtSecret;
    }

    generate(payload: TokenPayload): string {
        return jwt.sign(payload, this.secret, {
            expiresIn: JWT_CONSTANTS.EXPIRATION,
            algorithm: JWT_CONSTANTS.ALGORITHM,
        });
    }

    verify(token: string): DecodedToken {
        return jwt.verify(token, this.secret, {
            algorithms: [JWT_CONSTANTS.ALGORITHM],
        }) as DecodedToken;
    }
}
