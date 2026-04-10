import { Router } from 'express';
import * as patientCtrl from '../controllers/patient.controller.js';
import { authenticate, orgScope } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createPatientSchema } from '../validators/schemas.js';

const router = Router();
router.use(authenticate, orgScope);

router.post('/', validate(createPatientSchema), patientCtrl.createPatient);
router.get('/',  patientCtrl.listPatients);
router.get('/:id', patientCtrl.getPatient);

export default router;
