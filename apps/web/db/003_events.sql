CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  host_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL CHECK (length(sport) BETWEEN 1 AND 60),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 20 AND 1000),
  starts_at TIMESTAMPTZ NOT NULL,
  time_zone TEXT NOT NULL CHECK (length(time_zone) BETWEEN 1 AND 80),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 2 AND 20),
  language TEXT NOT NULL CHECK (length(language) BETWEEN 1 AND 35),
  minimum_age INTEGER NOT NULL CHECK (minimum_age BETWEEN 18 AND 100),
  maximum_age INTEGER NOT NULL CHECK (maximum_age BETWEEN 18 AND 100 AND maximum_age >= minimum_age),
  experience_levels TEXT[] NOT NULL CHECK (cardinality(experience_levels) BETWEEN 1 AND 3),
  public_city TEXT NOT NULL CHECK (length(public_city) BETWEEN 1 AND 100),
  public_country_code CHAR(2) NOT NULL,
  public_area_label TEXT NOT NULL CHECK (length(public_area_label) BETWEEN 1 AND 120),
  public_approximate_latitude DOUBLE PRECISION,
  public_approximate_longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((public_approximate_latitude IS NULL) = (public_approximate_longitude IS NULL)),
  CHECK (public_approximate_latitude IS NULL OR public_approximate_latitude BETWEEN -90 AND 90),
  CHECK (public_approximate_longitude IS NULL OR public_approximate_longitude BETWEEN -180 AND 180)
);

CREATE TABLE IF NOT EXISTS event_private_locations (
  event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL CHECK (length(venue_name) BETWEEN 1 AND 120),
  address TEXT NOT NULL CHECK (length(address) BETWEEN 1 AND 300),
  precise_latitude DOUBLE PRECISION,
  precise_longitude DOUBLE PRECISION,
  arrival_instructions TEXT CHECK (length(arrival_instructions) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((precise_latitude IS NULL) = (precise_longitude IS NULL)),
  CHECK (precise_latitude IS NULL OR precise_latitude BETWEEN -90 AND 90),
  CHECK (precise_longitude IS NULL OR precise_longitude BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS events_host_user_id_idx ON events(host_user_id);
CREATE INDEX IF NOT EXISTS events_discovery_idx ON events(status, starts_at, public_country_code, public_city);
