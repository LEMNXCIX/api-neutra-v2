export interface Slide {
    id: string;
    title: string;
    img: string;
    desc?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateSlideDTO {
    title: string;
    img: string;
    desc?: string;
}

export interface UpdateSlideDTO {
    title?: string;
    img?: string;
    desc?: string;
}
