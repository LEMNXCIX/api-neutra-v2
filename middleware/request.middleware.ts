import type { NextFunction, Request, Response } from "express";
import type { ILogger } from "@/core/providers/logger.interface";

export function createRequestMiddleware(logger: ILogger) {
    return function requestMiddleware(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        logger.logRequest({
            method: req.method,
            url: req.originalUrl,
            body: req.body,
            headers: req.headers as Record<string, string>,
        });
        next();
    };
}

export default createRequestMiddleware;
