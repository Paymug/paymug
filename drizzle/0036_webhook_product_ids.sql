ALTER TABLE `webhooks` ADD `product_ids` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
UPDATE `webhooks` SET `product_ids` = json_array(`product_id`) WHERE `product_id` IS NOT NULL;
