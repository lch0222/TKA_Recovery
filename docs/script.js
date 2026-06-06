let currentCount = Number(localStorage.getItem("currentCount")) || 0;
let currentAction = Number(localStorage.getItem("currentAction")) || 1;
let totalCount = Number(localStorage.getItem("totalCount")) || 0;
let completedRounds = Number(localStorage.getItem("completedRounds")) || 0;
let points = Number(localStorage.getItem("points")) || 0;
const IMG_PATH = "./img/";
const ACTIONS_PER_ROUND = 4;
const ACTION_NAMES = [
  "足踝運動",
  "大腿肌肉收縮運動",
  "直抬腿運動",
  "膝部屈曲伸直運動"
];
const ACTION_DURATION_MS = 10000;
const BREAK_DURATION_MS = 20000;
const ACTION_VIDEOS = [
  { url: "https://www.youtube.com/watch?v=dW8bOKk_Jws", start: 17, end: 163 },
  { url: "https://www.youtube.com/watch?v=dW8bOKk_Jws", start: 165, end: 323 },
  { url: "https://www.youtube.com/watch?v=dW8bOKk_Jws", start: 325, end: 476 },
  { url: "https://www.youtube.com/watch?v=dW8bOKk_Jws", start: 478, end: 672 }
];
let actionTimer = null;
let actionStartedAt = 0;
let breakTimer = null;
let breakStartedAt = 0;

if (currentAction < 1 || currentAction > ACTIONS_PER_ROUND) {
  currentAction = 1;
  localStorage.setItem("currentAction", currentAction);
}

let actionCounts = loadActionCounts();
currentCount = actionCounts[currentAction - 1] || 0;

function loadActionCounts() {
  try {
    const savedCounts = JSON.parse(localStorage.getItem("actionCounts") || "[]");
    if (Array.isArray(savedCounts) && savedCounts.length === ACTIONS_PER_ROUND) {
      return savedCounts.map(count => Math.min(10, Math.max(0, Number(count) || 0)));
    }
  } catch (error) {
    // Fall back to the old single-count value below.
  }

  const counts = Array(ACTIONS_PER_ROUND).fill(0);
  counts[currentAction - 1] = Math.min(10, Math.max(0, currentCount));
  return counts;
}

function saveExerciseState() {
  currentCount = actionCounts[currentAction - 1] || 0;
  localStorage.setItem("currentAction", currentAction);
  localStorage.setItem("currentCount", currentCount);
  localStorage.setItem("actionCounts", JSON.stringify(actionCounts));
}

function showPage(pageId) {
  if (pageId !== "actionPage") {
    resetRecoveryAction();
  }

  document.querySelectorAll("section").forEach(section => {
    section.classList.add("hidden");
  });
  document.getElementById(pageId).classList.remove("hidden");

  if (pageId === "exercisePage") {
    resetExercise();
  }
  if (pageId === "actionPage") {
    resetActionPage();
  }

  updateHome();
  updateAchievement();
}

function resetExercise() {
  updateExerciseDisplay();
}

function updateExerciseDisplay() {
  document.getElementById("roundTitle").innerText =
    `第 ${completedRounds + 1} 回合 - 選擇動作`;
  updateActionButtons();
}

function selectAction(actionNumber) {
  if (actionTimer || breakTimer) return;
  if (actionNumber < 1 || actionNumber > ACTIONS_PER_ROUND) return;

  currentAction = actionNumber;
  saveExerciseState();
  showPage("actionPage");
}

function resetActionPage() {
  updateActionPageDisplay();
  resetRecoveryAction();
}

function updateActionPageDisplay() {
  currentCount = actionCounts[currentAction - 1] || 0;
  document.getElementById("actionTitle").innerText =
    `第 ${completedRounds + 1} 回合 - ${ACTION_NAMES[currentAction - 1]}`;
  document.getElementById("currentCount").innerText = currentCount;
  updateActionVideo();
  updateExerciseProgress();
}

function updateActionVideo() {
  const video = document.getElementById("actionVideo");
  const notice = document.getElementById("videoNotice");
  if (!video) return;

  const embedUrl = getYouTubeEmbedUrl(ACTION_VIDEOS[currentAction - 1]);
  video.src = embedUrl;
  video.classList.toggle("hidden", !embedUrl);
  if (notice) {
    notice.classList.toggle("hidden", Boolean(embedUrl));
  }
}

function getYouTubeEmbedUrl(videoConfig) {
  if (!videoConfig) return "";

  const url = typeof videoConfig === "string" ? videoConfig : videoConfig.url;
  const configuredStart = typeof videoConfig === "string" ? 0 : Number(videoConfig.start) || 0;
  const configuredEnd = typeof videoConfig === "string" ? 0 : Number(videoConfig.end) || 0;
  if (!url) return "";

  const trimmedUrl = url.trim();
  if (trimmedUrl.includes("VIDEO_ID_ACTION")) return "";

  const embedMatch = trimmedUrl.match(/youtube\.com\/embed\/([^?&/]+)/);
  const watchMatch = trimmedUrl.match(/[?&]v=([^?&]+)/);
  const shortMatch = trimmedUrl.match(/youtu\.be\/([^?&/]+)/);
  const videoId = embedMatch?.[1] || watchMatch?.[1] || shortMatch?.[1];
  if (!videoId) return "";

  const startSeconds = configuredStart || getYouTubeTimeParam(trimmedUrl, "start");
  const endSeconds = configuredEnd || getYouTubeTimeParam(trimmedUrl, "end");
  const params = new URLSearchParams({
    rel: "0",
    playsinline: "1"
  });

  if (startSeconds > 0) {
    params.set("start", startSeconds);
  }
  if (endSeconds > startSeconds) {
    params.set("end", endSeconds);
  }

  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    params.set("origin", window.location.origin);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function getYouTubeTimeParam(url, paramName) {
  const aliases = paramName === "start" ? "t|start" : paramName;
  const timeMatch = url.match(new RegExp(`[?&#](?:${aliases})=([^?&#]+)`));
  if (!timeMatch) return 0;

  const value = timeMatch[1];
  const hourMatch = value.match(/(\d+)h/);
  const minuteMatch = value.match(/(\d+)m/);
  const secondMatch = value.match(/(\d+)s/);

  if (hourMatch || minuteMatch || secondMatch) {
    return (
      (Number(hourMatch?.[1]) || 0) * 3600 +
      (Number(minuteMatch?.[1]) || 0) * 60 +
      (Number(secondMatch?.[1]) || 0)
    );
  }

  return Number(value) || 0;
}

function updateActionButtons() {
  document.querySelectorAll(".action-select").forEach(button => {
    const actionNumber = Number(button.dataset.action);
    const count = actionCounts[actionNumber - 1] || 0;

    button.innerText = `${ACTION_NAMES[actionNumber - 1]} (${count}/10)`;
    button.classList.toggle("selected", actionNumber === currentAction);
    button.classList.toggle("complete", count >= 10);
    button.disabled = Boolean(actionTimer || breakTimer);
  });
}

function setActionButtonsDisabled(isDisabled) {
  document.querySelectorAll(".action-select").forEach(button => {
    button.disabled = isDisabled;
  });
}

function setActionBackButtonDisabled(isDisabled) {
  const backButton = document.getElementById("actionBackButton");
  if (!backButton) return;

  backButton.disabled = isDisabled;
}

function startRecoveryAction() {
  if (actionTimer || breakTimer || currentCount >= 10) return;

  const startButton = document.getElementById("startRepButton");
  const statusText = document.getElementById("repStatusText");
  actionStartedAt = Date.now();

  startButton.disabled = true;
  setActionButtonsDisabled(true);
  setActionBackButtonDisabled(true);
  statusText.innerText = "請持續完成這一次動作...";
  setRepProgressMode("action-progress");
  updateRepProgress(0);

  actionTimer = setInterval(() => {
    const elapsed = Date.now() - actionStartedAt;
    const percent = Math.min(100, Math.round((elapsed / ACTION_DURATION_MS) * 100));
    updateRepProgress(percent);

    if (elapsed >= ACTION_DURATION_MS) {
      clearInterval(actionTimer);
      actionTimer = null;
      statusText.innerText = "完成！已記錄 1 次。";

      const roundFinished = recordCompletedAction();
      if (!roundFinished) {
        startBreakTimer();
      }
    }
  }, 100);
}

function startBreakTimer() {
  const startButton = document.getElementById("startRepButton");
  const statusText = document.getElementById("repStatusText");
  breakStartedAt = Date.now();

  startButton.disabled = true;
  startButton.innerText = "休息一下";
  setActionButtonsDisabled(true);
  setActionBackButtonDisabled(true);
  setRepProgressMode("break-progress");
  updateRepProgress(100, "休息");

  breakTimer = setInterval(() => {
    const elapsed = Date.now() - breakStartedAt;
    const remainingMs = Math.max(0, BREAK_DURATION_MS - elapsed);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const percent = Math.max(0, Math.round((remainingMs / BREAK_DURATION_MS) * 100));

    statusText.innerText = `休息倒數：${remainingSeconds} 秒`;
    updateRepProgress(percent, "休息");

    if (remainingMs <= 0) {
      clearInterval(breakTimer);
      breakTimer = null;
      resetRecoveryAction();
    }
  }, 100);
}

function resetRecoveryAction(delay = 0) {
  if (actionTimer) {
    clearInterval(actionTimer);
    actionTimer = null;
  }
  if (breakTimer) {
    clearInterval(breakTimer);
    breakTimer = null;
  }

  setTimeout(() => {
    const startButton = document.getElementById("startRepButton");
    const backButton = document.getElementById("actionBackButton");
    const statusText = document.getElementById("repStatusText");

    if (!startButton || !statusText) return;

    const selectedActionComplete = (actionCounts[currentAction - 1] || 0) >= 10;
    startButton.disabled = selectedActionComplete;
    startButton.innerText = selectedActionComplete ? "此動作已完成" : "開始復健動作";
    if (backButton) {
      backButton.disabled = false;
    }
    statusText.innerText = selectedActionComplete
      ? "此動作已完成，請返回選擇其他動作。"
      : "按下開始，完成動作後才會記錄 1 次。";
    setRepProgressMode("action-progress");
    updateRepProgress(0);
    updateActionButtons();
  }, delay);
}

function updateRepProgress(percent, label = "") {
  const bar = document.getElementById("repProgress");
  if (!bar) return;

  bar.style.width = percent + "%";
  bar.innerText = percent === 0 ? "Ready" : `${label ? label + " " : ""}${percent}%`;
}

function setRepProgressMode(mode) {
  const bar = document.getElementById("repProgress");
  if (!bar) return;

  bar.classList.remove("action-progress", "break-progress");
  if (mode) {
    bar.classList.add(mode);
  }
}

function recordCompletedAction() {
  if (currentCount < 10) {
    actionCounts[currentAction - 1]++;
    currentCount = actionCounts[currentAction - 1];
    totalCount++;
    points++;

    saveExerciseState();
    localStorage.setItem("totalCount", totalCount);
    localStorage.setItem("points", points);

    updateActionPageDisplay();
  }

  if (actionCounts.every(count => count >= 10)) {
    completedRounds++;
    localStorage.setItem("completedRounds", completedRounds);

    currentAction = 1;
    currentCount = 0;
    actionCounts = Array(ACTIONS_PER_ROUND).fill(0);
    saveExerciseState();

    updateHome();
    updateAchievement();

    alert("🎉 恭喜完成本回合！");

    setTimeout(() => {
      showPage("exercisePage");
    }, 300);

    return true;
  }

  if (currentCount === 10) {
    updateAchievement();
    alert(`${ACTION_NAMES[currentAction - 1]} 已完成。`);

    setTimeout(() => {
      showPage("exercisePage");
    }, 300);

    return true;
  }

  return false;
}

function resetAll() {
  const confirmReset = confirm(
    "確定要清除所有資料嗎？\n包含點數、完成次數與成就紀錄。"
  );

  if (!confirmReset) return;

  // 清除 localStorage
  localStorage.clear();

  // 重設變數
  currentCount = 0;
  currentAction = 1;
  actionCounts = Array(ACTIONS_PER_ROUND).fill(0);
  totalCount = 0;
  completedRounds = 0;
  points = 0;

  // 更新畫面
  updateHome();
  updateAchievement();
  resetExercise();

  alert("系統已歸零！");
  showPage("homePage");
}

function finishRound() {
  if (completedRounds < 4) {

    completedRounds++;
    points += 10;

    localStorage.setItem("completedRounds", completedRounds);
    localStorage.setItem("points", points);

    updateHome();
    updateAchievement();

    alert("本回合已完成，獲得 10 點！");
  }

  showPage("homePage");
}

function updateExerciseProgress() {
  const percent = Math.round((currentCount / 10) * 100);
  const bar = document.getElementById("exerciseProgress");
  if (!bar) return;

  bar.style.width = percent + "%";
  bar.innerText = percent + "%";
}

function updateHome() {
  let status = "";
  for (let i = 1; i <= 4; i++) {
    status += `${i <= completedRounds ? "✅" : "⬜"}第 ${i} 回合 　`;
  }

  document.getElementById("roundStatus").innerText = status;

  const percent = Math.round((completedRounds / 4) * 100);
  const bar = document.getElementById("dailyProgress");
  bar.style.width = percent + "%";
  bar.innerText = percent + "%";

  document.getElementById("points").innerText = points;
}

function updateAchievement() {
  document.getElementById("totalCount").innerText = totalCount;
  document.getElementById("achievementPoints").innerText = points;

  const badges = document.getElementById("badges");
  badges.innerHTML = "";

  if (completedRounds >= 4) {
    badges.innerHTML += `<span class="badge">🏆 今日達標</span>`;
    document.getElementById("badgeImage").innerHTML =
      `<img src="${IMG_PATH}goodcat_4.png" alt="成就圖片">`;
  }
  else if (completedRounds >= 3) {
    badges.innerHTML += `<span class="badge">🌲 優秀高手</span>`;
    document.getElementById("badgeImage").innerHTML =
      `<img src="${IMG_PATH}goodcat_3.png" alt="成就圖片">`;
  }
  else if (completedRounds >= 2) {
    badges.innerHTML += `<span class="badge">🌳 復健成長中</span>`;
    document.getElementById("badgeImage").innerHTML =
      `<img src="${IMG_PATH}goodcat_2.png" alt="成就圖片">`;
  }
  else if (completedRounds >= 1) {
    badges.innerHTML += `<span class="badge">🌿 復健新手</span>`;
    document.getElementById("badgeImage").innerHTML =
      `<img src="${IMG_PATH}goodcat_1.png" alt="成就圖片">`;
  }
  else if (totalCount > 0) {
    badges.innerHTML += `<span class="badge">🌱 開始今日復建之旅</span>`;
    document.getElementById("badgeImage").innerHTML =
      `<img src="${IMG_PATH}goodcat_0.png" alt="成就圖片">`;
  }
  else if (totalCount === 0) {
    badges.innerHTML = `<span class="badge">尚未獲得成就</span>`;
    document.getElementById("badgeImage").innerHTML =
      `<img src="${IMG_PATH}startReco.png" alt="成就圖片">`;    
  }
}

updateHome();
updateAchievement();
