-- Admin dashboard aggregates (token-gated like other admin_* RPCs)
create or replace function public.admin_dashboard_stats(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_day date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  result jsonb;
begin
  if p_token is null
     or p_token is distinct from (
       select value from private.admin_config where key = 'delete_token' limit 1
     ) then
    raise exception 'unauthorized';
  end if;

  v_day := (timezone('Asia/Hong_Kong', now()))::date;
  v_day_start := (v_day::timestamp AT TIME ZONE 'Asia/Hong_Kong');
  v_day_end := v_day_start + interval '1 day';

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'online_now', (
      select count(*)::int from private.presence_heartbeats
      where last_seen > now() - interval '90 seconds'
    ),
    'today_active', (
      select count(*)::int from (
        select client_key as k
        from private.presence_heartbeats
        where last_seen >= v_day_start and last_seen < v_day_end
        union
        select user_id::text
        from public.workouts
        where started_at >= v_day_start and started_at < v_day_end
        union
        select user_id::text
        from public.meals
        where eaten_at >= v_day_start and eaten_at < v_day_end
      ) u
    ),
    'messages_total', (select count(*)::int from public.messages),
    'messages_today', (
      select count(*)::int from public.messages
      where created_at >= v_day_start and created_at < v_day_end
    ),
    'workouts_total', (select count(*)::int from public.workouts),
    'workouts_today', (
      select count(*)::int from public.workouts
      where started_at >= v_day_start and started_at < v_day_end
    ),
    'meals_total', (select count(*)::int from public.meals),
    'meals_today', (
      select count(*)::int from public.meals
      where eaten_at >= v_day_start and eaten_at < v_day_end
    ),
    'plans_total', (select count(*)::int from public.workout_plans),
    'banned_ips', (select count(*)::int from private.banned_ips),
    'day_hk', to_char(v_day, 'YYYY-MM-DD'),
    'as_of', to_char(timezone('Asia/Hong_Kong', now()), 'YYYY-MM-DD HH24:MI:SS')
  ) into result;

  return result;
end;
$function$;

revoke all on function public.admin_dashboard_stats(text) from public;
grant execute on function public.admin_dashboard_stats(text) to anon, authenticated, service_role;
