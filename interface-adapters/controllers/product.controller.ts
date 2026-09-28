import type { Request, Response } from "express";
import type {
    CreateProductDto,
    SearchProductDto,
    UpdateProductDTO,
} from "@/core/application/dtos/requests/product.request";
import { ProductResponse } from "@/core/application/dtos/responses/product/product.response";
import type { CreateProductUseCase } from "@/core/application/products/create-product.use-case";
import type { DeleteProductUseCase } from "@/core/application/products/delete-product.use-case";
import type { GetAllProductsUseCase } from "@/core/application/products/get-all-products.use-case";
import type { GetProductUseCase } from "@/core/application/products/get-product.use-case";
import type { GetProductStatsUseCase } from "@/core/application/products/get-product-stats.use-case";
import type { GetProductSummaryStatsUseCase } from "@/core/application/products/get-product-summary-stats.use-case";
import type { SearchProductsUseCase } from "@/core/application/products/search-products.use-case";
import type { UpdateProductUseCase } from "@/core/application/products/update-product.use-case";
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
            ...(req.validatedBody as CreateProductDto),
            // `ownerId` is the authenticated author, not a body field: it is
            // spread last, so a body carrying one cannot claim the product.
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
            req.validatedBody as UpdateProductDTO,
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
        const name = (req.validatedBody as SearchProductDto).name;
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
