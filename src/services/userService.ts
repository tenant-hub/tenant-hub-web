import api from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  lastLoginDate: string | null;
  errorLoginCount: number;
  createdDate: string;
  createdBy: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface UserListParams {
  page: number;
  size: number;
  sort?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface UpdateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
}

export async function getUsers(params: UserListParams): Promise<PageResponse<User>> {
  const { data } = await api.get<PageResponse<User>>('/users', { params });
  return data;
}

export async function createUser(payload: CreateUserRequest): Promise<User> {
  const { data } = await api.post<User>('/users', payload);
  return data;
}

export async function updateUser(id: number, payload: UpdateUserRequest): Promise<User> {
  const { data } = await api.put<User>(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
