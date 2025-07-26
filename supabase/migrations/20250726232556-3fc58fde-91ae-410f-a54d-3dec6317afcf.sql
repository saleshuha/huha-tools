-- Check current inventory_status enum values and add 'ordered' if not present
DO $$ 
BEGIN
    -- Add 'ordered' to the inventory_status enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ordered' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'inventory_status')
    ) THEN
        ALTER TYPE inventory_status ADD VALUE 'ordered';
    END IF;
END $$;