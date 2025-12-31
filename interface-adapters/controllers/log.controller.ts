import { Request, Response } from 'express';
import { ILogRepository } from '../../core/repositories/log.repository.interface';
import { ILogger } from '../../core/providers/logger.interface';

export class LogController {
    private logRepository: ILogRepository;
    private logger: ILogger;

    constructor(logRepository: ILogRepository, logger: ILogger) {
        this.logRepository = logRepository;
        this.logger = logger;
    }

    async getAll(req: Request, res: Response) {
        try {
            const { level, tenantId, startDate, endDate, skip, take } = req.query;

            const result = await this.logRepository.findAll({
                level,
                tenantId,
                startDate,
                endDate,
                skip,
                take
            });

            res.json({
                success: true,
                data: result.data,
                pagination: {
                    total: result.total,
                    skip: Number(skip) || 0,
                    take: Number(take) || 50
                }
            });
        } catch (error: any) {
            this.logger.error('Error getting logs', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getStats(req: Request, res: Response) {
        try {
            const { timeframe } = req.query;
            const stats = await this.logRepository.getStats(timeframe as string || 'daily');

            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            this.logger.error('Error getting log stats', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
