-- ════════════════════════════════════════════════════════════════════════════
-- V3 CMS rebuild: public.get_gym_active_plan(p_gym_id)
-- ════════════════════════════════════════════════════════════════════════════
--
-- The public gym website (anon visitors at iron-paradise.gymmobius.com or
-- /iron-paradise) needs to know the gym's plan to decide whether to render
-- the multi-page site or the Solo Coach single-page site. subscriptions
-- has RLS that restricts SELECT to owners, so an anon SELECT returns no
-- rows.
--
-- SECURITY DEFINER function exposes ONLY the lowercase plan_name for the
-- gym's most recent active/trial subscription — no other columns, no row
-- enumeration. Same narrow-exception pattern as founder_slots_used().
-- Falls back to 'free' (Solo Coach default) when no subscription exists.

CREATE OR REPLACE FUNCTION public.get_gym_active_plan(p_gym_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- V3 P0 lifecycle (2026-06-02): include 'expired' so an expired gym
  -- returns its last-paid plan_name (premium/pro/starter). Otherwise the
  -- public site demoted them to Solo Coach single-page on expiry, which
  -- contradicts the intentional design "expired gyms keep their brand
  -- presence". Only TRUE Solo Coach gyms (status=active + plan=free,
  -- i.e. post-trial converts) return 'free' from this RPC.
  SELECT COALESCE(
    (
      SELECT lower(s.plan_name)
      FROM public.subscriptions s
      WHERE s.gym_id = p_gym_id
        AND s.status IN ('active', 'trial', 'expired')
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    'free'
  );
$$;

COMMENT ON FUNCTION public.get_gym_active_plan(uuid) IS
  'Public lookup: returns the canonical lowercase plan_name (free / starter / pro / premium) for a gym''s most recent active/trial subscription. SECURITY DEFINER so anon visitors on the public gym site can drive single-page-vs-multi-page rendering without RLS access to the subscriptions table. Returns ''free'' when no subscription exists (Solo Coach default).';

REVOKE ALL ON FUNCTION public.get_gym_active_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gym_active_plan(uuid) TO anon, authenticated;
