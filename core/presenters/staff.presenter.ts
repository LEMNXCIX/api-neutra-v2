import { Staff } from "@/core/entities/staff.entity";
import {
    StaffResponse,
    IStaffResponse,
} from "@/core/application/dtos/responses/staff/staff.response";

export class StaffPresenter {
    static toResponse(staff: Staff): IStaffResponse {
        return StaffResponse.fromEntity(staff);
    }

    static toResponseList(staffList: Staff[]): IStaffResponse[] {
        return staffList.map((s) => StaffResponse.fromEntity(s));
    }
}
