CREATE INDEX `products_slug_idx` ON `products` (`slug`);
--> statement-breakpoint
CREATE INDEX `products_user_store_environment_created_idx` ON `products` (`user_id`,`store_id`,`environment`,`created_at`);
--> statement-breakpoint
CREATE INDEX `orders_user_store_environment_created_idx` ON `orders` (`user_id`,`store_id`,`environment`,`created_at`);
--> statement-breakpoint
CREATE INDEX `orders_paypal_order_environment_idx` ON `orders` (`paypal_order_id`,`environment`);
--> statement-breakpoint
CREATE INDEX `orders_paypal_capture_environment_idx` ON `orders` (`paypal_capture_id`,`environment`);
--> statement-breakpoint
CREATE INDEX `orders_customer_environment_status_created_idx` ON `orders` (lower(`customer_email`),`environment`,`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `orders_reminder_purchase_lookup_idx` ON `orders` (`store_id`,`product_id`,lower(`customer_email`),`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `feature_records_user_feature_environment_created_idx` ON `feature_records` (`user_id`,`feature`,`environment`,`created_at`);
--> statement-breakpoint
CREATE INDEX `feature_records_customer_portal_idx` ON `feature_records` (lower(`subtitle`),`environment`,`feature`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `feature_records_paypal_subscription_idx` ON `feature_records` (`feature`,`environment`,json_extract(`data`, '$.paypalSubscriptionId'));
