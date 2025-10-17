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
