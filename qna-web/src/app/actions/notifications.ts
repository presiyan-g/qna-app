'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/services/auth';
import { markNotificationsSeen } from '@/services/notifications';

/**
 * Stamps the viewer's `last_seen_notifications_at` to `now()` so the bell
 * badge drops to 0. Called from the bell button's open handler.
 *
 * Best-effort: silently no-ops for logged-out callers rather than throwing.
 * Revalidates the root layout so the next navigation re-renders `Nav` with
 * the fresh unread count.
 */
export async function markNotificationsSeenAction(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await markNotificationsSeen(session.sub);
  revalidatePath('/', 'layout');
}
