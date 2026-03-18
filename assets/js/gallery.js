const DATA_URL = "data/images.json";
const config = window.UPLOAD_CONFIG || {};

const state = {
  items: [],
  activeDate: "all",
};

const galleryTitle = document.getElementById("gallery-title");
const repoBadge = document.getElementById("repo-badge");
const galleryBaseLink = document.getElementById("gallery-base-link");
const dateFilters = document.getElementById("date-filters");
const visibleCount = document.getElementById("visible-count");
const activeDateLabel = document.getElementById("active-date-label");
const galleryStatus = document.getElementById("gallery-status");
const gallerySections = document.getElementById("gallery-sections");
const cardTemplate = document.getElementById("gallery-card-template");
const imageDialog = document.getElementById("image-dialog");
const dialogImage = document.getElementById("dialog-image");
const dialogTitle = document.getElementById("dialog-title");
const dialogLink = document.getElementById("dialog-link");

const repoName = config.repoName || inferRepoName();
const galleryBaseUrl = normalizeBaseUrl(config.galleryBaseUrl || inferGalleryBaseUrl());

galleryTitle.textContent = `${repoName} 사진 아카이브`;
repoBadge.textContent = repoName;
galleryBaseLink.href = galleryBaseUrl;
galleryBaseLink.textContent = galleryBaseUrl;

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
  const rawItems = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : [];
  state.items = rawItems
    .map(normalizeItem)
    .filter((item) => item && item.date)
    .sort((left, right) => {
      if (left.date !== right.date) {
        return left.date < right.date ? 1 : -1;
      }
      return left.filename.localeCompare(right.filename);
    });
  state.activeDate = readDateFromLocation();

  render();
}

function normalizeItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    src: resolveAssetUrl(item.src),
    thumb: resolveAssetUrl(item.thumb),
    date: String(item.date || ""),
    title: String(item.title || item.filename || "Untitled"),
    filename: String(item.filename || ""),
  };
}

function render() {
  const dates = collectDates(state.items);

  if (!dates.includes(state.activeDate) && state.activeDate !== "all") {
    state.activeDate = "all";
  }

  renderFilters(dates);
  renderSections();
}

function collectDates(items) {
  return [...new Set(items.map((item) => item.date))].sort((a, b) => (a < b ? 1 : -1));
}

function renderFilters(dates) {
  dateFilters.replaceChildren(makeFilterChip("전체", "all", state.activeDate === "all"));

  dates.forEach((date) => {
    dateFilters.append(makeFilterChip(date, date, state.activeDate === date));
  });
}

function makeFilterChip(label, value, isActive) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `filter-chip${isActive ? " is-active" : ""}`;
  button.textContent = label;
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", isActive ? "true" : "false");
  button.addEventListener("click", () => {
    state.activeDate = value;
    writeDateToLocation(value);
    renderSections();
    updateFilterStates();
  });
  return button;
}

function updateFilterStates() {
  dateFilters.querySelectorAll(".filter-chip").forEach((chip) => {
    const matches = chip.textContent === "전체" ? state.activeDate === "all" : chip.textContent === state.activeDate;
    chip.classList.toggle("is-active", matches);
    chip.setAttribute("aria-selected", matches ? "true" : "false");
  });
}

function renderSections() {
  gallerySections.replaceChildren();

  const visibleItems = state.items.filter((item) => state.activeDate === "all" || item.date === state.activeDate);
  visibleCount.textContent = String(visibleItems.length);
  activeDateLabel.textContent = state.activeDate === "all" ? "전체" : state.activeDate;

  if (!visibleItems.length) {
    setStatus("표시할 이미지가 없습니다.");
    return;
  }

  const groups = groupByDate(visibleItems);
  const dates = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));

  dates.forEach((date) => {
    const section = document.createElement("section");
    section.className = "date-group";

    const header = document.createElement("div");
    header.className = "date-group-head";

    const label = document.createElement("p");
    label.className = "date-group-label";
    label.textContent = date;

    const count = document.createElement("p");
    count.className = "date-group-count";
    count.textContent = `${groups[date].length} image${groups[date].length === 1 ? "" : "s"}`;

    const grid = document.createElement("div");
    grid.className = "gallery-grid";

    groups[date].forEach((item) => {
      grid.append(renderCard(item));
    });

    header.append(label, count);
    section.append(header, grid);
    gallerySections.append(section);
  });

  setStatus(`${visibleItems.length}개의 이미지를 표시하고 있습니다.`);
}

function renderCard(item) {
  const fragment = cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".gallery-card");
  const thumb = fragment.querySelector(".gallery-thumb");
  const imageButton = fragment.querySelector(".card-image-button");
  const dateNode = fragment.querySelector(".card-date");
  const titleNode = fragment.querySelector(".card-title");
  const filenameNode = fragment.querySelector(".card-filename");
  const linkNode = fragment.querySelector(".card-link");
  const copyUrlButton = fragment.querySelector(".action-copy-url");
  const copyMarkdownButton = fragment.querySelector(".action-copy-markdown");

  thumb.src = item.thumb;
  thumb.alt = item.title;
  dateNode.textContent = item.date;
  titleNode.textContent = item.title;
  filenameNode.textContent = item.filename;
  linkNode.href = item.src;

  imageButton.addEventListener("click", () => openDialog(item));
  copyUrlButton.addEventListener("click", () => copyText(item.src, copyUrlButton));
  copyMarkdownButton.addEventListener("click", () => copyText(`![${item.title}](${item.src})`, copyMarkdownButton));

  card.dataset.date = item.date;
  return card;
}

function groupByDate(items) {
  return items.reduce((accumulator, item) => {
    accumulator[item.date] ||= [];
    accumulator[item.date].push(item);
    return accumulator;
  }, {});
}

function openDialog(item) {
  dialogImage.src = item.src;
  dialogImage.alt = item.title;
  dialogTitle.textContent = `${item.date} · ${item.title}`;
  dialogLink.href = item.src;
  dialogLink.textContent = item.filename;
  imageDialog.showModal();
}

function setStatus(message, isError = false) {
  galleryStatus.textContent = message;
  galleryStatus.classList.toggle("is-error", isError);
}

function readDateFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return params.get("date") || "all";
}

function writeDateToLocation(date) {
  const url = new URL(window.location.href);

  if (date === "all") {
    url.searchParams.delete("date");
  } else {
    url.searchParams.set("date", date);
  }

  window.history.replaceState({}, "", url);
}

function resolveAssetUrl(pathValue) {
  const value = String(pathValue || "").trim();

  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return new URL(value.replace(/^\/+/, ""), `${galleryBaseUrl}/`).toString();
}

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function inferGalleryBaseUrl() {
  const { origin, pathname } = window.location;
  const cleanPath = pathname.replace(/index\.html$/, "").replace(/\/upload\/?$/, "/");
  return `${origin}${cleanPath}`.replace(/\/+$/, "");
}

function inferRepoName() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  return pathParts[0] || "filter-images-template";
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
