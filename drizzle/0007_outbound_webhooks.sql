CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text NOT NULL,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`secret_encrypted` text NOT NULL,
	`events` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhooks_user_store_environment_idx` ON `webhooks` (`user_id`,`store_id`,`environment`);
--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`event_name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`request_body` text NOT NULL,
	`response_status` integer,
	`response_body` text,
	`error` text,
	`duration_ms` integer,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_deliveries_webhook_created_idx` ON `webhook_deliveries` (`webhook_id`,`created_at`);
