ALTER TABLE `product_categories` ADD `sort_order` integer DEFAULT 0 NOT NULL;

UPDATE `product_categories`
SET `sort_order` = (
	SELECT count(*) - 1
	FROM `product_categories` AS `previous`
	WHERE `previous`.`store_id` = `product_categories`.`store_id`
		AND (`previous`.`created_at` < `product_categories`.`created_at`
			OR (`previous`.`created_at` = `product_categories`.`created_at`
				AND `previous`.`id` <= `product_categories`.`id`))
);

CREATE TABLE `product_category_products` (
	`category_id` text NOT NULL,
	`product_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`category_id`, `product_id`),
	FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `product_category_products` (`category_id`, `product_id`, `created_at`)
SELECT `category_id`, `id`, `updated_at`
FROM `products`
WHERE `category_id` IS NOT NULL;

CREATE INDEX `product_category_products_product_idx` ON `product_category_products` (`product_id`);
