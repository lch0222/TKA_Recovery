let currentCount = Number(localStorage.getItem("currentCount")) || 0;
let currentAction = Number(localStorage.getItem("currentAction")) || 1;
let totalCount = Number(localStorage.getItem("totalCount")) || 0;
let completedRounds = Number(localStorage.getItem("completedRounds")) || 0;
let points = Number(localStorage.getItem("points")) || 0;
const AUTH_COOKIE_NAME = "tkaRecoveryUsername";
const PAIN_ASSESSMENT_PREFIX = "painAssessment";
let currentUsername = getCookie(AUTH_COOKIE_NAME) || localStorage.getItem(AUTH_COOKIE_NAME) || "";
const show_user_name = true;
const IMG_PATH = "./img/";
const ACTIONS_PER_ROUND = 4;
const ACTION_NAMES = [
  "足踝運動",
  "大腿肌肉收縮運動",
  "直抬腿運動",
  "膝部屈曲伸直運動"
];
const ANIMAL_REWARDS = [
  { name: "白鵝", icon: "🪿", position: { x: 22, y: 64 } },
  { name: "綠頭鴨", icon: "🦆", position: { x: 64, y: 65 } },
  { name: "湖畔鳥", icon: "🐦", position: { x: 31, y: 28 } },
  { name: "花蝴蝶", icon: "🦋", position: { x: 86, y: 58 } }
];
const ACTION_DURATION_MS = 10000;
const ACTION_VIDEOS = [
  {
    url: "https://www.youtube.com/watch?v=dW8bOKk_Jws",
    start: 17,
    end: 163,
    repTimes: [59, 70, 82, 93, 104, 115, 127, 139, 150, 162]
  },
  {
    url: "https://www.youtube.com/watch?v=dW8bOKk_Jws",
    start: 165,
    end: 323,
    repTimes: [205, 218, 231, 244, 258, 271, 285, 297, 311, 322]
  },
  {
    url: "https://www.youtube.com/watch?v=dW8bOKk_Jws",
    start: 325,
    end: 476,
    repTimes: [360, 374, 385, 398, 410, 422, 435, 449, 461, 475]
  },
  {
    url: "https://www.youtube.com/watch?v=dW8bOKk_Jws",
    start: 478,
    end: 672,
    repTimes: [523, 540, 557, 572, 588, 605, 623, 639, 656, 672]
  }
];
let actionTimer = null;
let actionStartedAt = 0;
let youtubePlayer = null;
let youtubeApiReady = false;
let pendingYoutubePlayerInit = false;
let videoProgressTimer = null;
let lastAllowedVideoTime = 0;
let pendingPlayerElementId = "";
let youtubePlayerInitVersion = 0;
let sensorEnabled = false;
let latestOrientation = null;

if (currentAction < 1 || currentAction > ACTIONS_PER_ROUND) {
  currentAction = 1;
  localStorage.setItem("currentAction", currentAction);
}

let actionCounts = loadActionCounts();
currentCount = actionCounts[currentAction - 1] || 0;

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const cookie = cookies.find(item => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
}

function setCookie(name, value, daysToExpire) {
  const expires = new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function buildUsername(surgeryDate, wardNumber, bedNumber) {
  return `${surgeryDate.split("-").join("")}${wardNumber.trim()}${bedNumber.trim()}`;
}

function updateUsernameDisplay() {
  const usernameDisplay = document.getElementById("usernameDisplay");
  if (!usernameDisplay) return;
  if (!show_user_name) return;

  usernameDisplay.innerText = currentUsername;
  usernameDisplay.classList.toggle("hidden", !currentUsername);
}

function handleLogin(event) {
  event.preventDefault();

  const surgeryDate = document.getElementById("surgeryDate").value;
  const wardNumber = document.getElementById("wardNumber").value;
  const bedNumber = document.getElementById("bedNumber").value;
  const username = buildUsername(surgeryDate, wardNumber, bedNumber);

  if (!username) return;

  currentUsername = username;
  setCookie(AUTH_COOKIE_NAME, username, 365);
  localStorage.setItem(AUTH_COOKIE_NAME, username);
  showNextRequiredPage();
}

function initAuthPage() {
  updateUsernameDisplay();

  if (currentUsername) {
    showNextRequiredPage();
    return;
  }

  showPage("loginPage");
}

function showNextRequiredPage() {
  if (!currentUsername) {
    showPage("loginPage");
    return;
  }

  showPage(hasCompletedTodaysPainAssessment() ? "homePage" : "painAssessmentPage");
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPainAssessmentStorageKey(dateKey = getTodayKey()) {
  return `${PAIN_ASSESSMENT_PREFIX}:${currentUsername}:${dateKey}`;
}

function hasCompletedTodaysPainAssessment() {
  if (!currentUsername) return false;
  return Boolean(localStorage.getItem(getPainAssessmentStorageKey()));
}

function updatePainScoreDisplay() {
  const painScore = document.getElementById("painScore");
  const painScoreDisplay = document.getElementById("painScoreDisplay");
  const painEmoji = document.getElementById("painEmoji");
  const painLevelText = document.getElementById("painLevelText");
  const painForm = document.getElementById("painAssessmentForm");
  if (!painScore || !painScoreDisplay) return;

  const score = Number(painScore.value);
  const painLevels = [
    { max: 0, emoji: "😊", label: "不痛", color: "#1c9b67" },
    { max: 3, emoji: "🙂", label: "輕微疼痛", color: "#79a824" },
    { max: 6, emoji: "😣", label: "中度疼痛", color: "#dd8610" },
    { max: 9, emoji: "😖", label: "重度疼痛", color: "#df573f" },
    { max: 10, emoji: "😭", label: "最痛", color: "#c83245" }
  ];
  const currentLevel = painLevels.find(level => score <= level.max);

  painScoreDisplay.innerText = score;
  if (painEmoji) painEmoji.innerText = currentLevel.emoji;
  if (painLevelText) painLevelText.innerText = currentLevel.label;
  if (painForm) painForm.style.setProperty("--pain-color", currentLevel.color);
}

function openPainAssessment() {
  const painForm = document.getElementById("painAssessmentForm");
  const statusText = document.getElementById("painAssessmentStatus");

  if (painForm) painForm.reset();
  if (statusText) statusText.innerText = "";
  showPage("painAssessmentPage");
}

async function handlePainAssessment(event) {
  event.preventDefault();

  const painScore = document.getElementById("painScore");
  const painNote = document.getElementById("painNote");
  const statusText = document.getElementById("painAssessmentStatus");
  const submitButton = document.getElementById("painSubmitButton");
  const dateKey = getTodayKey();
  const record = {
    username: currentUsername,
    date: dateKey,
    vasScore: Number(painScore.value),
    note: painNote.value.trim(),
    createdAt: new Date().toISOString()
  };

  if (submitButton) submitButton.disabled = true;
  if (statusText) statusText.innerText = "儲存中...";

  try {
    await submitPainAssessment(record);
    localStorage.setItem(getPainAssessmentStorageKey(dateKey), JSON.stringify(record));
    if (statusText) statusText.innerText = "已完成疼痛評估";
    showPage("homePage");
  } catch (error) {
    console.error(error);
    if (statusText) statusText.innerText = "儲存失敗，請稍後再試";
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

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
  if (!currentUsername && pageId !== "loginPage") {
    pageId = "loginPage";
  }

  if (currentUsername && pageId !== "loginPage" && pageId !== "painAssessmentPage" && !hasCompletedTodaysPainAssessment()) {
    pageId = "painAssessmentPage";
  }

  updateUsernameDisplay();

  if (pageId !== "actionPage") {
    stopActionVideo();
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
  if (pageId === "painAssessmentPage") {
    const painBackButton = document.getElementById("painBackButton");
    if (painBackButton) {
      painBackButton.classList.toggle("hidden", !hasCompletedTodaysPainAssessment());
    }
    updatePainScoreDisplay();
  }
  if (pageId === "motionPage") {
    requestSensorAccess();
    updateMotionDisplay();
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
  if (actionTimer) return;
  if (actionNumber < 1 || actionNumber > ACTIONS_PER_ROUND) return;

  currentAction = actionNumber;
  saveExerciseState();
  showPage("actionPage");
}

async function requestSensorAccess() {
  if (!window.DeviceOrientationEvent) {
    setSensorStatus("此裝置或瀏覽器不支援姿態感測器");
    return false;
  }

  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        setSensorStatus("未取得感測器權限");
        return false;
      }
    }

    if (!sensorEnabled) {
      window.addEventListener("deviceorientation", handleDeviceOrientation);
      sensorEnabled = true;
    }

    setSensorStatus("感測器已啟用，請彎曲到最大角度後記錄");
    return true;
  } catch (error) {
    console.error(error);
    setSensorStatus("感測器啟用失敗，請按記錄此角度再試一次");
    return false;
  }
}

function handleDeviceOrientation(event) {
  latestOrientation = {
    beta: Number(event.beta),
    gamma: Number(event.gamma),
    alpha: Number(event.alpha),
    capturedAt: new Date().toISOString()
  };

  if (!Number.isFinite(latestOrientation.beta)) {
    setSensorStatus("讀不到有效角度");
    return;
  }

  updateMotionDisplay();
}

async function saveMotionMeasurement() {
  if (!sensorEnabled) {
    const granted = await requestSensorAccess();
    if (!granted) return;
  }

  if (!latestOrientation || !Number.isFinite(latestOrientation.beta)) {
    setSensorStatus("尚未取得角度資料，請保持手機固定後再試");
    return;
  }

  const statusText = document.getElementById("motionSaveStatus");
  const measuredAt = new Date();
  const record = {
    username: currentUsername,
    date: getTodayKey(),
    actionName: ACTION_NAMES[currentAction - 1],
    measuredAngle: roundSensorValue(getCurrentEstimatedLegAngle()),
    beta: roundSensorValue(latestOrientation.beta),
    gamma: roundSensorValue(latestOrientation.gamma),
    measuredAt: measuredAt.toISOString()
  };

  try {
    if (statusText) statusText.innerText = "儲存中...";
    await submitMotionMeasurement(record);
    if (statusText) statusText.innerText = `已記錄 ${record.measuredAngle}°`;
    setSensorStatus("角度已記錄，可再次彎曲後重新記錄");
  } catch (error) {
    console.error(error);
    if (statusText) statusText.innerText = "儲存失敗，請稍後再試";
  }
}

function getCurrentEstimatedLegAngle() {
  if (!latestOrientation || !Number.isFinite(latestOrientation.beta)) return 0;

  return Math.min(180, Math.abs(latestOrientation.beta));
}

function updateMotionDisplay() {
  const currentAngle = getCurrentEstimatedLegAngle();
  setElementText("estimatedAngle", roundSensorValue(currentAngle));
  setElementText("sensorBeta", formatSensorValue(latestOrientation?.beta));
  setElementText("sensorGamma", formatSensorValue(latestOrientation?.gamma));
}

function setSensorStatus(message) {
  setElementText("sensorStatus", message);
}

function setElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.innerText = text;
}

function setButtonDisabled(buttonId, isDisabled) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.disabled = isDisabled;
}

function formatSensorValue(value) {
  return Number.isFinite(value) ? `${roundSensorValue(value)}°` : "--";
}

function roundSensorValue(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

function resetActionPage() {
  updateActionPageDisplay();
  resetRecoveryAction();
  updateVideoProgressText();
}

function updateVideoProgressText() {
  const statusText = document.getElementById("repStatusText");
  if (!statusText) return;

  statusText.innerText = "播放影片後會依照影片進度自動記錄次數。";
}

function updateActionPageDisplay() {
  currentCount = actionCounts[currentAction - 1] || 0;
  document.getElementById("actionTitle").innerText =
    `第 ${completedRounds + 1} 回合 - ${ACTION_NAMES[currentAction - 1]}`;
  updateActionCountDisplay();
  updateActionVideo();
}

function updateActionCountDisplay() {
  currentCount = actionCounts[currentAction - 1] || 0;
  document.getElementById("currentCount").innerText = currentCount;
  updateExerciseProgress();
}

function updateActionVideo() {
  const embedUrl = getYouTubeEmbedUrl(ACTION_VIDEOS[currentAction - 1]);
  stopActionVideo();
  destroyYouTubePlayer();

  const video = ensureActionVideoFrame();
  const notice = document.getElementById("videoNotice");
  if (!video) return;

  lastAllowedVideoTime = getCurrentVideoStartSeconds();
  video.src = embedUrl;
  video.classList.toggle("hidden", !embedUrl);
  if (notice) {
    notice.classList.toggle("hidden", Boolean(embedUrl));
  }

  if (embedUrl) {
    initYouTubePlayer();
  }
}

function ensureActionVideoFrame() {
  const existingVideo = document.getElementById("actionVideo");
  if (existingVideo) return existingVideo;

  const videoFrame = document.querySelector(".video-frame");
  if (!videoFrame) return null;

  const video = document.createElement("iframe");
  video.id = "actionVideo";
  video.title = "Exercise instruction video";
  video.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  video.referrerPolicy = "strict-origin-when-cross-origin";
  video.allowFullscreen = true;
  videoFrame.prepend(video);
  return video;
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
    enablejsapi: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    modestbranding: "1",
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

function loadYouTubeApi() {
  if (window.YT?.Player || document.getElementById("youtubeIframeApi")) {
    return;
  }

  const script = document.createElement("script");
  script.id = "youtubeIframeApi";
  script.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(script);
}

function initYouTubePlayer() {
  pendingYoutubePlayerInit = true;
  pendingPlayerElementId = "actionVideo";
  loadYouTubeApi();

  if (!youtubeApiReady || !window.YT?.Player) return;

  pendingYoutubePlayerInit = false;
  destroyYouTubePlayer();
  const initVersion = ++youtubePlayerInitVersion;

  setTimeout(() => {
    if (initVersion !== youtubePlayerInitVersion) return;

    const playerElement = document.getElementById(pendingPlayerElementId);
    if (!playerElement || !playerElement.src) return;

    youtubePlayer = new YT.Player(pendingPlayerElementId, {
      events: {
        onReady: handleYouTubeReady,
        onStateChange: handleYouTubeStateChange
      }
    });
  }, 0);
}

function destroyYouTubePlayer() {
  stopVideoProgressTracking();
  youtubePlayerInitVersion++;

  if (youtubePlayer?.destroy) {
    youtubePlayer.destroy();
  }

  youtubePlayer = null;
}

function handleYouTubeReady(event) {
  const startSeconds = getCurrentVideoStartSeconds();
  lastAllowedVideoTime = startSeconds;

  if (event.target?.seekTo) {
    event.target.seekTo(startSeconds, true);
  }
}

function handleYouTubeStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    startVideoProgressTracking(event.target);
    return;
  }

  if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.BUFFERING) {
    stopVideoProgressTracking();
    return;
  }

  if (event.data === YT.PlayerState.ENDED) {
    stopVideoProgressTracking();
    updateVideoDrivenCount(getCurrentVideoEndSeconds());

    const startSeconds = getCurrentVideoStartSeconds();
    event.target.seekTo(startSeconds, true);
    event.target.pauseVideo();
  }
}

function getCurrentVideoStartSeconds() {
  const videoConfig = ACTION_VIDEOS[currentAction - 1];
  if (!videoConfig) return 0;

  if (typeof videoConfig === "string") {
    return getYouTubeTimeParam(videoConfig, "start");
  }

  return Number(videoConfig.start) || getYouTubeTimeParam(videoConfig.url || "", "start");
}

function getCurrentVideoEndSeconds() {
  const videoConfig = ACTION_VIDEOS[currentAction - 1];
  if (!videoConfig) return 0;

  if (typeof videoConfig === "string") {
    return getYouTubeTimeParam(videoConfig, "end");
  }

  return Number(videoConfig.end) || getYouTubeTimeParam(videoConfig.url || "", "end");
}

function startVideoProgressTracking(player) {
  stopVideoProgressTracking();
  const startSeconds = getCurrentVideoStartSeconds();
  const initialTime = player.getCurrentTime();
  lastAllowedVideoTime = Math.max(startSeconds, initialTime);

  if (initialTime < startSeconds && player.seekTo) {
    player.seekTo(startSeconds, true);
  }

  updateVideoDrivenCount(lastAllowedVideoTime);

  videoProgressTimer = setInterval(() => {
    const currentTime = player.getCurrentTime();
    const minimumAllowedTime = Math.max(startSeconds, lastAllowedVideoTime);
    const isLikelyFastForward = currentTime > minimumAllowedTime + 2.5;

    if (currentTime < startSeconds) {
      player.seekTo(startSeconds, true);
      lastAllowedVideoTime = startSeconds;
      return;
    }

    if (isLikelyFastForward) {
      player.seekTo(minimumAllowedTime, true);
      return;
    }

    lastAllowedVideoTime = Math.max(lastAllowedVideoTime, currentTime);
    updateVideoDrivenCount(currentTime);
  }, 500);
}

function stopVideoProgressTracking() {
  if (!videoProgressTimer) return;

  clearInterval(videoProgressTimer);
  videoProgressTimer = null;
}

function updateVideoDrivenCount(currentTime) {
  const startSeconds = getCurrentVideoStartSeconds();
  const endSeconds = getCurrentVideoEndSeconds();
  if (endSeconds <= startSeconds || currentTime < startSeconds) return;

  const repTimes = getCurrentVideoRepTimes();
  const nextCount = repTimes.length > 0
    ? repTimes.filter(repTime => currentTime >= repTime).length
    : Math.min(10, Math.floor(((currentTime - startSeconds) / (endSeconds - startSeconds)) * 10));
  if (nextCount <= currentCount) return;

  recordVideoDrivenCount(nextCount);
}

function getCurrentVideoRepTimes() {
  const videoConfig = ACTION_VIDEOS[currentAction - 1];
  if (!videoConfig || typeof videoConfig === "string" || !Array.isArray(videoConfig.repTimes)) {
    return [];
  }

  return videoConfig.repTimes
    .map(repTime => Number(repTime))
    .filter(repTime => Number.isFinite(repTime))
    .sort((first, second) => first - second)
    .slice(0, 10);
}

function recordVideoDrivenCount(nextCount) {
  const previousCount = actionCounts[currentAction - 1] || 0;
  const safeNextCount = Math.min(10, Math.max(previousCount, nextCount));
  const countDelta = safeNextCount - previousCount;
  if (countDelta <= 0) return;

  actionCounts[currentAction - 1] = safeNextCount;
  currentCount = safeNextCount;
  totalCount += countDelta;
  points += countDelta;

  saveExerciseState();
  localStorage.setItem("totalCount", totalCount);
  localStorage.setItem("points", points);

  updateActionCountDisplay();

  if (safeNextCount >= 10) {
    completeCurrentActionFromVideo();
  }
}

function completeCurrentActionFromVideo() {
  stopVideoProgressTracking();
  setActionBackButtonDisabled(false);
  if (youtubePlayer?.pauseVideo) {
    youtubePlayer.pauseVideo();
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
    return;
  }

  updateAchievement();
  alert(`${ACTION_NAMES[currentAction - 1]} 已完成。`);
  setTimeout(() => {
    showPage("exercisePage");
  }, 300);
}

window.onYouTubeIframeAPIReady = function () {
  youtubeApiReady = true;
  if (pendingYoutubePlayerInit) {
    initYouTubePlayer();
  }
};

function updateActionButtons() {
  document.querySelectorAll(".action-select").forEach(button => {
    const actionNumber = Number(button.dataset.action);
    const count = actionCounts[actionNumber - 1] || 0;

    button.innerText = `${ACTION_NAMES[actionNumber - 1]} (${count}/10)`;
    button.classList.toggle("selected", actionNumber === currentAction);
    button.classList.toggle("complete", count >= 10);
    button.disabled = Boolean(actionTimer);
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

function handleActionBack() {
  const currentActionCount = actionCounts[currentAction - 1] || 0;
  const videoIsPlaying = Boolean(videoProgressTimer);
  const actionIncomplete = videoIsPlaying || (currentActionCount > 0 && currentActionCount < 10);

  if (actionIncomplete) {
    const shouldLeave = confirm("如果中途返回，會喪失目前這個動作的進度。確定要返回動作選擇嗎？");
    if (!shouldLeave) return;

    resetCurrentActionProgress();
  }

  stopActionVideo();
  showPage("exercisePage");
}

function resetCurrentActionProgress() {
  const lostCount = actionCounts[currentAction - 1] || 0;
  if (lostCount <= 0) return;

  actionCounts[currentAction - 1] = 0;
  currentCount = 0;
  totalCount = Math.max(0, totalCount - lostCount);
  points = Math.max(0, points - lostCount);

  saveExerciseState();
  localStorage.setItem("totalCount", totalCount);
  localStorage.setItem("points", points);
  updateActionCountDisplay();
  updateHome();
  updateAchievement();
}

function stopActionVideo() {
  stopVideoProgressTracking();
  if (youtubePlayer?.pauseVideo) {
    youtubePlayer.pauseVideo();
  }
  setActionBackButtonDisabled(false);
}

function startRecoveryAction() {
  if (actionTimer || currentCount >= 10) return;

  const startButton = document.getElementById("startRepButton");
  const statusText = document.getElementById("repStatusText");
  actionStartedAt = Date.now();

  startButton.disabled = true;
  setActionButtonsDisabled(true);
  setActionBackButtonDisabled(true);
  statusText.innerText = "請持續完成這一次動作...";

  actionTimer = setInterval(() => {
    const elapsed = Date.now() - actionStartedAt;

    if (elapsed >= ACTION_DURATION_MS) {
      clearInterval(actionTimer);
      actionTimer = null;
      statusText.innerText = "完成！已記錄 1 次。";

      const roundFinished = recordCompletedAction();
      if (!roundFinished) {
        resetRecoveryAction();
      }
    }
  }, 100);
}

function resetRecoveryAction(delay = 0) {
  if (actionTimer) {
    clearInterval(actionTimer);
    actionTimer = null;
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
      : "播放影片後會依照影片進度自動記錄次數。";
    updateActionButtons();
  }, delay);
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

  const roundStatus = document.getElementById("roundStatus");
  if (roundStatus) {
    roundStatus.innerText = status;
  }

  const percent = Math.min(100, Math.round((completedRounds / 4) * 100));
  const bar = document.getElementById("dailyProgress");
  bar.style.width = percent + "%";
  bar.innerText = percent + "%";

  const pointsText = document.getElementById("points");
  if (pointsText) {
    pointsText.innerText = points;
  }

  const completedRoundCount = document.getElementById("completedRoundCount");
  if (completedRoundCount) {
    completedRoundCount.innerText = Math.min(4, completedRounds);
  }

  updateAnimalMap();
  updateAnimalFriends();
}

function updateAnimalMap() {
  const animalMap = document.getElementById("animalMap");
  if (!animalMap) return;

  animalMap.innerHTML = ANIMAL_REWARDS.map((animal, index) => {
    const roundNumber = index + 1;
    const isUnlocked = completedRounds >= roundNumber;
    return `
      <div class="map-animal ${isUnlocked ? "complete" : "locked"}" style="left:${animal.position.x}%; top:${animal.position.y}%;">
        <span class="animal-icon">${animal.icon}</span>
        <span class="animal-label">第 ${roundNumber} 回合</span>
      </div>
    `;
  }).join("");
}

function updateAnimalFriends() {
  const animalFriends = document.getElementById("animalFriends");
  if (!animalFriends) return;

  const unlockedCount = Math.min(ANIMAL_REWARDS.length, completedRounds);
  const summary = document.getElementById("animalFriendSummary");
  const nextMessage = document.getElementById("nextAnimalMessage");

  if (summary) {
    summary.innerText = `已遇見 ${unlockedCount} 位朋友`;
  }
  if (nextMessage) {
    nextMessage.innerText = unlockedCount >= ANIMAL_REWARDS.length
      ? "今天的朋友都到齊了！"
      : `下一回合，${ANIMAL_REWARDS[unlockedCount].name}等著你！`;
  }

  animalFriends.innerHTML = ANIMAL_REWARDS.map((animal, index) => {
    const roundNumber = index + 1;
    const isUnlocked = completedRounds >= roundNumber;
    return `
      <div class="friend-card ${isUnlocked ? "complete" : "locked"}">
        <span class="friend-icon">${animal.icon}</span>
        <div class="friend-state">第 ${roundNumber} 回合</div>
      </div>
    `;
  }).join("");
}

function updateAchievement() {
  document.getElementById("totalCount").innerText = totalCount;
  document.getElementById("achievementPoints").innerText = points;

  const badges = document.getElementById("badges");
  badges.innerHTML = "";
  const badgeImage = document.getElementById("badgeImage");
  const unlockedAnimals = ANIMAL_REWARDS.filter((animal, index) => completedRounds >= index + 1);

  if (unlockedAnimals.length === 0) {
    badges.innerHTML = `<span class="badge">尚未遇見動物朋友</span>`;
    badgeImage.innerHTML = `<div class="achievement-animals"><span>🌱</span><p>完成第 1 回合後解鎖白鵝</p></div>`;
    return;
  }

  badges.innerHTML = unlockedAnimals
    .map((animal, index) => `<span class="badge">${animal.icon} 第 ${index + 1} 回合：${animal.name}</span>`)
    .join("");
  badgeImage.innerHTML = `
    <div class="achievement-animals">
      ${ANIMAL_REWARDS.map((animal, index) => `
        <div class="${completedRounds >= index + 1 ? "complete" : "locked"}">
          <span>${animal.icon}</span>
          <p>${completedRounds >= index + 1 ? animal.name : `第 ${index + 1} 回合`}</p>
        </div>
      `).join("")}
    </div>
  `;
}

updateHome();
updateAchievement();
initAuthPage();
