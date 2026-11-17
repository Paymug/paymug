CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`price` integer NOT NULL,
	`custom_amount_enabled` integer,
	`min_price` integer,
	`suggested_price` integer,
	`billing_type` text,
	`interval_unit` text,
	`interval_count` integer,
	`trial_days` integer,
	`product_files` text,
	`generate_license` integer,
	`license_type` text,
	`license_seat_limit` integer,
	`license_update_period_unit` text,
	`license_update_period_count` integer,
	`delivery_content` text,
	`redirect_url` text,
	`github_repo_owner` text,
	`github_repo_name` text,
	`source` text,
	`source_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_variants_product_idx` ON `product_variants` (`product_id`,`sort`);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_source_idx` ON `product_variants` (`user_id`,`environment`,`source`,`source_id`);
--> statement-breakpoint
INSERT INTO `product_variants` (`id`,`product_id`,`user_id`,`store_id`,`environment`,`name`,`slug`,`description`,`sort`,`status`,`price`,`created_at`,`updated_at`)
SELECT json_extract(o.value,'$.id'), p.id, p.user_id, p.store_id, p.environment,
  json_extract(o.value,'$.name'), lower(replace(json_extract(o.value,'$.name'),' ','-')) || '-' || o.key, '', CAST(o.key AS integer), 'published',
  CAST(json_extract(o.value,'$.price') AS integer), p.created_at, p.updated_at
FROM `products` p, json_each(CASE WHEN json_valid(p.options) THEN p.options ELSE '[]' END) o
WHERE json_extract(o.value,'$.id') IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `variant_id` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD `variant_name` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD `source` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD `source_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_source_idx` ON `orders` (`user_id`,`environment`,`source`,`source_id`);
--> statement-breakpoint
ALTER TABLE `products` ADD `source` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `source_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `products_source_idx` ON `products` (`user_id`,`environment`,`source`,`source_id`);
--> statement-breakpoint
CREATE TABLE `migration_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text NOT NULL,
	`source` text NOT NULL,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stage` text DEFAULT 'products' NOT NULL,
	`cursor` text DEFAULT '{}' NOT NULL,
	`options` text DEFAULT '{}' NOT NULL,
	`counts` text DEFAULT '{}' NOT NULL,
	`errors` text DEFAULT '[]' NOT NULL,
	`id_map` text DEFAULT '{}' NOT NULL,
	`encrypted_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`finished_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `migration_jobs_user_idx` ON `migration_jobs` (`user_id`,`created_at`);
