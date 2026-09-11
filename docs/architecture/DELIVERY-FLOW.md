# Portlane — Delivery Flow

Related: [documentation index](../../README.md)

## 1. Submission

1. Resolve trusted source IP.
2. Authenticate API key.
3. Confirm API key status.
4. Evaluate IP allowlist.
5. Apply rate limit.
6. Resolve tenant.
7. Validate all destination ownership.
8. Check idempotency key.
9. Persist message.
10. Persist one delivery per destination.
11. Enqueue each delivery.
12. Return message + delivery summary.

## 2. Worker Processing

For each queued delivery:

1. Atomically claim delivery.
2. Change status to `PROCESSING`.
3. Resolve provider connection.
4. Validate connection is active.
5. Resolve provider adapter.
6. Invoke adapter.
7. Record attempt.
8. On success, set `DELIVERED`.
9. On retryable failure, schedule retry.
10. On permanent failure, set `FAILED` or `DEAD`.
11. On retry exhaustion, set `DEAD`.

## 3. Retry Policy

Default example:

```text
Attempt 1: immediate
Attempt 2: +5 seconds
Attempt 3: +30 seconds
Attempt 4: +2 minutes
Attempt 5: +10 minutes
```

Exact policy should be configurable centrally.

Retryable examples:

- timeout
- connection reset
- provider 429
- provider 5xx

Usually non-retryable:

- invalid credentials
- invalid destination
- malformed message
- forbidden destination
- permanent validation errors

## 4. Manual Retry

Manual retry creates a new delivery attempt but preserves the original delivery history.

If desired later, a cloned delivery may be created instead, but V1 should keep the model simple.

## 5. Duplicate Protection

Workers must be safe under at-least-once queue semantics.

A delivery job may execute more than once, so state transitions and provider calls should be protected with locking/idempotency where feasible.
