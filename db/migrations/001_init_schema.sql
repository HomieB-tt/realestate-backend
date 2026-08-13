-- =====================================================================
-- Migration 001: Core Schema Initialization
-- Real Estate MVP — profiles, properties (PostGIS), property_images,
-- viewings (ACID-safe booking), indexes, and Row Level Security.
--
-- Target: Supabase (PostgreSQL 15+) with PostGIS extension.
-- Apply with: supabase db push  OR  psql -f 001_init_schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists postgis;
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('client', 'agent', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type property_status as enum ('draft', 'published', 'under_offer', 'sold', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'listing_type') then
    create type listing_type as enum ('sale', 'rent');
  end if;

  if not exists (select 1 from pg_type where typname = 'viewing_status') then
    create type viewing_status as enum ('requested', 'confirmed', 'cancelled', 'completed', 'no_show');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. PROFILES
-- Extends auth.users (Supabase-managed) with app-specific role/data.
-- One-to-one with auth.users via shared primary key.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  phone         text,
  role          user_role not null default 'client',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'App-level user profile & role, 1:1 with auth.users';

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'client')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. PROPERTIES
-- Spatial column uses GEOGRAPHY(POINT, 4326) per architecture spec.
-- ---------------------------------------------------------------------
create table if not exists public.properties (
  id              uuid primary key default uuid_generate_v4(),
  agent_id        uuid not null references public.profiles (id) on delete cascade,
  title           text not null,
  description     text not null default '',
  listing_type    listing_type not null,
  status          property_status not null default 'draft',
  price           numeric(14, 2) not null check (price >= 0),
  currency        char(3) not null default 'USD',
  bedrooms        smallint not null default 0 check (bedrooms >= 0),
  bathrooms       smallint not null default 0 check (bathrooms >= 0),
  area_sqm        numeric(10, 2) check (area_sqm is null or area_sqm > 0),
  address_line    text not null,
  city            text not null,
  country         text not null,
  location        geography(Point, 4326) not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on column public.properties.location is 'WGS84 point (lng, lat) — always insert as ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography';

-- Spatial index — critical for PostGIS radius/boundary queries.
create index if not exists idx_properties_location
  on public.properties using gist (location);

-- Common filter indexes.
create index if not exists idx_properties_status on public.properties (status);
create index if not exists idx_properties_agent_id on public.properties (agent_id);
create index if not exists idx_properties_listing_type on public.properties (listing_type);

-- ---------------------------------------------------------------------
-- 4. PROPERTY IMAGES
-- References objects in Supabase Storage bucket 'property-images'.
-- ---------------------------------------------------------------------
create table if not exists public.property_images (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid not null references public.properties (id) on delete cascade,
  storage_path  text not null,       -- path within the Supabase Storage bucket
  position      smallint not null default 0,
  is_cover      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_property_images_property_id
  on public.property_images (property_id);

-- Only one cover image per property.
create unique index if not exists uq_property_cover
  on public.property_images (property_id)
  where is_cover = true;

-- ---------------------------------------------------------------------
-- 5. VIEWINGS (Appointment Booking)
-- Overlap protection is enforced at two levels:
--   (a) DB-level EXCLUDE constraint using btree_gist (belt & suspenders)
--   (b) Explicit SELECT ... FOR UPDATE transaction in the repository layer
-- ---------------------------------------------------------------------
create extension if not exists btree_gist;

create table if not exists public.viewings (
  id              uuid primary key default uuid_generate_v4(),
  property_id     uuid not null references public.properties (id) on delete cascade,
  client_id       uuid not null references public.profiles (id) on delete cascade,
  agent_id        uuid not null references public.profiles (id) on delete cascade,
  scheduled_at    timestamptz not null,
  duration_mins   smallint not null default 30 check (duration_mins > 0),
  -- Generated column so we can express the time range for the EXCLUDE constraint.
  time_range      tstzrange generated always as (
                    tstzrange(scheduled_at, scheduled_at + make_interval(mins => duration_mins), '[)')
                  ) stored,
  status          viewing_status not null default 'requested',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Prevents two ACTIVE (requested/confirmed) bookings for the same
  -- property from overlapping in time, enforced by Postgres itself.
  constraint no_overlapping_active_viewings
    exclude using gist (
      property_id with =,
      time_range with &&
    ) where (status in ('requested', 'confirmed'))
);

create index if not exists idx_viewings_property_id on public.viewings (property_id);
create index if not exists idx_viewings_client_id on public.viewings (client_id);
create index if not exists idx_viewings_agent_id on public.viewings (agent_id);
create index if not exists idx_viewings_scheduled_at on public.viewings (scheduled_at);

-- ---------------------------------------------------------------------
-- 6. updated_at TRIGGERS
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_viewings_updated_at on public.viewings;
create trigger trg_viewings_updated_at
  before update on public.viewings
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. HELPER: current user's role (used heavily in RLS policies)
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.viewings enable row level security;

-- ---- profiles -----------------------------------------------------
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using ( id = auth.uid() or public.current_user_role() = 'admin' );

create policy "profiles_update_own"
  on public.profiles for update
  using ( id = auth.uid() )
  with check ( id = auth.uid() );

-- ---- properties -----------------------------------------------------
-- Public can read published listings; agents can read their own drafts;
-- admins can read everything.
create policy "properties_select_published_or_owner"
  on public.properties for select
  using (
    status = 'published'
    or agent_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

create policy "properties_insert_agent_only"
  on public.properties for insert
  with check (
    agent_id = auth.uid()
    and public.current_user_role() in ('agent', 'admin')
  );

create policy "properties_update_owner_or_admin"
  on public.properties for update
  using ( agent_id = auth.uid() or public.current_user_role() = 'admin' )
  with check ( agent_id = auth.uid() or public.current_user_role() = 'admin' );

create policy "properties_delete_owner_or_admin"
  on public.properties for delete
  using ( agent_id = auth.uid() or public.current_user_role() = 'admin' );

-- ---- property_images --------------------------------------------------
-- Visibility mirrors the parent property's visibility.
create policy "property_images_select_via_parent"
  on public.property_images for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_images.property_id
        and (p.status = 'published' or p.agent_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy "property_images_mutate_owner_or_admin"
  on public.property_images for all
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_images.property_id
        and (p.agent_id = auth.uid() or public.current_user_role() = 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_images.property_id
        and (p.agent_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

-- ---- viewings -----------------------------------------------------------
-- Clients see their own bookings; agents see bookings on their properties;
-- admins see everything.
create policy "viewings_select_participant_or_admin"
  on public.viewings for select
  using (
    client_id = auth.uid()
    or agent_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

create policy "viewings_insert_client_only"
  on public.viewings for insert
  with check (
    client_id = auth.uid()
    and public.current_user_role() in ('client', 'agent', 'admin')
  );

create policy "viewings_update_participant_or_admin"
  on public.viewings for update
  using (
    client_id = auth.uid()
    or agent_id = auth.uid()
    or public.current_user_role() = 'admin'
  )
  with check (
    client_id = auth.uid()
    or agent_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ---------------------------------------------------------------------
-- 9. GEO-SPATIAL RPC — radius search
-- Exposed to the backend via Supabase RPC (or callable raw SQL).
-- Returns properties within `radius_m` meters of (lng, lat).
-- ---------------------------------------------------------------------
create or replace function public.properties_within_radius(
  center_lng double precision,
  center_lat double precision,
  radius_m    double precision,
  max_results integer default 50
)
returns setof public.properties
language sql
stable
as $$
  select p.*
  from public.properties p
  where p.status = 'published'
    and ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      radius_m
    )
  order by p.location <-> ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
  limit max_results;
$$;

-- ---------------------------------------------------------------------
-- 10. STORAGE BUCKET (idempotent) for property images
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "storage_property_images_public_read"
  on storage.objects for select
  using ( bucket_id = 'property-images' );

create policy "storage_property_images_agent_write"
  on storage.objects for insert
  with check (
    bucket_id = 'property-images'
    and auth.role() = 'authenticated'
  );

-- =====================================================================
-- END Migration 001
-- =====================================================================
