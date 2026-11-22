CREATE TABLE `paypal_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`environment` text NOT NULL,
	`client_id` text NOT NULL,
	`signature` text NOT NULL,
	`paypal_product_id` text NOT NULL,
	`paypal_plan_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paypal_plans_terms_idx` ON `paypal_plans` (`user_id`,`environment`,`client_id`,`signature`);
