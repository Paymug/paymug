ALTER TABLE `product_category_products` ADD `sort_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `product_category_products`
SET `sort_order` = (
	SELECT count(*)
	FROM `product_category_products` AS `previous`
	WHERE `previous`.`category_id` = `product_category_products`.`category_id`
		AND (`previous`.`created_at` < `product_category_products`.`created_at`
			OR (`previous`.`created_at` = `product_category_products`.`created_at`
				AND `previous`.`product_id` <= `product_category_products`.`product_id`))
);
