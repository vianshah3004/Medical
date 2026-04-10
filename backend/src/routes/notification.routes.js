import { Router } from 'express';
import * as notifCtrl from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();
router.use(authenticate);

router.get('/',          notifCtrl.listNotifications);
router.patch('/:id/read', notifCtrl.markAsRead);

export default router;
