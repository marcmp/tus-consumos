// Period calculation shared module

export const nationalFestivities = [
  "01/01",
  "01/06",
  "03/29",
  "05/01",
  "08/15",
  "10/12",
  "11/01",
  "12/06",
  "12/25"
];

const hourToPeriodMap = {
  0: 'P3', 1: 'P3', 2: 'P3', 3: 'P3', 4: 'P3', 5: 'P3', 6: 'P3', 7: 'P3', 8: 'P3',
  9: 'P2', 10: 'P2',
  11: 'P1', 12: 'P1', 13: 'P1', 14: 'P1',
  15: 'P2', 16: 'P2', 17: 'P2', 18: 'P2',
  19: 'P1', 20: 'P1', 21: 'P1', 22: 'P1',
  23: 'P2', 24: 'P2'
};

export function getPeriod(date, time) {
  const [, month, day] = date.split("/");
  const monthDay = `${month}/${day}`;
  if (nationalFestivities.includes(monthDay)) {
    return 'P3';
  }
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'P3';
  }
  const hour = parseInt(time.split(':')[0], 10);
  return hourToPeriodMap[hour] || 'P3';
}


