-- Add country column to tasks table to make tasks country-specific
ALTER TABLE tasks 
ADD COLUMN country text NOT NULL DEFAULT 'UAE';