import { IsString, IsEmail, MinLength, MaxLength, IsOptional, IsArray, IsNumber, IsPositive, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ErrorDetail {
  code: string = '';
  message: string = '';
  field?: string;
}

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

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

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

export class AddToCartDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

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