import 'server-only';
import { notFound } from 'next/navigation';
import { ApiError, apiFetch } from './api';

export interface Tenant {
  name: string;
  slug: string;
  timezone: string;
}

export async function loadTenant(slug: string): Promise<Tenant> {
  try {
    return await apiFetch<Tenant>(`/tenants/${encodeURIComponent(slug)}`, {
      auth: false,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}