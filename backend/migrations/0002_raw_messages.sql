CREATE TABLE `raw_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`chat_id` text NOT NULL,
	`raw_text` text NOT NULL,
	`parse_status` text NOT NULL,
	`expense_id` integer,
	`received_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE set null
);
