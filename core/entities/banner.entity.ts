export interface Banner {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    imageUrl: string | null;
    backgroundColor: string | null;
    textColor: string | null;
    cta: string | null;
    ctaUrl: string | null;
    priority: number;
    active: boolean;
    startsAt: Date;
    endsAt: Date;
    impressions: number;
    clicks: number;
    createdAt: Date;
    updatedAt: Date;
}
