export const SERVICE_CATEGORIES = [
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "ac_technician", label: "AC Technician" },
  { value: "cleaner", label: "Cleaner" },
  { value: "mobile_repair", label: "Mobile/Phone Repair" },
  { value: "appliance_repair", label: "Appliance Repair" },
  { value: "carpenter", label: "Carpenter" },
  { value: "painter", label: "Painter" },
  { value: "mechanic", label: "Mechanic" },
  { value: "computer_repair", label: "Computer/Laptop Repair" },
  { value: "other", label: "Other" },
] as const;

export const SR_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const URGENCY = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
] as const;

export const labelOf = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((x) => x.value === v)?.label ?? v;
