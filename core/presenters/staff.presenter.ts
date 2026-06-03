import {
    StaffResponse,
    IStaffResponse,
} from "@/core/application/dtos/responses/staff/staff.response";
import {
    StaffMinimalResponse,
    IStaffMinimalResponse,
} from "@/core/application/dtos/responses/shared/staff-minimal.response";

export class StaffPresenter {
    static toResponse(staff: any): IStaffResponse {
        return StaffResponse.fromEntity(staff);
    }

    static toMinimalResponse(staff: any): IStaffMinimalResponse {
        return StaffMinimalResponse.fromEntity(staff);
    }

    static toResponseList(staffList: any[]): IStaffResponse[] {
        return staffList.map((s) => StaffResponse.fromEntity(s));
    }
}
