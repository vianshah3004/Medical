import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  integer,
  real,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ──────────────────────────────────────────────
//  1. ORGANIZATIONS
// ──────────────────────────────────────────────
export const medOrganizations = pgTable('med_organizations', {
  id:        uuid('id').defaultRandom().primaryKey(),
  name:      varchar('name', { length: 255 }).notNull(),
  type:      varchar('type', { length: 50 }).default('hospital'), // hospital | lab | clinic
  email:     varchar('email', { length: 255 }).notNull().unique(),
  phone:     varchar('phone', { length: 30 }),
  address:   text('address'),
  logo_url:  text('logo_url'),
  settings:  jsonb('settings').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ──────────────────────────────────────────────
//  2. USERS (org staff / admins)
// ──────────────────────────────────────────────
export const medUsers = pgTable('med_users', {
  id:            uuid('id').defaultRandom().primaryKey(),
  orgId:         uuid('org_id').notNull().references(() => medOrganizations.id, { onDelete: 'cascade' }),
  name:          varchar('name', { length: 255 }).notNull(),
  email:         varchar('email', { length: 255 }).notNull().unique(),
  passwordHash:  text('password_hash').notNull(),
  role:          varchar('role', { length: 30 }).default('staff').notNull(), // admin | staff
  isActive:      boolean('is_active').default(true),
  lastLoginAt:   timestamp('last_login_at', { withTimezone: true }),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_users_org').on(t.orgId),
  index('idx_med_users_email').on(t.email),
]);

// ──────────────────────────────────────────────
//  3. DOCTORS
// ──────────────────────────────────────────────
export const medDoctors = pgTable('med_doctors', {
  id:               uuid('id').defaultRandom().primaryKey(),
  orgId:            uuid('org_id').notNull().references(() => medOrganizations.id, { onDelete: 'cascade' }),
  name:             varchar('name', { length: 255 }).notNull(),
  email:            varchar('email', { length: 255 }).notNull().unique(),
  username:         varchar('username', { length: 100 }).notNull().unique(),
  passwordHash:     text('password_hash').notNull(),
  specialty:        varchar('specialty', { length: 150 }),
  licenseId:        varchar('license_id', { length: 50 }),
  university:       varchar('university', { length: 255 }),
  institutions:     jsonb('institutions').default([]),        // array of strings
  phone:            varchar('phone', { length: 30 }),
  avatarUrl:        text('avatar_url'),
  level:            integer('level').default(1),
  status:           varchar('status', { length: 30 }).default('pending').notNull(), // pending | verified | rejected
  tempPasswordSent: boolean('temp_password_sent').default(false),
  verifiedAt:       timestamp('verified_at', { withTimezone: true }),
  verifiedBy:       uuid('verified_by'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_doctors_org').on(t.orgId),
  index('idx_med_doctors_status').on(t.status),
  index('idx_med_doctors_email').on(t.email),
]);

// ──────────────────────────────────────────────
//  4. PATIENTS
// ──────────────────────────────────────────────
export const medPatients = pgTable('med_patients', {
  id:          uuid('id').defaultRandom().primaryKey(),
  orgId:       uuid('org_id').notNull().references(() => medOrganizations.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 255 }).notNull(),
  patientCode: varchar('patient_code', { length: 50 }).unique(),
  email:       varchar('email', { length: 255 }),
  phone:       varchar('phone', { length: 30 }),
  dob:         timestamp('dob', { withTimezone: true }),
  gender:      varchar('gender', { length: 20 }),
  address:     text('address'),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_patients_org').on(t.orgId),
  index('idx_med_patients_code').on(t.patientCode),
]);

// ──────────────────────────────────────────────
//  5. SCANS
// ──────────────────────────────────────────────
export const medScans = pgTable('med_scans', {
  id:          uuid('id').defaultRandom().primaryKey(),
  orgId:       uuid('org_id').notNull().references(() => medOrganizations.id, { onDelete: 'cascade' }),
  patientId:   uuid('patient_id').references(() => medPatients.id, { onDelete: 'set null' }),
  uploadedBy:  uuid('uploaded_by').references(() => medUsers.id, { onDelete: 'set null' }),
  scanType:    varchar('scan_type', { length: 50 }).notNull(), // mri | ct | xray | ecg | skin | lung
  bodyRegion:  varchar('body_region', { length: 100 }),
  priority:    varchar('priority', { length: 20 }).default('normal'), // low | normal | high | critical
  status:      varchar('status', { length: 30 }).default('uploaded').notNull(), // uploaded | processing | completed | critical | reviewed
  metadata:    jsonb('metadata').default({}),
  notes:       text('notes'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_scans_org').on(t.orgId),
  index('idx_med_scans_patient').on(t.patientId),
  index('idx_med_scans_status').on(t.status),
  index('idx_med_scans_type').on(t.scanType),
]);

// ──────────────────────────────────────────────
//  6. SCAN ASSETS (S3 file references)
// ──────────────────────────────────────────────
export const medScanAssets = pgTable('med_scan_assets', {
  id:         uuid('id').defaultRandom().primaryKey(),
  scanId:     uuid('scan_id').notNull().references(() => medScans.id, { onDelete: 'cascade' }),
  assetType:  varchar('asset_type', { length: 30 }).notNull(), // original | heatmap | processed | thumbnail
  fileName:   varchar('file_name', { length: 255 }).notNull(),
  s3Key:      text('s3_key').notNull(),
  bucketName: varchar('bucket_name', { length: 100 }).notNull(),
  mimeType:   varchar('mime_type', { length: 100 }),
  fileSize:   integer('file_size'), // bytes
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_scan_assets_scan').on(t.scanId),
]);

// ──────────────────────────────────────────────
//  7. SCAN ASSIGNMENTS
// ──────────────────────────────────────────────
export const medScanAssignments = pgTable('med_scan_assignments', {
  id:         uuid('id').defaultRandom().primaryKey(),
  scanId:     uuid('scan_id').notNull().references(() => medScans.id, { onDelete: 'cascade' }),
  doctorId:   uuid('doctor_id').notNull().references(() => medDoctors.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => medUsers.id, { onDelete: 'set null' }),
  status:     varchar('status', { length: 30 }).default('assigned').notNull(), // assigned | in_review | completed
  notes:      text('notes'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => [
  index('idx_med_assignments_scan').on(t.scanId),
  index('idx_med_assignments_doctor').on(t.doctorId),
  index('idx_med_assignments_status').on(t.status),
]);

// ──────────────────────────────────────────────
//  8. AI JOBS
// ──────────────────────────────────────────────
export const medAiJobs = pgTable('med_ai_jobs', {
  id:          uuid('id').defaultRandom().primaryKey(),
  scanId:      uuid('scan_id').notNull().references(() => medScans.id, { onDelete: 'cascade' }),
  jobType:     varchar('job_type', { length: 50 }).notNull(), // brain_tumor | lung_disease | skin_lesion | fracture | ecg
  status:      varchar('status', { length: 30 }).default('queued').notNull(), // queued | processing | completed | failed
  priority:    integer('priority').default(0),
  attempt:     integer('attempt').default(0),
  error:       text('error'),
  startedAt:   timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_ai_jobs_scan').on(t.scanId),
  index('idx_med_ai_jobs_status').on(t.status),
]);

// ──────────────────────────────────────────────
//  9. AI RESULTS
// ──────────────────────────────────────────────
export const medAiResults = pgTable('med_ai_results', {
  id:           uuid('id').defaultRandom().primaryKey(),
  scanId:       uuid('scan_id').notNull().references(() => medScans.id, { onDelete: 'cascade' }),
  jobId:        uuid('job_id').references(() => medAiJobs.id, { onDelete: 'set null' }),
  modelName:    varchar('model_name', { length: 100 }),
  modelVersion: varchar('model_version', { length: 30 }),
  prediction:   jsonb('prediction').default({}),      // { label, confidence, class_probabilities }
  insights:     jsonb('insights').default({}),         // Groq-generated insights
  confidence:   real('confidence'),                     // 0.0–1.0
  isCritical:   boolean('is_critical').default(false),
  metadata:     jsonb('metadata').default({}),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_ai_results_scan').on(t.scanId),
]);

// ──────────────────────────────────────────────
//  10. REPORTS
// ──────────────────────────────────────────────
export const medReports = pgTable('med_reports', {
  id:          uuid('id').defaultRandom().primaryKey(),
  scanId:      uuid('scan_id').notNull().references(() => medScans.id, { onDelete: 'cascade' }),
  doctorId:    uuid('doctor_id').notNull().references(() => medDoctors.id, { onDelete: 'cascade' }),
  orgId:       uuid('org_id').notNull().references(() => medOrganizations.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 255 }),
  findings:    text('findings'),
  diagnosis:   text('diagnosis'),
  recommendations: text('recommendations'),
  severity:    varchar('severity', { length: 30 }),  // normal | mild | moderate | severe | critical
  reportData:  jsonb('report_data').default({}),     // structured report fields
  status:      varchar('status', { length: 30 }).default('draft').notNull(), // draft | submitted | approved
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_reports_scan').on(t.scanId),
  index('idx_med_reports_doctor').on(t.doctorId),
  index('idx_med_reports_org').on(t.orgId),
]);

// ──────────────────────────────────────────────
//  11. NOTIFICATIONS
// ──────────────────────────────────────────────
export const medNotifications = pgTable('med_notifications', {
  id:         uuid('id').defaultRandom().primaryKey(),
  orgId:      uuid('org_id').notNull().references(() => medOrganizations.id, { onDelete: 'cascade' }),
  userId:     uuid('user_id'),     // polymorphic — could be user or doctor
  userType:   varchar('user_type', { length: 20 }).default('user'), // user | doctor
  type:       varchar('type', { length: 50 }).notNull(), // scan_uploaded | ai_completed | assignment | report_submitted
  title:      varchar('title', { length: 255 }).notNull(),
  message:    text('message'),
  data:       jsonb('data').default({}),     // flexible payload (scanId, doctorId, etc.)
  isRead:     boolean('is_read').default(false),
  readAt:     timestamp('read_at', { withTimezone: true }),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_notifications_user').on(t.userId, t.userType),
  index('idx_med_notifications_org').on(t.orgId),
  index('idx_med_notifications_read').on(t.isRead),
]);

// ──────────────────────────────────────────────
//  12. AUDIT LOGS
// ──────────────────────────────────────────────
export const medAuditLogs = pgTable('med_audit_logs', {
  id:         uuid('id').defaultRandom().primaryKey(),
  orgId:      uuid('org_id').references(() => medOrganizations.id, { onDelete: 'set null' }),
  actorId:    uuid('actor_id'),
  actorType:  varchar('actor_type', { length: 20 }), // user | doctor | system
  action:     varchar('action', { length: 100 }).notNull(), // e.g. scan.upload, doctor.verify, report.submit
  resource:   varchar('resource', { length: 100 }),  // e.g. scan, doctor, report
  resourceId: uuid('resource_id'),
  details:    jsonb('details').default({}),
  ipAddress:  varchar('ip_address', { length: 45 }),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_med_audit_org').on(t.orgId),
  index('idx_med_audit_action').on(t.action),
  index('idx_med_audit_actor').on(t.actorId),
]);

// ──────────────────────────────────────────────
//  RELATIONS
// ──────────────────────────────────────────────

export const orgRelations = relations(medOrganizations, ({ many }) => ({
  users:         many(medUsers),
  doctors:       many(medDoctors),
  patients:      many(medPatients),
  scans:         many(medScans),
  reports:       many(medReports),
  notifications: many(medNotifications),
  auditLogs:     many(medAuditLogs),
}));

export const userRelations = relations(medUsers, ({ one }) => ({
  organization: one(medOrganizations, { fields: [medUsers.orgId], references: [medOrganizations.id] }),
}));

export const doctorRelations = relations(medDoctors, ({ one, many }) => ({
  organization: one(medOrganizations, { fields: [medDoctors.orgId], references: [medOrganizations.id] }),
  assignments:  many(medScanAssignments),
  reports:      many(medReports),
}));

export const patientRelations = relations(medPatients, ({ one, many }) => ({
  organization: one(medOrganizations, { fields: [medPatients.orgId], references: [medOrganizations.id] }),
  scans:        many(medScans),
}));

export const scanRelations = relations(medScans, ({ one, many }) => ({
  organization: one(medOrganizations, { fields: [medScans.orgId],      references: [medOrganizations.id] }),
  patient:      one(medPatients,      { fields: [medScans.patientId],  references: [medPatients.id] }),
  uploader:     one(medUsers,         { fields: [medScans.uploadedBy], references: [medUsers.id] }),
  assets:       many(medScanAssets),
  assignments:  many(medScanAssignments),
  aiJobs:       many(medAiJobs),
  aiResults:    many(medAiResults),
  reports:      many(medReports),
}));

export const scanAssetRelations = relations(medScanAssets, ({ one }) => ({
  scan: one(medScans, { fields: [medScanAssets.scanId], references: [medScans.id] }),
}));

export const assignmentRelations = relations(medScanAssignments, ({ one }) => ({
  scan:       one(medScans,   { fields: [medScanAssignments.scanId],     references: [medScans.id] }),
  doctor:     one(medDoctors, { fields: [medScanAssignments.doctorId],   references: [medDoctors.id] }),
  assignedByUser: one(medUsers, { fields: [medScanAssignments.assignedBy], references: [medUsers.id] }),
}));

export const aiJobRelations = relations(medAiJobs, ({ one }) => ({
  scan: one(medScans, { fields: [medAiJobs.scanId], references: [medScans.id] }),
}));

export const aiResultRelations = relations(medAiResults, ({ one }) => ({
  scan: one(medScans,  { fields: [medAiResults.scanId], references: [medScans.id] }),
  job:  one(medAiJobs, { fields: [medAiResults.jobId],  references: [medAiJobs.id] }),
}));

export const reportRelations = relations(medReports, ({ one }) => ({
  scan:         one(medScans,          { fields: [medReports.scanId],   references: [medScans.id] }),
  doctor:       one(medDoctors,        { fields: [medReports.doctorId], references: [medDoctors.id] }),
  organization: one(medOrganizations,  { fields: [medReports.orgId],   references: [medOrganizations.id] }),
}));

export const notificationRelations = relations(medNotifications, ({ one }) => ({
  organization: one(medOrganizations, { fields: [medNotifications.orgId], references: [medOrganizations.id] }),
}));

export const auditLogRelations = relations(medAuditLogs, ({ one }) => ({
  organization: one(medOrganizations, { fields: [medAuditLogs.orgId], references: [medOrganizations.id] }),
}));
