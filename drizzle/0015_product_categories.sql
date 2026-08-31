CREATE TABLE `product_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_categories_store_slug_idx` ON `product_categories` (`store_id`,`slug`);
--> statement-breakpoint
CREATE INDEX `product_categories_user_store_idx` ON `product_categories` (`user_id`,`store_id`);
--> statement-breakpoint
ALTER TABLE `products` ADD `category_id` text REFERENCES product_categories(id) ON DELETE set null;
--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);
