-- Enable database change events used by the MemberHub live dashboard.
-- Safe to run more than once in the Supabase SQL editor.

do $$
declare
  target_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Supabase Realtime publication does not exist in this project.';
  end if;

  foreach target_table in array array['notifications', 'service_requests', 'transactions']
  loop
    if to_regclass('public.' || target_table) is not null
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = target_table
      ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end $$;
