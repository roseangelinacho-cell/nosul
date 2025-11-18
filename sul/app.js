import { saveLog, fetchSummary } from "./api.js";

const goalInput = document.getElementById("weekly-goal");
const registerButton = document.getElementById("register-goal");
const sojuGrid = document.getElementById("soju-grid");
const goalStatus = document.getElementById("goal-status");
const sojuTemplate = document.getElementById("soju-template");
const goalBoard = document.querySelector(".goal-board");
const summaryMonthBottles = document.getElementById("month-bottles");
const summaryMonthAmount = document.getElementById("month-amount");
const summaryYearBottles = document.getElementById("year-bottles");
const summaryYearAmount = document.getElementById("year-amount");
const logModal = document.getElementById("log-modal");
const logForm = document.getElementById("log-form");
const logDateInput = document.getElementById("log-date");
const logMemoInput = document.getElementById("log-memo");
const logPriceInput = document.getElementById("log-price");
const cancelLogButton = document.getElementById("cancel-log");
const changeGoalButton = document.getElementById("change-goal");
const controlsPanel = document.getElementById("goal-controls");

const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

let currentGoal = 0;
let consumedCount = 0;
let bottleData = [];
let selectedBottleIndex = null;
let goalConfigured = false;

function getDayLabelFromDate(dateStr) {
  if (!dateStr) return "";
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) return "";
  return dayNames[dateObj.getDay()];
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}.${parts[2]}`;
}

function getTodayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
}

function createBottle() {
  return sojuTemplate.content.firstElementChild.cloneNode(true);
}

function setFillLevel(bottle, ratio) {
  const liquid = bottle.querySelector(".liquid");
  if (liquid) {
    liquid.style.setProperty("--fill-level", ratio);
  }
}

function updateGoalStatus() {
  goalBoard.classList.remove("on-track", "over-goal");
  if (currentGoal === 0) {
    goalStatus.textContent = "이번 주는 금주! 0병으로 설정했습니다.";
    return;
  }

  if (consumedCount > currentGoal) {
    goalBoard.classList.add("over-goal");
    goalStatus.textContent = `목표 ${currentGoal}병을 초과했어요! 총 ${consumedCount}병`;
  } else {
    goalBoard.classList.add("on-track");
    const remain = currentGoal - consumedCount;
    goalStatus.textContent = `이번 주 목표: ${currentGoal}병 / 기록: ${consumedCount}병 (남은 ${remain}병)`;
  }
}

async function updateSummaryFromApi() {
  try {
    const summary = await fetchSummary();
    summaryMonthBottles.textContent = summary.monthBottles ?? 0;
    summaryMonthAmount.textContent = (summary.monthAmount ?? 0).toLocaleString();
    summaryYearBottles.textContent = summary.yearBottles ?? 0;
    summaryYearAmount.textContent = (summary.yearAmount ?? 0).toLocaleString();
  } catch (error) {
    console.error("요약 정보를 불러오지 못했습니다:", error);
  }
}

function prepareBottleElement(bottle) {
  bottle.classList.remove("drained", "over-goal");
  const label = bottle.querySelector(".bottle-label");
  if (label) label.classList.add("empty");
  const dayText = bottle.querySelector(".label-day");
  if (dayText) dayText.textContent = "";
  const dateText = bottle.querySelector(".label-date");
  if (dateText) dateText.textContent = "";
  const memoText = bottle.querySelector(".label-memo");
  if (memoText) memoText.textContent = "";
  setFillLevel(bottle, 1);
}

function reindexBottles() {
  [...sojuGrid.querySelectorAll(".soju")].forEach((bottle, index) => {
    bottle.dataset.index = index.toString();
  });
}

function addBottleElement() {
  const bottle = createBottle();
  prepareBottleElement(bottle);
  sojuGrid.appendChild(bottle);
  bottleData.push({
    consumed: false,
    date: null,
    memo: "",
    price: 0,
  });
}

function resetBottles(count) {
  sojuGrid.innerHTML = "";
  bottleData = [];
  consumedCount = 0;
  updateGoalStatus();

  for (let i = 0; i < count; i += 1) {
    addBottleElement();
  }
  reindexBottles();
}

function closeModal() {
  logModal.classList.remove("active");
  logModal.setAttribute("aria-hidden", "true");
  selectedBottleIndex = null;
  logForm.reset();
}

function openModal(index) {
  selectedBottleIndex = index;
  const existing = bottleData[index];
  logDateInput.value = existing.date || getTodayISO();
  logMemoInput.value = existing.memo || "";
  logPriceInput.value = existing.price ? String(existing.price) : "";
  logModal.classList.add("active");
  logModal.setAttribute("aria-hidden", "false");
  logDateInput.focus();
}

async function applyBottleState(index, { date, memo, price }) {
  const bottle = sojuGrid.querySelector(`.soju[data-index="${index}"]`);
  if (!bottle) return;
  const label = bottle.querySelector(".bottle-label");
  const dayText = bottle.querySelector(".label-day");
  const dateText = bottle.querySelector(".label-date");
  const memoText = bottle.querySelector(".label-memo");
  const wasConsumed = bottleData[index].consumed;
  bottle.classList.add("drained");
  setFillLevel(bottle, 0);
  if (label) label.classList.remove("empty");
  if (dayText) {
    dayText.textContent = date ? getDayLabelFromDate(date) : "";
  }
  if (dateText) {
    dateText.textContent = formatDateLabel(date);
  }
  if (memoText) {
    memoText.textContent = memo ? memo.slice(0, 24) : "";
  }
  bottleData[index] = {
    consumed: true,
    date,
    memo,
    price,
  };
  if (!wasConsumed) {
    consumedCount += 1;
    if (consumedCount > currentGoal) {
      bottle.classList.add("over-goal");
    }
    try {
      await saveLog({ date, price, count: 1 });
    } catch (error) {
      console.error("로그 저장 실패:", error);
    }
  }
  updateGoalStatus();
  await updateSummaryFromApi();
}

function adjustBottles(newGoal) {
  if (newGoal === currentGoal) {
    goalStatus.textContent = `이번 주 목표: ${currentGoal}병 / 기록: ${consumedCount}병 (남은 ${currentGoal - consumedCount}병)`;
    return;
  }

  if (newGoal < consumedCount) {
    goalStatus.textContent = `이미 ${consumedCount}병 기록되어 최소 ${consumedCount}병 이상만 설정할 수 있어요.`;
    goalInput.value = currentGoal;
    return;
  }

  if (newGoal > currentGoal) {
    const diff = newGoal - currentGoal;
    for (let i = 0; i < diff; i += 1) {
      addBottleElement();
    }
  } else {
    while (bottleData.length > newGoal) {
      const idx = bottleData
        .map((data, index) => ({ data, index }))
        .reverse()
        .find((entry) => !entry.data.consumed);
      if (!idx) break;
      const removeIndex = idx.index;
      bottleData.splice(removeIndex, 1);
      const bottleEl = sojuGrid.querySelector(`.soju[data-index="${removeIndex}"]`);
      if (bottleEl) {
        sojuGrid.removeChild(bottleEl);
      }
      reindexBottles();
    }
  }

  currentGoal = newGoal;
  reindexBottles();
  updateGoalStatus();
}

function hideControls() {
  controlsPanel.classList.add("hidden");
}

function showControls() {
  controlsPanel.classList.remove("hidden");
  goalInput.focus();
}

registerButton.addEventListener("click", () => {
  const value = parseInt(goalInput.value, 10);
  if (Number.isNaN(value) || value < 0) {
    goalStatus.textContent = "0 이상 정수만 입력해 주세요.";
    goalInput.focus();
    return;
  }

  if (!goalConfigured) {
    currentGoal = value;
    resetBottles(value);
    goalConfigured = true;
    changeGoalButton.classList.add("visible");
    hideControls();
  } else {
    adjustBottles(value);
    hideControls();
  }
});

changeGoalButton.addEventListener("click", () => {
  goalInput.value = String(currentGoal);
  showControls();
});

sojuGrid.addEventListener("click", (event) => {
  const bottle = event.target.closest(".soju");
  if (!bottle) return;
  const index = Number(bottle.dataset.index);
  if (Number.isNaN(index)) return;
  openModal(index);
});

logForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (selectedBottleIndex === null) return;
  const date = logDateInput.value;
  const memo = logMemoInput.value.trim();
  const priceValue = Number.parseInt(logPriceInput.value, 10);
  const price = Number.isNaN(priceValue) ? 0 : priceValue;
  await applyBottleState(selectedBottleIndex, { date, memo, price });
  closeModal();
});

cancelLogButton.addEventListener("click", () => {
  closeModal();
});

logModal.addEventListener("click", (event) => {
  if (event.target === logModal) {
    closeModal();
  }
});

updateSummaryFromApi();
