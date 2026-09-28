import type { NextFunction, Request, Response } from "express";
import { RequestContext } from "@/infrastructure/context/request-context";

export function contextMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    RequestContext.run({ req }, () => {
        next();
    });
}
