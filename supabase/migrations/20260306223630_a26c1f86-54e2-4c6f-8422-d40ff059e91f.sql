-- Clear wrongly assigned serial from B0G3Y6FD41
UPDATE asin_inventory SET serial_number = '' WHERE id = 'fe912c82-abe3-484b-93b0-a6c2dfb42da9' AND serial_number = '04482';