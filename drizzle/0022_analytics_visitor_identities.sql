CREATE TABLE `analytics_visitor_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`email` text NOT NULL,
	`linked_at` text NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_visitor_identities_store_visitor_idx` ON `analytics_visitor_identities` (`store_id`,`visitor_id`);
--> statement-breakpoint
CREATE INDEX `analytics_visitor_identities_store_email_idx` ON `analytics_visitor_identities` (`store_id`,`email`);
