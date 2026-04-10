import { verifyToken } from '../utils/jwt.js';
import { unauthorized, forbidden } from '../utils/apiResponse.js';

/**
 * JWT authentication middleware.
 * Attaches req.user = { id, orgId, role, type }
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res, 'Missing or invalid authorization header');
  }

  try {
    const token = header.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded; // { id, orgId, role, type }
    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
}

/**
 * Role-based authorization.
 * Usage: authorize('admin', 'staff')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Role '${req.user.role}' is not authorized for this action`);
    }
    next();
  };
}

/**
 * Ensures queries are scoped to the authenticated user's organization.
 * Attaches req.orgId for convenience.
 */
export function orgScope(req, res, next) {
  if (!req.user?.orgId) {
    return unauthorized(res, 'Organization context missing');
  }
  req.orgId = req.user.orgId;
  next();
}
