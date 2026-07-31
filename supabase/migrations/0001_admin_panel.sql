-- Admin Panel schema for chat.sharjeel.space
-- Run this in the Supabase SQL editor (or `supabase db push`) once per project.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / ON CONFLICT.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- ---------------------------------------------------------------------------
-- site_settings — singleton JSON document (website/branding/SEO/footer/etc.)
-- ---------------------------------------------------------------------------
create table if not exists site_settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id),
  constraint site_settings_singleton check (id = 1)
);
insert into site_settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- chat_settings — singleton JSON document (model, prompts UI defaults, etc.)
-- ---------------------------------------------------------------------------
create table if not exists chat_settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id),
  constraint chat_settings_singleton check (id = 1)
);
insert into chat_settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- prompts + prompt_versions — editable system/feature prompts with history
-- ---------------------------------------------------------------------------
create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id)
);

create table if not exists prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references prompts(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  created_by uuid references admin_users(id)
);
create index if not exists prompt_versions_prompt_id_idx on prompt_versions (prompt_id, created_at desc);

-- Seed the built-in prompt slots the app understands. Admins can also add
-- unlimited custom ones from the Prompts screen.
insert into prompts (key, name, content) values
  ('system', 'System Prompt', 'You are a helpful, friendly AI assistant.'),
  ('vision', 'Vision Prompt', 'Describe and analyze the attached image(s) accurately and concisely.'),
  ('search', 'Search Prompt', 'Use the provided web search results to answer factually, citing sources.'),
  ('summarization', 'Summarization Prompt', 'Summarize the provided content clearly and concisely.'),
  ('coding', 'Coding Prompt', 'You are an expert software engineer. Write correct, clean, well-explained code.'),
  ('safety', 'Safety Prompt', 'Do not produce harmful, illegal, or unsafe content.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- analytics_events — lightweight event log the dashboard aggregates over
-- ---------------------------------------------------------------------------
create table if not exists analytics_events (
  id bigserial primary key,
  event_type text not null, -- 'message_sent' | 'chat_error' | 'file_uploaded' | 'rate_limited'
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_type_created_idx on analytics_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- audit_logs — admin action trail
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id bigserial primary key,
  admin_id uuid references admin_users(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: lock every table down completely. The app only ever
-- talks to Supabase through the service_role key from server-side code
-- (API routes / middleware), which bypasses RLS by design. No anon/public
-- policies are defined, so the anon key (if ever exposed) can read/write
-- nothing here.
-- ---------------------------------------------------------------------------
alter table admin_users enable row level security;
alter table site_settings enable row level security;
alter table chat_settings enable row level security;
alter table prompts enable row level security;
alter table prompt_versions enable row level security;
alter table analytics_events enable row level security;
alter table audit_logs enable row level security;
