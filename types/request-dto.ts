import {
    IsString,
    IsEmail,
    MinLength,
    MaxLength,
    IsOptional,
    IsArray,
    IsNumber,
    IsPositive,
    Min,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorDetail:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *         message:
 *           type: string
 *         field:
 *           type: string
 */
export class ErrorDetail {
    code: string = "";
    message: string = "";
    field?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUserDto:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *         provider:
 *           type: string
 *         profilePic:
 *           type: string
 */
export class CreateUserDto {
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    @Transform(({ value }) => value.trim())
    name!: string;

    @IsEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email!: string;

    @IsString()
    @MinLength(8)
    password!: string;

    @IsOptional()
    provider?: string;

    @IsOptional()
    @IsString()
    profilePic?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginDto:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 */
export class LoginDto {
    @IsEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email!: string;

    @IsString()
    @MinLength(8)
    password!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductCreateDto:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *         price:
 *           type: number
 *         image:
 *           type: array
 *           items:
 *             type: string
 *         stock:
 *           type: number
 */
export class ProductCreateDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categories?: string[];

    @IsOptional()
    @IsNumber()
    @IsPositive()
    price?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    image?: string[];

    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     AddToCartDto:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *         quantity:
 *           type: number
 *           minimum: 1
 */
export class AddToCartDto {
    @IsString()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateOrderDto:
 *       type: object
 *       required:
 *         - userId
 *         - items
 *       properties:
 *         userId:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *         address:
 *           type: string
 */
export class CreateOrderDto {
    @IsString()
    userId!: string;

    @IsArray()
    items!: Array<{ productId: string; quantity: number }>;

    @IsOptional()
    @IsString()
    address?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ForgotPasswordDto:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *     ResetPasswordDto:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *         password:
 *           type: string
 *           minLength: 8
 *     CreateTenantDto:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *       properties:
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         type:
 *           type: string
 *           enum: [STORE, BOOKING, HYBRID]
 *         config:
 *           type: object
 *         active:
 *           type: boolean
 *         planId:
 *           type: string
 *     UpdateTenantDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         type:
 *           type: string
 *           enum: [STORE, BOOKING, HYBRID]
 *         config:
 *           type: object
 *         active:
 *           type: boolean
 *         planId:
 *           type: string
 *     CreateStaffDto:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         avatar:
 *           type: string
 *         bio:
 *           type: string
 *         active:
 *           type: boolean
 *         workingHours:
 *           type: object
 *         userId:
 *           type: string
 *     UpdateStaffDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         avatar:
 *           type: string
 *         bio:
 *           type: string
 *         active:
 *           type: boolean
 *         workingHours:
 *           type: object
 *     AssignStaffServiceDto:
 *       type: object
 *       required:
 *         - serviceId
 *       properties:
 *         serviceId:
 *           type: string
 *     SyncStaffServicesDto:
 *       type: object
 *       required:
 *         - serviceIds
 *       properties:
 *         serviceIds:
 *           type: array
 *           items:
 *             type: string
 *     CreateAppointmentDto:
 *       type: object
 *       required:
 *         - serviceId
 *         - staffId
 *         - startTime
 *         - endTime
 *       properties:
 *         serviceId:
 *           type: string
 *         staffId:
 *           type: string
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 *         couponId:
 *           type: string
 *     UpdateAppointmentStatusDto:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW]
 *     CreateServiceDto:
 *       type: object
 *       required:
 *         - name
 *         - duration
 *         - price
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         duration:
 *           type: integer
 *           description: Duration in minutes
 *         price:
 *           type: number
 *         categoryId:
 *           type: string
 *         active:
 *           type: boolean
 *     UpdateServiceDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         duration:
 *           type: integer
 *         price:
 *           type: number
 *         categoryId:
 *           type: string
 *         active:
 *           type: boolean
 *     CreateFeatureDto:
 *       type: object
 *       required:
 *         - key
 *         - name
 *       properties:
 *         key:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: [MODULE, INTEGRATION, CUSTOMIZATION]
 *         price:
 *           type: number
 *     UpdateFeatureDto:
 *       type: object
 *       properties:
 *         key:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: [MODULE, INTEGRATION, CUSTOMIZATION]
 *         price:
 *           type: number
 *     UpdateTenantFeaturesDto:
 *       type: object
 *       required:
 *         - features
 *       properties:
 *         features:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - featureId
 *               - enabled
 *             properties:
 *               featureId:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     WhatsAppConfigDto:
 *       type: object
 *       required:
 *         - phoneNumberId
 *         - businessAccountId
 *         - accessToken
 *         - webhookVerifyToken
 *       properties:
 *         phoneNumberId:
 *           type: string
 *         businessAccountId:
 *           type: string
 *         accessToken:
 *           type: string
 *         webhookVerifyToken:
 *           type: string
 *         enabled:
 *           type: boolean
 *         notificationsEnabled:
 *           type: boolean
 *         botEnabled:
 *           type: boolean
 *         templates:
 *           type: object
 *         botConfig:
 *           type: object
 *     SendWhatsAppTemplateDto:
 *       type: object
 *       required:
 *         - templateName
 *         - recipientPhone
 *       properties:
 *         templateName:
 *           type: string
 *         recipientPhone:
 *           type: string
 *         parameters:
 *           type: object
 */
