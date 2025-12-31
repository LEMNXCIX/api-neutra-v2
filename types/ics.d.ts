declare module 'ics' {
    export type DateArray = [number, number, number, number, number];

    export interface DurationObject {
        weeks?: number;
        days?: number;
        hours?: number;
        minutes?: number;
        seconds?: number;
    }

    export interface Geo {
        lat: number;
        lon: number;
    }

    export interface Organizer {
        name: string;
        email: string;
    }

    export interface Attendee {
        name: string;
        email: string;
        role?: string;
        rsvp?: boolean;
        partstat?: string;
        dir?: string;
    }

    export interface Alarm {
        action: string;
        description?: string;
        summary?: string;
        duration?: DurationObject;
        repeat?: number;
        attach?: string;
        trigger: DurationObject | Date | DateArray;
    }

    export interface EventAttributes {
        start: DateArray;
        startInputType?: string;
        startOutputType?: string;
        end?: DateArray;
        endInputType?: string;
        endOutputType?: string;
        duration?: DurationObject;
        title?: string;
        description?: string;
        location?: string;
        geo?: Geo;
        url?: string;
        status?: string;
        busyStatus?: string;
        organizer?: Organizer;
        attendees?: Attendee[];
        categories?: string[];
        categoriesOutputType?: string;
        alarms?: Alarm[];
        productId?: string;
        uid?: string;
        method?: string;
        sequence?: number;
        recurrenceRule?: string;
        exclusionDates?: DateArray[];
        created?: DateArray;
        lastModified?: DateArray;
        classification?: string;
        transp?: string;
    }

    export function createEvent(
        attributes: EventAttributes,
        callback: (error: any, value: string) => void
    ): void;

    export function createEvents(
        events: EventAttributes[],
        callback: (error: any, value: string) => void
    ): void;
}
