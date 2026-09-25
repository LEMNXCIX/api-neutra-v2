import { ProductController } from "@/interface-adapters/controllers/product.controller";
import { CategoryController } from "@/interface-adapters/controllers/category.controller";
import { BannerController } from "@/interface-adapters/controllers/banner.controller";
import { CouponController } from "@/interface-adapters/controllers/coupon.controller";
import { SlideController } from "@/interface-adapters/controllers/slide.controller";

import { GetAllProductsUseCase } from "@/core/application/products/get-all-products.use-case";
import { GetProductUseCase } from "@/core/application/products/get-product.use-case";
import { CreateProductUseCase } from "@/core/application/products/create-product.use-case";
import { UpdateProductUseCase } from "@/core/application/products/update-product.use-case";
import { DeleteProductUseCase } from "@/core/application/products/delete-product.use-case";
import { SearchProductsUseCase } from "@/core/application/products/search-products.use-case";
import { GetProductStatsUseCase } from "@/core/application/products/get-product-stats.use-case";
import { GetProductSummaryStatsUseCase } from "@/core/application/products/get-product-summary-stats.use-case";

import { CreateCategoryUseCase } from "@/core/application/categories/create-category.use-case";
import { GetCategoriesUseCase } from "@/core/application/categories/get-categories.use-case";
import { UpdateCategoryUseCase } from "@/core/application/categories/update-category.use-case";
import { DeleteCategoryUseCase } from "@/core/application/categories/delete-category.use-case";
import { GetCategoryStatsUseCase } from "@/core/application/categories/get-category-stats.use-case";

import { CreateBannerUseCase } from "@/core/application/banners/create-banner.use-case";
import { GetBannersUseCase } from "@/core/application/banners/get-banners.use-case";
import { UpdateBannerUseCase } from "@/core/application/banners/update-banner.use-case";
import { DeleteBannerUseCase } from "@/core/application/banners/delete-banner.use-case";
import { TrackBannerAnalyticsUseCase } from "@/core/application/banners/track-banner-analytics.use-case";
import { GetBannerStatsUseCase } from "@/core/application/banners/get-banner-stats.use-case";

import { CreateCouponUseCase } from "@/core/application/coupons/create-coupon.use-case";
import { GetCouponsUseCase } from "@/core/application/coupons/get-coupons.use-case";
import { GetCouponsPaginatedUseCase } from "@/core/application/coupons/get-coupons-paginated.use-case";
import { UpdateCouponUseCase } from "@/core/application/coupons/update-coupon.use-case";
import { DeleteCouponUseCase } from "@/core/application/coupons/delete-coupon.use-case";
import { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import { GetCouponStatsUseCase } from "@/core/application/coupons/get-coupon-stats.use-case";

import { CreateSlideUseCase } from "@/core/application/slide/create-slide.use-case";
import { UpdateSlideUseCase } from "@/core/application/slide/update-slide.use-case";
import { GetSlidesUseCase } from "@/core/application/slide/get-slides.use-case";
import { DeleteSlideUseCase } from "@/core/application/slide/delete-slide.use-case";
import { GetSliderStatsUseCase } from "@/core/application/slide/get-slider-stats.use-case";
import type { Runtime } from "../runtime";

export function createCatalogControllers(runtime: Runtime) {
    const r = runtime.repositories;

    return {
        product: new ProductController(
            new GetAllProductsUseCase(r.product),
            new GetProductUseCase(r.product),
            new CreateProductUseCase(r.product),
            new UpdateProductUseCase(r.product),
            new DeleteProductUseCase(r.product),
            new SearchProductsUseCase(r.product),
            new GetProductStatsUseCase(r.product),
            new GetProductSummaryStatsUseCase(r.product),
        ),
        category: new CategoryController(
            new CreateCategoryUseCase(r.category),
            new GetCategoriesUseCase(r.category),
            new UpdateCategoryUseCase(r.category),
            new DeleteCategoryUseCase(r.category),
            new GetCategoryStatsUseCase(r.category),
        ),
        banner: new BannerController(
            new CreateBannerUseCase(r.banner),
            new GetBannersUseCase(r.banner),
            new UpdateBannerUseCase(r.banner),
            new DeleteBannerUseCase(r.banner),
            new TrackBannerAnalyticsUseCase(r.banner),
            new GetBannerStatsUseCase(r.banner),
        ),
        coupon: new CouponController(
            new CreateCouponUseCase(r.coupon),
            new GetCouponsUseCase(r.coupon),
            new GetCouponsPaginatedUseCase(r.coupon),
            new UpdateCouponUseCase(r.coupon),
            new DeleteCouponUseCase(r.coupon),
            new ValidateCouponUseCase(r.coupon),
            new GetCouponStatsUseCase(r.coupon),
        ),
        slide: new SlideController(
            new CreateSlideUseCase(r.slide),
            new UpdateSlideUseCase(r.slide),
            new GetSlidesUseCase(r.slide),
            new DeleteSlideUseCase(r.slide),
            new GetSliderStatsUseCase(r.slide),
        ),
    };
}
