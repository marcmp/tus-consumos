import { getPeriod } from '../script.js';

describe('getPeriod', () => {
  test('returns P3 for National holidays', () => {
    expect(getPeriod("2025/01/01", "13:00")).toBe('P3');
    expect(getPeriod("2025/01/06", "13:00")).toBe('P3');
    expect(getPeriod("2025/03/29", "13:00")).toBe('P3');
    expect(getPeriod("2025/05/01", "13:00")).toBe('P3');
    expect(getPeriod("2025/08/15", "13:00")).toBe('P3');
    expect(getPeriod("2025/10/12", "13:00")).toBe('P3');
    expect(getPeriod("2025/11/01", "13:00")).toBe('P3');
    expect(getPeriod("2025/12/06", "13:00")).toBe('P3');
    expect(getPeriod("2025/12/25", "13:00")).toBe('P3');
  });

  test('returns P3 for weekends', () => {
    expect(getPeriod("2024/03/02", "13:00")).toBe('P3'); // Saturday
    expect(getPeriod("2024/03/03", "13:00")).toBe('P3'); // Sunday
  });

  test('returns P1 for weekdays between 10:00-14:00 and 18:00-22:00', () => {
    expect(getPeriod("2024/03/01", "11:00")).toBe('P1');
    expect(getPeriod("2024/03/01", "12:00")).toBe('P1');
    expect(getPeriod("2024/03/01", "13:00")).toBe('P1');
    expect(getPeriod("2024/03/01", "14:00")).toBe('P1');
    expect(getPeriod("2024/03/01", "19:00")).toBe('P1');
    expect(getPeriod("2024/03/01", "20:00")).toBe('P1');
    expect(getPeriod("2024/03/01", "21:00")).toBe('P1');
    expect(getPeriod("2024/03/01", "22:00")).toBe('P1');
    expect(getPeriod("2024/03/01", "22:59")).toBe('P1');
  });

  test('returns P2 for weekdays between 8:00-10:00, 14:00-18:00 and 22:00-24:00', () => {
    expect(getPeriod("2024/03/01", "09:00")).toBe('P2');
    expect(getPeriod("2024/03/01", "10:00")).toBe('P2');
    expect(getPeriod("2024/03/01", "10:59")).toBe('P2');
    expect(getPeriod("2024/03/01", "15:00")).toBe('P2');
    expect(getPeriod("2024/03/01", "16:00")).toBe('P2');
    expect(getPeriod("2024/03/01", "17:00")).toBe('P2');
    expect(getPeriod("2024/03/01", "18:00")).toBe('P2');
    expect(getPeriod("2024/03/01", "23:00")).toBe('P2');
    expect(getPeriod("2024/03/01", "24:00")).toBe('P2');
  });

  test('returns P3 for all other times', () => {
    expect(getPeriod("2024/03/01", "01:00")).toBe('P3');
    expect(getPeriod("2024/03/01", "05:00")).toBe('P3');
    expect(getPeriod("2024/03/01", "07:59")).toBe('P3');
  });
}); 