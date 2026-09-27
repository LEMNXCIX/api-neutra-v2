import { AppointmentController } from "@/interface-adapters/controllers/appointment.controller";
import { StaffController } from "@/interface-adapters/controllers/staff.controller";
import { ServiceController } from "@/interface-adapters/controllers/service.controller";

import { CreateAppointmentUseCase } from "@/core/application/booking/create-appointment.use-case";
import { GetAppointmentsUseCase } from "@/core/application/booking/get-appointments.use-case";
import { GetAppointmentsNeedingReviewUseCase } from "@/core/application/booking/get-appointments-needing-review.use-case";
import { GetAppointmentByIdUseCase } from "@/core/application/booking/get-appointment-by-id.use-case";
import { CancelAppointmentUseCase } from "@/core/application/booking/cancel-appointment.use-case";
import { GetAvailabilityUseCase } from "@/core/application/booking/get-availability.use-case";
import { UpdateAppointmentStatusUseCase } from "@/core/application/booking/update-appointment-status.use-case";
import { DeleteAppointmentUseCase } from "@/core/application/booking/delete-appointment.use-case";
import { CreateServiceUseCase } from "@/core/application/booking/create-service.use-case";
import { GetServicesUseCase } from "@/core/application/booking/get-services.use-case";
import { UpdateServiceUseCase } from "@/core/application/booking/update-service.use-case";
import { DeleteServiceUseCase } from "@/core/application/booking/delete-service.use-case";
import { CreateStaffUseCase } from "@/core/application/booking/create-staff.use-case";
import { GetStaffUseCase } from "@/core/application/booking/get-staff.use-case";
import { GetStaffByUserIdUseCase } from "@/core/application/booking/get-staff-by-user-id.use-case";
import { UpdateStaffUseCase } from "@/core/application/booking/update-staff.use-case";
import { DeleteStaffUseCase } from "@/core/application/booking/delete-staff.use-case";
import { AssignStaffServiceUseCase } from "@/core/application/booking/assign-staff-service.use-case";
import { SyncStaffServicesUseCase } from "@/core/application/booking/sync-staff-services.use-case";
import { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import type { Runtime } from "../runtime";

export function createBookingControllers(runtime: Runtime) {
    const r = runtime.repositories;
    const p = runtime.providers;

    return {
        appointment: new AppointmentController(
            new CreateAppointmentUseCase(
                r.appointment,
                r.staff,
                r.service,
                r.coupon,
                new ValidateCouponUseCase(r.coupon),
                p.queue,
                r.feature,
                r.tenant,
            ),
            new GetAppointmentsUseCase(r.appointment),
            new GetAppointmentsNeedingReviewUseCase(r.appointment),
            new GetAppointmentByIdUseCase(r.appointment),
            new CancelAppointmentUseCase(r.appointment, r.feature, p.queue),
            new GetAvailabilityUseCase(
                r.appointment,
                r.staff,
                r.service,
                r.tenant,
            ),
            new UpdateAppointmentStatusUseCase(
                r.appointment,
                p.queue,
                r.feature,
            ),
            new DeleteAppointmentUseCase(r.appointment),
        ),
        staff: new StaffController(
            new CreateStaffUseCase(r.staff, r.user, r.role, r.tenant),
            new GetStaffUseCase(r.staff),
            new GetStaffByUserIdUseCase(r.staff),
            new UpdateStaffUseCase(r.staff, r.user, r.role, r.tenant),
            new DeleteStaffUseCase(r.staff),
            new AssignStaffServiceUseCase(r.staff),
            new SyncStaffServicesUseCase(r.staff),
        ),
        service: new ServiceController(
            new CreateServiceUseCase(r.service, r.category),
            new GetServicesUseCase(r.service),
            new UpdateServiceUseCase(r.service, r.category),
            new DeleteServiceUseCase(r.service),
        ),
    };
}
