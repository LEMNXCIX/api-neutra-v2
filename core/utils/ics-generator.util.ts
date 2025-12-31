import * as ics from 'ics';

export interface IcsAppointmentData {
    id: string;
    title: string;
    description: string;
    startTime: Date;
    duration: number; // in minutes
    location?: string;
    organizer?: { name: string; email: string };
}

/**
 * Generates an ICS string for a given appointment
 */
export async function generateAppointmentIcs(data: IcsAppointmentData): Promise<string> {
    const start = data.startTime;

    // ics expects [year, month, day, hour, minute]
    // Month is 1-indexed in ics, but JS Date.getMonth() is 0-indexed
    const startDate: ics.DateArray = [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes()
    ];

    const event: ics.EventAttributes = {
        start: startDate,
        duration: { minutes: data.duration },
        title: data.title,
        description: data.description,
        location: data.location || 'Online / Specified Location',
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        organizer: data.organizer,
        productId: 'NeutraApp/Appointment',
        uid: data.id
    };

    return new Promise((resolve, reject) => {
        ics.createEvent(event, (error, value) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(value);
        });
    });
}
