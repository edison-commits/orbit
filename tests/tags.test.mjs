import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTagInput, parseTags, tagsToInput, tagsToJson } from '../lib/tags.ts';

test('parseTags trims values and removes case-insensitive duplicates', () => {
  assert.deepEqual(parseTags('[" Family ","family","Work",""]'), ['Family', 'Work']);
  assert.deepEqual(parseTags('{"not":"an array"}'), []);
  assert.deepEqual(parseTags('not json'), []);
});

test('normalizeTagInput accepts comma, hash, and newline separators', () => {
  assert.deepEqual(normalizeTagInput(' Family, #Work\nfamily ##Friends '), ['family', 'work', 'friends']);
});

test('tag input and JSON conversions preserve canonical normalized tags', () => {
  assert.equal(tagsToInput('["Family","Work"]'), 'Family, Work');
  assert.equal(tagsToJson(' Family, Work, family '), '["family","work"]');
  assert.equal(tagsToJson(' , # '), null);
});
