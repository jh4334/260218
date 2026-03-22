alter table public.students
add column if not exists tags text[] not null default '{}'::text[];

create index if not exists idx_students_tags
on public.students using gin (tags);
