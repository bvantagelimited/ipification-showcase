const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalJson, createRequestHash } = require('../../utils/canonicalJson');

test('sorts nested keys and preserves arrays', () => assert.equal(
  canonicalJson({ z: [3, { b: true, a: null }], a: 'x' }),
  '{"a":"x","z":[3,{"a":null,"b":true}]}'
));

test('hash ignores insertion order', () => assert.equal(
  createRequestHash('demo.protected-action.v1', { b: 2, a: { y: 1, x: 0 } }),
  createRequestHash('demo.protected-action.v1', { a: { x: 0, y: 1 }, b: 2 })
));

test('rejects non-finite numbers', () => assert.throws(() => canonicalJson({ amount: NaN }), /finite/));
