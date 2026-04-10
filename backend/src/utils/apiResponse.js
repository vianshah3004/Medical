/**
 * Standard API response wrappers
 */
export function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function created(res, data = null, message = 'Created') {
  return success(res, data, message, 201);
}

export function error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

export function notFound(res, message = 'Resource not found') {
  return error(res, message, 404);
}

export function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

export function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

export function badRequest(res, message = 'Bad request', details = null) {
  return error(res, message, 400, details);
}
