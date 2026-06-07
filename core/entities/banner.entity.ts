export interface Banner {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    cta?: string;
    ctaUrl?: string;
    priority: number;
    active: boolean;
    startsAt: Date;
    endsAt: Date;
    impressions: number;
    clicks: number;
    createdAt: Date;
    updatedAt: Date;
}
