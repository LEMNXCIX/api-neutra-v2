export interface Slideshow {
    id: string;
    title: string;
    img: string;
    desc?: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateSlideshowDTO {
    title: string;
    img: string;
    desc?: string;
    active?: boolean;
}

export interface UpdateSlideshowDTO {
    title?: string;
    img?: string;
    desc?: string;
    active?: boolean;
}
