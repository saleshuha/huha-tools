-- Add additional_serial_numbers column to asin_inventory table
ALTER TABLE public.asin_inventory 
ADD COLUMN additional_serial_numbers text[] DEFAULT '{}';

-- Create index for searching additional serial numbers
CREATE INDEX idx_asin_inventory_additional_serials 
ON public.asin_inventory USING GIN(additional_serial_numbers);

-- Add comment for documentation
COMMENT ON COLUMN public.asin_inventory.additional_serial_numbers IS 'Array of additional bin/serial numbers when item spans multiple bins';