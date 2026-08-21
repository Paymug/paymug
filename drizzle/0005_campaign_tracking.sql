CREATE TABLE `campaign_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`subscriber_id` text,
	`email` text NOT NULL,
	`opened_at` text,
	`clicked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `feature_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `campaign_deliveries_campaign_idx` ON `campaign_deliveries` (`campaign_id`);
--> statement-breakpoint
CREATE INDEX `campaign_deliveries_email_idx` ON `campaign_deliveries` (`email`);
