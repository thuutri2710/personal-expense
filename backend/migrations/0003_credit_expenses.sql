CREATE TABLE `credit_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`description` text NOT NULL,
	`category_id` integer,
	`total_amount` integer NOT NULL,
	`currency` text NOT NULL,
	`months` integer NOT NULL,
	`start_month` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `expenses` ADD `credit_expense_id` integer REFERENCES credit_expenses(id) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `expenses` ADD `installment_index` integer;
