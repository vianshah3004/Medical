CREATE TABLE "med_ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 0,
	"attempt" integer DEFAULT 0,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "med_ai_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"job_id" uuid,
	"model_name" varchar(100),
	"model_version" varchar(30),
	"prediction" jsonb DEFAULT '{}'::jsonb,
	"insights" jsonb DEFAULT '{}'::jsonb,
	"confidence" real,
	"is_critical" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "med_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"actor_id" uuid,
	"actor_type" varchar(20),
	"action" varchar(100) NOT NULL,
	"resource" varchar(100),
	"resource_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "med_doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"specialty" varchar(150),
	"license_id" varchar(50),
	"university" varchar(255),
	"institutions" jsonb DEFAULT '[]'::jsonb,
	"phone" varchar(30),
	"avatar_url" text,
	"level" integer DEFAULT 1,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"temp_password_sent" boolean DEFAULT false,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "med_doctors_email_unique" UNIQUE("email"),
	CONSTRAINT "med_doctors_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "med_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"user_type" varchar(20) DEFAULT 'user',
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "med_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'hospital',
	"email" varchar(255) NOT NULL,
	"phone" varchar(30),
	"address" text,
	"logo_url" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "med_organizations_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "med_patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"patient_code" varchar(50),
	"email" varchar(255),
	"phone" varchar(30),
	"dob" timestamp with time zone,
	"gender" varchar(20),
	"address" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "med_patients_patient_code_unique" UNIQUE("patient_code")
);
--> statement-breakpoint
CREATE TABLE "med_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"title" varchar(255),
	"findings" text,
	"diagnosis" text,
	"recommendations" text,
	"severity" varchar(30),
	"report_data" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "med_scan_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"asset_type" varchar(30) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"s3_key" text NOT NULL,
	"bucket_name" varchar(100) NOT NULL,
	"mime_type" varchar(100),
	"file_size" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "med_scan_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"assigned_by" uuid,
	"status" varchar(30) DEFAULT 'assigned' NOT NULL,
	"notes" text,
	"assigned_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "med_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"patient_id" uuid,
	"uploaded_by" uuid,
	"scan_type" varchar(50) NOT NULL,
	"body_region" varchar(100),
	"priority" varchar(20) DEFAULT 'normal',
	"status" varchar(30) DEFAULT 'uploaded' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "med_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(30) DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "med_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "med_ai_jobs" ADD CONSTRAINT "med_ai_jobs_scan_id_med_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."med_scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_ai_results" ADD CONSTRAINT "med_ai_results_scan_id_med_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."med_scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_ai_results" ADD CONSTRAINT "med_ai_results_job_id_med_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."med_ai_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_audit_logs" ADD CONSTRAINT "med_audit_logs_org_id_med_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."med_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_doctors" ADD CONSTRAINT "med_doctors_org_id_med_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."med_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_notifications" ADD CONSTRAINT "med_notifications_org_id_med_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."med_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_patients" ADD CONSTRAINT "med_patients_org_id_med_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."med_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_reports" ADD CONSTRAINT "med_reports_scan_id_med_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."med_scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_reports" ADD CONSTRAINT "med_reports_doctor_id_med_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."med_doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_reports" ADD CONSTRAINT "med_reports_org_id_med_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."med_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_scan_assets" ADD CONSTRAINT "med_scan_assets_scan_id_med_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."med_scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_scan_assignments" ADD CONSTRAINT "med_scan_assignments_scan_id_med_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."med_scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_scan_assignments" ADD CONSTRAINT "med_scan_assignments_doctor_id_med_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."med_doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_scan_assignments" ADD CONSTRAINT "med_scan_assignments_assigned_by_med_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."med_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_scans" ADD CONSTRAINT "med_scans_org_id_med_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."med_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_scans" ADD CONSTRAINT "med_scans_patient_id_med_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."med_patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_scans" ADD CONSTRAINT "med_scans_uploaded_by_med_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."med_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_users" ADD CONSTRAINT "med_users_org_id_med_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."med_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_med_ai_jobs_scan" ON "med_ai_jobs" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_med_ai_jobs_status" ON "med_ai_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_med_ai_results_scan" ON "med_ai_results" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_med_audit_org" ON "med_audit_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_med_audit_action" ON "med_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_med_audit_actor" ON "med_audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_med_doctors_org" ON "med_doctors" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_med_doctors_status" ON "med_doctors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_med_doctors_email" ON "med_doctors" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_med_notifications_user" ON "med_notifications" USING btree ("user_id","user_type");--> statement-breakpoint
CREATE INDEX "idx_med_notifications_org" ON "med_notifications" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_med_notifications_read" ON "med_notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_med_patients_org" ON "med_patients" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_med_patients_code" ON "med_patients" USING btree ("patient_code");--> statement-breakpoint
CREATE INDEX "idx_med_reports_scan" ON "med_reports" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_med_reports_doctor" ON "med_reports" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_med_reports_org" ON "med_reports" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_med_scan_assets_scan" ON "med_scan_assets" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_med_assignments_scan" ON "med_scan_assignments" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_med_assignments_doctor" ON "med_scan_assignments" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_med_assignments_status" ON "med_scan_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_med_scans_org" ON "med_scans" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_med_scans_patient" ON "med_scans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_med_scans_status" ON "med_scans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_med_scans_type" ON "med_scans" USING btree ("scan_type");--> statement-breakpoint
CREATE INDEX "idx_med_users_org" ON "med_users" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_med_users_email" ON "med_users" USING btree ("email");