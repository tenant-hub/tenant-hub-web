import api from './api';
import type { PageResponse } from './userService';

export interface RealEstate {
  id: number;
  name: string;
  description: string;
  type: string;
  province: string;
  district: string;
  neighborhood: string;
  address: string;
  tenantId: number | null;
  tenantName: string | null;
  landlordId: number | null;
  landlordName: string | null;
  status: string;
  createdDate: string;
  createdBy: string;
}

export interface RealEstateRequest {
  name: string;
  description?: string;
  type: string;
  province: string;
  district: string;
  neighborhood: string;
  address: string;
  tenantId?: number | null;
  landlordId?: number | null;
}

export interface RealEstateListParams {
  page: number;
  size: number;
  sort?: string;
  name?: string;
  type?: string;
  province?: string;
  status?: string;
}

export async function getRealEstates(params: RealEstateListParams): Promise<PageResponse<RealEstate>> {
  const { data } = await api.get<PageResponse<RealEstate>>('/real-estates', { params });
  return data;
}

export async function createRealEstate(payload: RealEstateRequest): Promise<RealEstate> {
  const { data } = await api.post<RealEstate>('/real-estates', payload);
  return data;
}

export async function updateRealEstate(id: number, payload: RealEstateRequest): Promise<RealEstate> {
  const { data } = await api.put<RealEstate>(`/real-estates/${id}`, payload);
  return data;
}

export async function deleteRealEstate(id: number): Promise<void> {
  await api.delete(`/real-estates/${id}`);
}
