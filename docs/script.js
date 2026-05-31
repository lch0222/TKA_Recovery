let currentCount = Number(localStorage.getItem("currentCount")) || 0;
let totalCount = Number(localStorage.getItem("totalCount")) || 0;
let completedRounds = Number(localStorage.getItem("completedRounds")) || 0;
let points = Number(localStorage.getItem("points")) || 0;
const IMG_PATH = "./img/";

function showPage(pageId) {
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
}

function addCount() {
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
  }
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
