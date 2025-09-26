declare global {
  interface ApiPayload<T = any> {
    success: boolean;
    code: number;
    message?: string;
    data?: T;
    errors?: any;
    warnings?: any;
    traceId?: string;
  }

  type ServiceResult<T = any> = ApiPayload<T>;
}

export {};
