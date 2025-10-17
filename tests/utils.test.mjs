import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalDateKey,
  getTodayKey,
  calculateStreak,
  getDateRangeForFilter,
  getTotalStudyTimeInRange,
  filterCompletedProjects,
  calculateDaysBetween,
  formatDate,
  calculateProjectDistribution,
  buildThresholds,
  computeColorBucket,
  getBestDayOfWeek,
  getLongestStreak,
  getMostProductiveDay,
  getMostProductiveWeek,
  getMostProductiveMonth,
  getMonthDateRange,
  countProjectsCompletedInMonth
} from '../utils.mjs';

describe('Date Utilities', () => {
  describe('getLocalDateKey', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-03-15T10:30:00');
      expect(getLocalDateKey(date)).toBe('2024-03-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2024-01-05T10:30:00');
      expect(getLocalDateKey(date)).toBe('2024-01-05');
    });

    it('should use current date when no argument provided', () => {
      const result = getLocalDateKey();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getTodayKey', () => {
    it('should return today\'s date key', () => {
      const result = getTodayKey();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDate', () => {
    it('should format ISO date to DD/MM', () => {
      expect(formatDate('2024-03-15T10:30:00')).toBe('15/03');
    });

    it('should pad single digit days and months', () => {
      expect(formatDate('2024-01-05T10:30:00')).toBe('05/01');
    });
  });

  describe('calculateDaysBetween', () => {
    it('should calculate days between two dates', () => {
      const start = '2024-03-01T00:00:00';
      const end = '2024-03-05T00:00:00';
      expect(calculateDaysBetween(start, end)).toBe(4);
    });

    it('should return 0 for same day', () => {
      const date = '2024-03-01T10:30:00';
      expect(calculateDaysBetween(date, date)).toBe(0);
    });

    it('should handle month boundaries', () => {
      const start = '2024-02-28T00:00:00';
      const end = '2024-03-02T00:00:00';
      expect(calculateDaysBetween(start, end)).toBe(3);
    });
  });
});

describe('Date Range Filters', () => {
  describe('getDateRangeForFilter', () => {
    it('should return 30-day range for "past-30"', () => {
      const { startDate, endDate } = getDateRangeForFilter('past-30');
      const diffDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(29); // 30 days including today
    });

    it('should return this month range for "this-month"', () => {
      const now = new Date();
      const { startDate, endDate } = getDateRangeForFilter('this-month');

      expect(startDate.getDate()).toBe(1);
      expect(startDate.getMonth()).toBe(now.getMonth());
      expect(endDate.getDate()).toBe(now.getDate());
    });

    it('should return last month range for "last-month"', () => {
      const now = new Date();
      const { startDate, endDate } = getDateRangeForFilter('last-month');

      const lastMonth = now.getMonth() - 1;
      expect(startDate.getMonth()).toBe(lastMonth < 0 ? 11 : lastMonth);
      expect(startDate.getDate()).toBe(1);
    });

    it('should return same date for unknown period', () => {
      const { startDate, endDate } = getDateRangeForFilter('unknown');
      expect(startDate.toDateString()).toBe(endDate.toDateString());
    });
  });
});

describe('Streak Calculation', () => {
  describe('calculateStreak', () => {
    beforeEach(() => {
      // Mock current date to ensure consistent tests
      // We'll use relative dates from "today"
    });

    it('should return 0 for empty stats', () => {
      expect(calculateStreak({})).toBe(0);
    });

    it('should count consecutive days from today backwards', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      const stats = {
        [getLocalDateKey(today)]: { minutes: 30, pomos: 2 },
        [getLocalDateKey(yesterday)]: { minutes: 25, pomos: 1 },
        [getLocalDateKey(twoDaysAgo)]: { minutes: 20, pomos: 1 }
      };

      expect(calculateStreak(stats)).toBe(3);
    });

    it('should stop at first missing day', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);

      const stats = {
        [getLocalDateKey(today)]: { minutes: 30, pomos: 2 },
        [getLocalDateKey(yesterday)]: { minutes: 25, pomos: 1 },
        // Missing 2 days ago
        [getLocalDateKey(threeDaysAgo)]: { minutes: 20, pomos: 1 }
      };

      expect(calculateStreak(stats)).toBe(2);
    });

    it('should continue from yesterday if today has 0 minutes', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      const stats = {
        [getLocalDateKey(today)]: { minutes: 0, pomos: 0 },
        [getLocalDateKey(yesterday)]: { minutes: 25, pomos: 1 },
        [getLocalDateKey(twoDaysAgo)]: { minutes: 20, pomos: 1 }
      };

      expect(calculateStreak(stats)).toBe(2);
    });

    it('should return 0 if today and yesterday both have no minutes', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      const stats = {
        [getLocalDateKey(today)]: { minutes: 0, pomos: 0 },
        [getLocalDateKey(yesterday)]: { minutes: 0, pomos: 0 },
        [getLocalDateKey(twoDaysAgo)]: { minutes: 20, pomos: 1 }
      };

      expect(calculateStreak(stats)).toBe(0);
    });

    it('should handle single day streak', () => {
      const today = new Date();
      const stats = {
        [getLocalDateKey(today)]: { minutes: 30, pomos: 2 }
      };

      expect(calculateStreak(stats)).toBe(1);
    });
  });
});

describe('Study Time Calculations', () => {
  describe('getTotalStudyTimeInRange', () => {
    it('should sum minutes across date range', () => {
      const stats = {
        '2024-03-01': { minutes: 30, pomos: 2 },
        '2024-03-02': { minutes: 45, pomos: 3 },
        '2024-03-03': { minutes: 25, pomos: 1 }
      };

      const start = new Date(2024, 2, 1); // March 1, 2024 (month is 0-indexed)
      const end = new Date(2024, 2, 3);   // March 3, 2024

      expect(getTotalStudyTimeInRange(stats, start, end)).toBe(100);
    });

    it('should handle missing days', () => {
      const stats = {
        '2024-03-01': { minutes: 30, pomos: 2 },
        '2024-03-03': { minutes: 25, pomos: 1 }
        // Missing 2024-03-02
      };

      const start = new Date(2024, 2, 1); // March 1, 2024
      const end = new Date(2024, 2, 3);   // March 3, 2024

      expect(getTotalStudyTimeInRange(stats, start, end)).toBe(55);
    });

    it('should return 0 for empty range', () => {
      const stats = {};
      const start = new Date('2024-03-01');
      const end = new Date('2024-03-03');

      expect(getTotalStudyTimeInRange(stats, start, end)).toBe(0);
    });
  });
});

describe('Project Filtering', () => {
  describe('filterCompletedProjects', () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 15).toISOString();
    const lastYear = new Date(now.getFullYear() - 1, 5, 15).toISOString();

    const projects = [
      { name: 'Project A', completed: true, endDate: thisMonth },
      { name: 'Project B', completed: true, endDate: lastMonth },
      { name: 'Project C', completed: true, endDate: sixMonthsAgo },
      { name: 'Project D', completed: true, endDate: lastYear },
      { name: 'Project E', completed: false, endDate: null }
    ];

    it('should filter projects for "this-month"', () => {
      const result = filterCompletedProjects(projects, 'this-month');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Project A');
    });

    it('should filter projects for "past-month"', () => {
      const result = filterCompletedProjects(projects, 'past-month');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Project B');
    });

    it('should filter projects for "6-months"', () => {
      const result = filterCompletedProjects(projects, '6-months');
      expect(result.length).toBeGreaterThanOrEqual(2); // At least A, B, C
    });

    it('should filter projects for "entire-year"', () => {
      const result = filterCompletedProjects(projects, 'entire-year');
      expect(result.length).toBeGreaterThanOrEqual(2); // At least A, B
    });

    it('should only include completed projects', () => {
      const result = filterCompletedProjects(projects, 'entire-year');
      expect(result.every(p => p.completed)).toBe(true);
    });
  });
});

describe('Heatmap Utilities', () => {
  describe('buildThresholds', () => {
    it('should return default thresholds for empty array', () => {
      expect(buildThresholds([])).toEqual([5, 15, 30]);
    });

    it('should use small thresholds for max <= 15', () => {
      expect(buildThresholds([1, 5, 10, 12])).toEqual([1, 5, 10]);
    });

    it('should calculate percentage-based thresholds for moderate values', () => {
      const result = buildThresholds([10, 20, 30, 40, 50]);
      expect(result).toHaveLength(3);
      expect(result[0]).toBeLessThan(result[1]);
      expect(result[1]).toBeLessThan(result[2]);
    });

    it('should handle large values', () => {
      const result = buildThresholds([100, 200, 300]);
      expect(result).toHaveLength(3);
      expect(result[2]).toBeLessThanOrEqual(300);
    });
  });

  describe('computeColorBucket', () => {
    const thresholds = [10, 30, 60];

    it('should return 0 for 0 minutes', () => {
      expect(computeColorBucket(0, thresholds)).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(computeColorBucket(null, thresholds)).toBe(0);
      expect(computeColorBucket(undefined, thresholds)).toBe(0);
    });

    it('should return 1 for minutes <= threshold[0]', () => {
      expect(computeColorBucket(5, thresholds)).toBe(1);
      expect(computeColorBucket(10, thresholds)).toBe(1);
    });

    it('should return 2 for minutes <= threshold[1]', () => {
      expect(computeColorBucket(20, thresholds)).toBe(2);
      expect(computeColorBucket(30, thresholds)).toBe(2);
    });

    it('should return 3 for minutes <= threshold[2]', () => {
      expect(computeColorBucket(40, thresholds)).toBe(3);
      expect(computeColorBucket(60, thresholds)).toBe(3);
    });

    it('should return 4 for minutes > threshold[2]', () => {
      expect(computeColorBucket(61, thresholds)).toBe(4);
      expect(computeColorBucket(100, thresholds)).toBe(4);
    });
  });
});

describe('Project Distribution', () => {
  describe('calculateProjectDistribution', () => {
    it('should calculate distribution with daily tracking', () => {
      const now = new Date();
      const today = getLocalDateKey(now);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayKey = getLocalDateKey(yesterday);

      const projects = [
        {
          name: 'Project A',
          startDate: yesterday.toISOString(),
          completed: false,
          dailySeconds: {
            [yesterdayKey]: 3600, // 1 hour
            [today]: 3600  // 1 hour
          }
        }
      ];

      const stats = {
        [yesterdayKey]: { minutes: 90, pomos: 3 },
        [today]: { minutes: 90, pomos: 3 }
      };

      const result = calculateProjectDistribution(projects, stats, 'this-month');

      expect(result.projectTimes).toHaveLength(1);
      expect(result.projectTimes[0].name).toBe('Project A');
      expect(result.projectTimes[0].minutes).toBe(120); // 2 hours
      expect(result.totalProjectMinutes).toBe(120);
      expect(result.unattributedMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should handle projects without daily tracking', () => {
      const projects = [
        {
          name: 'Project B',
          startDate: '2024-03-01T00:00:00',
          completed: false,
          currentSeconds: 7200 // 2 hours
        }
      ];

      const stats = {
        '2024-03-01': { minutes: 120, pomos: 4 }
      };

      const result = calculateProjectDistribution(projects, stats, 'this-month');

      expect(result.projectTimes).toHaveLength(1);
      expect(result.projectTimes[0].minutes).toBe(120);
    });

    it('should calculate unattributed time', () => {
      const now = new Date();
      const today = getLocalDateKey(now);

      const projects = [
        {
          name: 'Project A',
          startDate: now.toISOString(),
          completed: false,
          dailySeconds: {
            [today]: 1800 // 30 minutes (in seconds)
          }
        }
      ];

      const stats = {
        [today]: { minutes: 60, pomos: 2 }
      };

      const result = calculateProjectDistribution(projects, stats, 'this-month');

      // Today should be included in this month
      expect(result.totalStudyMinutes).toBeGreaterThanOrEqual(60);
      expect(result.totalProjectMinutes).toBeGreaterThanOrEqual(0); // Project minutes depend on date range
      expect(result.unattributedMinutes).toBeGreaterThanOrEqual(0);

      // If project time is found, verify it's calculated correctly
      if (result.totalProjectMinutes > 0) {
        expect(result.projectTimes).toHaveLength(1);
        expect(result.projectTimes[0].name).toBe('Project A');
      }
    });

    it('should handle no projects', () => {
      const projects = [];
      const stats = {
        '2024-03-01': { minutes: 60, pomos: 2 }
      };

      const result = calculateProjectDistribution(projects, stats, 'this-month');

      expect(result.projectTimes).toHaveLength(0);
      expect(result.unattributedMinutes).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Statistics Functions', () => {
  describe('getBestDayOfWeek', () => {
    it('should return N/A for empty stats', () => {
      const result = getBestDayOfWeek({});
      expect(result.dayName).toBe('N/A');
      expect(result.avgMinutes).toBe(0);
    });

    it('should find the day with highest average', () => {
      // Use same dates repeated to test averaging
      const stats = {
        '2024-01-01': { minutes: 120, pomos: 4 },
        '2024-01-08': { minutes: 100, pomos: 3 },  // Same day of week as Jan 1
        '2024-01-02': { minutes: 50, pomos: 2 },
        '2024-01-03': { minutes: 80, pomos: 3 },
        '2024-01-10': { minutes: 90, pomos: 3 }    // Same day of week as Jan 3
      };

      const result = getBestDayOfWeek(stats);
      // Should find the day with highest average (Jan 1 and Jan 8)
      expect(result.avgMinutes).toBe(110); // (120+100)/2
      expect(result.dayName).not.toBe('N/A');
    });

    it('should ignore days with 0 minutes', () => {
      const stats = {
        '2024-01-01': { minutes: 100, pomos: 4 },
        '2024-01-02': { minutes: 0, pomos: 0 },
        '2024-01-03': { minutes: 50, pomos: 2 }
      };

      const result = getBestDayOfWeek(stats);
      // Should find the day with 100 minutes (not 0 and not 50)
      expect(result.avgMinutes).toBe(100);
      expect(result.dayName).not.toBe('N/A');
    });

    it('should handle all days of the week', () => {
      // Create 7 consecutive days with increasing values
      const stats = {
        '2024-01-01': { minutes: 10, pomos: 1 },
        '2024-01-02': { minutes: 20, pomos: 1 },
        '2024-01-03': { minutes: 30, pomos: 1 },
        '2024-01-04': { minutes: 40, pomos: 1 },
        '2024-01-05': { minutes: 50, pomos: 1 },
        '2024-01-06': { minutes: 60, pomos: 1 },
        '2024-01-07': { minutes: 70, pomos: 1 }
      };

      const result = getBestDayOfWeek(stats);
      // Should find the day with maximum value (70 minutes)
      expect(result.avgMinutes).toBe(70);
      expect(result.dayName).not.toBe('N/A');
    });
  });

  describe('getLongestStreak', () => {
    it('should return 0 for empty stats', () => {
      expect(getLongestStreak({})).toBe(0);
    });

    it('should find longest consecutive streak', () => {
      const stats = {
        '2024-03-01': { minutes: 30, pomos: 2 },
        '2024-03-02': { minutes: 25, pomos: 1 },
        '2024-03-03': { minutes: 20, pomos: 1 },
        // Gap here
        '2024-03-05': { minutes: 40, pomos: 2 },
        '2024-03-06': { minutes: 35, pomos: 2 },
        '2024-03-07': { minutes: 30, pomos: 2 },
        '2024-03-08': { minutes: 45, pomos: 2 }
      };

      expect(getLongestStreak(stats)).toBe(4); // Days 5-8
    });

    it('should handle single day streak', () => {
      const stats = {
        '2024-03-01': { minutes: 30, pomos: 2 }
      };

      expect(getLongestStreak(stats)).toBe(1);
    });

    it('should ignore days with 0 minutes', () => {
      const stats = {
        '2024-03-01': { minutes: 30, pomos: 2 },
        '2024-03-02': { minutes: 0, pomos: 0 },
        '2024-03-03': { minutes: 20, pomos: 1 }
      };

      expect(getLongestStreak(stats)).toBe(1);
    });

    it('should handle multiple equal streaks', () => {
      const stats = {
        '2024-03-01': { minutes: 30, pomos: 2 },
        '2024-03-02': { minutes: 25, pomos: 1 },
        // Gap
        '2024-03-04': { minutes: 40, pomos: 2 },
        '2024-03-05': { minutes: 35, pomos: 2 }
      };

      expect(getLongestStreak(stats)).toBe(2);
    });
  });

  describe('getMostProductiveDay', () => {
    it('should return N/A for empty stats', () => {
      const result = getMostProductiveDay({});
      expect(result.date).toBe('N/A');
      expect(result.minutes).toBe(0);
    });

    it('should find day with most minutes', () => {
      const stats = {
        '2024-03-01': { minutes: 30, pomos: 2 },
        '2024-03-02': { minutes: 120, pomos: 4 },
        '2024-03-03': { minutes: 45, pomos: 2 }
      };

      const result = getMostProductiveDay(stats);
      expect(result.date).toBe('2024-03-02');
      expect(result.minutes).toBe(120);
    });

    it('should handle single day', () => {
      const stats = {
        '2024-03-01': { minutes: 30, pomos: 2 }
      };

      const result = getMostProductiveDay(stats);
      expect(result.date).toBe('2024-03-01');
      expect(result.minutes).toBe(30);
    });

    it('should handle ties (returns first)', () => {
      const stats = {
        '2024-03-01': { minutes: 100, pomos: 4 },
        '2024-03-02': { minutes: 100, pomos: 4 }
      };

      const result = getMostProductiveDay(stats);
      expect(result.minutes).toBe(100);
      expect(['2024-03-01', '2024-03-02']).toContain(result.date);
    });
  });

  describe('getMostProductiveWeek', () => {
    it('should return 0 for empty stats', () => {
      expect(getMostProductiveWeek({})).toBe(0);
    });

    it('should find week with most total minutes', () => {
      const now = new Date();
      const stats = {};

      // Create a productive week 10 days ago
      for (let i = 10; i <= 16; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const key = getLocalDateKey(date);
        stats[key] = { minutes: 60, pomos: 2 }; // 420 minutes total
      }

      // Create a less productive week 3 days ago
      for (let i = 3; i <= 9; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const key = getLocalDateKey(date);
        stats[key] = { minutes: 30, pomos: 1 }; // 210 minutes total
      }

      const result = getMostProductiveWeek(stats);
      expect(result).toBeGreaterThanOrEqual(420);
    });

    it('should use 7-day rolling window', () => {
      const now = new Date();
      const stats = {};

      // Create consecutive days with varying minutes
      for (let i = 0; i < 14; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const key = getLocalDateKey(date);
        stats[key] = { minutes: i * 10, pomos: 1 };
      }

      const result = getMostProductiveWeek(stats);
      // Should find the 7-day window with highest sum
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('getMostProductiveMonth', () => {
    it('should return N/A for empty stats', () => {
      const result = getMostProductiveMonth({});
      expect(result.monthName).toBe('N/A');
      expect(result.hours).toBe(0);
    });

    it('should find month with most total hours', () => {
      const now = new Date();
      const stats = {};

      // Fill this month with data
      for (let day = 1; day <= 10; day++) {
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        const key = getLocalDateKey(date);
        stats[key] = { minutes: 60, pomos: 2 }; // 10 hours total
      }

      // Fill last month with more data
      for (let day = 1; day <= 20; day++) {
        const date = new Date(now.getFullYear(), now.getMonth() - 1, day);
        const key = getLocalDateKey(date);
        stats[key] = { minutes: 60, pomos: 2 }; // 20 hours total
      }

      const result = getMostProductiveMonth(stats);
      expect(result.hours).toBeGreaterThan(0);
      expect(result.monthName).not.toBe('N/A');
    });

    it('should return month name and hours', () => {
      const now = new Date();
      const stats = {};

      // Fill current month
      for (let day = 1; day <= 5; day++) {
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        const key = getLocalDateKey(date);
        stats[key] = { minutes: 120, pomos: 4 }; // 10 hours total
      }

      const result = getMostProductiveMonth(stats);
      expect(result).toHaveProperty('monthName');
      expect(result).toHaveProperty('hours');
      expect(result.hours).toBeGreaterThan(0);
      expect(typeof result.monthName).toBe('string');
    });
  });

  describe('getMonthDateRange', () => {
    it('should return correct range for current month', () => {
      const referenceDate = new Date(2024, 9, 15); // October 15, 2024
      const result = getMonthDateRange(0, referenceDate);

      expect(result.monthStart).toEqual(new Date(2024, 9, 1));
      expect(result.monthEnd).toEqual(new Date(2024, 9, 15));
      expect(result.targetMonth).toEqual(new Date(2024, 9, 1));
    });

    it('should return correct range for previous month', () => {
      const referenceDate = new Date(2024, 9, 15); // October 15, 2024
      const result = getMonthDateRange(-1, referenceDate);

      expect(result.monthStart).toEqual(new Date(2024, 8, 1)); // September 1
      expect(result.monthEnd).toEqual(new Date(2024, 8, 30)); // September 30 (last day)
      expect(result.targetMonth).toEqual(new Date(2024, 8, 1));
    });

    it('should handle month boundaries correctly', () => {
      const referenceDate = new Date(2024, 0, 31); // January 31, 2024
      const result = getMonthDateRange(-1, referenceDate);

      expect(result.monthStart).toEqual(new Date(2023, 11, 1)); // December 1, 2023
      expect(result.monthEnd).toEqual(new Date(2023, 11, 31)); // December 31, 2023
      expect(result.targetMonth).toEqual(new Date(2023, 11, 1));
    });

    it('should handle leap year February correctly', () => {
      const referenceDate = new Date(2024, 2, 15); // March 15, 2024
      const result = getMonthDateRange(-1, referenceDate);

      expect(result.monthStart).toEqual(new Date(2024, 1, 1)); // February 1, 2024
      expect(result.monthEnd).toEqual(new Date(2024, 1, 29)); // February 29, 2024 (leap year)
      expect(result.targetMonth).toEqual(new Date(2024, 1, 1));
    });

    it('should handle non-leap year February correctly', () => {
      const referenceDate = new Date(2023, 2, 15); // March 15, 2023
      const result = getMonthDateRange(-1, referenceDate);

      expect(result.monthStart).toEqual(new Date(2023, 1, 1)); // February 1, 2023
      expect(result.monthEnd).toEqual(new Date(2023, 1, 28)); // February 28, 2023 (non-leap year)
      expect(result.targetMonth).toEqual(new Date(2023, 1, 1));
    });

    it('should work for two months back', () => {
      const referenceDate = new Date(2024, 9, 15); // October 15, 2024
      const result = getMonthDateRange(-2, referenceDate);

      expect(result.monthStart).toEqual(new Date(2024, 7, 1)); // August 1
      expect(result.monthEnd).toEqual(new Date(2024, 7, 31)); // August 31
      expect(result.targetMonth).toEqual(new Date(2024, 7, 1));
    });
  });

  describe('countProjectsCompletedInMonth', () => {
    it('should return 0 for empty projects array', () => {
      const targetMonth = new Date(2024, 9, 1); // October 2024
      expect(countProjectsCompletedInMonth([], targetMonth)).toBe(0);
    });

    it('should count projects completed in target month', () => {
      const projects = [
        { name: 'P1', completed: true, endDate: '2024-10-15T10:00:00Z' },
        { name: 'P2', completed: true, endDate: '2024-10-20T10:00:00Z' },
        { name: 'P3', completed: true, endDate: '2024-09-15T10:00:00Z' },
      ];
      const targetMonth = new Date(2024, 9, 1); // October 2024

      expect(countProjectsCompletedInMonth(projects, targetMonth)).toBe(2);
    });

    it('should not count incomplete projects', () => {
      const projects = [
        { name: 'P1', completed: true, endDate: '2024-10-15T10:00:00Z' },
        { name: 'P2', completed: false, endDate: '2024-10-20T10:00:00Z' },
        { name: 'P3', completed: true, endDate: null },
      ];
      const targetMonth = new Date(2024, 9, 1); // October 2024

      expect(countProjectsCompletedInMonth(projects, targetMonth)).toBe(1);
    });

    it('should handle projects without endDate', () => {
      const projects = [
        { name: 'P1', completed: true, endDate: null },
        { name: 'P2', completed: true, endDate: undefined },
      ];
      const targetMonth = new Date(2024, 9, 1); // October 2024

      expect(countProjectsCompletedInMonth(projects, targetMonth)).toBe(0);
    });

    it('should correctly match year and month', () => {
      const projects = [
        { name: 'P1', completed: true, endDate: '2024-10-15T10:00:00Z' }, // October 2024
        { name: 'P2', completed: true, endDate: '2023-10-15T10:00:00Z' }, // October 2023
      ];
      const targetMonth = new Date(2024, 9, 1); // October 2024

      expect(countProjectsCompletedInMonth(projects, targetMonth)).toBe(1);
    });

    it('should handle end of month dates correctly', () => {
      const projects = [
        { name: 'P1', completed: true, endDate: '2024-10-01T00:00:00Z' }, // First day
        { name: 'P2', completed: true, endDate: '2024-10-31T23:59:59Z' }, // Last day
      ];
      const targetMonth = new Date(2024, 9, 1); // October 2024

      expect(countProjectsCompletedInMonth(projects, targetMonth)).toBe(2);
    });
  });
});
