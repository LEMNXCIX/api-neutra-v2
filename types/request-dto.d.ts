import { IsString, IsEmail, MinLength, MaxLength, IsOptional, IsArray, IsNumber, IsPositive, Min } from 'class-validator';
import { Transform } from 'class-transformer';

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
  code: string = '';
  message: string = '';
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

// Genérico para requests (composición funcional)
export interface ApiRequest<T> {
  body: T;
  user?: { id: string; role: number };
  params?: Record<string, string>;
  query?: Record<string, any>;
}