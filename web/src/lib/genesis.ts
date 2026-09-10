/**
 * The only thing hardcoded in the site: the Hashgram Mainnet genesis pin.
 * `/api/v1/chain.genesis_hash` (read by the indexer from the `network.json` pin
 * in /etc/hashgram — never from RPC `/genesis`) must match this value or the
 * explorer refuses to render data and shows a full-width banner.
 */
export const MAINNET_CHAIN_ID = 'hashgram-1';
export const MAINNET_GENESIS_SHA256 = 'e322bc2319f6e0173286fa526dab5a8ff8ad0797c7b80dd03e7c9d98621d5e4d';

export function genesisMatches(hash: string | null | undefined): boolean {
  if (!hash) return false;
  return hash.trim().toLowerCase() === MAINNET_GENESIS_SHA256;
}
