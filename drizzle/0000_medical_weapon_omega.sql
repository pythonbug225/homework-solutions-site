CREATE TABLE `collaborators` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `compilations` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`user_id` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `compilations_user_idx` ON `compilations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`course` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`owner_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`source_key` text NOT NULL,
	`pdf_key` text,
	`state` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`compiled_revision` integer,
	`compile_token` text,
	`compile_until` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_owner_idx` ON `documents` (`owner_id`);--> statement-breakpoint
CREATE INDEX `documents_state_idx` ON `documents` (`state`);