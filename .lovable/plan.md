

# Noon FBPI Webhook Receiver

## Overview
Create a public webhook endpoint that Noon (or any integrator) can call to push FBPI orders directly into your system. The endpoint URL can be shared with Noon's integration team to enable automatic order delivery. The Settings tab will display the generated webhook URL and an API key for authentication.

## What We'll Build

### 1. New Edge Function: `noon-fbpi-webhook`
A **public** endpoint (no JWT auth) that accepts incoming order payloads from Noon:
- `POST` receives order data, validates via a shared API secret (`NOON_WEBHOOK_SECRET`)
- Stores the order in `noon_fbpi_orders` and runs inventory matching against `asin_inventory`
- Returns success/failure response to the caller
- Supports both Noon's native format and a generic JSON format

### 2. Database: `noon_webhook_keys` table
Stores per-user webhook API keys so each user gets a unique, revocable key:
- `id`, `user_id`, `api_key` (unique), `store_id` (nullable FK), `is_active`, `created_at`
- RLS: users can only see/manage their own keys

### 3. Edge Function Logic
```text
POST /functions/v1/noon-fbpi-webhook?key=<api_key>

→ Validate api_key from noon_webhook_keys (active, linked to user)
→ Parse order payload (items, order number, etc.)
→ Match item SKUs against asin_inventory
→ Upsert into noon_fbpi_orders with inventory_status
→ Return { success: true, order_id }
```

Uses a service-role client (since no user JWT) but scopes all queries via the API key's `user_id`.

### 4. UI Updates: Settings Tab
Add a **Webhook** section to `FBPISettings.tsx`:
- Display the webhook URL: `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/noon-fbpi-webhook`
- Generate / regenerate API key button
- Copy URL + key to clipboard
- Show active/inactive status
- Instructions for Noon integration team

### 5. Config
- `supabase/config.toml`: Add `[functions.noon-fbpi-webhook]` with `verify_jwt = false`

## Files to Create/Modify
- **Create**: `supabase/functions/noon-fbpi-webhook/index.ts`
- **Modify**: `src/components/noon-fbpi/FBPISettings.tsx` — add webhook URL/key section
- **Modify**: `src/hooks/useNoonFBPI.ts` — add webhook key management functions
- **Modify**: `supabase/config.toml` — register new function
- **Migration**: Create `noon_webhook_keys` table with RLS

