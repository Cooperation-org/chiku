// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeReturnTo, saveReturnTo, consumeReturnTo } from '$lib/auth/returnTo';

describe('sanitizeReturnTo', () => {
	it('accepts same-app absolute paths with query', () => {
		expect(sanitizeReturnTo('/p/myteam/board')).toBe('/p/myteam/board');
		expect(sanitizeReturnTo('/p/myteam/board?story=42')).toBe('/p/myteam/board?story=42');
		expect(sanitizeReturnTo('/tasks')).toBe('/tasks');
	});

	it('rejects empty and null', () => {
		expect(sanitizeReturnTo(null)).toBeNull();
		expect(sanitizeReturnTo(undefined)).toBeNull();
		expect(sanitizeReturnTo('')).toBeNull();
	});

	it('rejects full URLs and relative paths', () => {
		expect(sanitizeReturnTo('https://evil.example/board')).toBeNull();
		expect(sanitizeReturnTo('board?story=1')).toBeNull();
	});

	it('rejects protocol-relative open-redirect paths', () => {
		expect(sanitizeReturnTo('//evil.example/board')).toBeNull();
		expect(sanitizeReturnTo('/\\evil.example/board')).toBeNull();
	});

	it('rejects auth-flow routes (redirect loops)', () => {
		expect(sanitizeReturnTo('/login')).toBeNull();
		expect(sanitizeReturnTo('/login?x=1')).toBeNull();
		expect(sanitizeReturnTo('/oauth/callback')).toBeNull();
		expect(sanitizeReturnTo('/auth/google/callback?code=abc')).toBeNull();
	});

	it('does not over-block routes that merely start with an auth word', () => {
		expect(sanitizeReturnTo('/authors')).toBe('/authors');
		expect(sanitizeReturnTo('/loginworthy')).toBe('/loginworthy');
	});
});

describe('saveReturnTo / consumeReturnTo', () => {
	beforeEach(() => sessionStorage.clear());

	it('round-trips a deep link and is single-use', () => {
		saveReturnTo('/p/myteam/board?story=42');
		expect(consumeReturnTo()).toBe('/p/myteam/board?story=42');
		expect(consumeReturnTo()).toBeNull();
	});

	it('does not save the root path or invalid paths', () => {
		saveReturnTo('/');
		expect(consumeReturnTo()).toBeNull();
		saveReturnTo('//evil.example');
		expect(consumeReturnTo()).toBeNull();
	});

	it('sanitizes on read, so a tampered stored value cannot redirect off-app', () => {
		sessionStorage.setItem('marten_return_to', 'https://evil.example/');
		expect(consumeReturnTo()).toBeNull();
	});
});
