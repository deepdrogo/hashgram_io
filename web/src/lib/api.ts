import createClient from 'openapi-fetch';
import type { paths, components } from '../generated/api';

/**
 * Base URL of the read API. Defaults to same-origin `/api`, which Caddy forwards
 * to the local indexer (`127.0.0.1:1318`) after stripping the prefix. The
 * browser never talks to the node directly.
 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '/api';
export const API_V1 = `${API_BASE}/v1`;

export const api = createClient<paths>({
  baseUrl: API_V1,
  headers: { Accept: 'application/json' },
});

export type Schemas = components['schemas'];
export type ChainInfo = Schemas['ChainInfo'];
export type Health = Schemas['Health'];
export type BlockSummary = Schemas['BlockSummary'];
export type BlockDetail = Schemas['BlockDetail'];
export type TxSummary = Schemas['TxSummary'];
export type TxDetail = Schemas['TxDetail'];
export type Transfer = Schemas['Transfer'];
export type TopAccount = Schemas['TopAccount'];
export type AccountDetail = Schemas['AccountDetail'];
export type Validator = Schemas['Validator'];
export type ValidatorDetail = Schemas['ValidatorDetail'];
export type Staking = Schemas['Staking'];
export type RewardParams = Schemas['RewardParams'];
export type RewardReserve = Schemas['RewardReserve'];
export type Epoch = Schemas['Epoch'];
export type CurrentEpoch = Schemas['CurrentEpoch'];
export type Provider = Schemas['Provider'];
export type ProviderDetail = Schemas['ProviderDetail'];
export type Welcome = Schemas['Welcome'];
export type Founder = Schemas['Founder'];
export type Fees = Schemas['Fees'];
export type Treasury = Schemas['Treasury'];
export type Proposal = Schemas['Proposal'];
export type ProposalDetail = Schemas['ProposalDetail'];
export type GovParams = Schemas['GovParams'];
export type Network = Schemas['Network'];
export type Peer = Schemas['Peer'];
export type SearchResult = Schemas['SearchResult'];
export type StatsSnapshot = Schemas['StatsSnapshot'];
export type Vesting = Schemas['Vesting'];
export type Delegation = Schemas['Delegation'];

export class ApiError extends Error {
  status: number;
  path: string;
  constructor(status: number, message: string, path: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

/** Unwrap an openapi-fetch result into data or a thrown ApiError. */
export function unwrap<T>(res: { data?: T; error?: unknown; response: Response }, path: string): T {
  if (res.data !== undefined && res.response.ok) return res.data;
  const err = res.error as { error?: string } | undefined;
  throw new ApiError(res.response.status, err?.error ?? res.response.statusText ?? 'request failed', path);
}

/** Plain fetch helper used for simple GETs where a typed client is overkill. */
export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_V1}${path}`, { ...init, headers: { Accept: 'application/json', ...(init?.headers ?? {}) } });
  if (!r.ok) {
    let msg = r.statusText;
    try {
      const j = (await r.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(r.status, msg, path);
  }
  return (await r.json()) as T;
}
