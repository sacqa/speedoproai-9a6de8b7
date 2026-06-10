
-- Enable RLS on realtime.messages (no-op if already enabled) and add
-- authenticated-only policies so anon users cannot subscribe to channels.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can write realtime" ON realtime.messages;

CREATE POLICY "authenticated can read realtime"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can write realtime"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (true);
