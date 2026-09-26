import { Request, Response } from "express";
import { GetAllProductsUseCase } from "@/core/application/products/get-all-products.use-case";
import { GetProductUseCase } from "@/core/application/products/get-product.use-case";
import { CreateProductUseCase } from "@/core/application/products/create-product.use-case";
import { UpdateProductUseCase } from "@/core/application/products/update-product.use-case";
import { DeleteProductUseCase } from "@/core/application/products/delete-product.use-case";
import { SearchProductsUseCase } from "@/core/application/products/search-products.use-case";
import { GetProductStatsUseCase } from "@/core/application/products/get-product-stats.use-case";
import { GetProductSummaryStatsUseCase } from "@/core/application/products/get-product-summary-stats.use-case";

import { ProductResponse } from "@/core/application/dtos/responses/product/product.response";
import { present } from "@/core/utils/use-case-result";

export class ProductController {
    constructor(
        private getAllProductsUseCase: GetAllProductsUseCase,
        private getProductUseCase: GetProductUseCase,
        private createProductUseCase: CreateProductUseCase,
        private updateProductUseCase: UpdateProductUseCase,
        private deleteProductUseCase: DeleteProductUseCase,
        private searchProductsUseCase: SearchProductsUseCase,
        private getProductStatsUseCase: GetProductStatsUseCase,
        private getProductSummaryStatsUseCase: GetProductSummaryStatsUseCase,
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
        const tenantId = req.tenantId!;

        const result = await this.getAllProductsUseCase.execute(tenantId);
        return res.json(
            present(result, (products) =>
                Array.isArray(products)
                    ? products.map((p) => ProductResponse.fromEntity(p))
                    : [],
            ),
        );
    }

    async getOne(req: Request, res: Response) {
        const tenantId = req.tenantId!;

        const id = req.params.id;
        const result = await this.getProductUseCase.execute(tenantId, id);
        return res.json(present(result, ProductResponse.fromEntity));
    }

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.createProductUseCase.execute(tenantId, {
            ...req.body,
            ownerId: req.user!.id,
        });
        return res
            .status(201)
            .json(present(result, ProductResponse.fromEntity));
    }

    async update(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const id = req.params.id;
        const result = await this.updateProductUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        return res.json(present(result, ProductResponse.fromEntity));
    }

    async delete(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const id = req.params.id;
        const userId = req.user!.id;
        const result = await this.deleteProductUseCase.execute(
            tenantId,
            id,
            userId,
        );
        return res.json(result);
    }

    async search(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const name = req.body.name;
        const result = await this.searchProductsUseCase.execute(tenantId, name);
        return res.json(
            present(result, (products) =>
                Array.isArray(products)
                    ? products.map((p) => ProductResponse.fromEntity(p))
                    : [],
            ),
        );
    }

    async getStats(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.getProductStatsUseCase.execute(tenantId);
        return res.json(result);
    }

    async getSummaryStats(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result =
            await this.getProductSummaryStatsUseCase.execute(tenantId);
        return res.json(result);
    }
}
