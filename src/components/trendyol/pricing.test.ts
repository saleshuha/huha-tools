import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatedPrice, calculatedPrices, lookupAsins } from '../../../supabase/functions/trendyol/pricing';
test('percentage adjustment precedes fixed SAR addition', () => assert.equal(calculatedPrice(100, { percentage: 20, fixed_sar: 5 }), 125));
test('signed percentage and fixed amounts support reductions', () => assert.equal(calculatedPrice(100, { percentage: -10, fixed_sar: -5 }), 85));
test('missing or nonpositive prices are never submitted', () => {
 assert.equal(calculatedPrice(null, { percentage: 0, fixed_sar: 0 }), null);
 assert.equal(calculatedPrice(10, { percentage: -100, fixed_sar: 0 }), null);
});
test('original and sale prices use independent formulas', () => {
 assert.deepEqual(calculatedPrices(100, { percentage: 20, fixed_sar: 5, original_percentage: 40, original_fixed_sar: 10 }), { salePrice: 125, listPrice: 150, valid: true });
});
test('original below sale price blocks submission instead of changing the formula result', () => {
 assert.equal(calculatedPrices(100, { percentage: 20, fixed_sar: 5, original_percentage: 0, original_fixed_sar: 0 }).valid, false);
});
test('fetch all includes unselected products and deduplicates normalized ASINs', () => {
 const products = [{ id: '1', asin: ' b0dst89yp2 ' }, { id: '2', asin: 'B0DST89YP2' }, { id: '3', asin: 'B0FL817V9N' }];
 assert.deepEqual(lookupAsins(products, null), ['B0DST89YP2', 'B0FL817V9N']);
 assert.deepEqual(lookupAsins(products, new Set(['1'])), ['B0DST89YP2']);
});