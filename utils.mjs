// Utility functions for testing
// These are duplicated from main.js for testing purposes

/**
 * Get local date key in YYYY-MM-DD format
 */
export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date key
 */
export function getTodayKey() {
  return getLocalDateKey(new Date());
}

/**
 * Calculate streak of consecutive study days
 */
export function calculateStreak(stats) {
  const today = new Date();
  let streakCount = 0;

  // Start from today (offset 0) and count backwards
  for (let offset = 0; ; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const key = getLocalDateKey(d);
    const entry = stats[key];

    // If this day has study time, increment streak
    if (entry && entry.minutes > 0) {
      streakCount++;
    } else {
      // If it's today and has 0 minutes, streak can still continue from yesterday
      // But if any past day is missing, streak ends
      if (offset === 0) {
        // Today has 0 minutes - check if yesterday exists
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yKey = getLocalDateKey(yesterday);
        const yEntry = stats[yKey];

        // If yesterday has minutes, continue counting from yesterday
        if (yEntry && yEntry.minutes > 0) {
          continue; // Keep checking backwards
        }
      }
      // Streak ends here
      break;
    }
  }

  return streakCount;
}

/**
 * Get date range based on filter period
 */
export function getDateRangeForFilter(period) {
  const now = new Date();
  let startDate, endDate;

  switch(period) {
    case 'past-30':
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 29); // 30 days including today
      break;
    case 'this-month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'last-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
      break;
    default:
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = endDate;
  }

  return { startDate, endDate };
}

/**
 * Calculate total study time from daily stats for a given date range
 */
export function getTotalStudyTimeInRange(stats, startDate, endDate) {
  let totalMinutes = 0;

  const current = new Date(startDate);
  while (current <= endDate) {
    const key = getLocalDateKey(current);
    if (stats[key]) {
      totalMinutes += stats[key].minutes || 0;
    }
    current.setDate(current.getDate() + 1);
  }

  return totalMinutes;
}

/**
 * Filter completed projects by time period
 */
export function filterCompletedProjects(projects, period) {
  const completedProjects = projects.filter(p => p.completed && p.endDate);
  const now = new Date();

  return completedProjects.filter(p => {
    const endDate = new Date(p.endDate);
    const diffMs = now - endDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    switch(period) {
      case 'this-month':
        return endDate.getMonth() === now.getMonth() && endDate.getFullYear() === now.getFullYear();
      case 'past-month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return endDate >= lastMonth && endDate <= lastMonthEnd;
      case '6-months':
        return diffDays <= 180;
      case 'entire-year':
        return endDate.getFullYear() === now.getFullYear();
      default:
        return false;
    }
  });
}

/**
 * Calculate days between two ISO date strings
 */
export function calculateDaysBetween(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diffMs = end - start;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format ISO date string to DD/MM
 */
export function formatDate(isoString) {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Calculate project time distribution for a given period
 */
export function calculateProjectDistribution(projects, stats, period) {
  const { startDate, endDate } = getDateRangeForFilter(period);

  // Get total study time from daily stats
  const totalStudyMinutes = getTotalStudyTimeInRange(stats, startDate, endDate);

  // Calculate project times
  const projectTimes = [];
  let totalProjectMinutes = 0;

  projects.forEach(project => {
    const projectStartDate = new Date(project.startDate);
    const projectEndDate = project.completed && project.endDate ? new Date(project.endDate) : new Date();

    // Check if project overlaps with the selected period
    if (projectStartDate <= endDate && projectEndDate >= startDate) {
      let projectMinutes = 0;

      // If project has daily tracking data
      if (project.dailySeconds) {
        // Sum up daily seconds within the range
        const current = new Date(startDate);
        while (current <= endDate) {
          const key = getLocalDateKey(current);
          if (project.dailySeconds[key]) {
            projectMinutes += Math.floor(project.dailySeconds[key] / 60);
          }
          current.setDate(current.getDate() + 1);
        }
      } else {
        // Fallback: Only show if project has any time and was active in period
        const projectTotalSeconds = project.currentSeconds || project.endSeconds || 0;

        if (projectTotalSeconds > 0) {
          projectMinutes = Math.floor(projectTotalSeconds / 60);
        }
      }

      if (projectMinutes > 0) {
        projectTimes.push({
          name: project.name,
          minutes: projectMinutes,
          goal: project.goal || null,
          completed: project.completed || false
        });
        totalProjectMinutes += projectMinutes;
      }
    }
  });

  // Calculate unattributed time
  const unattributedMinutes = Math.max(0, totalStudyMinutes - totalProjectMinutes);

  return {
    projectTimes,
    unattributedMinutes,
    totalStudyMinutes,
    totalProjectMinutes
  };
}

/**
 * Build dynamic thresholds for heatmap color buckets
 */
export function buildThresholds(allMinutes) {
  if (allMinutes.length === 0) return [5, 15, 30];

  const max = Math.max(...allMinutes);

  if (max <= 15) return [1, 5, 10];
  if (max <= 60) return [Math.ceil(max * 0.15), Math.ceil(max * 0.4), Math.ceil(max * 0.75)];

  return [Math.ceil(max * 0.1), Math.ceil(max * 0.33), Math.ceil(max * 0.66)];
}

/**
 * Compute color bucket for heatmap cell
 */
export function computeColorBucket(minutes, thresholds) {
  if (!minutes || minutes <= 0) return 0;
  if (minutes <= thresholds[0]) return 1;
  if (minutes <= thresholds[1]) return 2;
  if (minutes <= thresholds[2]) return 3;
  return 4;
}

/**
 * Find the best day of the week based on average study time
 */
export function getBestDayOfWeek(stats) {
  const dayMinutes = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  Object.keys(stats).forEach(key => {
    const date = new Date(key);
    const dayOfWeek = date.getDay();
    const minutes = stats[key].minutes || 0;
    if (minutes > 0) {
      dayMinutes[dayOfWeek].push(minutes);
    }
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let bestDay = 'N/A';
  let bestAvg = 0;

  Object.keys(dayMinutes).forEach(day => {
    if (dayMinutes[day].length > 0) {
      const avg = dayMinutes[day].reduce((a, b) => a + b, 0) / dayMinutes[day].length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestDay = dayNames[day];
      }
    }
  });

  return { dayName: bestDay, avgMinutes: bestAvg };
}

/**
 * Calculate the longest streak in the entire history
 */
export function getLongestStreak(stats) {
  let longestStreak = 0;
  let currentStreakCount = 0;
  const allKeys = Object.keys(stats).filter(k => stats[k].minutes > 0).sort();

  for (let i = 0; i < allKeys.length; i++) {
    const currentDate = new Date(allKeys[i]);

    if (i === 0) {
      // First day with minutes
      currentStreakCount = 1;
    } else {
      const prevDate = new Date(allKeys[i - 1]);
      const diffDays = Math.round((currentDate - prevDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        currentStreakCount++;
      } else {
        // Gap found, restart streak
        currentStreakCount = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreakCount);
  }

  return longestStreak;
}

/**
 * Find the most productive single day ever
 */
export function getMostProductiveDay(stats) {
  let maxDay = { date: 'N/A', minutes: 0 };

  Object.keys(stats).forEach(key => {
    if (stats[key].minutes > maxDay.minutes) {
      maxDay = { date: key, minutes: stats[key].minutes };
    }
  });

  return maxDay;
}

/**
 * Find the most productive week (7-day rolling window) in the past year
 */
export function getMostProductiveWeek(stats) {
  let maxWeekMinutes = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - i);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    const weekMinutes = getTotalStudyTimeInRange(stats, weekStart, weekEnd);
    maxWeekMinutes = Math.max(maxWeekMinutes, weekMinutes);
  }

  return maxWeekMinutes;
}

/**
 * Find the most productive month in the past 12 months
 */
export function getMostProductiveMonth(stats) {
  let maxMonthHours = 0;
  let maxMonthName = 'N/A';
  const today = new Date();

  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const checkDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const monthStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), 1);
    const monthEnd = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0);

    const monthMinutes = getTotalStudyTimeInRange(stats, monthStart, monthEnd);
    const monthHours = monthMinutes / 60;

    if (monthHours > maxMonthHours) {
      maxMonthHours = monthHours;
      maxMonthName = checkDate.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    }
  }

  return { monthName: maxMonthName, hours: maxMonthHours };
}

/**
 * Calculate date range for a month given an offset from reference date
 * @param {number} monthOffset - 0 for current month, -1 for previous month, etc.
 * @param {Date} referenceDate - The reference date (defaults to now)
 * @returns {Object} - { monthStart: Date, monthEnd: Date, targetMonth: Date }
 */
export function getMonthDateRange(monthOffset, referenceDate = new Date()) {
  // Calculate target month (first day of the target month)
  const targetMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + monthOffset, 1);

  // Month always starts on the 1st
  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);

  // For current month (offset 0), end at reference date
  // For other months, end at last day of that month
  let monthEnd;
  if (monthOffset === 0) {
    monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  } else {
    // Setting day to 0 gives last day of previous month, so month+1, day 0 = last day of current month
    monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
  }

  return { monthStart, monthEnd, targetMonth };
}

/**
 * Count projects completed in a specific month
 * @param {Array} projects - Array of project objects
 * @param {Date} targetMonth - Date representing the target month (typically the 1st of the month)
 * @returns {number} - Count of completed projects in that month
 */
export function countProjectsCompletedInMonth(projects, targetMonth) {
  return projects.filter(p => {
    if (!p.completed || !p.endDate) return false;
    const endDate = new Date(p.endDate);
    return endDate.getUTCMonth() === targetMonth.getMonth() &&
           endDate.getUTCFullYear() === targetMonth.getFullYear();
  }).length;
}

/**
 * Get all years that have activity data
 * @param {Object} stats - Daily stats object
 * @returns {number[]} - Sorted array of years with activity
 */
export function getAvailableYears(stats) {
  const years = new Set();

  Object.keys(stats).forEach(dateKey => {
    // Only include years that have actual activity (minutes > 0)
    if (stats[dateKey] && stats[dateKey].minutes > 0) {
      const year = new Date(dateKey).getFullYear();
      years.add(year);
    }
  });

  return Array.from(years).sort((a, b) => a - b);
}

/**
 * Get the last date when a project was tracked
 * @param {Object} project - Project object with dailySeconds
 * @returns {string|null} - Date key in YYYY-MM-DD format, or null if never tracked
 */
export function getProjectLastTrackedDate(project) {
  if (!project.dailySeconds) return null;

  const dates = Object.keys(project.dailySeconds)
    .filter(key => project.dailySeconds[key] > 0)
    .sort();

  return dates.length > 0 ? dates[dates.length - 1] : null;
}

/**
 * Format last tracked date as human-readable text
 * @param {string|null} lastDateKey - Date key in YYYY-MM-DD format
 * @param {Date} referenceDate - The reference date to calculate from (defaults to today)
 * @returns {string} - Human-readable text like "Today", "2 days ago", or "Never"
 */
export function formatLastTracked(lastDateKey, referenceDate = new Date()) {
  if (!lastDateKey) return "Never";

  const lastDate = new Date(lastDateKey);
  const todayKey = getLocalDateKey(referenceDate);

  if (lastDateKey === todayKey) return "Today";

  const today = new Date(todayKey);
  const diffMs = today - lastDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}
