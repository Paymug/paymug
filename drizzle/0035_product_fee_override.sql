ALTER TABLE `products` ADD `transaction_fee_override` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `products` SET `transaction_fee_override` = 1 WHERE EXISTS (SELECT 1 FROM `stores` WHERE `stores`.`id` = `products`.`store_id` AND (`stores`.`transaction_fee_type` != `products`.`transaction_fee_type` OR `stores`.`transaction_fee_value` != `products`.`transaction_fee_value`));
