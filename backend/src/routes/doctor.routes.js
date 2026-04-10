import { Router } from 'express';
import * as doctorCtrl from '../controllers/doctor.controller.js';
import { authenticate, authorize, orgScope } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { addDoctorSchema } from '../validators/schemas.js';

const router = Router();

// All doctor-management routes require auth + org scope
router.use(authenticate, orgScope);

router.post('/',            authorize('admin', 'staff'), validate(addDoctorSchema), doctorCtrl.addDoctor);
router.get('/',             doctorCtrl.listDoctors);
router.get('/:id',          doctorCtrl.getDoctor);
router.patch('/:id/verify', authorize('admin'),          doctorCtrl.verifyDoctor);

export default router;
