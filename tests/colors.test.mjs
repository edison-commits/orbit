import test from 'node:test';
import assert from 'node:assert/strict';
import { withAlpha } from '../lib/colors.ts';

test('withAlpha appends alpha hex to 6-digit colors', () => {
  assert.equal(withAlpha('#123456', 1), '#123456ff');
  assert.equal(withAlpha('#123456', 0), '#12345600');
  assert.equal(withAlpha('#123456', 0x18 / 0xff), '#12345618');
});

test('withAlpha expands 3-digit hex and drops existing alpha', () => {
  assert.equal(withAlpha('#abc', 0.5), '#aabbcc80');
  assert.equal(withAlpha('#123456ff', 0.25), '#12345640');
});

test('withAlpha converts rgb/rgba to rgba form', () => {
  assert.equal(withAlpha('rgb(1, 2, 3)', 0.5), 'rgba(1, 2, 3, 0.5)');
  assert.equal(withAlpha('rgba(1, 2, 3, 0.9)', 0.25), 'rgba(1, 2, 3, 0.25)');
});

test('withAlpha leaves named/platform colors opaque', () => {
  assert.equal(withAlpha('red', 0.5), 'red');
  assert.equal(withAlpha('transparent', 0), 'transparent');
});

test('withAlpha rejects alpha outside 0..1', () => {
  assert.throws(() => withAlpha('#123456', 1.5), RangeError);
  assert.throws(() => withAlpha('#123456', Number.NaN), RangeError);
});
