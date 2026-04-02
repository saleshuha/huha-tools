

# Add Product Images + DOCX Export to ASIN Sales Health

## What Changes

1. **Product images in each row** — Fetch images from the existing `product_images` table (by ASIN) and display a small thumbnail in the Product column of the Sales Health table.

2. **Export to DOCX** — Add a "Export DOCX" button that generates an editable Word document containing each product's image, ASIN, title, status, score, and sales data.

## Technical Details

### 1. Fetch product images

- In `SalesHealthDashboard.tsx`, add a `useQuery` call to fetch images from `product_images` table for all visible ASINs
- Build a `Map<string, string>` (asin → image_url) for quick lookup
- Display a 32x32 thumbnail in the Product cell (sticky left column), with a fallback placeholder if no image exists

### 2. Product column layout update

The current Product cell shows ASIN + SKU + title vertically. Add the image to the left:

```text
[IMG] ASIN · SKU
      Title (truncated)
```

### 3. DOCX Export

- Install `docx` package (already available via npm)
- Add a "Export DOCX" button next to the existing CSV Export popover
- Generate a Word document with:
  - Title header with date and filter info
  - A table with columns: Image, ASIN/SKU, Title, Status, Score, Velocity, Total Shipped, Trend
  - Product images fetched and embedded as `ImageRun` in the DOCX
  - For products without images, show "No image" text
- Download as `.docx` file

### 4. Image fetching for DOCX

- Images are stored as URLs (Supabase storage public URLs)
- Fetch each image as a blob/buffer, then embed using `ImageRun` with base64 data
- Process in batches to avoid overwhelming the browser
- Show a loading toast during generation

## Files

- **Modify**: `src/components/asin-sales-health/SalesHealthDashboard.tsx` — Add image column, image fetching query, DOCX export button and handler
- **Install**: `docx` and `file-saver` packages (for DOCX generation and download)

