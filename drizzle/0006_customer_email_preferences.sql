CREATE TABLE `customer_email_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`email` text NOT NULL,
	`marketing_enabled` integer DEFAULT 1 NOT NULL,
	`product_updates_enabled` integer DEFAULT 1 NOT NULL,
	`affiliate_updates_enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_email_preferences_store_email_unique` ON `customer_email_preferences` (`store_id`,`email`);
--> statement-breakpoint
CREATE INDEX `customer_email_preferences_email_idx` ON `customer_email_preferences` (lower(`email`));
