import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
} from "class-validator";

export interface WorkingHours {
    [day: string]: {
        start: string;
        end: string;
    } | null;
}

export interface CreateStaffDTO {
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active?: boolean;
    workingHours?: WorkingHours;
}

export interface UpdateStaffDTO {
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active?: boolean;
    workingHours?: WorkingHours;
}

export interface AssignStaffServiceDTO {
    serviceId: string;
}

export interface SyncStaffServicesDTO {
    serviceIds: string[];
}

/**
 * `workingHours` is asserted as an object rather than as a
 * `WorkingHours`-shaped one: its day keys are open-ended, so the only honest
 * constraint at the edge is "is an object", and the day-level shape is what
 * `working-hours.ts` already resolves and reports on.
 */
export class CreateStaffDto implements CreateStaffDTO {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsObject()
    workingHours?: WorkingHours;
}

export class UpdateStaffDto implements UpdateStaffDTO {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsObject()
    workingHours?: WorkingHours;
}

/** The body of `POST /api/staff/:staffId/services`. */
export class AssignStaffServiceDto implements AssignStaffServiceDTO {
    @IsString()
    @IsNotEmpty()
    serviceId!: string;
}

/**
 * The body of `PUT /api/staff/:staffId/services`. An empty list is meaningful
 * here: `SyncStaffServicesUseCase` treats it as "detach every service", so it
 * is asserted as an array and not as a non-empty array.
 */
export class SyncStaffServicesDto implements SyncStaffServicesDTO {
    @IsArray()
    @IsString({ each: true })
    serviceIds!: string[];
}
