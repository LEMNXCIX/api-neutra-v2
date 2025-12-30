export interface IUserRepository {
  create(user: any): Promise<{ success: boolean; data?: any }>;
  findById(id: string): Promise<any | null>;
  update(id: string, user: any): Promise<{ success: boolean; data?: any }>;
  delete(id: string): Promise<{ success: boolean }>;
}