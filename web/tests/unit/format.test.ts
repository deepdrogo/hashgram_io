import { describe, it, expect } from 'vitest';
import { formatHash, toBigInt, truncateMiddle, relativeTime, classifyQuery, ratioPct, ppmToPct, shortMsgType, formatBytes } from '../../src/lib/format';
import { genesisMatches, MAINNET_GENESIS_SHA256 } from '../../src/lib/genesis';

describe('formatHash', () => {
  it('formats uhash strings with BigInt precision', () => {
    expect(formatHash('1000000')).toBe('1');
    expect(formatHash('1000000', { unit: true })).toBe('1 HASH');
    expect(formatHash('1500000')).toBe('1.5');
    expect(formatHash('1')).toBe('0.000001');
    expect(formatHash('500000000000000')).toBe('500,000,000');
    expect(formatHash('199000000000000', { unit: true })).toBe('199,000,000 HASH');
    expect(formatHash('123456789123456789')).toBe('123,456,789,123.456789');
  });
  it('never loses precision on huge values', () => {
    expect(formatHash('999999999999999999999999')).toBe('999,999,999,999,999,999.999999');
  });
  it('respects maxFraction and compact', () => {
    expect(formatHash('1234567', { maxFraction: 2 })).toBe('1.23');
    expect(formatHash('1000000000000000', { compact: true })).toBe('1B');
    expect(formatHash('-2500000')).toBe('-2.5');
  });
  it('tolerates decimals and empties', () => {
    expect(toBigInt('12.5')).toBe(12n);
    expect(toBigInt('')).toBe(0n);
    expect(toBigInt(undefined)).toBe(0n);
  });
});

describe('truncateMiddle', () => {
  it('keeps head and tail', () => {
    expect(truncateMiddle('hash13t8v5nnghrvgcuuqcrt9k5wyhtqwq7fl3ynjpy', 8, 5)).toBe('hash13t8…ynjpy');
    expect(truncateMiddle('short')).toBe('short');
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-09-10T12:00:00Z');
  it('renders human deltas', () => {
    expect(relativeTime('2026-09-10T11:59:56Z', now)).toBe('4s ago');
    expect(relativeTime('2026-09-10T11:58:00Z', now)).toBe('2m 0s ago');
    expect(relativeTime('2026-09-10T09:30:00Z', now)).toBe('2h 30m ago');
    expect(relativeTime('2026-09-08T12:00:00Z', now)).toBe('2d 0h ago');
    expect(relativeTime('2026-09-10T12:00:10Z', now)).toBe('in 10s');
    expect(relativeTime(undefined, now)).toBe('—');
  });
});

describe('classifyQuery', () => {
  it('recognises every searchable identifier', () => {
    expect(classifyQuery('12345')).toBe('height');
    expect(classifyQuery('A'.repeat(64))).toBe('hash');
    expect(classifyQuery('hash13t8v5nnghrvgcuuqcrt9k5wyhtqwq7fl3ynjpy')).toBe('address');
    expect(classifyQuery('hashvaloper127zemcfnxd3jrldpjzzgcckek4dswyw0l7rfcq')).toBe('validator');
    expect(classifyQuery('@alice')).toBe('username');
    expect(classifyQuery('12D3KooW' + 'Q'.repeat(44))).toBe('peer');
    expect(classifyQuery('hello world')).toBe('unknown');
  });
});

describe('ratios', () => {
  it('computes percentages from uhash strings', () => {
    expect(ratioPct('500000000000000', '1000000000000000')).toBe(50);
    expect(ratioPct('0', '0')).toBe(0);
    expect(ppmToPct(500_000)).toBe('50.00 %');
  });
});

describe('misc', () => {
  it('shortens message type URLs', () => {
    expect(shortMsgType('/cosmos.bank.v1beta1.MsgSend')).toBe('Send');
    expect(shortMsgType('/hashgram.serviceproof.v1.MsgRegisterProvider')).toBe('RegisterProvider');
  });
  it('formats bytes', () => {
    expect(formatBytes('1099511627776')).toBe('1.00 TiB');
    expect(formatBytes(0)).toBe('0 B');
  });
  it('pins the mainnet genesis', () => {
    expect(MAINNET_GENESIS_SHA256).toHaveLength(64);
    expect(genesisMatches(MAINNET_GENESIS_SHA256.toUpperCase())).toBe(true);
    expect(genesisMatches('deadbeef')).toBe(false);
    expect(genesisMatches(undefined)).toBe(false);
  });
});
