# settlement-service

A backend service that settles completed bookings. It receives a `BookingCompleted`
event over HTTP, computes the final charge (base fare + usage overage + late fee),
captures the money from a pre-authorization via a (flaky) payment gateway, and
persists an **immutable** settlement record. The settlement can then be read back
by `bookingId`.

The whole system (service + payment mock + Postgres) runs with **one command**.

---

## Run

```bash
docker compose up --build
```

This starts three containers:

- `postgres` — Postgres 16. The migration in `apps/settlement/migrations/001_init.sql`
  is applied automatically on first start via `docker-entrypoint-initdb.d`.
- `payment-mock` — a deliberately flaky payment gateway (~15% timeout / 500).
- `settlement` — the service, listening on `http://localhost:3000`.

Once it's up, send the example event:

```bash
curl -X POST http://localhost:3000/events/booking-completed \
  -H 'content-type: application/json' \
  -d @examples/booking-completed.json

curl http://localhost:3000/settlements/bk_8f2a
```

Or use the smoke scripts:

- Windows: `./scripts/smoke.ps1`
- macOS/Linux: `./scripts/smoke.sh` (needs `jq`)

---

## API

| Method | Path | Body | Result |
|---|---|---|---|
| `POST` | `/events/booking-completed` | `BookingCompleted` event JSON | `200` settlement row (idempotent) |
| `GET`  | `/settlements/:bookingId` | — | `200` settlement, or `404` |
| `GET`  | `/healthz` | — | `{ "status": "ok" }` |

Every request gets an `x-trace-id` (generated if not supplied) which is echoed in
the response header and attached to every log line for that request.

---

## Architecture

```
                POST /events/booking-completed
                            │
                            ▼
   ┌────────────────────────────────────────────┐
   │              settlement service             │
   │                                             │
   │  routes → SettlementService (domain)         │
   │              │            │                  │
   │   computeCharge()   ports: SettlementRepo    │
   │                            PaymentGateway    │
   └──────────┬───────────────────────┬──────────┘
              │                       │
       capture (idempotent,     INSERT ... ON CONFLICT
        retried on 5xx/timeout)   DO NOTHING
              │                       │
              ▼                       ▼
      ┌───────────────┐       ┌───────────────┐
      │  payment-mock  │       │   Postgres 16  │
      │  ~15% flaky    │       │  settlements    │
      └───────────────┘       └───────────────┘
```

**Ports & Adapters (hexagonal-lite).** The domain (`computeCharge`,
`SettlementService`) depends only on interfaces in `ports.ts`
(`SettlementRepo`, `PaymentGateway`). Postgres and the HTTP gateway are adapters
plugged in at the edge (`app.ts`). Tests swap in in-memory implementations, so
`npm test` needs no database.

Retry is a **decorator** (`RetryingPaymentGateway`) that wraps any
`PaymentGateway`, not logic baked into the HTTP client. The HTTP adapter only
owns transport and timeout; the retry policy sits around the port, so it applies
to every implementation and can be tested independently.

---

## Design decisions

| Decision | Choice | Why |
|---|---|---|
| Late-hour fee | `Math.ceil` of partial hours | Spec is ambiguous on partial hours. Rounding **up** is conservative and predictable; documented here so the reviewer sees it's a deliberate call, not an accident. |
| Idempotency (service) | `booking_id` PRIMARY KEY + `INSERT ... ON CONFLICT DO NOTHING` | DB-level guarantee. Two concurrent requests for the same booking can't both insert; there's no read-then-write race. |
| Idempotency (gateway) | `idempotencyKey = bookingId` sent to the gateway | A retry (or a duplicate event) re-uses the same key, so the gateway never double-captures. The mock dedupes via an in-memory map. |
| Retry policy | 3 attempts, exponential backoff with jitter (0.5–1.5×), **only** on timeout/5xx; implemented as a decorator around the `PaymentGateway` port | Transient failures are worth retrying; 4xx are caller bugs and retrying them just amplifies load. Keeping retry off the transport makes it transport-agnostic and unit-testable. |
| Money | Integer **cents** end to end | Never use floats for currency. |
| Trace ID | UUID v4 per request, stored in `AsyncLocalStorage`, attached to every log via a pino mixin | Standard structured-logging approach; no need to thread a logger through every function. |
| Immutability | Settlement row is inserted once and never updated | A settlement is a financial fact. Corrections would be new rows, not mutations. |

---

## Tests

```bash
cd apps/settlement
npm install
npm test
```

No database or Docker required — tests use an in-memory repo and a stub gateway.

Covered:

- `charge.test.ts` — the money math, including the example from the spec, the
  `Math.ceil` partial-hour rule, and the no-overage / not-late case.
- `retry.test.ts` — retry on 5xx and timeout, **no** retry on 4xx, give up after
  exhausting attempts.
- `idempotency.test.ts` — 10 sequential and 10 concurrent identical requests each
  produce exactly **one** row and **one** gateway capture; retries through
  transient 5xx still produce exactly one row with one idempotency key.

---

## Tradeoffs (knowingly cut for a take-home)

- **Migrations** run via Postgres' `docker-entrypoint-initdb.d` rather than a real
  migration tool (Flyway/Prisma). Fine for a single init script; production needs
  versioned, repeatable migrations.
- **Tests use an in-memory repo** to keep `npm test` zero-config and fast. Real DB
  integration would use Testcontainers.
- **Gateway idempotency cache is in-memory** in the mock — a restart loses it. A
  real gateway persists this.
- **No outbox / event emission.** The service does not publish a `BookingSettled`
  event. The spec only requires HTTP intake (see below).

---

## What I'd do with more time

- Emit a `BookingSettled` event using the **transactional outbox pattern**: write
  an outbox row in the same DB transaction as the settlement, with a separate
  poller publishing to Kafka. (Kafka was deliberately left out — the spec is
  HTTP-intake only and adding a broker here would be over-engineering.)
- **Circuit breaker** around the gateway: open after N failures in a window so we
  fail fast instead of burning the retry budget while it's down.
- **Saga / compensating transaction** for the one dangerous edge case: gateway
  captured successfully but the DB write then failed. Today that money is captured
  without a record; a compensation flow would void/refund or reconcile it.
- Prometheus metrics + a `/metrics` endpoint.
- Real migration tooling (Prisma/Flyway).
- OpenAPI spec + a generated client.

---

## Repo layout

```
settlement-service/
├── docker-compose.yml          # one-command run: postgres + payment-mock + settlement
├── README.md
├── AI_USAGE.md                 # how AI was used to build this
├── .env.example
├── examples/booking-completed.json
├── scripts/                    # smoke.ps1 / smoke.sh
├── apps/
│   ├── payment-mock/           # deliberately flaky (~15%) payment gateway
│   │   └── src/index.js
│   └── settlement/
│       ├── migrations/001_init.sql
│       └── src/
│           ├── index.ts        # process entrypoint
│           ├── app.ts          # wires adapters → domain (composition root)
│           ├── config.ts       # zod-validated env
│           ├── logger.ts       # pino + AsyncLocalStorage trace id
│           ├── ports.ts        # SettlementRepo / PaymentGateway interfaces
│           ├── errors.ts
│           ├── domain/
│           │   ├── eventSchema.ts   # zod schema for the inbound event
│           │   └── charge.ts        # computeCharge — pure money math
│           ├── services/settlementService.ts  # orchestration
│           ├── adapters/
│           │   ├── db/{pool,settlementRepo}.ts
│           │   └── gateway/{retry,paymentClient,retryingGateway}.ts
│           ├── middleware/{trace,error}.ts
│           ├── routes/{health,events,settlements}.ts
│           └── __tests__/{charge,retry,idempotency}.test.ts
```
