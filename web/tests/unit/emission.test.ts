import { describe, it, expect } from 'vitest';
import { projectEmission } from '../../src/routes/Rewards';

const U = 1_000_000n;

describe('projectEmission', () => {
  it('caps the first epochs at 250,000 HASH and then decays at 5 bps', () => {
    const cap = 250_000n * U;
    const out = projectEmission(500_000_000n * U, 5, cap, 3);
    expect(out[0]!.budget).toBe(cap); // 500M × 5/10,000 = 250,000 → exactly at cap
    expect(out[1]!.remaining).toBe(500_000_000n * U - cap);
    expect(out[1]!.budget).toBe(((500_000_000n * U - cap) * 5n) / 10_000n);
    expect(out[1]!.budget < cap).toBe(true);
  });
  it('never emits more than remains', () => {
    const out = projectEmission(100n * U, 5000, 1_000_000n * U, 10);
    const total = out.reduce((a, x) => a + x.budget, 0n);
    expect(total <= 100n * U).toBe(true);
    expect(out.at(-1)!.remaining >= 0n).toBe(true);
  });
  it('samples with step', () => {
    const out = projectEmission(500_000_000n * U, 5, 250_000n * U, 100, 10);
    expect(out).toHaveLength(10);
    expect(out.map((x) => x.epoch)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });
});
