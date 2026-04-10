import * as authService from '../services/auth.service.js';
import * as doctorService from '../services/doctor.service.js';
import * as response from '../utils/apiResponse.js';

export async function signup(req, res, next) {
  try {
    const result = await authService.signup(req.validated);
    return response.created(res, result, 'Organization registered successfully');
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.validated);
    return response.success(res, result, 'Login successful');
  } catch (err) { next(err); }
}

export async function doctorLogin(req, res, next) {
  try {
    const result = await doctorService.doctorLogin(req.validated);
    return response.success(res, result, 'Doctor login successful');
  } catch (err) { next(err); }
}

export async function getMe(req, res, next) {
  try {
    const profile = await authService.getProfile(req.user.id);
    return response.success(res, profile);
  } catch (err) { next(err); }
}
