import { Router } from 'express';
import * as reportCtrl from '../controllers/report.controller.js';
import { authenticate, authorize, orgScope } from '../middlewares/auth.js';

const router = Router();
router.use(authenticate, orgScope);

router.post('/:scanId/email', authorize('admin', 'staff'), reportCtrl.sendReportToPatient);
router.get('/', reportCtrl.listReports);

export default router;
