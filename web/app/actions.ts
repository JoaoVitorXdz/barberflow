'use server';

import { redirect } from 'next/navigation';

export async function goToShopAction(formData: FormData): Promise<void> {
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    redirect('/');
  }
  redirect(`/b/${slug}`);
}