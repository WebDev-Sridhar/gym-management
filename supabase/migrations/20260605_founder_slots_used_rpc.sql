-- ============================================================================
-- V3 Task 8: public founder_slots_used() RPC
-- ============================================================================
-- The pricing page (anon visitors) shows "X of 100 founder spots claimed".
-- subscriptions has RLS that restricts SELECT to gym owners, so a plain
-- count(*) from an anon session returns 0 instead of the real number.
--
-- This RPC is the narrow exception: it returns ONLY the aggregate count,
-- never any subscription rows. SECURITY DEFINER lets it bypass RLS to
-- read the count, but the function signature only exposes an int — no
-- way for a caller to enumerate rows or learn anything else about the
-- subscriptions table.
--
-- Grants: anon + authenticated. Both can read the counter; the actual
-- claim logic is in create-subscription-order (server-validated against
-- the same count).

CREATE OR REPLACE FUNCTION public.founder_slots_used()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.subscriptions
  WHERE is_founder_pricing = true;
$$;

COMMENT ON FUNCTION public.founder_slots_used() IS
  'Public aggregate count of subscriptions in the first-100 founder pricing program. SECURITY DEFINER so anon visitors on the pricing page can read the counter without RLS access to the subscriptions table.';

REVOKE ALL ON FUNCTION public.founder_slots_used() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founder_slots_used() TO anon, authenticated;
