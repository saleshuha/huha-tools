import { test } from "node:test";
import assert from "node:assert/strict";
import { stockPushProgress } from "./stock-push-progress";

test("all-stock push waits for confirmation of every targeted product", () => {
  const targets = [{ id: "a", version: 2 }, { id: "b", version: 1 }];
  const rows = [{ id: "a", version: 2, state: "submitted", last_error: null }, { id: "b", version: 1, state: "completed", last_error: null }];
  assert.deepEqual(stockPushProgress(targets, rows), { total: 2, completed: 1, confirming: 1, failed: 0, sending: 0, done: false });
  rows[0].state = "completed";
  assert.equal(stockPushProgress(targets, rows).done, true);
});
test("old or missing queue rows cannot falsely complete a new push", () => {
  assert.equal(stockPushProgress([{ id: "a", version: 2 }, { id: "b", version: 1 }], [{ id: "a", version: 1, state: "completed", last_error: null }]).completed, 0);
});
test("failed products are not reported as confirmed stock", () => {
  assert.deepEqual(stockPushProgress([{ id: "a", version: 1 }], [{ id: "a", version: 1, state: "failed", last_error: "Rejected" }]), { total: 1, completed: 0, confirming: 0, failed: 1, sending: 0, done: true });
});