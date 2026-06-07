export interface Product {
    id: string;
    name: string;
    description: string;
    image: string | null;
    price: number;
    stock: number;
    active: boolean;
    ownerId: string;
    createdAt?: Date;
    updatedAt?: Date;
    categories?: { id: string; name: string }[];
}
