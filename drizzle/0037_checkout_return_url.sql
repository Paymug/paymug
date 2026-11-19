ALTER TABLE `stores` ADD `allowed_redirect_domains` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `products` ADD `auto_redirect` integer DEFAULT true NOT NULL;
