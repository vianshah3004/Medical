import { badRequest } from '../utils/apiResponse.js';

/**
 * Express middleware factory for Zod schema validation.
 * Usage: validate(yourZodSchema)
 * Validates req.body against the schema.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return badRequest(res, 'Validation failed', result.error.flatten().fieldErrors);
    }
    req.validated = result.data;
    next();
  };
}
