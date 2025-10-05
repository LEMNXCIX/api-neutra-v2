import { IsBoolean, IsNumber, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';

export class ErrorDetail {
  @IsString()
  code!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  field?: string;
}

export class ApiResponse<T = any> {
  @IsBoolean()
  success!: boolean;

  @IsBoolean()
  error!: boolean;

  @IsNumber()
  code!: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  data?: Readonly<T>;  // Inmutabilidad

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ErrorDetail)
  @IsArray()
  errorDetails?: ReadonlyArray<ErrorDetail>;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ErrorDetail)
  @IsArray()
  warnings?: ReadonlyArray<ErrorDetail>;

  @IsOptional()
  @IsString()
  traceId?: string;

  // Factories funcionales (puras, inmutables)
  static new(): ApiResponse<null> {
    return Object.freeze(new ApiResponse({
      success: false,
      error: false,
      code: 200,
      message: '',
      data: null,
      errorDetails: [],
      warnings: [],
      traceId: uuidv4(),
    }));
  }

  static success<T>(data: T, message: string = 'OK', code: 200 | 201 | 204 = 200): ApiResponse<T> {
    const response = Object.freeze(new ApiResponse({
      success: true,
      error: false,
      code,
      message,
      data,
      errorDetails: [],
      warnings: [],
      traceId: uuidv4(),
    }));
    return response;
  }

  static warning<T>(data: T | null, message: string, warnings: ErrorDetail[] = [], code: 200 | 202 = 200): ApiResponse<T> {
    const response = Object.freeze(new ApiResponse({
      success: true,  // Warning como success con caveats
      error: false,
      code,
      message,
      data,
      errorDetails: [],
      warnings,
      traceId: uuidv4(),
    }));
    return response;
  }

  static error(message: string, errorDetails: ErrorDetail[] = [], code: 400 | 401 | 403 | 404 | 500 = 400): ApiResponse<null> {
    const response = Object.freeze(new ApiResponse({
      success: false,
      error: true,
      code,
      message,
      data: null,
      errorDetails,
      warnings: [],
      traceId: uuidv4(),
    }));
    return response;
  }

  private constructor(init: Partial<ApiResponse<T>>) {
    Object.assign(this, init);
  }
}

// Type alias para composabilidad
export type ServiceResult<T = any> = ApiResponse<T>;