import { Router } from 'express';
import * as analyticsCtrl from '../controllers/analytics.controller.js';
import { authenticate, orgScope } from '../middlewares/auth.js';

const router = Router();
router.use(authenticate, orgScope);

router.get('/overview', analyticsCtrl.getOverview);
router.get('/volume',   analyticsCtrl.getVolume);
router.get('/workload', analyticsCtrl.getDoctorWorkload);

export default router;
