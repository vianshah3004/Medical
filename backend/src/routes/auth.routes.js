import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { signupSchema, loginSchema, doctorLoginSchema } from '../validators/schemas.js';

const router = Router();

// Org signup & login
router.post('/signup',       validate(signupSchema),      authCtrl.signup);
router.post('/login',        validate(loginSchema),       authCtrl.login);

// Doctor login
router.post('/doctor/login', validate(doctorLoginSchema), authCtrl.doctorLogin);

// Get current user profile (own JWT)
router.get('/me',            authenticate,                authCtrl.getMe);

export default router;
