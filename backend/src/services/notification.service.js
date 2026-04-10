import { db } from '../db/index.js';
import { medNotifications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Create a notification.
 */
export async function createNotification({ orgId, userId, userType, type, title, message, data }) {
  const [notification] = await db.insert(medNotifications).values({
    orgId,
    userId,
    userType: userType || 'user',
    type,
    title,
    message,
    data: data || {},
  }).returning();

  return notification;
}

/**
 * List notifications for a user.
 */
export async function listNotifications(userId, userType = 'user', { limit = 20 } = {}) {
  return db.select().from(medNotifications)
    .where(and(eq(medNotifications.userId, userId), eq(medNotifications.userType, userType)))
    .orderBy(desc(medNotifications.createdAt))
    .limit(limit);
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId) {
  const [updated] = await db.update(medNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(medNotifications.id, notificationId))
    .returning();
  return updated;
}
