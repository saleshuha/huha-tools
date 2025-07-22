-- Create triggers to automatically update status based on quantity changes
CREATE TRIGGER update_asin_status_on_quantity_change
  BEFORE UPDATE ON public.asin_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_status_based_on_quantity();

CREATE TRIGGER update_sku_status_on_quantity_change
  BEFORE UPDATE ON public.sku_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_status_based_on_quantity();