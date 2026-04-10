import { Router } from 'express';
import multer from 'multer';
import * as scanCtrl from '../controllers/scan.controller.js';
import * as reportCtrl from '../controllers/report.controller.js';
import { authenticate, authorize, orgScope } from '../middlewares/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

const router = Router();
router.use(authenticate);

// --- Doctor-facing scan routes ---
router.get('/doctor/inbox',   authorize('doctor'), scanCtrl.getDoctorScans);
router.get('/doctor/:id',     authorize('doctor'), scanCtrl.getDoctorScanDetail);
router.post('/:id/report',    authorize('doctor'), reportCtrl.submitReport);

// --- Org staff routes ---
router.post('/',              orgScope, upload.single('file'), scanCtrl.uploadScan);
router.get('/history',        orgScope, scanCtrl.listScans);
router.get('/',               orgScope, scanCtrl.listScans);
router.get('/:id',            orgScope, scanCtrl.getScan);
router.post('/:id/assign',    orgScope, authorize('admin', 'staff'), scanCtrl.assignDoctor);
router.patch('/:id/status',   orgScope, scanCtrl.updateStatus);
router.get('/:id/report',     orgScope, reportCtrl.getReportByScan);

export default router;
