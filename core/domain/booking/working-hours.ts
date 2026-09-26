// Shared logic for staff/tenant working hours and holidays.
// Accepts legacy single-range shape ({monday: {start,end}}) and
// multi-range shape ({monday: [{start,end}, ...]}); null = day off.

export interface TimeRange {
    start: string; // "HH:mm"
    end: string; // "HH:mm"
}

export type WorkingHours = { [day: string]: TimeRange | TimeRange[] | null };

const DAY_NAMES = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
];

const isRange = (v: unknown): v is TimeRange =>
    !!v &&
    typeof v === "object" &&
    typeof (v as TimeRange).start === "string" &&
    typeof (v as TimeRange).end === "string";

export function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

/** Ranges for a given Date (local weekday), normalized to arrays. */
export function getDayRanges(
    workingHours: WorkingHours | null | undefined,
    date: Date,
): TimeRange[] {
    if (!workingHours || typeof workingHours !== "object") return [];
    const day = DAY_NAMES[date.getDay()];
    const value = workingHours[day];
    if (!value) return [];
    return (Array.isArray(value) ? value : [value]).filter(isRange);
}

/** Intersect two range lists. Empty `b` means "no restriction" → returns a. */
export function intersectRanges(
    a: TimeRange[],
    b: TimeRange[],
): TimeRange[] {
    if (!b.length) return a;
    const result: TimeRange[] = [];
    for (const ra of a) {
        for (const rb of b) {
            const start = Math.max(toMinutes(ra.start), toMinutes(rb.start));
            const end = Math.min(toMinutes(ra.end), toMinutes(rb.end));
            if (start < end) {
                result.push({
                    start: `${Math.floor(start / 60)}`.padStart(2, "0") + ":" + `${start % 60}`.padStart(2, "0"),
                    end: `${Math.floor(end / 60)}`.padStart(2, "0") + ":" + `${end % 60}`.padStart(2, "0"),
                });
            }
        }
    }
    return result;
}

/** [startMin, endMin) fits entirely inside one of the ranges. */
export function fitsInRanges(
    startMin: number,
    endMin: number,
    ranges: TimeRange[],
): boolean {
    return ranges.some(
        (r) =>
            startMin >= toMinutes(r.start) && endMin <= toMinutes(r.end),
    );
}

/** Holidays are tenant-level point dates as "YYYY-MM-DD" (local). */
export function isHoliday(
    holidays: string[] | null | undefined,
    date: Date,
): boolean {
    if (!holidays?.length) return false;
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const d = `${date.getDate()}`.padStart(2, "0");
    return holidays.includes(`${y}-${m}-${d}`);
}
