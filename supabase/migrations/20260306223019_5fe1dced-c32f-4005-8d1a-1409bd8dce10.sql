-- Fix items_used on Google TPU range (was incorrectly incremented)
UPDATE serial_range_directory SET items_used = items_used - 1 WHERE id = '94c94afe-2099-45ca-92ac-95e6e5e98796';

-- Clear the wrongly assigned serial from B0G3Y6FD41
UPDATE asin_inventory SET serial_number = '' WHERE id = 'fe912c82-abe3-484b-93b0-a6c2dfb42da9';