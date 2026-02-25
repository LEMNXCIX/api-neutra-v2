import { Request, Response } from 'express';
import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { GetAllProductsUseCase } from '@/core/application/products/get-all-products.use-case';
import { GetProductUseCase } from '@/core/application/products/get-product.use-case';
import { CreateProductUseCase } from '@/core/application/products/create-product.use-case';
import { UpdateProductUseCase } from '@/core/application/products/update-product.use-case';
import { DeleteProductUseCase } from '@/core/application/products/delete-product.use-case';
import { SearchProductsUseCase } from '@/core/application/products/search-products.use-case';
import { GetProductStatsUseCase } from '@/core/application/products/get-product-stats.use-case';
import { GetProductSummaryStatsUseCase } from '@/core/application/products/get-product-summary-stats.use-case';

import { VALIDATION_CONSTANTS } from '@/core/domain/constants';

export class ProductController {
    constructor(
        private getAllProductsUseCase: GetAllProductsUseCase,
        private getProductUseCase: GetProductUseCase,
        private createProductUseCase: CreateProductUseCase,
        private updateProductUseCase: UpdateProductUseCase,
        private deleteProductUseCase: DeleteProductUseCase,
        private searchProductsUseCase: SearchProductsUseCase,
        private getProductStatsUseCase: GetProductStatsUseCase,
        private getProductSummaryStatsUseCase: GetProductSummaryStatsUseCase
    ) {
        // Bind methods
        this.getAll = this.getAll.bind(this);
        this.getOne = this.getOne.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.search = this.search.bind(this);
        this.getStats = this.getStats.bind(this);
        this.getSummaryStats = this.getSummaryStats.bind(this);
    }

    async getAll(req: Request, res: Response) {
        let tenantId = (req as any).tenantId;
        const user = (req as any).user;

        // Super Admin Bypass
        if (user && user.role && user.role.name === 'SUPER_ADMIN') {
            if (req.query.tenantId) {
                tenantId = req.query.tenantId as string;
                if (tenantId === 'all') tenantId = undefined;
            }
        } else if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant ID required" });
        }

        const result = await this.getAllProductsUseCase.execute(tenantId);
        return res.json(result);
    }

    async getOne(req: Request, res: Response) {
        let tenantId = (req as any).tenantId;
        const user = (req as any).user;

        // Super Admin Bypass
        if (user && user.role && user.role.name === 'SUPER_ADMIN') {
            if (req.query.tenantId) {
                tenantId = req.query.tenantId as string;
                if (tenantId === 'all') tenantId = undefined;
            }
        } else if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant context required. Use x-tenant-id or x-tenant-slug header."
            });
        }

        const id = req.params.id;
        const result = await this.getProductUseCase.execute(tenantId, id);
        return res.json(result);
    }

    async create(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const result = await this.createProductUseCase.execute(tenantId, {
            ...req.body,
            ownerId: (req as any).user.id
        });
        return res.status(201).json(result);
    }

    async update(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const id = req.params.id;
        const result = await this.updateProductUseCase.execute(tenantId, id, req.body);
        return res.json(result);
    }

    async delete(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const id = req.params.id;
        const userId = (req as any).user.id;
        const result = await this.deleteProductUseCase.execute(tenantId, id, userId);
        return res.json(result);
    }

    async search(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const name = req.body.name;
        const result = await this.searchProductsUseCase.execute(tenantId, name);
        return res.json(result);
    }

    async getStats(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const result = await this.getProductStatsUseCase.execute(tenantId);
        return res.json(result);
    }

    async getSummaryStats(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const result = await this.getProductSummaryStatsUseCase.execute(tenantId);
        return res.json(result);
    }
}
