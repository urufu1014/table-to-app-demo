create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'staff', 'viewer');
create type public.job_status as enum (
  'unassigned',
  'scheduled',
  'in_progress',
  'report_preparing',
  'submitted',
  'completed',
  'cancelled'
);
create type public.billing_status as enum (
  'not_quoted',
  'quoted',
  'ordered',
  'not_invoiced',
  'invoiced',
  'paid',
  'not_applicable'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique,
  role public.app_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique not null,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  name text not null,
  postal_code text,
  address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sites_unique_location unique (customer_id, name, address)
);

create table public.inspection_jobs (
  id uuid primary key default gen_random_uuid(),
  job_no text unique not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  site_id uuid not null references public.sites(id) on delete restrict,
  inspection_type text not null,
  assignee_id uuid not null references public.profiles(id) on delete restrict,
  scheduled_date date not null,
  report_due_date date not null,
  status public.job_status not null default 'scheduled',
  estimate_amount numeric(12, 0),
  billing_status public.billing_status not null default 'not_quoted',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_jobs_due_after_schedule check (report_due_date >= scheduled_date),
  constraint inspection_jobs_estimate_non_negative check (estimate_amount is null or estimate_amount >= 0)
);

create table public.job_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.inspection_jobs(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  changed_fields jsonb not null,
  created_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  total_rows integer not null check (total_rows >= 0),
  success_rows integer not null check (success_rows >= 0),
  failed_rows integer not null check (failed_rows >= 0),
  imported_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.import_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number integer not null check (row_number >= 0),
  field_name text,
  error_code text not null,
  message text not null,
  row_data jsonb not null,
  created_at timestamptz not null default now()
);

create index inspection_jobs_assignee_idx on public.inspection_jobs (assignee_id);
create index inspection_jobs_status_idx on public.inspection_jobs (status);
create index inspection_jobs_due_idx on public.inspection_jobs (report_due_date);
create index inspection_jobs_billing_idx on public.inspection_jobs (billing_status);
create index inspection_jobs_customer_idx on public.inspection_jobs (customer_id);
create index sites_customer_idx on public.sites (customer_id);
create index job_history_job_idx on public.job_history (job_id, created_at desc);
create index import_errors_batch_idx on public.import_errors (batch_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger sites_set_updated_at before update on public.sites
for each row execute function public.set_updated_at();
create trigger inspection_jobs_set_updated_at before update on public.inspection_jobs
for each row execute function public.set_updated_at();

create or replace function public.log_inspection_job_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changes jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.job_history (job_id, actor_id, action, changed_fields)
    values (
      new.id,
      new.created_by,
      'create',
      jsonb_build_object(
        'job_no', jsonb_build_object('before', null, 'after', new.job_no),
        'customer_id', jsonb_build_object('before', null, 'after', new.customer_id),
        'site_id', jsonb_build_object('before', null, 'after', new.site_id),
        'inspection_type', jsonb_build_object('before', null, 'after', new.inspection_type),
        'assignee_id', jsonb_build_object('before', null, 'after', new.assignee_id),
        'scheduled_date', jsonb_build_object('before', null, 'after', new.scheduled_date),
        'report_due_date', jsonb_build_object('before', null, 'after', new.report_due_date),
        'status', jsonb_build_object('before', null, 'after', new.status),
        'estimate_amount', jsonb_build_object('before', null, 'after', new.estimate_amount),
        'billing_status', jsonb_build_object('before', null, 'after', new.billing_status),
        'notes', jsonb_build_object('before', null, 'after', new.notes)
      )
    );
    return new;
  end if;

  if old.job_no is distinct from new.job_no then
    changes := changes || jsonb_build_object('job_no', jsonb_build_object('before', old.job_no, 'after', new.job_no));
  end if;
  if old.customer_id is distinct from new.customer_id then
    changes := changes || jsonb_build_object('customer_id', jsonb_build_object('before', old.customer_id, 'after', new.customer_id));
  end if;
  if old.site_id is distinct from new.site_id then
    changes := changes || jsonb_build_object('site_id', jsonb_build_object('before', old.site_id, 'after', new.site_id));
  end if;
  if old.inspection_type is distinct from new.inspection_type then
    changes := changes || jsonb_build_object('inspection_type', jsonb_build_object('before', old.inspection_type, 'after', new.inspection_type));
  end if;
  if old.assignee_id is distinct from new.assignee_id then
    changes := changes || jsonb_build_object('assignee_id', jsonb_build_object('before', old.assignee_id, 'after', new.assignee_id));
  end if;
  if old.scheduled_date is distinct from new.scheduled_date then
    changes := changes || jsonb_build_object('scheduled_date', jsonb_build_object('before', old.scheduled_date, 'after', new.scheduled_date));
  end if;
  if old.report_due_date is distinct from new.report_due_date then
    changes := changes || jsonb_build_object('report_due_date', jsonb_build_object('before', old.report_due_date, 'after', new.report_due_date));
  end if;
  if old.status is distinct from new.status then
    changes := changes || jsonb_build_object('status', jsonb_build_object('before', old.status, 'after', new.status));
  end if;
  if old.estimate_amount is distinct from new.estimate_amount then
    changes := changes || jsonb_build_object('estimate_amount', jsonb_build_object('before', old.estimate_amount, 'after', new.estimate_amount));
  end if;
  if old.billing_status is distinct from new.billing_status then
    changes := changes || jsonb_build_object('billing_status', jsonb_build_object('before', old.billing_status, 'after', new.billing_status));
  end if;
  if old.notes is distinct from new.notes then
    changes := changes || jsonb_build_object('notes', jsonb_build_object('before', old.notes, 'after', new.notes));
  end if;

  if changes <> '{}'::jsonb then
    insert into public.job_history (job_id, actor_id, action, changed_fields)
    values (new.id, new.updated_by, 'update', changes);
  end if;

  return new;
end;
$$;

create trigger inspection_jobs_log_history
after insert or update on public.inspection_jobs
for each row execute function public.log_inspection_job_history();

create or replace function public.current_profile_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_profile_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_profile_role() = 'staff', false)
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.sites enable row level security;
alter table public.inspection_jobs enable row level security;
alter table public.job_history enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_errors enable row level security;

create policy "profiles select active users" on public.profiles
for select using (public.current_profile_role() is not null);

create policy "profiles update admin only" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

create policy "customers select authenticated" on public.customers
for select using (public.current_profile_role() is not null);

create policy "customers insert admin only" on public.customers
for insert with check (public.is_admin());

create policy "customers update admin only" on public.customers
for update using (public.is_admin()) with check (public.is_admin());

create policy "sites select authenticated" on public.sites
for select using (public.current_profile_role() is not null);

create policy "sites insert admin only" on public.sites
for insert with check (public.is_admin());

create policy "sites update admin only" on public.sites
for update using (public.is_admin()) with check (public.is_admin());

create policy "jobs select by role" on public.inspection_jobs
for select using (
  public.is_admin()
  or public.current_profile_role() = 'viewer'
  or (public.is_staff() and assignee_id = auth.uid())
);

create policy "jobs insert admin staff" on public.inspection_jobs
for insert with check (
  public.is_admin()
  or (public.is_staff() and assignee_id = auth.uid() and created_by = auth.uid() and updated_by = auth.uid())
);

create policy "jobs update by role" on public.inspection_jobs
for update using (
  public.is_admin()
  or (public.is_staff() and assignee_id = auth.uid())
) with check (
  public.is_admin()
  or (public.is_staff() and assignee_id = auth.uid() and updated_by = auth.uid())
);

create policy "history select by job visibility" on public.job_history
for select using (
  public.is_admin()
  or public.current_profile_role() = 'viewer'
  or exists (
    select 1 from public.inspection_jobs j
    where j.id = job_history.job_id and j.assignee_id = auth.uid()
  )
);

create policy "history insert matching visible job" on public.job_history
for insert with check (
  public.is_admin()
  or (
    public.is_staff()
    and exists (
      select 1 from public.inspection_jobs j
      where j.id = job_history.job_id and j.assignee_id = auth.uid()
    )
  )
);

create policy "import batches select admin" on public.import_batches
for select using (public.is_admin());

create policy "import batches insert admin" on public.import_batches
for insert with check (public.is_admin());

create policy "import errors select admin" on public.import_errors
for select using (public.is_admin());

create policy "import errors insert admin" on public.import_errors
for insert with check (public.is_admin());

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
