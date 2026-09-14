-- Restructures credit_expenses: adds billing_type ("installment" vs "subscription"),
-- upgrades start_month (YYYY-MM) to day-precision start_date/end_date, makes months
-- nullable (open-ended subscriptions), and adds FX conversion fields matching expenses.
-- Table is dropped and recreated rather than altered in place — safe only because no
-- production data exists in this table yet.
DROP TABLE `credit_expenses`;
--> statement-breakpoint
CREATE TABLE `credit_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`description` text NOT NULL,
	`category_id` integer,
	`billing_type` text NOT NULL,
	`total_amount` integer NOT NULL,
	`currency` text NOT NULL,
	`months` integer,
	`start_date` text NOT NULL,
	`end_date` text,
	`source` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`original_currency` text,
	`original_amount` integer,
	`exchange_rate` real,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
