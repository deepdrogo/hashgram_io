# Stories

A story is a `STORY_CREATE` social event: media, an optional caption, and an
`expires_at` the author signs along with everything else. It is the same
kind of object as a post, with one extra field and one extra rule.

## What expiry means

**Expiry is a display rule, not deletion.** This is the sentence the product
has to get right, because every other social network has trained people to
read "24 hours" as "gone".

After `expires_at`:

- `Feed::active_stories` and `Feed::stories_of` stop returning it, so Pulse's
  story row and the profile stop showing it;
- the indexer stops serving it — `/v1/stories/{address}` filters on
  `expires_at > now` ([`indexer/api.go`](https://github.com/deepdrogo/hashgram_windows/blob/main/indexer/api.go));
- a client that receives it anyway drops it on read, because the filter is
  applied to the event's own signed field rather than to whatever a node
  chose to send.

After `expires_at`, these things are still true:

- the event stays in the social log of every node that accepted it until the
  ordinary retention sweep drops it — `event_retention_days` (90) or
  `max_events` (2,000,000), whichever comes first
  ([`node/hashgram-node/src/social.rs`](https://github.com/deepdrogo/hashgram_windows/blob/main/node/hashgram-node/src/social.rs));
- **the media blob has no expiry at all.** Public blobs live until an
  operator deletes them or a safety attestation blocks them
  ([`docs/STORAGE.md`](STORAGE.md)). A story's picture is replicated to three
  providers like any other public media, and those copies are not swept when
  the story stops being shown;
- anybody who fetched the story while it was active has it.

The composer says this in the dialog, in the user's own words, before they
post. No string in the application may say "disappears", "deleted after 24
hours", or anything a reader would take as a privacy guarantee. Something
that must never be seen again does not go in a story; it goes in a Chat.

## Limits

| | |
| --- | --- |
| Default lifetime | 24 h (`STORY_DEFAULT_SECS`) |
| Maximum lifetime | 48 h (`STORY_MAX_SECS`, mirrors `hashgram_proto::limits::MAX_STORY_SECS`) |
| Media | required, exactly one in this client, picture or video |
| Caption | ≤ 500 characters in this client; the protocol's payload bound is 32 KiB |

A node refuses `expires_at` that is not after the event's own timestamp or
is more than 48 hours past it
([`node/hashgram-proto/src/validate.rs`](https://github.com/deepdrogo/hashgram_windows/blob/main/node/hashgram-proto/src/validate.rs)).
The client clamps rather than signing an event every node will reject.

## Clocks

A story carries two times the author signed: the event `timestamp` and
`expires_at`. Both are the author's claim. A node bounds the timestamp — no
more than 300 s in the future — and checks the expiry against it, so an
author cannot mint a story that lives for a year, but an author can make one
that looks a few minutes older or newer than it is. Nothing security-related
depends on story timing, and the viewer says "N h left" rather than showing
an exact deadline it cannot vouch for.

## Viewers

The viewer count other networks show is not implemented, and will not be
until the protocol can answer it honestly. Counting views means every viewer
telling somebody they watched, which is a report to a server in all but
name. A guessed number would be worse than none.

## What a future version could add

The event family already carries what these would need:

- **Reactions** — a `REACTION` whose target is the story id.
- **Replies** — a Chat message referring to the story id, which keeps the
  reply private and the story public, the way both are meant to work.

Neither is built. The structures do not need changing to add them.
