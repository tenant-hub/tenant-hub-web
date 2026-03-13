import api from './api';
import type { PageResponse } from './userService';

export interface Rent {
  id: number;
  realEstateId: number;
  realEstateName: string;
  rentDate: string;
  rentAmount: number;
  currency: string;
  zamOrani?: number;
  status: string;
  createdDate: string;
  createdBy: string;
}

export interface RentRequest {
  realEstateId: number;
  rentDate: string;
  rentAmount: number;
  currency: string;
  zamOrani?: number;
}

export interface RentListParams {
  page: number;
  size: number;
  sort?: string;
  status?: string;
  realEstateId?: number;
}

export async function getRents(params: RentListParams): Promise<PageResponse<Rent>> {
  const { data } = await api.get<PageResponse<Rent>>('/rents', { params });
  return data;
}

export async function createRent(payload: RentRequest): Promise<Rent> {
  const { data } = await api.post<Rent>('/rents', payload);
  return data;
}

export async function updateRent(id: number, payload: RentRequest): Promise<Rent> {
  const { data } = await api.put<Rent>(`/rents/${id}`, payload);
  return data;
}

export async function updateRentStatus(id: number, status: string): Promise<Rent> {
  const { data } = await api.patch<Rent>(`/rents/${id}/status/${status}`);
  return data;
}

export async function deleteRent(id: number): Promise<void> {
  await api.delete(`/rents/${id}`);
}
