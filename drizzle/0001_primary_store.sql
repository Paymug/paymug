ALTER TABLE `users` ADD `primary_store_id` text;
UPDATE `users`
SET `primary_store_id` = `active_store_id`
WHERE `primary_store_id` IS NULL;
