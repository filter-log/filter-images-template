const DATA_URL = "data/images.json";

const state = {
  items: [],
  activeMonth: "all",
};

const monthFilters = document.getElementById("month-filters");
const galleryGrid = document.getElementById("gallery-grid");
const galleryStatus = document.getElementById("gallery-status");
const imageCount = document.getElementById("image-count");
const activeMonth = document.getElementById("active-month");
const cardTemplate = document.getElementById("gallery-card-template");
const imageDialog = document.getElementById("image-dialog");
const dialogImage = document.getElementById("dialog-image");
const dialogTitle = document.getElementById("dialog-title");
const dialogLink = document.getElementById("dialog-link");

boot().catch((error) => {
  console.error(error);
  setStatus("이미지 데이터를 불러오지 못했습니다.", true);
});

async function boot() {
  const response = await fetch(DATA_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${DATA_URL}: ${response.status}`);
  }

  const payload = await response.json();
  state.items = Array.isArray(payload.items) ? payload.items : [];
  state.activeMonth = readMonthFromLocation();

  render();
}

function render() {
  const months = collectMonths(state.items);

  if (!months.includes(state.activeMonth) && state.activeMonth !== "all") {
    state.activeMonth = "all";
  }

  renderMonthFilters(months);
  renderGallery();
}

function collectMonths(items) {
  return [...new Set(items.map((item) => `${item.year}-${String(item.month).padStart(2, "0")}`))].sort((a, b) =>
    a < b ? 1 : -1,
  );
}

function renderMonthFilters(months) {
  monthFilters.replaceChildren(makeMonthChip("전체", "all", state.activeMonth === "all"));

  months.forEach((month) => {
    monthFilters.append(makeMonthChip(month, month, state.activeMonth === month));
  });
}

function makeMonthChip(label, value, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `month-chip${active ? " is-active" : ""}`;
  button.textContent = label;
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", active ? "true" : "false");
  button.addEventListener("click", () => {
    state.activeMonth = value;
    writeMonthToLocation(value);
    renderGallery();
    updateChipStates();
  });
  return button;
}

function updateChipStates() {
  monthFilters.querySelectorAll(".month-chip").forEach((chip) => {
    const selected = chip.textContent === "전체" ? state.activeMonth === "all" : chip.textContent === state.activeMonth;
    chip.classList.toggle("is-active", selected);
    chip.setAttribute("aria-selected", selected ? "true" : "false");
  });
}

function renderGallery() {
  const visibleItems = state.items
    .filter((item) => state.activeMonth === "all" || `${item.year}-${String(item.month).padStart(2, "0")}` === state.activeMonth)
    .sort((left, right) => {
      const leftKey = `${left.year}${String(left.month).padStart(2, "0")}${String(left.day || "00").padStart(2, "0")}${left.filename}`;
      const rightKey = `${right.year}${String(right.month).padStart(2, "0")}${String(right.day || "00").padStart(2, "0")}${right.filename}`;
      return leftKey < rightKey ? 1 : -1;
    });

  galleryGrid.replaceChildren();
  activeMonth.textContent = state.activeMonth === "all" ? "전체" : state.activeMonth;
  imageCount.textContent = String(visibleItems.length);

  if (!visibleItems.length) {
    setStatus("표시할 이미지가 없습니다.");
    return;
  }

  setStatus(`${visibleItems.length}개의 이미지를 표시하고 있습니다.`);

  visibleItems.forEach((item) => {
    const fragment = cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".gallery-card");
    const thumb = fragment.querySelector(".gallery-thumb");
    const imageButton = fragment.querySelector(".card-image-button");
    const dateNode = fragment.querySelector(".card-date");
    const folderNode = fragment.querySelector(".card-folder");
    const titleNode = fragment.querySelector(".card-title");
    const filenameNode = fragment.querySelector(".card-filename");
    const linkNode = fragment.querySelector(".card-link");
    const copyUrlButton = fragment.querySelector(".action-copy-url");
    const copyMarkdownButton = fragment.querySelector(".action-copy-markdown");

    const month = `${item.year}-${String(item.month).padStart(2, "0")}`;
    thumb.src = item.thumb;
    thumb.alt = item.title;
    dateNode.textContent = month;
    folderNode.textContent = item.folder || "루트";
    titleNode.textContent = item.title;
    filenameNode.textContent = item.filename;
    linkNode.href = item.src;

    imageButton.addEventListener("click", () => openDialog(item));
    copyUrlButton.addEventListener("click", () => copyText(item.src, copyUrlButton));
    copyMarkdownButton.addEventListener("click", () => copyText(`![${item.title}](${item.src})`, copyMarkdownButton));

    card.dataset.month = month;
    galleryGrid.append(card);
  });
}

function openDialog(item) {
  dialogImage.src = item.src;
  dialogImage.alt = item.title;
  dialogTitle.textContent = item.title;
  dialogLink.href = item.src;
  dialogLink.textContent = `${item.filename} 열기`;
  imageDialog.showModal();
}

function setStatus(message, isError = false) {
  galleryStatus.textContent = message;
  galleryStatus.classList.toggle("is-error", isError);
}

function readMonthFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return params.get("month") || "all";
}

function writeMonthToLocation(month) {
  const url = new URL(window.location.href);
  if (month === "all") {
    url.searchParams.delete("month");
  } else {
    url.searchParams.set("month", month);
  }
  window.history.replaceState({}, "", url);
}

async function copyText(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    flashButton(button, "복사됨", "is-success");
  } catch (error) {
    console.error(error);
    flashButton(button, "실패", "is-error");
  }
}

function flashButton(button, label, stateClass) {
  const previous = button.textContent;
  button.textContent = label;
  button.classList.add(stateClass);
  window.setTimeout(() => {
    button.textContent = previous;
    button.classList.remove(stateClass);
  }, 1400);
}
