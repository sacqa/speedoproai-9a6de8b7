-- Order instructions thread (customer + admin messages on a specific order)
CREATE TABLE public.order_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  author_role text NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_instructions_order ON public.order_instructions(order_id, created_at);

ALTER TABLE public.order_instructions ENABLE ROW LEVEL SECURITY;

-- Customer (order owner) and admins can read
CREATE POLICY "read order instructions"
ON public.order_instructions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_instructions.order_id
          AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);

-- Customer can insert messages on their own order
CREATE POLICY "customer insert instructions"
ON public.order_instructions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_instructions.order_id AND o.user_id = auth.uid())
);

-- Admins can manage all
CREATE POLICY "admin manage instructions"
ON public.order_instructions FOR ALL
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Allow admins to update/delete order_items (RLS already covers ALL via admin items policy — confirmed)
-- Allow admins to insert order_items via existing admin items policy

-- Enable realtime for instructions
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_instructions;
