// Reporting an Ollie reply (POST /chat/report) -- run with `npm test`.
// Checks the exact request the website sends, and that every language
// has every string the report flag and dialog use.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeEach, describe, test } from 'node:test';

import { REPORT_REASONS, reportReply } from '../src/lib/api.ts';

// The browser pieces api.ts uses, faked: storage for the sign-in
// token, and fetch to catch the request instead of sending it.
const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

let sent: { url: string; init: RequestInit }[] = [];
function answerWith(status: number, body: unknown) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

beforeEach(() => {
  sent = [];
  storage.clear();
  storage.set('ollie_access_token', 'token-1');
});

describe('reportReply', () => {
  test('a saved reply goes by its id, with the reason and the note', async () => {
    answerWith(200, { success: true });
    await reportReply({ messageId: 'm-1', messageText: 'the reply', reason: 'harmful', details: 'please look' });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'https://ollie-api-1-production.up.railway.app/chat/report');
    assert.equal(sent[0].init.method, 'POST');
    assert.equal((sent[0].init.headers as Record<string, string>).Authorization, 'Bearer token-1');
    assert.deepEqual(JSON.parse(String(sent[0].init.body)), {
      message_id: 'm-1',
      message_text: 'the reply',
      reason: 'harmful',
      details: 'please look',
    });
  });

  test('a reply that was never saved goes by its text, and no note means no details', async () => {
    answerWith(200, { success: true });
    await reportReply({ messageId: null, messageText: 'opening line', reason: 'other', details: null });
    assert.deepEqual(JSON.parse(String(sent[0].init.body)), { message_text: 'opening line', reason: 'other' });
  });

  test('a refused report rejects, so the chat can put the flag back', async () => {
    answerWith(404, { detail: "That reply couldn't be found" });
    await assert.rejects(
      reportReply({ messageId: 'gone', messageText: 'x', reason: 'offensive', details: null }),
      /couldn't be found/,
    );
  });

  test('offers exactly the reasons the server accepts', () => {
    // Must match chat.py's REPORT_REASONS keys.
    assert.deepEqual([...REPORT_REASONS].sort(), ['false', 'harmful', 'offensive', 'other', 'sexual']);
  });
});

describe('report translations', () => {
  const localesDir = new URL('../src/i18n/locales/', import.meta.url);
  const english = JSON.parse(readFileSync(new URL('en.json', localesDir), 'utf8')).chat.report;
  const keysOf = (value: unknown, prefix = ''): string[] =>
    typeof value === 'object' && value !== null
      ? Object.entries(value).flatMap(([key, child]) => keysOf(child, `${prefix}${key}.`))
      : [prefix.slice(0, -1)];

  for (const file of readdirSync(localesDir).filter((name) => name.endsWith('.json'))) {
    test(`${file} has every report string`, () => {
      const report = JSON.parse(readFileSync(new URL(file, localesDir), 'utf8')).chat.report;
      assert.deepEqual(keysOf(report).sort(), keysOf(english).sort());
      for (const key of keysOf(report)) {
        const text = key.split('.').reduce((node, part) => node[part], report);
        assert.ok(typeof text === 'string' && text.trim() !== '', `${file}: chat.report.${key} is empty`);
      }
      for (const reason of REPORT_REASONS) assert.ok(report.reasons[reason], `${file}: no label for ${reason}`);
    });
  }
});
