import { checkPythonHealth } from './python.service.js';

/**
 * Proxy a scan analysis request to the Python ML service.
 */
export async function analyzeWithML() {
  throw Object.assign(new Error('analyzeWithML is deprecated. Use services/python.service.js'), {
    statusCode: 500,
  });
}

/**
 * Check ML API health.
 */
export async function checkMLHealth() {
  return checkPythonHealth();
}
