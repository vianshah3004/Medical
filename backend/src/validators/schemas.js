import { z } from 'zod';

export const signupSchema = z.object({
  orgName:  z.string().min(2, 'Organization name is required'),
  orgType:  z.enum(['hospital', 'lab', 'clinic']).optional().default('hospital'),
  name:     z.string().min(2, 'Name is required'),
  email:    z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email:    z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const doctorLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const addDoctorSchema = z.object({
  name:         z.string().min(2),
  email:        z.string().email(),
  specialty:    z.string().optional(),
  licenseId:    z.string().optional(),
  university:   z.string().optional(),
  institutions: z.array(z.string()).optional().default([]),
  phone:        z.string().optional(),
});

export const createPatientSchema = z.object({
  name:        z.string().min(1, 'Patient name is required'),
  patientCode: z.string().optional(),
  email:       z.string().email().optional(),
  phone:       z.string().optional(),
  dob:         z.string().optional(),
  gender:      z.enum(['male', 'female', 'other']).optional(),
  address:     z.string().optional(),
  metadata:    z.record(z.any()).optional().default({}),
});
