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
