export interface Feature {
    id: string;
    key: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
    createdAt?: Date;
}
