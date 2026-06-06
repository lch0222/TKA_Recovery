let currentCount = Number(localStorage.getItem("currentCount")) || 0;
let totalCount = Number(localStorage.getItem("totalCount")) || 0;
let completedRounds = Number(localStorage.getItem("completedRounds")) || 0;
let points = Number(localStorage.getItem("points")) || 0;
const IMG_PATH = "./img/";
const ACTION_DURATION_MS = 10000;
const BREAK_DURATION_MS = 20000;
let actionTimer = null;
let actionStartedAt = 0;
let breakTimer = null;
let breakStartedAt = 0;

function showPage(pageId) {
  if (pageId !== "exercisePage") {
    resetRecoveryAction();
  }

  document.querySelectorAll("section").forEach(section => {
    section.classList.add("hidden");
  });
  document.getElementById(pageId).classList.remove("hidden");

  if (pageId === "exercisePage") {
    resetExercise();
  }

  updateHome();
  updateAchievement();
}

function resetExercise() {
  document.getElementById("roundTitle").innerText = `第 ${completedRounds + 1} 回合復健`;
  document.getElementById("currentCount").innerText = currentCount;
  updateExerciseProgress();
  resetRecoveryAction();
}

function startRecoveryAction() {
  if (actionTimer || breakTimer || currentCount >= 10) return;

  const startButton = document.getElementById("startRepButton");
  const statusText = document.getElementById("repStatusText");
  actionStartedAt = Date.now();

  startButton.disabled = true;
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
    const statusText = document.getElementById("repStatusText");

    if (!startButton || !statusText) return;

    startButton.disabled = false;
    startButton.innerText = "開始復健動作";
    statusText.innerText = "按下開始，完成動作後才會記錄 1 次。";
    setRepProgressMode("action-progress");
    updateRepProgress(0);
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
    currentCount++;
    totalCount++;
    points++;

    localStorage.setItem("currentCount", currentCount);
    localStorage.setItem("totalCount", totalCount);
    localStorage.setItem("points", points);

    document.getElementById("currentCount").innerText = currentCount;
    updateExerciseProgress();
  }

  if (currentCount === 10) {
    completedRounds++;
    localStorage.setItem("completedRounds", completedRounds);

    localStorage.setItem("currentCount", 0);
    currentCount = 0;

    updateHome();
    updateAchievement();

    alert("🎉 恭喜完成本回合！獲得 10 點");

    setTimeout(() => {
      showPage("homePage");
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
