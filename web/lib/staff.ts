import 'server-only';
import { redirect } from 'next/navigation';
import { getSession, type Session } from './session';

export const STAFF_ROLES = ['owner', 'receptionist', 'barber'];

// Garante que há alguém da equipe logado nesta barbearia.
export async function requireStaff(slug: string): Promise<Session> {
  const session = await getSession(slug);
  if (!session) {
    redirect(`/b/${slug}/entrar`);
  }
  if (!STAFF_ROLES.includes(session.role)) {
    redirect(`/b/${slug}`);
  }
  return session;
}