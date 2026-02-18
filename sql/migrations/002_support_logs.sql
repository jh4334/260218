create extension if not exists pgcrypto;

create table if not exists public.support_logs (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_code text not null,
  kind text not null,
  minutes int not null default 0,
  mission text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_logs_classroom_created
on public.support_logs (classroom_id, created_at desc);

create index if not exists idx_support_logs_student_created
on public.support_logs (classroom_id, student_code, created_at desc);

create index if not exists idx_support_logs_kind
on public.support_logs (classroom_id, kind);
