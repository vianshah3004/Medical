import { jest } from '@jest/globals';

/**
 * Mock Supabase Storage service
 */
export const mockStorageService = {
  uploadFile: jest.fn().mockResolvedValue({
    key: 'test/scans/image.jpg',
    url: 'https://mock.supabase.co/storage/v1/object/public/Diagnoscope/test/scans/image.jpg',
    bucket: 'Diagnoscope'
  }),
  getSignedDownloadUrl: jest.fn().mockResolvedValue('https://mock.supabase.co/signed-url/image.jpg')
};

/**
 * Mock ML API logic
 */
export const mockMLResponse = {
  success: true,
  scan_id: 'test-scan-id',
  results: {
    detection: 'Normal',
    confidence: 0.98,
    details: 'No abnormalities detected in the mock scan.'
  },
  insights: 'Based on the mock analysis, the scan appears to be within normal limits. Recommend routine follow-up.'
};
