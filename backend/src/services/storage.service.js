import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;

  if (!config.storage.url || !config.storage.serviceKey) {
    console.log('[STORAGE] No Supabase credentials configured — using local simulation');
    return null;
  }

  supabase = createClient(config.storage.url, config.storage.serviceKey);
  return supabase;
}

/**
 * Upload a file buffer to Supabase Storage.
 */
export async function uploadFile({ key, body, contentType, bucket }) {
  const client = getSupabase();
  const bucketName = bucket || config.storage.bucket;

  if (!client) {
    console.log(`[STORAGE-DEV] Simulated upload → supabase://${bucketName}/${key}`);
    return { key, bucket: bucketName, simulated: true };
  }

  const { data, error } = await client.storage
    .from(bucketName)
    .upload(key, body, {
      contentType,
      upsert: true,
    });

  if (error) throw error;
  return { key, bucket: bucketName };
}

/**
 * Generate a time-limited signed URL for reading a file.
 */
export async function getSignedDownloadUrl(key, bucket) {
  const client = getSupabase();
  const bucketName = bucket || config.storage.bucket;

  if (!client) {
    return `http://localhost:${config.port}/dev/storage/${bucketName}/${key}`;
  }

  const { data, error } = await client.storage
    .from(bucketName)
    .createSignedUrl(key, config.storage.signedUrlExpiry);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Generate a signed URL for direct browser upload.
 */
export async function getSignedUploadUrl(key, contentType, bucket) {
  const client = getSupabase();
  const bucketName = bucket || config.storage.bucket;

  if (!client) {
    return `http://localhost:${config.port}/dev/storage-upload/${bucketName}/${key}`;
  }

  // Note: createSignedUploadUrl creates a temporary placeholder and returns a URL
  const { data, error } = await client.storage
    .from(bucketName)
    .createSignedUploadUrl(key);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(key, bucket) {
  const client = getSupabase();
  const bucketName = bucket || config.storage.bucket;

  if (!client) {
    console.log(`[STORAGE-DEV] Simulated delete → supabase://${bucketName}/${key}`);
    return;
  }

  const { error } = await client.storage
    .from(bucketName)
    .remove([key]);

  if (error) throw error;
}
