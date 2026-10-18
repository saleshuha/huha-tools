import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatedPrice } from '../../../supabase/functions/trendyol/pricing';
test('percentage adjustment precedes fixed SAR addition', () => assert.equal(calculatedPrice(100, { percentage: 20, fixed_sar: 5 }), 125));
test('signed percentage and fixed amounts support reductions', () => assert.equal(calculatedPrice(100, { percentage: -10, fixed_sar: -5 }), 85));
test('missing or nonpositive prices are never submitted', () => {
 assert.equal(calculatedPrice(null, { percentage: 0, fixed_sar: 0 }), null);
 assert.equal(calculatedPrice(10, { percentage: -100, fixed_sar: 0 }), null);
});