export interface Slideshow {
    id: string;
    title: string;
    img: string;
    desc?: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
