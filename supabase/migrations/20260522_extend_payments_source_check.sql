-- Add 'member_app_renewal' to the allowed payments.source values.
--
-- create-public-order tags renewals initiated from the member-app with
-- source = 'member_app_renewal' (vs 'checkout' for first-time public
-- signups via the gym's public site). The original constraint shipped
-- before that path existed, so every renewal attempt was hitting
-- payments_source_check and returning 500 from the edge function.
--
-- Keeping the values distinct lets analytics later separate "new members
-- bought a plan on the website" from "existing member renewed inside the
-- app" — same Razorpay amount, very different funnels.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_source_check;
ALTER TABLE payments ADD CONSTRAINT payments_source_check
  CHECK (source IS NULL OR source IN ('checkout', 'link', 'upi', 'manual', 'member_app_renewal'));
