export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfDay(date = new Date()): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfWeek(date = new Date()): Date {
  const d = startOfDay(date);
  const mondayIndex = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - mondayIndex);
  return d;
}
