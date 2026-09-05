CREATE TABLE `fx_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`currency` text NOT NULL,
	`date` text NOT NULL,
	`rate` real NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fx_rates_currency_date_unique` ON `fx_rates` (`currency`,`date`);--> statement-breakpoint
ALTER TABLE `expenses` ADD `original_currency` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `original_amount` integer;--> statement-breakpoint
ALTER TABLE `expenses` ADD `exchange_rate` real;