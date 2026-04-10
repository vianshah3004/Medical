import * as notifService from '../services/notification.service.js';
import * as response from '../utils/apiResponse.js';

export async function listNotifications(req, res, next) {
  try {
    const notifications = await notifService.listNotifications(
      req.user.id,
      req.user.type || 'user',
      { limit: parseInt(req.query.limit) || 20 }
    );
    return response.success(res, notifications);
  } catch (err) { next(err); }
}

export async function markAsRead(req, res, next) {
  try {
    const notification = await notifService.markAsRead(req.params.id);
    if (!notification) return response.notFound(res, 'Notification not found');
    return response.success(res, notification, 'Marked as read');
  } catch (err) { next(err); }
}
