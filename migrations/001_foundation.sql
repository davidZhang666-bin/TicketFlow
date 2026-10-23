CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('USER', 'ORGANIZER')),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (expires_at > created_at)
);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE events (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 4000),
  location text NOT NULL CHECK (char_length(location) BETWEEN 1 AND 160),
  category text NOT NULL CHECK (category IN ('LECTURE', 'COMPETITION', 'PERFORMANCE')),
  status text NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELING', 'CANCELED')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  sales_opens_at timestamptz NOT NULL,
  sales_closes_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (sales_closes_at > sales_opens_at)
);
CREATE INDEX events_owner_idx ON events(owner_id, created_at DESC);
CREATE INDEX events_public_idx ON events(created_at DESC) WHERE status = 'PUBLISHED';
CREATE TABLE event_slots (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents BETWEEN 0 AND 100000000),
  CHECK (ends_at > starts_at)
);
CREATE INDEX event_slots_event_idx ON event_slots(event_id, starts_at);
CREATE TABLE slot_inventory (
  slot_id uuid PRIMARY KEY REFERENCES event_slots(id) ON DELETE CASCADE,
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 100000),
  available integer NOT NULL CHECK (available >= 0),
  held integer NOT NULL DEFAULT 0 CHECK (held >= 0),
  confirmed integer NOT NULL DEFAULT 0 CHECK (confirmed >= 0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  CHECK (capacity = available + held + confirmed)
);
CREATE TABLE idempotency_records (
  user_id uuid NOT NULL REFERENCES users(id),
  scope text NOT NULL,
  key text NOT NULL CHECK (char_length(key) BETWEEN 16 AND 128),
  request_hash text NOT NULL,
  response_json jsonb,
  status_code integer,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(user_id, scope, key),
  CHECK ((response_json IS NULL) = (status_code IS NULL))
);
CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'PROCESSING', 'DELIVERED', 'DEAD')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX outbox_pending_idx ON outbox_events(available_at, created_at) WHERE state = 'PENDING';
