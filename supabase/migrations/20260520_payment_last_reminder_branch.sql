-- Add branch_id to payment_last_reminder so reminder history can be filtered
-- by branch alongside the rest of the multi-branch dashboard.
DROP VIEW IF EXISTS payment_last_reminder;
CREATE VIEW payment_last_reminder AS
  SELECT DISTINCT ON (payment_id)
    payment_id,
    gym_id,
    branch_id,
    sent_at AS last_sent_at,
    status  AS last_status,
    channel AS last_channel
  FROM payment_reminders
  ORDER BY payment_id, sent_at DESC;

GRANT SELECT ON payment_last_reminder TO authenticated;
