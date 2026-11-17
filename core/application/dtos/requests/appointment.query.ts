import {
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from "class-validator";

/** Positive integer as it arrives in a query string; parsePagination converts it. */
const POSITIVE_INT = /^[1-9]\d*$/;

export class ListAppointmentsQueryDto {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    staffId?: string;

    @IsOptional()
    @IsString()
    serviceId?: string;

    /** Kept as a string: assertAppointmentStatus owns the 422 error contract. */
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @Matches(POSITIVE_INT)
    page?: string;

    @IsOptional()
    @Matches(POSITIVE_INT)
    limit?: string;
}

export class AttentionAppointmentsQueryDto {
    @IsOptional()
    @Matches(POSITIVE_INT)
    page?: string;

    @IsOptional()
    @Matches(POSITIVE_INT)
    limit?: string;
}

export class AvailabilityQueryDto {
    @IsString()
    @IsNotEmpty()
    staffId!: string;

    @IsString()
    @IsNotEmpty()
    serviceId!: string;

    @IsDateString()
    date!: string;

    @IsOptional()
    @IsString()
    timezoneOffset?: string;
}
