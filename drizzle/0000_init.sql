CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`store_name` text NOT NULL,
	`store_slug` text NOT NULL,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`active_store_id` text,
	`github_oauth_hostname` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_store_slug_unique` ON `users` (`store_slug`);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`logo_image_url` text,
	`cover_image_url` text,
	`email_from` text,
	`email_reply_to` text,
	`payment_credential_source_store_id` text,
	`payment_gateway` text DEFAULT 'paypal' NOT NULL,
	`github_credential_source_store_id` text,
	`affiliates_enabled` integer DEFAULT 1 NOT NULL,
	`affiliate_commission_type` text DEFAULT 'percentage' NOT NULL,
	`affiliate_commission_value` real DEFAULT 10 NOT NULL,
	`affiliate_commission_duration` text DEFAULT 'one_time' NOT NULL,
	`affiliate_attribution_model` text DEFAULT 'last_click' NOT NULL,
	`email_campaigns_enabled` integer DEFAULT 1 NOT NULL,
	`abandoned_checkout_reminders_enabled` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`transaction_fee_type` text DEFAULT 'fixed' NOT NULL,
	`transaction_fee_value` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_slug_idx` ON `stores` (`slug`);
--> statement-breakpoint
CREATE INDEX `stores_user_idx` ON `stores` (`user_id`);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price` integer NOT NULL,
	`transaction_fee_type` text DEFAULT 'fixed' NOT NULL,
	`transaction_fee_value` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`image_url` text,
	`delivery_content` text,
	`product_files` text DEFAULT '[]' NOT NULL,
	`generate_license` integer DEFAULT 0 NOT NULL,
	`license_type` text DEFAULT 'standard' NOT NULL,
	`license_update_period_unit` text,
	`license_update_period_count` integer DEFAULT 1 NOT NULL,
	`billing_type` text DEFAULT 'one_time' NOT NULL,
	`interval_unit` text,
	`interval_count` integer DEFAULT 1 NOT NULL,
	`trial_days` integer DEFAULT 0 NOT NULL,
	`github_repo_owner` text,
	`github_repo_name` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`product_description` text,
	`product_price` integer,
	`delivery_content` text,
	`product_files` text DEFAULT '[]' NOT NULL,
	`github_repo_owner` text,
	`github_repo_name` text,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`customer_email` text NOT NULL,
	`customer_name` text,
	`discount_code` text,
	`discount_amount` integer DEFAULT 0 NOT NULL,
	`transaction_fee_amount` integer DEFAULT 0 NOT NULL,
	`affiliate_id` text,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`paypal_order_id` text,
	`paypal_capture_id` text,
	`stripe_checkout_session_id` text,
	`stripe_payment_intent_id` text,
	`gateway` text DEFAULT 'paypal' NOT NULL,
	`created_at` text NOT NULL,
	`paid_at` text,
	`github_username` text,
	`github_access_status` text DEFAULT 'not_required' NOT NULL,
	`github_access_managed` integer DEFAULT 0 NOT NULL,
	`github_invitation_id` text,
	`github_access_error` text,
	`github_access_granted_at` text,
	`github_access_revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `checkout_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text NOT NULL,
	`product_id` text NOT NULL,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`customer_email` text NOT NULL,
	`customer_name` text,
	`product_name` text NOT NULL,
	`checkout_url` text NOT NULL,
	`due_at` text NOT NULL,
	`sent_at` text,
	`cancelled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_reminders_store_product_environment_email_idx` ON `checkout_reminders` (`store_id`,`product_id`,`environment`,`customer_email`);
--> statement-breakpoint
CREATE INDEX `checkout_reminders_due_idx` ON `checkout_reminders` (`due_at`,`sent_at`,`cancelled_at`);
--> statement-breakpoint
CREATE TABLE `github_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`github_user_id` text NOT NULL,
	`login` text NOT NULL,
	`access_token_encrypted` text NOT NULL,
	`scopes` text DEFAULT '' NOT NULL,
	`connected_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `paypal_connections` (
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`client_secret_encrypted` text NOT NULL,
	`mode` text DEFAULT 'sandbox' NOT NULL,
	`merchant_email` text,
	`webhook_id` text,
	`webhook_url` text,
	`webhook_status` text DEFAULT 'not_configured' NOT NULL,
	`webhook_error` text,
	`connected_at` text NOT NULL,
	PRIMARY KEY (`user_id`,`mode`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stripe_connections` (
	`user_id` text NOT NULL,
	`secret_key_encrypted` text NOT NULL,
	`webhook_secret_encrypted` text,
	`account_id` text NOT NULL,
	`mode` text DEFAULT 'sandbox' NOT NULL,
	`connected_at` text NOT NULL,
	PRIMARY KEY (`user_id`,`mode`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feature_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`feature` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`status` text DEFAULT 'active' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feature_records_user_feature_idx` ON `feature_records` (`user_id`,`feature`);
--> statement-breakpoint
CREATE TABLE `app_licenses` (
	`id` text PRIMARY KEY NOT NULL,
	`license_key_encrypted` text NOT NULL,
	`license_key_prefix` text NOT NULL,
	`instance_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`plan` text DEFAULT 'pro' NOT NULL,
	`features` text DEFAULT '[]' NOT NULL,
	`manage_url` text,
	`expires_at` text,
	`last_validated_at` text,
	`validation_error` text,
	`activated_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_licenses_instance_id_unique` ON `app_licenses` (`instance_id`);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);
--> statement-breakpoint
CREATE INDEX `api_keys_user_idx` ON `api_keys` (`user_id`);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`environment` text DEFAULT 'sandbox' NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text,
	`href` text,
	`source_key` text NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`read_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_user_environment_source_idx` ON `notifications` (`user_id`,`environment`,`source_key`);
--> statement-breakpoint
CREATE TABLE `customer_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`avatar_image_url` text,
	`password_hash` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_accounts_email_unique` ON `customer_accounts` (`email`);
--> statement-breakpoint
CREATE TABLE `customer_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customer_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_access_tokens_token_hash_unique` ON `customer_access_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `customer_access_tokens_customer_idx` ON `customer_access_tokens` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `customer_access_tokens_expiry_idx` ON `customer_access_tokens` (`expires_at`);
--> statement-breakpoint
CREATE TRIGGER `users_single_account_insert`
BEFORE INSERT ON `users`
WHEN EXISTS (SELECT 1 FROM `users`)
BEGIN
	SELECT RAISE(ABORT, 'Only one account is allowed');
END;
