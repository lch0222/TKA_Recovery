let currentCount = Number(localStorage.getItem("currentCount")) || 0;
let currentAction = Number(localStorage.getItem("currentAction")) || 1;
let totalCount = Number(localStorage.getItem("totalCount")) || 0;
let completedRounds = Number(localStorage.getItem("completedRounds")) || 0;
let unlockedAnimalCount = Math.min(10, Math.max(0, Number(localStorage.getItem("unlockedAnimalCount")) || 0));
let dailyAnimalStartIndex = Math.max(0, Number(localStorage.getItem("dailyAnimalStartIndex")) || 0);
let dailyBonusAnimalClaimed = localStorage.getItem("dailyBonusAnimalClaimed") === "true";
let points = Number(localStorage.getItem("points")) || 0;
const AUTH_COOKIE_NAME = "tkaRecoveryUsername";
const PAIN_ASSESSMENT_PREFIX = "painAssessment";
let currentUsername = getCookie(AUTH_COOKIE_NAME) || localStorage.getItem(AUTH_COOKIE_NAME) || "";
let surgerySide = localStorage.getItem("surgerySide") || "";
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
  { name: "白鵝", icon: "🪿" },
  { name: "綠頭鴨", icon: "🦆" },
  { name: "湖畔鳥", icon: "🐦" },
  { name: "花蝴蝶", icon: "🦋" },
  { name: "青蛙", icon: "🐸" },
  { name: "烏龜", icon: "🐢" },
  { name: "小魚", icon: "🐟" },
  { name: "兔子", icon: "🐇" },
  { name: "松鼠", icon: "🐿️" },
  { name: "梅花鹿", icon: "🦌" }
];
const DAILY_MAP_POSITIONS = [
  { x: 27, y: 25 },
  { x: 73, y: 25 },
  { x: 16, y: 74 },
  { x: 50, y: 74 },
  { x: 84, y: 74 }
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
let motionMeasurementSession = null;

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

function closeAppMenu() {
  const appMenu = document.getElementById("appMenu");
  const menuToggleButton = document.getElementById("menuToggleButton");
  if (!appMenu || !menuToggleButton) return;

  appMenu.classList.add("hidden");
  menuToggleButton.setAttribute("aria-expanded", "false");
  menuToggleButton.setAttribute("aria-label", "開啟功能選單");
}

function toggleAppMenu() {
  const appMenu = document.getElementById("appMenu");
  const menuToggleButton = document.getElementById("menuToggleButton");
  if (!appMenu || !menuToggleButton) return;

  const willOpen = appMenu.classList.contains("hidden");
  appMenu.classList.toggle("hidden", !willOpen);
  menuToggleButton.setAttribute("aria-expanded", String(willOpen));
  menuToggleButton.setAttribute("aria-label", willOpen ? "關閉功能選單" : "開啟功能選單");
}

function updateAppMenuAvailability() {
  const menuToggleButton = document.getElementById("menuToggleButton");
  if (!menuToggleButton) return;

  const canUseMenu = Boolean(currentUsername && surgerySide && hasCompletedTodaysPainAssessment());
  menuToggleButton.classList.toggle("hidden", !canUseMenu);
  if (!canUseMenu) closeAppMenu();
}

function handleLogin(event) {
  event.preventDefault();

  const surgeryDate = document.getElementById("surgeryDate").value;
  const wardNumber = document.getElementById("wardNumber").value;
  const bedNumber = document.getElementById("bedNumber").value;
  const selectedSurgerySide = document.querySelector('input[name="surgerySide"]:checked')?.value || "";
  const username = buildUsername(surgeryDate, wardNumber, bedNumber);

  if (!username || !selectedSurgerySide) return;

  currentUsername = username;
  surgerySide = selectedSurgerySide;
  setCookie(AUTH_COOKIE_NAME, username, 365);
  localStorage.setItem(AUTH_COOKIE_NAME, username);
  localStorage.setItem("surgerySide", surgerySide);
  syncDailyExerciseProgress();
  showNextRequiredPage();
}

function initAuthPage() {
  updateUsernameDisplay();

  if (currentUsername) {
    syncDailyExerciseProgress();
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

  if (!surgerySide) {
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

function syncDailyExerciseProgress() {
  const todayKey = getTodayKey();
  const savedDate = localStorage.getItem("exerciseProgressDate");
  const hasSavedCollection = localStorage.getItem("unlockedAnimalCount") !== null;

  // Preserve progress from the original four-animal version on first upgrade.
  if (!hasSavedCollection) {
    unlockedAnimalCount = Math.min(ANIMAL_REWARDS.length, Math.max(0, completedRounds));
    localStorage.setItem("unlockedAnimalCount", unlockedAnimalCount);
  }

  if (!savedDate) {
    completedRounds = Math.min(4, Math.max(0, completedRounds));
    dailyAnimalStartIndex = Math.max(0, unlockedAnimalCount - completedRounds);
    localStorage.setItem("completedRounds", completedRounds);
    localStorage.setItem("dailyAnimalStartIndex", dailyAnimalStartIndex);
    localStorage.setItem("exerciseProgressDate", todayKey);
    claimDailyCompletionBonus();
    return;
  }

  if (savedDate === todayKey) {
    completedRounds = Math.min(4, Math.max(0, completedRounds));
    claimDailyCompletionBonus();
    return;
  }

  completedRounds = 0;
  currentAction = 1;
  currentCount = 0;
  actionCounts = Array(ACTIONS_PER_ROUND).fill(0);
  dailyAnimalStartIndex = unlockedAnimalCount;
  dailyBonusAnimalClaimed = false;

  localStorage.setItem("completedRounds", completedRounds);
  localStorage.setItem("dailyAnimalStartIndex", dailyAnimalStartIndex);
  localStorage.setItem("dailyBonusAnimalClaimed", "false");
  localStorage.setItem("exerciseProgressDate", todayKey);
  saveExerciseState();
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
  if (painForm) {
    painForm.style.setProperty("--pain-color", currentLevel.color);
    painForm.style.setProperty("--pain-progress", `${score * 10}%`);
  }
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
  if (currentUsername) {
    syncDailyExerciseProgress();
  }

  if (!currentUsername && pageId !== "loginPage") {
    pageId = "loginPage";
  }

  if (currentUsername && !surgerySide && pageId !== "loginPage") {
    pageId = "loginPage";
  }

  if (currentUsername && pageId !== "loginPage" && pageId !== "painAssessmentPage" && !hasCompletedTodaysPainAssessment()) {
    pageId = "painAssessmentPage";
  }

  if (pageId === "exercisePage" && completedRounds >= 4) {
    pageId = "homePage";
  }

  closeAppMenu();
  updateUsernameDisplay();
  updateAppMenuAvailability();

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
    startMotionMeasurementSession();
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

function getMeasurementLegs() {
  if (surgerySide === "bilateral") return ["left", "right"];
  return surgerySide ? [surgerySide] : [];
}

function getLegLabel(legSide) {
  return legSide === "left" ? "左腳" : "右腳";
}

function startMotionMeasurementSession() {
  const legs = getMeasurementLegs();
  motionMeasurementSession = {
    legs,
    legIndex: 0,
    stage: "extension",
    extension: null
  };

  const statusText = document.getElementById("motionSaveStatus");
  if (statusText) statusText.innerText = "";
  updateMotionWorkflowDisplay();
}

function updateMotionWorkflowDisplay() {
  if (!motionMeasurementSession) return;

  const { legs, legIndex, stage, extension } = motionMeasurementSession;
  const currentLeg = legs[legIndex];
  const legLabel = getLegLabel(currentLeg);
  const isComplete = stage === "complete";
  const guide = document.getElementById("motionGuide");
  const saveButton = document.getElementById("saveMotionButton");

  if (guide) guide.dataset.stage = stage;
  setElementText(
    "motionStepBadge",
    isComplete ? "量測完成" : `${legLabel} ${legIndex + 1} / ${legs.length}・步驟 ${stage === "extension" ? 1 : 2} / 2`
  );

  if (isComplete) {
    setElementText("motionInstructionTitle", `${legs.length === 2 ? "雙腳" : legLabel}量測完成`);
    setElementText("motionInstructionText", "伸直與彎曲角度已完整儲存。回診時可提供醫療人員參考。");
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.innerText = "本次量測已完成";
    }
    return;
  }

  const isExtension = stage === "extension";
  setElementText("motionInstructionTitle", `請將${legLabel}盡可能${isExtension ? "伸直" : "向下彎曲"}`);
  setElementText(
    "motionInstructionText",
    `手機側邊貼近${legLabel}小腿並保持平行，姿勢穩定後按下記錄。`
  );
  setElementText("extensionAngleResult", extension ? `${extension.angle}°` : "尚未記錄");
  setElementText("flexionAngleResult", "尚未記錄");
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.innerText = isExtension ? "記錄伸直角度" : "記錄彎曲角度並完成";
  }
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

    setSensorStatus("感測器已啟用，請依照上方步驟完成量測");
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

  if (!motionMeasurementSession || motionMeasurementSession.stage === "complete") return;

  const statusText = document.getElementById("motionSaveStatus");
  const saveButton = document.getElementById("saveMotionButton");
  const capturedMeasurement = {
    angle: roundSensorValue(getCurrentEstimatedLegAngle()),
    beta: roundSensorValue(latestOrientation.beta),
    gamma: roundSensorValue(latestOrientation.gamma),
    capturedAt: new Date().toISOString()
  };

  if (motionMeasurementSession.stage === "extension") {
    motionMeasurementSession.extension = capturedMeasurement;
    motionMeasurementSession.stage = "flexion";
    updateMotionWorkflowDisplay();
    if (statusText) statusText.innerText = `伸直角度 ${capturedMeasurement.angle}° 已記錄，請接著量彎曲角度。`;
    setSensorStatus("請將膝蓋盡可能向下彎曲，穩定後再次記錄");
    return;
  }

  const extension = motionMeasurementSession.extension;
  if (!extension) {
    motionMeasurementSession.stage = "extension";
    updateMotionWorkflowDisplay();
    return;
  }

  const legSide = motionMeasurementSession.legs[motionMeasurementSession.legIndex];
  const record = {
    username: currentUsername,
    date: getTodayKey(),
    legSide,
    extensionAngle: extension.angle,
    flexionAngle: capturedMeasurement.angle,
    rangeOfMotion: roundSensorValue(Math.abs(capturedMeasurement.angle - extension.angle)),
    extensionBeta: extension.beta,
    extensionGamma: extension.gamma,
    flexionBeta: capturedMeasurement.beta,
    flexionGamma: capturedMeasurement.gamma,
    measuredAt: capturedMeasurement.capturedAt
  };

  try {
    if (saveButton) saveButton.disabled = true;
    if (statusText) statusText.innerText = "儲存中...";
    await submitMotionMeasurement(record);
    setElementText("flexionAngleResult", `${record.flexionAngle}°`);

    const hasNextLeg = motionMeasurementSession.legIndex < motionMeasurementSession.legs.length - 1;
    if (hasNextLeg) {
      const completedLegLabel = getLegLabel(legSide);
      motionMeasurementSession.legIndex++;
      motionMeasurementSession.stage = "extension";
      motionMeasurementSession.extension = null;
      updateMotionWorkflowDisplay();
      if (statusText) statusText.innerText = `${completedLegLabel}完整資料已儲存，請開始量測${getLegLabel(motionMeasurementSession.legs[motionMeasurementSession.legIndex])}。`;
      setSensorStatus("下一腳請先盡可能伸直，穩定後記錄");
    } else {
      motionMeasurementSession.stage = "complete";
      updateMotionWorkflowDisplay();
      if (statusText) statusText.innerText = `${getLegLabel(legSide)}完整資料已儲存。`;
      setSensorStatus("本次膝蓋角度量測已完成");
    }
  } catch (error) {
    console.error(error);
    if (saveButton) saveButton.disabled = false;
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

function unlockNextAnimal() {
  const unlockedAnimal = ANIMAL_REWARDS[unlockedAnimalCount] || null;
  if (unlockedAnimal) {
    unlockedAnimalCount++;
    localStorage.setItem("unlockedAnimalCount", unlockedAnimalCount);
  }
  return unlockedAnimal;
}

function claimDailyCompletionBonus() {
  if (completedRounds < 4 || dailyBonusAnimalClaimed) return null;

  dailyBonusAnimalClaimed = true;
  localStorage.setItem("dailyBonusAnimalClaimed", "true");
  return unlockNextAnimal();
}

function completeRoundAndUnlockAnimal() {
  if (completedRounds >= 4) {
    return { completed: false, animal: null, bonusAnimal: null };
  }

  completedRounds++;
  const unlockedAnimal = unlockNextAnimal();
  const bonusAnimal = claimDailyCompletionBonus();

  localStorage.setItem("completedRounds", completedRounds);
  return { completed: true, animal: unlockedAnimal, bonusAnimal };
}

function getRoundCompletionMessage(roundReward) {
  if (roundReward.bonusAnimal) {
    return `🎉 完成今日 4 回合！解鎖 ${roundReward.animal.icon} ${roundReward.animal.name}，再加碼解鎖 ${roundReward.bonusAnimal.icon} ${roundReward.bonusAnimal.name}！`;
  }
  if (roundReward.animal) {
    return `🎉 完成本回合，解鎖 ${roundReward.animal.icon} ${roundReward.animal.name}！`;
  }
  return "🎉 恭喜完成本回合！動物圖鑑已全部蒐集完成。";
}

function completeCurrentActionFromVideo() {
  stopVideoProgressTracking();
  setActionBackButtonDisabled(false);
  if (youtubePlayer?.pauseVideo) {
    youtubePlayer.pauseVideo();
  }

  if (actionCounts.every(count => count >= 10)) {
    const roundReward = completeRoundAndUnlockAnimal();
    if (!roundReward.completed) {
      alert("今天已完成 4 回合，請明天再繼續復健。");
      showPage("homePage");
      return;
    }

    currentAction = 1;
    currentCount = 0;
    actionCounts = Array(ACTIONS_PER_ROUND).fill(0);
    saveExerciseState();

    updateHome();
    updateAchievement();

    alert(getRoundCompletionMessage(roundReward));
    setTimeout(() => {
      showPage(completedRounds >= 4 ? "homePage" : "exercisePage");
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
    const roundReward = completeRoundAndUnlockAnimal();
    if (!roundReward.completed) {
      alert("今天已完成 4 回合，請明天再繼續復健。");
      showPage("homePage");
      return true;
    }

    currentAction = 1;
    currentCount = 0;
    actionCounts = Array(ACTIONS_PER_ROUND).fill(0);
    saveExerciseState();

    updateHome();
    updateAchievement();

    alert(getRoundCompletionMessage(roundReward));

    setTimeout(() => {
      showPage(completedRounds >= 4 ? "homePage" : "exercisePage");
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
  unlockedAnimalCount = 0;
  dailyAnimalStartIndex = 0;
  dailyBonusAnimalClaimed = false;

  // 更新畫面
  updateHome();
  updateAchievement();
  resetExercise();

  alert("系統已歸零！");
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

  const startExerciseButton = document.getElementById("startExerciseButton");
  if (startExerciseButton) {
    const reachedDailyLimit = completedRounds >= 4;
    startExerciseButton.disabled = reachedDailyLimit;
    startExerciseButton.innerText = reachedDailyLimit ? "今日 4 回合已完成" : "開始本次復健";
  }

  updateAnimalMap();
  updateAnimalFriends();
}

function updateAnimalMap() {
  const animalMap = document.getElementById("animalMap");
  if (!animalMap) return;

  const todayAnimals = ANIMAL_REWARDS.slice(dailyAnimalStartIndex, dailyAnimalStartIndex + 5);
  const todayUnlockedCount = Math.max(0, unlockedAnimalCount - dailyAnimalStartIndex);
  animalMap.innerHTML = todayAnimals.map((animal, index) => {
    const isUnlocked = index < todayUnlockedCount;
    const position = DAILY_MAP_POSITIONS[index];
    return `
      <div class="map-animal ${isUnlocked ? "complete" : "locked"}" style="left:${position.x}%; top:${position.y}%;">
        <span class="animal-icon">${isUnlocked ? animal.icon : "❓"}</span>
      </div>
    `;
  }).join("");
}

function updateAnimalFriends() {
  const animalFriends = document.getElementById("animalFriends");
  if (!animalFriends) return;

  const unlockedCount = Math.min(ANIMAL_REWARDS.length, unlockedAnimalCount);
  const summary = document.getElementById("animalFriendSummary");
  const nextMessage = document.getElementById("nextAnimalMessage");

  if (summary) {
    summary.innerText = `已蒐集 ${unlockedCount} / ${ANIMAL_REWARDS.length} 隻動物`;
  }
  if (nextMessage) {
    if (unlockedCount >= ANIMAL_REWARDS.length) {
      nextMessage.innerText = "恭喜完成 10 隻動物圖鑑！";
    } else if (completedRounds >= 4) {
      nextMessage.innerText = "今天完成 4 回合，加碼動物也解鎖了！";
    } else {
      nextMessage.innerText = `再完成一回合，解鎖第 ${unlockedCount + 1} 隻動物！`;
    }
  }

  animalFriends.innerHTML = ANIMAL_REWARDS.map((animal, index) => {
    const isUnlocked = unlockedCount > index;
    return `
      <div class="friend-card ${isUnlocked ? "complete" : "locked"}">
        <span class="friend-icon">${isUnlocked ? animal.icon : "❓"}</span>
        <div class="friend-state">${index + 1}. ${isUnlocked ? animal.name : "尚未解鎖"}</div>
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
  const unlockedAnimals = ANIMAL_REWARDS.slice(0, unlockedAnimalCount);

  if (unlockedAnimals.length === 0) {
    badges.innerHTML = `<span class="badge">尚未遇見動物朋友</span>`;
    badgeImage.innerHTML = `<div class="achievement-animals"><span>🌱</span><p>完成第 1 回合後解鎖白鵝</p></div>`;
    return;
  }

  badges.innerHTML = unlockedAnimals
    .map((animal, index) => `<span class="badge">${animal.icon} 圖鑑 ${index + 1}：${animal.name}</span>`)
    .join("");
  badgeImage.innerHTML = `
    <div class="achievement-animals">
      ${ANIMAL_REWARDS.map((animal, index) => `
        <div class="${unlockedAnimalCount > index ? "complete" : "locked"}">
          <span>${unlockedAnimalCount > index ? animal.icon : "❓"}</span>
          <p>${unlockedAnimalCount > index ? animal.name : `圖鑑 ${index + 1}`}</p>
        </div>
      `).join("")}
    </div>
  `;
}

const openPainAssessmentButton = document.getElementById("openPainAssessmentButton");
const painScoreInput = document.getElementById("painScore");
const menuToggleButton = document.getElementById("menuToggleButton");

if (openPainAssessmentButton) {
  openPainAssessmentButton.addEventListener("click", () => {
    closeAppMenu();
    openPainAssessment();
  });
}
if (painScoreInput) {
  painScoreInput.addEventListener("input", updatePainScoreDisplay);
}
if (menuToggleButton) {
  menuToggleButton.addEventListener("click", toggleAppMenu);
}

document.querySelectorAll("[data-menu-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.menuPage));
});

document.addEventListener("click", event => {
  const header = document.querySelector("header");
  if (header && !header.contains(event.target)) closeAppMenu();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeAppMenu();
});

updateHome();
updateAchievement();
initAuthPage();
