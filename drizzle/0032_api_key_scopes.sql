ALTER TABLE `api_keys` ADD `scopes` text DEFAULT '["products:read","orders:read","customers:read"]' NOT NULL;
