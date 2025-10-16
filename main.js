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

function openStatsModal(){ renderHeatmap(); statsModal.style.display="flex"; statsModal.setAttribute("aria-hidden","false"); closeStats.focus(); }
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