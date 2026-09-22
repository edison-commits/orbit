import test from 'node:test';
import assert from 'node:assert/strict';

import { formatSocialHandle, getSocialUrls, normalizeSocialHandle } from '../lib/social.ts';

test('normalizeSocialHandle strips known profile URLs and handle decoration', () => {
  assert.equal(normalizeSocialHandle('instagram', 'https://www.instagram.com/@orbit.user/?hl=en'), 'orbit.user');
  assert.equal(normalizeSocialHandle('twitter', '@orbit_team'), 'orbit_team');
  assert.equal(normalizeSocialHandle('linkedin', 'linkedin.com/in/orbit-person/'), 'orbit-person');
});

test('normalizeSocialHandle leaves unknown-host input intact', () => {
  assert.equal(normalizeSocialHandle('instagram', 'example.com/orbit'), 'example.com/orbit');
});

test('formatSocialHandle uses @ except for LinkedIn', () => {
  assert.equal(formatSocialHandle('instagram', 'orbit'), '@orbit');
  assert.equal(formatSocialHandle('linkedin', 'orbit-person'), 'orbit-person');
  assert.equal(formatSocialHandle('twitter', ''), '');
});

test('getSocialUrls returns preferred and fallback platform URLs', () => {
  assert.deepEqual(getSocialUrls('instagram', '@orbit user'), {
    preferred: 'instagram://user?username=orbit%20user',
    fallback: 'https://instagram.com/orbit%20user',
  });
  assert.deepEqual(getSocialUrls('twitter', '@orbit'), {
    preferred: 'https://x.com/orbit',
    fallback: 'https://x.com/orbit',
  });
  assert.deepEqual(getSocialUrls('linkedin', 'orbit-person'), {
    preferred: 'https://linkedin.com/in/orbit-person',
    fallback: 'https://linkedin.com/in/orbit-person',
  });
  assert.equal(getSocialUrls('twitter', ''), null);
});
