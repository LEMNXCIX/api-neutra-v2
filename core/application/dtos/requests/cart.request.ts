import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export interface AddToCartDTO {
    productId: string;
    amount: number;
}

/**
 * Aligned with the endpoint, not with the old name. `CartController`
 * reads `req.body.id` and hands it to `RemoveFromCartUseCase.execute` as the
 * `productId` argument of `ICartRepository.removeItem`, so `id` is the key a
 * client actually sends. The interface previously declared `productId`, which
 * no route, controller or use case read.
 */
export interface RemoveFromCartDTO {
    id: string;
}

export interface ChangeCartAmountDTO {
    amount: number;
}

/** The body of `POST /api/cart/add`. */
export class AddToCartDto implements AddToCartDTO {
    @IsString()
    @IsNotEmpty()
    productId!: string;

    @IsNumber()
    @Min(1)
    amount!: number;
}

/** The body of `PUT /api/cart/remove`. */
export class RemoveFromCartDto implements RemoveFromCartDTO {
    @IsString()
    @IsNotEmpty()
    id!: string;
}

// `ChangeCartAmountDTO` has no class: `CartController.changeAmount` is not
// mounted on any route, so nothing reads `amount` off a request body today and
// a validator class would constrain nothing. Add one with the route.
