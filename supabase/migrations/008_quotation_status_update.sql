-- Add 'rejected' to the status check constraint for quotations
ALTER TABLE quotations DROP CONSTRAINT quotations_status_check;
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (status IN ('pending', 'done', 'rejected'));
