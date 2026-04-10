export function errorHandler(err, req, res, _next) {
  console.error('[ERROR]', err.stack || err.message);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: 'validation_error',
      details: err.errors,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'auth_error',
    });
  }

  // Database unique constraint violation (Postgres code 23505)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry — resource already exists',
      error: 'duplicate_entry',
    });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: err.error || 'internal_error',
  });
}
