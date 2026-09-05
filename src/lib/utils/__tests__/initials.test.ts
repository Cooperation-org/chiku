import { describe, it, expect } from 'vitest';
import { initialsFor } from '../initials';

describe('initialsFor', () => {
	it('takes one letter from each of the first two words', () => {
		expect(initialsFor('Golda Velez')).toBe('GV');
		expect(initialsFor('Orjiene Kenechukwu Ada')).toBe('OK');
	});

	it('takes two letters from a single-word name, so two J names differ', () => {
		expect(initialsFor('jefferson')).toBe('JE');
		expect(initialsFor('jayarai625')).toBe('JA');
	});

	it('ignores punctuation', () => {
		expect(initialsFor('amebo (agent)')).toBe('AA');
		expect(initialsFor('  ')).toBe('?');
		expect(initialsFor('')).toBe('?');
		expect(initialsFor(null)).toBe('?');
	});

	it('keeps a one-letter name as one letter', () => {
		expect(initialsFor('J')).toBe('J');
	});
});
