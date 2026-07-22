# Gmail client-reply deduplication

Status: implementation helper added; production wiring still requires explicit Anton approval before any live scheduled runner, Gmail label mutation, database write, or outbound email behaviour is changed.

Related issue: #607

## Problem

The Jan / LuxeMaurice review watch repeated the same notification for the same client reply:

> Please simplify all processes

The monitor must remember what has already been reported and must only notify Anton when a genuinely newer inbound client-authored message appears.

## Required checkpoint

Every client-reply monitor must persist a checkpoint after it notifies Anton:

```json
{
  "thread_id": "gmail-thread-id",
  "last_reported_gmail_message_id": "gmail-message-id",
  "last_reported_message_timestamp": 1784354400000,
  "last_reported_excerpt_hash": "sha256-normalized-excerpt",
  "classification": "CHANGE_REQUEST",
  "reported_at": "2026-07-18T06:00:00.000Z"
}
```

The checkpoint may be stored in Postgres, a durable action-plan table, or another approved persistent control-plane store. It must not live only in the prompt text.

## Runtime rule

For each scheduled run:

1. Read the relevant Gmail thread.
2. Extract the newest inbound client-authored message only.
3. Ignore Anton's sent messages.
4. Ignore quoted historical thread content.
5. Load the last checkpoint for the monitor/client/thread.
6. Evaluate the message with `evaluateClientReplyForNotification` from `lib/email/client-reply-monitor.js`.
7. Notify Anton only when `shouldNotify === true`.
8. Persist the returned checkpoint only after the notification is successfully emitted.

## Duplicate suppression

The helper suppresses repeat notifications when any of these are true:

- the Gmail message id equals `last_reported_gmail_message_id`;
- the same normalized excerpt hash appears in the same thread;
- the candidate message timestamp is not newer than `last_reported_message_timestamp` in the same thread;
- the sender is not the expected client sender.

## Classification output

The helper produces both the existing simple classification and the richer internal classification.

Simple classification:

- `APPROVED`
- `CHANGES NEEDED`
- `UNCLEAR`

Detailed classification:

- `APPROVAL`
- `APPROVAL_WITH_CONDITIONS`
- `CHANGE_REQUEST`
- `SUPPORT_OR_HOW_TO_QUESTION`
- `CONTENT_OR_ASSET_REQUEST`
- `BLOCKER_OR_ACCESS_ISSUE`
- `GENERAL_ACK_NO_ACTION`
- `UNCLEAR`

## Acceptance test

Given a thread where Jan first says:

> Approved

and later says:

> How do I add listings, photos and videos

The monitor must classify the latest reply as a content/support request, not as approval.

Given a later repeated scheduled run where the latest Jan message is still:

> Please simplify all processes

The monitor must not notify Anton again if that message has already been checkpointed.

## Test coverage

`node-tests/client-reply-monitor.test.mjs` covers:

- simplify request classification;
- listings/photos/videos question classification;
- new-message notification;
- duplicate message-id suppression;
- duplicate excerpt suppression;
- older-message suppression;
- non-client sender suppression.
