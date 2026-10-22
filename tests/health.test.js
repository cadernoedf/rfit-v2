import test from 'node:test';
import assert from 'node:assert/strict';

test('health route module can be imported', async () => {
  const mod = await import('../services/api/src/routes/health.routes.js');
  assert.equal(typeof mod.healthRoutes, 'function');
});
