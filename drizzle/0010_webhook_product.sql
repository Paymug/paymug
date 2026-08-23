ALTER TABLE `webhooks` ADD `product_id` text REFERENCES `products`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `webhooks` DROP COLUMN `secret_encrypted`;
