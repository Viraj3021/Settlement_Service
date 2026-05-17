CREATE TABLE IF NOT EXISTS settlements (
  booking_id      TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  base_fare_cents INTEGER NOT NULL,
  overage_cents   INTEGER NOT NULL,
  late_fee_cents  INTEGER NOT NULL,
  total_cents     INTEGER NOT NULL,
  pre_auth_id     TEXT NOT NULL,
  capture_id      TEXT,
  status          TEXT NOT NULL CHECK (status IN ('SETTLED','FAILED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
