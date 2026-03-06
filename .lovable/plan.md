

## Root Cause

The previous "extend" migration (Step 3 in the function) **relocated** three TPU brand ranges to 4432+:

| Brand | Current Range | Capacity | Actually Used |
|-------|--------------|----------|---------------|
| Google | 4432–4456 | 25 | 0 |
| OnePlus | 4457–4481 | 25 | 0 |
| Nothing | 4482–4506 | 25 | 0 |

These ranges are empty and shouldn't exist. The function correctly finds the Nothing range at 4482–4506, sees serial 04482 is free, and returns it. The function logic is fine — the **data** is wrong.

Meanwhile, the original TPU ranges have actual available capacity:

| Brand | Range | Capacity | Used | **Free** |
|-------|-------|----------|------|----------|
| OPPO | 470–692 | 223 | 222 | **1** |
| Other | 693–727 | 35 | 29 | **6** |
| Samsung | 728–905 | 178 | 165 | **13** |
| Sony | 906–924 | 19 | 15 | **4** |
| Vivo | 933–985 | 53 | 39 | **14** |
| Xiaomi | 986–1138 | 153 | 132 | **21** |

Total free slots within existing TPU ranges: **59 slots available**.

## Plan

### 1. Data Repair (SQL data update)
- **Delete** the 3 broken TPU ranges at 4432+ (Google, OnePlus, Nothing) from `serial_range_directory`
- **Clear** serial on B0G3Y6FD41 again (set to `''`)

### 2. Update `get_next_serial_number` function (SQL migration)
- **Remove Step 3** (the "extend with new block" logic that creates relocated ranges)
- When both Step 1 (exact brand) and Step 2 (same-category gaps) are exhausted, **fall through to the global fallback** instead of creating an extension block
- This matches the user's preference: "Use global fallback only" when category is truly full

### Flow after fix:
```text
Title: "Nothing Phone 3a Pro ... TPU"
  → Detect: TPU / Carbon Fiber Case + Nothing
  → Step 1: Look for Nothing TPU range → NOT FOUND (deleted)
  → Step 2: Scan ALL TPU ranges for gaps
    → OPPO has 1 gap, Other has 6, Samsung has 13, Sony 4, Vivo 14, Xiaomi 21
    → Assign first available gap (e.g., in OPPO range)
  → Item gets a serial within the TPU category block (25–1138)
```

### Files Changed
- **1 SQL data update** — delete broken ranges + clear B0G3Y6FD41 serial
- **1 SQL migration** — updated `get_next_serial_number` function (remove Step 3 extension logic, fall through to global fallback)
- No frontend code changes

