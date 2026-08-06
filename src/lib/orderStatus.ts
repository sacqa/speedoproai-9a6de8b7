/** Maps a stored guest-order status onto the 5-step fulfilment timeline. */
export const STATUS_STEP: Record<string, number> = {
  submitted: 0,
  confirmed: 1,
  packing: 2,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: 0,
};

export const statusText = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
