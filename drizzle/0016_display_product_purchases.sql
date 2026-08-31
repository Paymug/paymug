ALTER TABLE `stores` ADD `display_purchases_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `products` ADD `purchase_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `products`
SET `purchase_count` = (
	SELECT count(*)
	FROM `orders`
	WHERE `orders`.`product_id` = `products`.`id`
		AND `orders`.`status` IN ('paid', 'refunded')
);
