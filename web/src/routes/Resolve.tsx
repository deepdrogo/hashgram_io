import { createResource, Show, onMount } from 'solid-js';
import { useParams, useNavigate, A } from '@solidjs/router';
import { resolveQuery } from '../components/Search';
import { setTitle } from '../lib/query';
import { Empty, Skeleton } from '../components/ui';
import { SearchBox } from '../components/Search';

/**
 * Short links. Any client (for example the Windows app) can open
 *   hashgram.io/<64-hex tx hash>   → /txs/<hash>
 *   hashgram.io/<height>           → /blocks/<height>
 *   hashgram.io/hash1…             → /accounts/…
 *   hashgram.io/hashvaloper1…      → /validators/…
 *   hashgram.io/@username          → the owner's account
 *   hashgram.io/12D3Koo…           → the peer on /network
 * Unresolvable paths render a 404 with search.
 */
export default function Resolve() {
  const params = useParams<{ rest: string }>();
  const nav = useNavigate();
  onMount(() => setTitle('Not found'));
  const [target] = createResource(
    () => decodeURIComponent(params.rest ?? '').replace(/^\/+|\/+$/g, ''),
    async (q) => {
      if (!q) return null;
      try {
        return await resolveQuery(q);
      } catch {
        return null;
      }
    },
  );
  return (
    <Show when={!target.loading} fallback={<Skeleton rows={4} />}>
      <Show
        when={target()}
        fallback={
          <div class="mx-auto max-w-xl">
            <Empty title="Nothing at this address" hint={<span><span class="font-mono">/{params.rest}</span> is not a block height, transaction hash, account, validator, @username or peer id on Hashgram Mainnet.</span>} />
            <SearchBox large autofocus />
            <p class="mt-4 text-center text-xs text-ink-500">
              <A href="/" class="underline">Back to the explorer</A>
            </p>
          </div>
        }
      >
        {(to) => {
          nav(to(), { replace: true });
          return <Skeleton rows={4} />;
        }}
      </Show>
    </Show>
  );
}
