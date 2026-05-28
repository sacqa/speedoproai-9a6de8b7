DROP POLICY IF EXISTS "customer insert instructions" ON public.order_instructions;
CREATE POLICY "customer insert instructions"
ON public.order_instructions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND author_role = 'customer'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_instructions.order_id
      AND o.user_id = auth.uid()
  )
);