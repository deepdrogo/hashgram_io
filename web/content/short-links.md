# Short links and integration

Applications — wallets, the desktop and mobile clients, bots — can link
straight into the explorer with nothing more than an identifier appended to
the site root. The site resolves it and redirects to the canonical page.

## Patterns

| URL | Opens |
| --- | --- |
| `https://hashgram.io/<64-hex transaction hash>` | the transaction |
| `https://hashgram.io/<height>` | the block |
| `https://hashgram.io/hash1…` | the account |
| `https://hashgram.io/hashvaloper1…` | the validator |
| `https://hashgram.io/@username` | the account that owns the username |
| `https://hashgram.io/12D3Koo…` | the peer on the network page |

Canonical routes, if you prefer to build them yourself:

```
/txs/<hash>            /blocks/<height>        /accounts/<address>
/validators/<operator> /governance/<id>        /rewards/providers/<operator>
```

Transaction hashes are case-insensitive; the canonical form is upper-case
hex, exactly as CometBFT prints it.

## From a Windows or mobile app

After broadcasting a transaction you already have its hash. Open

```
https://hashgram.io/<hash>
```

in the system browser. The page shows the decoded messages, the result, the
fee split and the events, and it updates live if the transaction is still
being included.

## Programmatic lookups

The same resolution is available as JSON:

```
GET https://hashgram.io/api/v1/search?q=<identifier>
→ {"type":"tx"|"block"|"account"|"validator"|"username"|"peer"|"proposal"|"none","id":"…"}
```

Full transaction detail:

```
GET https://hashgram.io/api/v1/txs/<hash>
```

Amounts in every response are `uhash` integers as decimal strings
(1 HASH = 1,000,000 uhash). See the [API](/docs/api) page for conventions,
rate limits and the live event stream.

## Open Graph previews

Every page carries an Open Graph image, so a short link pasted into a chat
shows a monochrome preview card with the page title.
