ALTER TABLE `stores` ADD `abandonment_popup_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `stores` ADD `abandonment_question` text;
--> statement-breakpoint
ALTER TABLE `stores` ADD `abandonment_options` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
CREATE TABLE `abandonment_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text,
	`email` text,
	`question` text NOT NULL,
	`answer` text,
	`marketing_opt_in` integer DEFAULT false NOT NULL,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `abandonment_responses_store_created_idx` ON `abandonment_responses` (`store_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `abandonment_responses_user_created_idx` ON `abandonment_responses` (`user_id`,`created_at`);
