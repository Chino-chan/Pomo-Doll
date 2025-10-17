// --------------------
// Existing variables
// --------------------
let pomodoroTime = 1 * 60; // 1 minute for testing
let shortBreakTime = 2 * 60;
let longBreakTime = 4 * 60;
let time; 
let timerInterval = null;
let streak = 0;
let cycle = 0;
let totalCycles = 0;
let isBreak = false;
let isLongBreak = false;
let cyclesPerSet = 4;
let totalStudySeconds = 0;
let sessionAddedSeconds = 0;


// --------------------
// Utility: Local date key
// --------------------
function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function getTodayKey() { return getLocalDateKey(new Date()); }

// --------------------
// Daily stats (persistent)
// --------------------
const lastStudyEl = document.getElementById("days-last-study");
const streakEl = document.getElementById("streak-count");
const minutesEl = document.getElementById("minutes-count");

function updateLastStudyDisplay() {
  const stats = JSON.parse(localStorage.getItem("pomodoroDailyStats")) || {};
  const todayKey = getTodayKey();
  const keys = Object.keys(stats).filter(k => stats[k].minutes > 0)
                  .sort((a,b) => new Date(b) - new Date(a));
  let displayText = "Never";
  if (keys.length > 0) {
    const lastDate = keys[0];
    if (lastDate === todayKey) displayText = "Today";
    else {
      const diffMs = new Date(todayKey) - new Date(lastDate);
      const diffDays = Math.floor(diffMs / (1000*60*60*24));
      displayText = diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
    }
  }
  lastStudyEl.textContent = displayText;
}

function loadDailyStats() {
  const stats = JSON.parse(localStorage.getItem("pomodoroDailyStats")) || {};
  const todayKey = getTodayKey();
  if (stats[todayKey]) {
    streak = stats[todayKey].pomos;
    totalStudySeconds = stats[todayKey].minutes * 60;
  } else {
    streak = 0;
    totalStudySeconds = 0;
  }
  streakEl.textContent = streak;
  updateStudyTimeDisplay();
  updateLastStudyDisplay();
}

// 🔥 FIXED: Calculate streak correctly
function calculateStreak() {
  const stats = JSON.parse(localStorage.getItem("pomodoroDailyStats")) || {};
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

function updateStreakDisplay() {
  const streakDays = calculateStreak();
  const streakDaysEl = document.getElementById("streak-days");
  if (!streakDaysEl) return;

  if (streakDays > 0) {
    streakDaysEl.textContent = `${streakDays} day${streakDays > 1 ? "s" : ""} 🔥`;
  } else {
    streakDaysEl.textContent = "No streak";
  }
}

function saveDailyStats() {
  const stats = JSON.parse(localStorage.getItem("pomodoroDailyStats")) || {};
  const todayKey = getTodayKey();

  // Save today's study data
  stats[todayKey] = {
    pomos: streak,
    minutes: Math.floor(totalStudySeconds / 60),
  };
  localStorage.setItem("pomodoroDailyStats", JSON.stringify(stats));

  // Update displays
  updateLastStudyDisplay();
  updateStreakDisplay();
}

function deleteTodayStats() {
  const stats = JSON.parse(localStorage.getItem("pomodoroDailyStats")) || {};
  const todayKey = getTodayKey();

  // Remove today's entry
  delete stats[todayKey];
  localStorage.setItem("pomodoroDailyStats", JSON.stringify(stats));

  // Reset today's counters
  streak = 0;
  totalStudySeconds = 0;
  streakEl.textContent = 0;
  updateStudyTimeDisplay();

  // Update displays
  updateLastStudyDisplay();
  updateStreakDisplay();
}

// --------------------
// DOM references
// --------------------
const timerEl = document.getElementById("timer");
const cycleEl = document.getElementById("cycle-count");
const totalEl = document.getElementById("total-cycle-count");
const startPauseBtn = document.getElementById("start-pause");
const resetBtn = document.getElementById("reset");
const skipBtn = document.getElementById("skip");
const modeLabelEl = document.getElementById("mode-label");
const configBtn = document.getElementById("config");
const configModal = document.getElementById("config-modal");
const closeConfig = document.getElementById("close-config");
const configForm = document.getElementById("config-form");

const discardBtn = document.getElementById("discard");
const discardModal = document.getElementById("discard-modal");
const closeDiscard = document.getElementById("close-discard");
const confirmDiscard = document.getElementById("confirm-discard");
const cancelDiscard = document.getElementById("cancel-discard");

// Stats modal
const statsBtn = document.getElementById("stats");
const statsModal = document.getElementById("stats-modal");
const closeStats = document.getElementById("close-stats");
const heatmapWeeks = document.getElementById("heatmap-weeks");

// Config inputs
const configStudyInput = document.getElementById("config-study-time");
const configShortBreakInput = document.getElementById("config-short-break");
const configLongBreakInput = document.getElementById("config-long-break");
const configCycleInput = document.getElementById("config-cycle-count");

// Project tracking elements
const projectListEl = document.getElementById("project-list");
const newProjectName = document.getElementById("new-project-name");
const newProjectGoal = document.getElementById("new-project-goal");
const addProjectBtn = document.getElementById("add-project-btn");
let currentProjectIndex = null; // currently active project

// Completed projects elements
const completedProjectsFilter = document.getElementById("completed-projects-filter");
const completedProjectsList = document.getElementById("completed-projects-list");

//Tracking Activity
const currentActivityEl = document.getElementById("current-activity-tracking");

//Other
skipBtn.title = "Ends the current pomo/break early, time already studied will still count.";
resetBtn.title = "Resets the pomo/break countdown, discards studied time from current pomo";

// --------------------
// Timer setup
// --------------------
startPauseBtn.innerHTML = `<img src="assets/play.svg" alt="Play" />`;

const studyEndSound = new Audio("alert_sound/study-end.mp3");
const breakEndSound = new Audio("alert_sound/break-end.mp3");
const longBreakEndSound = new Audio("alert_sound/long-break-end.mp3");
const skipSound = new Audio("alert_sound/skip.mp3");
[studyEndSound, breakEndSound, longBreakEndSound, skipSound].forEach(s => s.volume=0.3);

if (localStorage.getItem("pomodoroConfig")) {
  const savedConfig = JSON.parse(localStorage.getItem("pomodoroConfig"));
  pomodoroTime = savedConfig.pomodoroTime;
  shortBreakTime = savedConfig.shortBreakTime;
  longBreakTime = savedConfig.longBreakTime;
  cyclesPerSet = savedConfig.cyclesPerSet;
  configStudyInput.value = Math.floor(pomodoroTime/60);
  configShortBreakInput.value = Math.floor(shortBreakTime/60);
  configLongBreakInput.value = Math.floor(longBreakTime/60);
  configCycleInput.value = cyclesPerSet;
} else {
  configStudyInput.value = Math.floor(pomodoroTime/60);
  configShortBreakInput.value = Math.floor(shortBreakTime/60);
  configLongBreakInput.value = Math.floor(longBreakTime/60);
  configCycleInput.value = cyclesPerSet;
}

time = !isBreak && !isLongBreak ? pomodoroTime : isBreak ? shortBreakTime : longBreakTime;

// --------------------
// Timer functions
// --------------------
function setPlayIcon() { startPauseBtn.querySelector("img").src="assets/play.svg"; startPauseBtn.querySelector("img").alt="Play"; }
function setPauseIcon() { startPauseBtn.querySelector("img").src="assets/pause.svg"; startPauseBtn.querySelector("img").alt="Pause"; }

function updateModeLabel() {
  if (isLongBreak) modeLabelEl.textContent="Long Break";
  else if (isBreak) modeLabelEl.textContent="Break Time";
  else modeLabelEl.textContent="Study Time";
  modeLabelEl.style.color = isLongBreak ? "#27ae60" : isBreak ? "#2ecc71" : "#e74c3c";
}

function updateDisplay() {
  const minutes = String(Math.floor(time/60)).padStart(2,'0');
  const seconds = String(time%60).padStart(2,'0');
  timerEl.textContent=`${minutes}:${seconds}`;
}

function updateCycleDisplay() { cycleEl.textContent = `${cycle}/${cyclesPerSet}`; }
function updateTotalDisplay() { totalEl.textContent = totalCycles; }
function updateStudyTimeDisplay() { minutesEl.textContent = Math.floor(totalStudySeconds/60); }

// --------------------
// Project tracking
// --------------------
let projects = JSON.parse(localStorage.getItem("pomodoroProjects")) || [];

function renderProjectList() {
  projectListEl.innerHTML = "";
  projects.forEach((p, i) => {
    if (p.completed) return;

    const div = document.createElement("div");
    div.className = "project-item";

    const isActive = currentProjectIndex === i;

    const secs = p.currentSeconds || 0;
    const mins = Math.floor(secs / 60);
    const hours = secs / 3600;

    let currentDisplay;

    // More human-readable formatting
    if (mins < 60) {
      currentDisplay = `${mins} min`;
    } else {
      currentDisplay = `${hours.toFixed(2)}h`;
    }

    const goalText = p.goal
      ? `${currentDisplay} / ${p.goal}h goal`
      : `${currentDisplay} tracked`;

    div.innerHTML = `
      <strong>${p.name}</strong><br>
      — ${goalText}
      <div class="project-buttons">
        <button data-index="${i}" class="complete-btn">✓</button>
        <button data-index="${i}" class="delete-btn">🗑️</button>
        <button data-index="${i}" class="work-btn">${isActive ? "Stop Tracking" : "Track this!"}</button>
      </div>`;

    projectListEl.appendChild(div);

    // Update the button style based on active state
    const workBtn = div.querySelector(".work-btn");
    if (isActive) {
      workBtn.classList.add("stop-tracking");
    } else {
      workBtn.classList.remove("stop-tracking");
    }
  });

  // Event handlers
  document.querySelectorAll(".complete-btn").forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.index);
      const p = projects[i];
      p.completed = true;
      p.endDate = new Date().toISOString();
      p.endSeconds = p.currentSeconds || 0;
      p.endHours = +((p.endSeconds || 0) / 3600).toFixed(2);
      if (currentProjectIndex === i) currentProjectIndex = null;
      saveProjectsToStorage();
      renderProjectList();
    };
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.index);
      projects.splice(i, 1);
      if (currentProjectIndex === i) currentProjectIndex = null;
      saveProjectsToStorage();
      renderProjectList();
    };
  });

  document.querySelectorAll(".work-btn").forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.index);
      if (currentProjectIndex === i) {
        currentProjectIndex = null;
      } else {
        currentProjectIndex = i;
      }

      // Update the display
      if (currentProjectIndex !== null && projects[currentProjectIndex]) {
        currentActivityEl.textContent = `Tracking: ${projects[currentProjectIndex].name}`;
      } else {
        currentActivityEl.textContent = "Not tracking anything";
      }

      renderProjectList();
    };
  });
}

function saveProjectsToStorage() {
  localStorage.setItem("pomodoroProjects", JSON.stringify(projects));
}

addProjectBtn.onclick = () => {
  const name = newProjectName.value.trim();
  if (!name) return alert("Activity name can't be empty!");
  const goal = parseInt(newProjectGoal.value) || 0;
  const startDate = new Date().toISOString();
  projects.push({
    name,
    goal,
    startDate,
    currentSeconds: 0,
    endSeconds: 0,
    completed: false,
    endDate: null
  });
  saveProjectsToStorage();
  renderProjectList();
  newProjectName.value = "";
  newProjectGoal.value = "";
};

// --------------------
// Completed Projects Display
// --------------------
function filterCompletedProjects(period) {
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

function formatDate(isoString) {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function calculateDaysBetween(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diffMs = end - start;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function renderCompletedProjects() {
  const period = completedProjectsFilter.value;
  const filtered = filterCompletedProjects(period);

  if (filtered.length === 0) {
    completedProjectsList.innerHTML = '<div class="chart-placeholder">No completed projects in this period</div>';
    return;
  }

  completedProjectsList.innerHTML = filtered.map(p => {
    const hours = (p.endHours || 0).toFixed(2);
    const goalText = p.goal ? ` / ${p.goal}h` : '';
    const days = calculateDaysBetween(p.startDate, p.endDate);
    const startDate = formatDate(p.startDate);
    const endDate = formatDate(p.endDate);

    // Find original index in projects array
    const originalIndex = projects.findIndex(proj =>
      proj.name === p.name &&
      proj.startDate === p.startDate &&
      proj.completed
    );

    return `
      <div style="padding: 12px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span><strong>${p.name}</strong> - ${hours}h${goalText} - ${days} days - ${startDate} - ${endDate}</span>
        <button class="delete-completed-project-btn" data-index="${originalIndex}" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 4px 8px;" title="Delete this completed project">🗑️</button>
      </div>
    `;
  }).join('');

  // Add event listeners to delete buttons
  document.querySelectorAll('.delete-completed-project-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      if (index >= 0 && confirm(`Delete "${projects[index].name}"? This will remove the project but keep your study time history.`)) {
        projects.splice(index, 1);
        saveProjectsToStorage();
        renderCompletedProjects();
        renderProjectDistribution(); // Update pie chart too
      }
    };
  });
}

// Event listener for filter dropdown
if (completedProjectsFilter) {
  completedProjectsFilter.addEventListener('change', renderCompletedProjects);
}

// --------------------
// Project Distribution (Pie Chart + List)
// --------------------
const projectDistributionFilter = document.getElementById("project-distribution-filter");
const projectDistributionList = document.getElementById("project-distribution-list");
const projectPieChart = document.getElementById("project-pie-chart");

/**
 * Calculate total study time from daily stats for a given date range
 */
function getTotalStudyTimeInRange(startDate, endDate) {
  const stats = JSON.parse(localStorage.getItem("pomodoroDailyStats")) || {};
  let totalMinutes = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = getLocalDateKey(d);
    if (stats[key]) {
      totalMinutes += stats[key].minutes || 0;
    }
  }

  return totalMinutes;
}

/**
 * Get date range based on filter period
 */
function getDateRangeForFilter(period) {
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
 * Calculate project time distribution for a given period
 */
function calculateProjectDistribution(period) {
  const { startDate, endDate } = getDateRangeForFilter(period);

  // Get total study time from daily stats
  const totalStudyMinutes = getTotalStudyTimeInRange(startDate, endDate);

  // Calculate project times
  const projectTimes = [];
  let totalProjectMinutes = 0;

  projects.forEach(project => {
    const projectStartDate = new Date(project.startDate);
    const projectEndDate = project.completed && project.endDate ? new Date(project.endDate) : new Date();

    // Check if project overlaps with the selected period
    if (projectStartDate <= endDate && projectEndDate >= startDate) {
      // Calculate minutes for this project in the time range
      // Note: We're using a simple approximation here
      // In reality, we'd need daily project tracking to be 100% accurate

      let projectMinutes = 0;

      // If project has daily tracking data (we'll add this support)
      if (project.dailySeconds) {
        // Sum up daily seconds within the range
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const key = getLocalDateKey(d);
          if (project.dailySeconds[key]) {
            projectMinutes += Math.floor(project.dailySeconds[key] / 60);
          }
        }
      } else {
        // Fallback: Only show if project has any time and was active in period
        // This is less accurate but works with current data structure
        const projectTotalSeconds = project.currentSeconds || project.endSeconds || 0;

        // Simple heuristic: if project started before period end and ended after period start
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
 * Draw pie chart on canvas
 */
function drawPieChart(distribution) {
  const canvas = projectPieChart;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { projectTimes, unattributedMinutes, totalStudyMinutes } = distribution;

  // If no study time at all, show a message
  if (totalStudyMinutes === 0) {
    ctx.fillStyle = '#ebedf0';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No study time', centerX, centerY - 10);
    ctx.fillText('in this period', centerX, centerY + 10);
    return;
  }

  // Color palette for projects
  const colors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#27ae60'
  ];

  // Prepare data for pie chart
  const slices = [];

  projectTimes.forEach((project, index) => {
    slices.push({
      label: project.name,
      value: project.minutes,
      percentage: (project.minutes / totalStudyMinutes * 100).toFixed(1),
      color: colors[index % colors.length]
    });
  });

  if (unattributedMinutes > 0) {
    slices.push({
      label: 'No specific study',
      value: unattributedMinutes,
      percentage: (unattributedMinutes / totalStudyMinutes * 100).toFixed(1),
      color: '#5DADE2'  // Light blue
    });
  }

  // Draw pie slices
  let currentAngle = -Math.PI / 2; // Start at top

  slices.forEach(slice => {
    const sliceAngle = (slice.value / totalStudyMinutes) * 2 * Math.PI;

    ctx.fillStyle = slice.color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    // Draw slice border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    currentAngle += sliceAngle;
  });

  // Draw center circle (donut hole)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
  ctx.fill();

  // Draw total time in center
  ctx.fillStyle = '#333';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hours = (totalStudyMinutes / 60).toFixed(1);
  ctx.fillText(`${hours}h`, centerX, centerY - 8);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText('total', centerX, centerY + 10);
}

/**
 * Render project distribution list
 */
function renderProjectDistribution() {
  const period = projectDistributionFilter.value;
  const distribution = calculateProjectDistribution(period);

  // Draw pie chart
  drawPieChart(distribution);

  // Render project list
  const { projectTimes, unattributedMinutes } = distribution;

  if (projectTimes.length === 0 && unattributedMinutes === 0) {
    projectDistributionList.innerHTML = '<div class="chart-placeholder">No activity in this period</div>';
    return;
  }

  // Build list HTML
  let listHTML = '<div style="display: flex; flex-direction: column; gap: 10px;">';

  projectTimes.forEach(project => {
    const hours = (project.minutes / 60).toFixed(2);
    const goalText = project.goal ? ` — Goal: ${project.goal}h` : '';
    const statusBadge = project.completed ? ' ✓' : '';

    listHTML += `
      <div style="padding: 12px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px;">
        <strong>${project.name}${statusBadge}</strong> — ${hours}h${goalText}
      </div>
    `;
  });

  if (unattributedMinutes > 0) {
    const hours = (unattributedMinutes / 60).toFixed(2);
    listHTML += `
      <div style="padding: 12px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 6px;">
        <strong>No specific study</strong> — ${hours}h
      </div>
    `;
  }

  listHTML += '</div>';
  projectDistributionList.innerHTML = listHTML;
}

// Event listener for distribution filter
if (projectDistributionFilter) {
  projectDistributionFilter.addEventListener('change', renderProjectDistribution);
}

// --------------------
// Timer logic with project hours
// --------------------
function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    time--;

    if (!isBreak && !isLongBreak) {
      totalStudySeconds++;
      sessionAddedSeconds++;
      updateStudyTimeDisplay();

      // add time to current project
      if (currentProjectIndex !== null && projects[currentProjectIndex]) {
        projects[currentProjectIndex].currentSeconds = (projects[currentProjectIndex].currentSeconds || 0) + 1;

        // Track daily project time
        if (!projects[currentProjectIndex].dailySeconds) {
          projects[currentProjectIndex].dailySeconds = {};
        }
        const todayKey = getTodayKey();
        projects[currentProjectIndex].dailySeconds[todayKey] = (projects[currentProjectIndex].dailySeconds[todayKey] || 0) + 1;

        saveProjectsToStorage();
        renderProjectList();
      }
    }

    updateDisplay();

    if (time <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;

      if (!isBreak && !isLongBreak) {
        studyEndSound.play();
        streak++; 
        streakEl.textContent = streak;
        cycle++; 
        updateCycleDisplay();
        saveDailyStats();

        if (cycle >= cyclesPerSet) {
          isLongBreak = true;
          isBreak = false;
          time = longBreakTime;
          new Notification("Long Break Time! 🌴", { body: "Take a long break!" });
        } else {
          isBreak = true;
          time = shortBreakTime;
          new Notification("Pomodoro done! 🍵", { body: "Take a short break!" });
        }
      } else if (isBreak) {
        breakEndSound.play();
        isBreak = false;
        time = pomodoroTime;
        new Notification("Break over! ⏰", { body: "Time to start the next Pomodoro" });
      } else if (isLongBreak) {
        longBreakEndSound.play();
        isLongBreak = false;
        isBreak = false;
        cycle = 0;
        totalCycles++; 
        updateCycleDisplay(); 
        updateTotalDisplay();
        time = pomodoroTime;
        new Notification("Long break over! 🔁", { body: "New cycle starting" });
      }

      updateDisplay(); 
      updateModeLabel(); 
      setPlayIcon();
    }
  }, 1000);

  setPauseIcon();
}

function pauseTimer(){ clearInterval(timerInterval); timerInterval=null; setPlayIcon(); }
function toggleTimer(){ if(timerInterval) pauseTimer(); else startTimer(); }
startPauseBtn.onclick=toggleTimer;

resetBtn.onclick = () => {
    pauseTimer();

    // Remove session-added seconds from Today and project
    totalStudySeconds -= sessionAddedSeconds;
    if (totalStudySeconds < 0) totalStudySeconds = 0;

    if (currentProjectIndex !== null && projects[currentProjectIndex]) {
        projects[currentProjectIndex].currentSeconds -= sessionAddedSeconds;
        if (projects[currentProjectIndex].currentSeconds < 0) projects[currentProjectIndex].currentSeconds = 0;

        // Also remove from daily tracking
        if (projects[currentProjectIndex].dailySeconds) {
          const todayKey = getTodayKey();
          if (projects[currentProjectIndex].dailySeconds[todayKey]) {
            projects[currentProjectIndex].dailySeconds[todayKey] -= sessionAddedSeconds;
            if (projects[currentProjectIndex].dailySeconds[todayKey] < 0) {
              projects[currentProjectIndex].dailySeconds[todayKey] = 0;
            }
          }
        }

        saveProjectsToStorage();
    }

    sessionAddedSeconds = 0;
    updateStudyTimeDisplay();
    renderProjectList();

    // Reset timer display
    time = isLongBreak ? longBreakTime : isBreak ? shortBreakTime : pomodoroTime;
    updateDisplay();
    updateModeLabel();
    setPlayIcon();
};

skipBtn.onclick=()=>{
  skipSound.play(); pauseTimer();
  if(!isBreak&&!isLongBreak){ cycle++; streak++; updateCycleDisplay(); streakEl.textContent=streak; saveDailyStats();
    if(cycle>=cyclesPerSet){ isLongBreak=true; isBreak=false; time=longBreakTime; new Notification("Skipped to Long Break! 🌴",{body:"Take a long break!"}); }
    else{ isBreak=true; time=shortBreakTime; new Notification("Skipped to Break! 🍵",{body:"Take a short break!"}); }
  } else if(isBreak){ isBreak=false; time=pomodoroTime; new Notification("Skipped to Study Time! ⏰",{body:"Back to studying!"}); }
  else if(isLongBreak){ isLongBreak=false; isBreak=false; cycle=0; totalCycles++; updateCycleDisplay(); updateTotalDisplay(); time=pomodoroTime; new Notification("Skipped Long Break! ⏰",{body:"Back to studying!"}); }
  updateDisplay(); updateModeLabel(); setPlayIcon();
};

// --------------------
// Config modal
// --------------------
configBtn.onclick=()=>configModal.style.display="block";
closeConfig.onclick=()=>configModal.style.display="none";

configForm.onsubmit=(e)=>{
  e.preventDefault();
  pomodoroTime=parseInt(configStudyInput.value)*60;
  shortBreakTime=parseInt(configShortBreakInput.value)*60;
  longBreakTime=parseInt(configLongBreakInput.value)*60;
  cyclesPerSet=parseInt(configCycleInput.value);
  localStorage.setItem("pomodoroConfig", JSON.stringify({pomodoroTime, shortBreakTime, longBreakTime, cyclesPerSet}));
  time=!isBreak&&!isLongBreak?pomodoroTime:isBreak?shortBreakTime:longBreakTime;
  updateDisplay(); updateCycleDisplay(); configModal.style.display="none";
  saveProjectsToStorage(); renderProjectList();
};

// --------------------
// Discard modal
// --------------------
discardBtn.onclick=()=>discardModal.style.display="block";
closeDiscard.onclick=cancelDiscard.onclick=()=>discardModal.style.display="none";
confirmDiscard.onclick=()=>{
  deleteTodayStats();
  cycle=0; totalCycles=0; updateCycleDisplay(); updateTotalDisplay();
  discardModal.style.display="none";
};

// --------------------
// Heatmap / Stats modal
// --------------------
let currentHeatmapYear = new Date().getFullYear();
function getYearDates(year){ const arr=[]; const start=new Date(year,0,1); const end=new Date(year,11,31); for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) arr.push(new Date(d)); return arr; }
function computeColorBucket(minutes, thresholds){ if(!minutes||minutes<=0) return 0; if(minutes<=thresholds[0]) return 1; if(minutes<=thresholds[1]) return 2; if(minutes<=thresholds[2]) return 3; return 4; }
function buildThresholds(allMinutes){ if(allMinutes.length===0) return [5,15,30]; const max=Math.max(...allMinutes); if(max<=15) return [1,5,10]; if(max<=60) return [Math.ceil(max*0.15),Math.ceil(max*0.4),Math.ceil(max*0.75)]; return [Math.ceil(max*0.1),Math.ceil(max*0.33),Math.ceil(max*0.66)]; }
function renderHeatmap(year=currentHeatmapYear){
  heatmapWeeks.innerHTML="";
  const stats=JSON.parse(localStorage.getItem("pomodoroDailyStats"))||{};
  const dates=getYearDates(year);
  const allMinutes=dates.map(d=>(stats[getLocalDateKey(d)]?.minutes||0)).filter(m=>m>0);
  const thresholds=buildThresholds(allMinutes);
  const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  
  const weeksByMonth={};
  let currentWeek=new Array(7).fill(null);
  for(const d of dates){ const wd=d.getDay(); currentWeek[wd]=new Date(d); if(wd===6){ const month=currentWeek.find(day=>day)?.getMonth()??0; if(!weeksByMonth[month]) weeksByMonth[month]=[]; weeksByMonth[month].push([...currentWeek]); currentWeek=new Array(7).fill(null); } }
  if(currentWeek.some(x=>x)){ const month=currentWeek.find(day=>day)?.getMonth()??0; if(!weeksByMonth[month]) weeksByMonth[month]=[]; weeksByMonth[month].push([...currentWeek]); }

  Object.keys(weeksByMonth).forEach(monthKey=>{
    const monthContainer=document.createElement("div"); monthContainer.className="heatmap-month-container"; monthContainer.style.display="flex"; monthContainer.style.flexDirection="column"; monthContainer.style.alignItems="center"; monthContainer.style.marginRight="10px";
    const monthLabel=document.createElement("div"); monthLabel.textContent=monthNames[parseInt(monthKey)]; monthLabel.style.fontSize="0.75rem"; monthLabel.style.marginBottom="4px"; monthContainer.appendChild(monthLabel);
    const monthWeeksContainer=document.createElement("div"); monthWeeksContainer.style.display="flex"; monthWeeksContainer.style.gap="2px"; monthWeeksContainer.style.alignItems="flex-start";

    weeksByMonth[monthKey].forEach(week=>{
      const weekCol=document.createElement("div"); weekCol.className="heatmap-week"; weekCol.style.display="flex"; weekCol.style.flexDirection="column"; weekCol.style.gap="2px";
      for(let wd=0; wd<7; wd++){
        const day=week[wd]; const cell=document.createElement("div"); cell.className="heatmap-day day-0";
        if(day){ const key=getLocalDateKey(day); const obj=stats[key]||{pomos:0,minutes:0}; const bucket=computeColorBucket(obj.minutes, thresholds); cell.className=`heatmap-day day-${bucket}`; const pretty=day.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}); cell.title=`${pretty}\n${obj.minutes} min — ${obj.pomos||0} pomos`; cell.setAttribute("aria-label", `${pretty} — ${obj.minutes} minutes, ${obj.pomos||0} pomos`); if(key===getTodayKey()) cell.classList.add("today-cell"); }
        else{ cell.style.visibility="hidden"; }
        weekCol.appendChild(cell);
      }
      monthWeeksContainer.appendChild(weekCol);
    });
    monthContainer.appendChild(monthWeeksContainer); heatmapWeeks.appendChild(monthContainer);
  });
}

// --------------------
// General Statistics
// --------------------

/**
 * Draw weekly trends line chart
 */
function renderWeeklyTrendsChart() {
  const canvas = document.getElementById('weekly-trends-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const stats = JSON.parse(localStorage.getItem("pomodoroDailyStats")) || {};

  // Get last 8 weeks of data
  const now = new Date();
  const daysToShow = 56; // 8 weeks
  const dailyData = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = getLocalDateKey(d);
    const minutes = stats[key]?.minutes || 0;
    dailyData.push({
      date: new Date(d),
      minutes,
      label: d.getDate() === 1 ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : d.getDate().toString()
    });
  }

  // Canvas dimensions
  const padding = 40;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Find max value for scaling
  const maxMinutes = Math.max(...dailyData.map(d => d.minutes), 60); // At least 60 min scale

  // Draw grid lines and Y-axis labels
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#999';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';

  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding + height - (i / gridLines) * height;
    const value = Math.round((i / gridLines) * maxMinutes);

    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + width, y);
    ctx.stroke();

    ctx.fillText(`${value}m`, padding - 5, y + 4);
  }

  // Draw X-axis
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding + height);
  ctx.lineTo(padding + width, padding + height);
  ctx.stroke();

  // Draw data line
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  const stepX = width / (daysToShow - 1);

  dailyData.forEach((dataPoint, i) => {
    const x = padding + i * stepX;
    const y = padding + height - (dataPoint.minutes / maxMinutes) * height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw data points
  ctx.fillStyle = '#667eea';
  dailyData.forEach((dataPoint, i) => {
    const x = padding + i * stepX;
    const y = padding + height - (dataPoint.minutes / maxMinutes) * height;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Highlight today
    const isToday = getLocalDateKey(dataPoint.date) === getTodayKey();
    if (isToday) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  // Draw X-axis labels (show every 7 days)
  ctx.fillStyle = '#666';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  dailyData.forEach((dataPoint, i) => {
    if (i % 7 === 0 || i === daysToShow - 1) {
      const x = padding + i * stepX;
      ctx.fillText(dataPoint.label, x, padding + height + 15);
    }
  });

  // Draw title
  ctx.fillStyle = '#333';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Daily Study Time (Past 8 Weeks)', padding, padding - 10);
}

/**
 * Render monthly summary cards
 */
function renderMonthlySummaryCards() {
  const container = document.getElementById('monthly-summary-cards');
  if (!container) return;

  const stats = JSON.parse(localStorage.getItem("pomodoroDailyStats")) || {};
  const now = new Date();

  // Calculate this month's hours
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthMinutes = getTotalStudyTimeInRange(monthStart, monthEnd);
  const thisMonthHours = (thisMonthMinutes / 60).toFixed(1);

  // Find best day of week
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

  const bestDayHours = (bestAvg / 60).toFixed(1);

  // Count completed projects this month
  const completedThisMonth = projects.filter(p => {
    if (!p.completed || !p.endDate) return false;
    const endDate = new Date(p.endDate);
    return endDate.getMonth() === now.getMonth() && endDate.getFullYear() === now.getFullYear();
  }).length;

  // Render cards
  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-card-label">This Month</div>
      <div class="summary-card-value">${thisMonthHours}h</div>
      <div class="summary-card-subtitle">Total study time</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Best Day</div>
      <div class="summary-card-value">${bestDay}</div>
      <div class="summary-card-subtitle">${bestDayHours}h average</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Projects Done</div>
      <div class="summary-card-value">${completedThisMonth}</div>
      <div class="summary-card-subtitle">Completed this month</div>
    </div>
  `;
}

/**
 * Render personal records
 */
function renderPersonalRecords() {
  const container = document.getElementById('personal-records');
  if (!container) return;

  const stats = JSON.parse(localStorage.getItem("pomodoroDailyStats")) || {};

  // Longest streak ever
  let longestStreak = 0;
  let currentStreakCount = 0;
  const allKeys = Object.keys(stats).sort();

  for (let i = 0; i < allKeys.length; i++) {
    const key = allKeys[i];
    if (stats[key].minutes > 0) {
      currentStreakCount++;
      longestStreak = Math.max(longestStreak, currentStreakCount);
    } else {
      currentStreakCount = 0;
    }
  }

  // Most productive day ever
  let maxDay = { date: 'N/A', minutes: 0 };
  Object.keys(stats).forEach(key => {
    if (stats[key].minutes > maxDay.minutes) {
      maxDay = { date: key, minutes: stats[key].minutes };
    }
  });
  const maxDayFormatted = maxDay.date !== 'N/A' ? formatDate(new Date(maxDay.date).toISOString()) : 'N/A';
  const maxDayHours = (maxDay.minutes / 60).toFixed(1);

  // Most productive week (7-day rolling window)
  let maxWeekMinutes = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - i);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    const weekMinutes = getTotalStudyTimeInRange(weekStart, weekEnd);
    maxWeekMinutes = Math.max(maxWeekMinutes, weekMinutes);
  }
  const maxWeekHours = (maxWeekMinutes / 60).toFixed(1);

  // Most productive month
  let maxMonthHours = 0;
  let maxMonthName = 'N/A';
  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const checkDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const monthStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), 1);
    const monthEnd = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0);

    const monthMinutes = getTotalStudyTimeInRange(monthStart, monthEnd);
    const monthHours = monthMinutes / 60;

    if (monthHours > maxMonthHours) {
      maxMonthHours = monthHours;
      maxMonthName = checkDate.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    }
  }

  // Render records
  container.innerHTML = `
    <div class="record-item">
      <div class="record-icon">🔥</div>
      <div class="record-content">
        <div class="record-label">Longest Streak</div>
        <div class="record-value">${longestStreak} day${longestStreak !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <div class="record-item">
      <div class="record-icon">⭐</div>
      <div class="record-content">
        <div class="record-label">Most Productive Day</div>
        <div class="record-value">${maxDayFormatted} (${maxDayHours}h)</div>
      </div>
    </div>
    <div class="record-item">
      <div class="record-icon">📈</div>
      <div class="record-content">
        <div class="record-label">Most Productive Week</div>
        <div class="record-value">${maxWeekHours}h</div>
      </div>
    </div>
    <div class="record-item">
      <div class="record-icon">🏆</div>
      <div class="record-content">
        <div class="record-label">Most Productive Month</div>
        <div class="record-value">${maxMonthName} (${maxMonthHours.toFixed(1)}h)</div>
      </div>
    </div>
  `;
}

function openStatsModal(){
  renderHeatmap();
  renderCompletedProjects();
  renderProjectDistribution();
  renderWeeklyTrendsChart();
  renderMonthlySummaryCards();
  renderPersonalRecords();
  statsModal.style.display="flex";
  statsModal.setAttribute("aria-hidden","false");
  closeStats.focus();
}
function closeStatsModal(){ statsModal.style.display="none"; statsModal.setAttribute("aria-hidden","true"); }
statsBtn.addEventListener("click",openStatsModal);
closeStats.addEventListener("click",closeStatsModal);
statsModal.addEventListener("click",(e)=>{ if(e.target===statsModal) closeStatsModal(); });
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape"&&statsModal.style.display==="flex") closeStatsModal(); });

// --------------------
// Year toggle
// --------------------
const yearToggleBtn=document.getElementById("year-toggle");
if(yearToggleBtn) yearToggleBtn.onclick=()=>{ const thisYear=new Date().getFullYear(); currentHeatmapYear=currentHeatmapYear===thisYear?thisYear-1:thisYear; renderHeatmap(currentHeatmapYear); };

// --------------------
// Initialize display
// --------------------
loadDailyStats(); 
updateDisplay(); 
updateCycleDisplay(); 
updateTotalDisplay(); 
updateModeLabel(); 
updateStudyTimeDisplay(); 
setPlayIcon(); 
updateLastStudyDisplay(); 
renderProjectList(); 
updateStreakDisplay(); // 🔥 This now properly calculates streak on load

// Live project counter update every minute
setInterval(() => {
  if(currentProjectIndex !== null && projects[currentProjectIndex]){
    renderProjectList();
  }
}, 60 * 1000);