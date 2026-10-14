# n8n-nodes-automessage

iMessage for [n8n](https://n8n.io): send and receive iMessage and SMS texts
from your own Mac and Apple ID with [autoMessage](https://automessage.app) —
blue-bubble texting in your workflows.

## Nodes

**autoMessage** (action) — full REST coverage:
- **Message**: Send (iMessage/SMS from your Apple ID), Get Many, Get
- **Conversation**: Get Many (search by participant or name), Get, Get Messages
- **Draft**: Get (check send status), Get Many (by status), Update, Cancel
- **Contact**: Create or Update (idempotent upsert), Get Many, Get, Delete
- **Connector Status**: Get (is the Mac online?)

**autoMessage Trigger** (polling) — iMessage Received, iMessage Sent,
New Conversation, New Contact.

Sends honor STOP opt-outs and your daily new-outreach limit server-side.
The action node declares `usableAsTool`, so n8n AI agents can call it.

## Install

n8n → Settings → Community Nodes → Install → `n8n-nodes-automessage`.
Credentials need your autoMessage API key (go.automessage.app → Settings → API).

## Develop

```bash
cd n8n
npm install --ignore-scripts   # isolated-vm (transitive, types-only use) won't build on new Node — safe to skip
npm run build                  # tsc + icon copy into dist/
npm test                       # loads dist exactly like n8n + offline trigger-dedupe tests
```

Local n8n test run: `npm pack`, then in a scratch dir
`npm init -y && npm i n8n <path-to-tgz>` and `N8N_CUSTOM_EXTENSIONS` or install
via the Community Nodes UI against a local instance.

## Publish (needs Alex)

1. `npm publish --access public` from `n8n/` (npm user `stockmandigital`, 2FA).
   The package name prefix `n8n-nodes-` + the `n8n-community-node-package`
   keyword is what makes it installable/searchable for self-hosted users.
2. **Submit for n8n verification** (Creator hub: https://creators.n8n.io) —
   verified nodes appear in the in-app node search **on n8n Cloud**, which is
   the discovery surface that matters. Requirements we already meet by design:
   zero runtime dependencies, declarative action node, MIT license, no
   external file access. Review lead time applies.
3. Optional GitHub mirror `alexstockman1/n8n-nodes-automessage` (matches
   package.json repository field) — same rsync pattern as the MCP repo.
