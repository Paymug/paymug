ALTER TABLE `products` ADD `extra_seats_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `products` ADD `extra_seat_tiers` text DEFAULT '[]' NOT NULL;
