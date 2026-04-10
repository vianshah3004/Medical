import { jest } from '@jest/globals';

// --- Mocks Foundation (must be at the top for ESM) ---
jest.mock('../src/services/storage.service.js', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    key: 'test/scans/brain.jpg',
    url: 'https://mock.supabase.co/storage/v1/object/public/Diagnoscope/test/scans/brain.jpg',
    bucket: 'Diagnoscope'
  }),
  getSignedDownloadUrl: jest.fn().mockResolvedValue('https://mock.supabase.co/signed-url/image.jpg')
}));

import request from 'supertest';
import app from '../src/index.js';
import { signToken } from '../src/utils/jwt.js';
// Import mocked services to verify calls if needed
import * as storageService from '../src/services/storage.service.js';

const TEST_USER = {
  id: '85220fa5-a3ee-4e6c-bde3-e86a2cbb28d3',
  orgId: '4ac133be-527b-4fe4-96a5-805295a9cc3a',
  role: 'admin',
  type: 'user'
};

const authHeader = `Bearer ${signToken(TEST_USER)}`;

const logResult = (name, input, output, snapshot, error = null) => {
  if (!error) {
    console.log(`\n✅ PASS: ${name}`);
  } else {
    console.log(`\n❌ FAIL: ${name}`);
    console.log(`   Error: ${error}`);
  }
};

describe('DiagnoScope System Tests', () => {
  let createdScanId = null;

  test('🔹 Health Check', async () => {
    const res = await request(app).get('/health');
    const pass = res.status === 200 && res.body.status === 'ok';
    logResult('Health Check', null, null, null, pass ? null : 'Failed');
    expect(res.status).toBe(200);
  });

  test('🔹 Image Upload & Scan Submission', async () => {
    // Note: In real scenarios we'd use .attach() for file upload, 
    // but we'll test the endpoint logic here.
    const res = await request(app)
      .post('/api/v1/scans')
      .set('Authorization', authHeader)
      .attach('file', Buffer.from('fake-image'), 'scan.jpg')
      .field('scanType', 'mri')
      .field('bodyRegion', 'brain')
      .field('notes', 'automated test');

    if (res.status === 201) {
      createdScanId = res.body.data.id;
      logResult('Image Upload & Scan Submission', null, null, null);
    } else {
      logResult('Image Upload & Scan Submission', null, null, null, `Status ${res.status}`);
    }

    expect(res.status).toBe(201);
  });

  test('🔹 Insights API Test', async () => {
    const res = await request(app)
      .get(`/api/v1/scans/${createdScanId}`)
      .set('Authorization', authHeader);

    const aiResult = res.body?.data?.aiResults?.[0];
    expect(aiResult).toBeDefined();
    expect(aiResult?.insights).toBeTruthy();
    logResult('Insights API Test', null, null, null);
  });

  test('🔹 Full Pipeline Verification', async () => {
    const res = await request(app)
      .get(`/api/v1/scans/${createdScanId}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdScanId);
    expect(res.body.data.aiResults?.length || 0).toBeGreaterThan(0);
    logResult('Full Pipeline Verification', null, null, null);
  });

  afterAll(async () => {
    console.log('\n==========================');
    console.log('      TEST REPORT');
    console.log('==========================');
  });
});
