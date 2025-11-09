-- Add 'stock_receiving' to the stock_change_source enum
ALTER TYPE stock_change_source ADD VALUE IF NOT EXISTS 'stock_receiving';