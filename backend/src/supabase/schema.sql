-- ============================================================
-- VidyaBot 2.0 — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Students ─────────────────────────────────────────────────
create table if not exists students (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  grade          int  not null check (grade between 1 and 12),
  language       text not null check (language in ('ml', 'en', 'mng')),
  district       text,
  learning_needs text[] default '{}',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── Chat Messages ─────────────────────────────────────────────
create table if not exists chat_messages (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid references students(id) on delete cascade,
  session_id     uuid not null,
  content        text not null,
  type           text not null check (type in ('text', 'voice', 'document')),
  input_language text default 'auto',
  grade          int,
  grade_label    text,
  learning_needs text[] default '{}',
  document_id    uuid,
  ai_response    text,
  timestamp      timestamptz default now()
);

create index if not exists idx_chat_messages_session
  on chat_messages(session_id);

create index if not exists idx_chat_messages_student
  on chat_messages(student_id);

-- ── Documents ─────────────────────────────────────────────────
create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references students(id) on delete cascade,
  session_id    uuid,
  label         text,
  original_name text not null,
  stored_name   text not null,
  mime_type     text not null,
  size          int  not null,
  path          text not null,
  status        text default 'pending'
                  check (status in ('pending', 'ready', 'error')),
  summary       text,
  uploaded_at   timestamptz default now()
);

create index if not exists idx_documents_student
  on documents(student_id);
