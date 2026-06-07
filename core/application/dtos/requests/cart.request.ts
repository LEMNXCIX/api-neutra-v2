export interface AddToCartDTO {
    productId: string;
    amount: number;
}

export interface RemoveFromCartDTO {
    productId: string;
}

export interface ChangeCartAmountDTO {
    amount: number;
}
