-- Renames credit_expenses.months -> total_cycle and start_date -> transaction_date,
-- drops the derived end_date column, and renames expenses.installment_index ->
-- current_cycle, to match the transaction-date + cycle-count model.
ALTER TABLE `credit_expenses` RENAME COLUMN `months` TO `total_cycle`;
--> statement-breakpoint
ALTER TABLE `credit_expenses` RENAME COLUMN `start_date` TO `transaction_date`;
--> statement-breakpoint
ALTER TABLE `credit_expenses` DROP COLUMN `end_date`;
--> statement-breakpoint
ALTER TABLE `expenses` RENAME COLUMN `installment_index` TO `current_cycle`;
