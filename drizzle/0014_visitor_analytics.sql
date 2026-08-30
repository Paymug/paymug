ALTER TABLE `stores` ADD `analytics_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE `visitor_events` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`path` text NOT NULL,
	`source` text NOT NULL,
	`device` text NOT NULL,
	`os` text NOT NULL,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `visitor_events_store_created_idx` ON `visitor_events` (`store_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `visitor_events_store_visitor_idx` ON `visitor_events` (`store_id`,`visitor_id`);
