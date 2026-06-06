-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — P2 M3: admin_messaging_overview()
--
-- Messaging control-center aggregate over public.notifications: volume, delivery
-- rate, per-type + per-channel breakdown, and top WhatsApp-sending gyms.
-- Channel-level status is read from channel_results jsonb. Admin-guarded.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_messaging_overview()
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_total_24h int := 0;
  v_total_7d  int := 0;
  v_sent_7d   int := 0;
  v_failed_7d int := 0;
  v_partial_7d int := 0;
  v_skipped_7d int := 0;
  v_pending_7d int := 0;
  v_wa_sent   int := 0;
  v_wa_failed int := 0;
  v_em_sent   int := 0;
  v_em_failed int := 0;
  v_by_type   jsonb;
  v_top_gyms  jsonb;
  v_delivery  numeric;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into v_total_24h
  from public.notifications where created_at >= now() - interval '24 hours';

  select
    count(*),
    count(*) filter (where status = 'sent'),
    count(*) filter (where status = 'failed'),
    count(*) filter (where status = 'partial'),
    count(*) filter (where status = 'skipped'),
    count(*) filter (where status = 'pending')
  into v_total_7d, v_sent_7d, v_failed_7d, v_partial_7d, v_skipped_7d, v_pending_7d
  from public.notifications where created_at >= now() - interval '7 days';

  -- Per-channel from channel_results jsonb.
  select
    count(*) filter (where channel_results->'whatsapp'->>'status' = 'sent'),
    count(*) filter (where channel_results->'whatsapp'->>'status' = 'failed'),
    count(*) filter (where channel_results->'email'->>'status' = 'sent'),
    count(*) filter (where channel_results->'email'->>'status' = 'failed')
  into v_wa_sent, v_wa_failed, v_em_sent, v_em_failed
  from public.notifications where created_at >= now() - interval '7 days';

  -- Delivery rate = sent / (sent + partial + failed) over attempts (exclude skipped/pending).
  v_delivery := case
    when (v_sent_7d + v_partial_7d + v_failed_7d) > 0
    then round(100.0 * v_sent_7d / (v_sent_7d + v_partial_7d + v_failed_7d), 1)
    else null end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'type', type, 'total', total, 'failed', failed
         ) order by total desc), '[]'::jsonb)
  into v_by_type
  from (
    select type,
           count(*) as total,
           count(*) filter (where status in ('failed', 'partial')) as failed
    from public.notifications
    where created_at >= now() - interval '7 days'
    group by type
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object(
           'gym_id', gym_id, 'name', name, 'sent', sent
         ) order by sent desc), '[]'::jsonb)
  into v_top_gyms
  from (
    select n.gym_id, g.name, count(*) as sent
    from public.notifications n
    join public.gyms g on g.id = n.gym_id
    where n.created_at >= now() - interval '30 days'
      and n.channel_results->'whatsapp'->>'status' = 'sent'
    group by n.gym_id, g.name
    order by sent desc
    limit 5
  ) t;

  return jsonb_build_object(
    'total_24h', v_total_24h,
    'total_7d', v_total_7d,
    'sent_7d', v_sent_7d,
    'failed_7d', v_failed_7d,
    'partial_7d', v_partial_7d,
    'skipped_7d', v_skipped_7d,
    'pending_7d', v_pending_7d,
    'delivery_rate_7d', v_delivery,
    'whatsapp_sent_7d', v_wa_sent,
    'whatsapp_failed_7d', v_wa_failed,
    'email_sent_7d', v_em_sent,
    'email_failed_7d', v_em_failed,
    'by_type_7d', v_by_type,
    'top_whatsapp_gyms_30d', v_top_gyms,
    'generated_at', now()
  );
end;
$$;

revoke execute on function public.admin_messaging_overview() from anon, public;
grant   execute on function public.admin_messaging_overview() to authenticated;
