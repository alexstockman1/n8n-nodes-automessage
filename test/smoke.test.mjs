// Loads the BUILT package the way n8n does (dist paths from package.json's
// "n8n" manifest) and exercises the trigger's dedupe logic offline.
// Run: npm test (after npm run build). No network, no API key.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = require(join(root, 'package.json'));

test('n8n manifest points at files that exist and load', () => {
    for (const rel of [...pkg.n8n.credentials, ...pkg.n8n.nodes]) {
        const abs = join(root, rel);
        assert.ok(existsSync(abs), `${rel} missing — run npm run build`);
        require(abs);
    }
    assert.ok(pkg.keywords.includes('n8n-community-node-package'));
});

test('credentials inject X-API-KEY and test against /v1/status', () => {
    const { AutoMessageApi } = require(join(root, pkg.n8n.credentials[0]));
    const cred = new AutoMessageApi();
    assert.equal(cred.name, 'autoMessageApi');
    assert.equal(cred.authenticate.properties.headers['X-API-KEY'], '={{$credentials.apiKey}}');
    assert.equal(cred.test.request.url, '/v1/status');
});

test('action node covers the full /v1 resource set', () => {
    const { AutoMessage } = require(join(root, pkg.n8n.nodes[0]));
    const node = new AutoMessage();
    const resources = node.description.properties.find((p) => p.name === 'resource');
    assert.deepEqual(
        resources.options.map((o) => o.value).sort(),
        ['contact', 'conversation', 'draft', 'message', 'status'],
    );
    assert.equal(node.description.credentials[0].name, 'autoMessageApi');
    assert.match(node.description.description, /iMessage/);
});

function fakePollContext({ responses, mode = 'trigger', staticData = {} }) {
    let call = 0;
    return {
        staticData,
        ctx: {
            getNodeParameter: () => 'messageReceived',
            getCredentials: async () => ({ apiKey: 'am_test', baseUrl: 'https://api.automessage.app' }),
            getWorkflowStaticData: () => staticData,
            getMode: () => mode,
            helpers: {
                httpRequestWithAuthentication: async () => ({ data: responses[Math.min(call++, responses.length - 1)] }),
                returnJsonArray: (items) => items.map((json) => ({ json })),
            },
        },
    };
}

const MSG = (id, sentDate) => ({ id, sentDate, body: 'hi', outbound: false });

test('trigger: first poll seeds silently, new messages fire once, repeats are deduped', async () => {
    const { AutoMessageTrigger } = require(join(root, pkg.n8n.nodes[1]));
    const trigger = new AutoMessageTrigger();
    const batch1 = [MSG('m1', '2026-10-14T10:00:00.000Z')];
    const batch2 = [MSG('m2', '2026-10-14T10:05:00.000Z'), MSG('m1', '2026-10-14T10:00:00.000Z')];
    const { ctx, staticData } = fakePollContext({ responses: [batch1, batch2, batch2] });

    assert.equal(await trigger.poll.call(ctx), null, 'first poll seeds, no fire');
    assert.equal(staticData.lastSentDate, '2026-10-14T10:00:00.000Z');

    const second = await trigger.poll.call(ctx);
    assert.equal(second[0].length, 1, 'only the unseen message fires');
    assert.equal(second[0][0].json.id, 'm2');

    assert.equal(await trigger.poll.call(ctx), null, 'same batch again → fully deduped');
});

test('trigger: manual test mode returns the latest item for field mapping', async () => {
    const { AutoMessageTrigger } = require(join(root, pkg.n8n.nodes[1]));
    const trigger = new AutoMessageTrigger();
    const { ctx } = fakePollContext({
        responses: [[MSG('m9', '2026-10-14T11:00:00.000Z')]],
        mode: 'manual',
    });
    const result = await trigger.poll.call(ctx);
    assert.equal(result[0][0].json.id, 'm9');
});
