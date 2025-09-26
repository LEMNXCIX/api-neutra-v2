declare global {
  /** DTO for creating a local user (signup) */
  interface CreateUserDto {
    name: string;
    email: string;
    password: string;
    provider?: any;
    profilePic?: string;
  }

  /** DTO for login */
  interface LoginDto {
    email: string;
    password: string;
  }

  /** DTO for product creation/update */
  interface ProductCreateDto {
    name: string;
    description?: string;
    categories?: string[];
    price?: number;
    image?: string[];
    stock?: number;
  }

  /** DTO for adding items to cart */
  interface AddToCartDto {
    productId: string;
    quantity: number;
  }

  /** DTO for creating an order */
  interface CreateOrderDto {
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
    address?: string;
  }
}

export {};
