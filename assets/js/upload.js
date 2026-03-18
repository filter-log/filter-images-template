const config = window.UPLOAD_CONFIG || {};
const maxFiles = Number(config.maxFiles || 100);
const repoName = config.repoName || inferRepoName();
const galleryBaseUrl = normalizeBaseUrl(config.galleryBaseUrl || inferGalleryBaseUrl());
const workerApiUrl = String(config.workerApiUrl || "").trim();

const state = {
  files: [],
  submitting: false,
};

const form = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const pickFilesButton = document.getElementById("pick-files-button");
const uploadButton = document.getElementById("upload-button");
const dropZone = document.getElementById("drop-zone");
const dateInput = document.getElementById("date-input");
const passwordInput = document.getElementById("password-input");
const pathPreview = document.getElementById("path-preview");
const selectionSummary = document.getElementById("selection-summary");
const selectedFiles = document.getElementById("selected-files");
const payloadPreview = document.getElementById("payload-preview");
const payloadSummary = document.getElementById("payload-summary");
const resultSummary = document.getElementById("result-summary");
const resultList = document.getElementById("result-list");
const statusBanner = document.getElementById("status-banner");
const uploadTitle = document.getElementById("upload-title");
const workerState = document.getElementById("worker-state");
const workerStateCopy = document.getElementById("worker-state-copy");
const repoNameValue = document.getElementById("repo-name-value");
const workerEndpointValue = document.getElementById("worker-endpoint-value");
const incomingPrefixValue = document.getElementById("incoming-prefix-value");
const maxFilesPill = document.getElementById("max-files-pill");

dateInput.value = formatDate(new Date());
uploadTitle.textContent = `${repoName} 업로드 준비 페이지`;
repoNameValue.textContent = repoName;
workerEndpointValue.textContent = workerApiUrl || "Not configured";
maxFilesPill.textContent = `최대 ${maxFiles}장`;

if (workerApiUrl) {
  workerState.textContent = "연결 준비됨";
  workerStateCopy.textContent = `${workerApiUrl} 로 POST 요청을 보낼 준비가 되어 있습니다.`;
} else {
  workerState.textContent = "미연결";
  workerStateCopy.textContent = "현재는 Worker API가 비어 있어 payload만 준비합니다.";
}

syncComputedState();

pickFilesButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => {
  mergeFiles(event.target.files);
  fileInput.value = "";
});

dateInput.addEventListener("input", () => {
  syncComputedState();
});

passwordInput.addEventListener("input", () => {
  renderPayloadPreview();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (state.submitting) {
    return;
  }

  const validationError = validateForm();

  if (validationError) {
    setStatus(validationError, true);
    return;
  }

  const payload = buildPayloadSummary();
  renderPayloadPreview(payload);

  if (!workerApiUrl) {
    renderResultCards([
      {
        type: "success",
        title: "Worker 미연결",
        message: "요청은 아직 전송하지 않았습니다. payload 구조만 준비된 상태입니다.",
      },
      {
        type: "success",
        title: "준비된 경로",
        message: payload.files.map((file) => file.targetPath).join("\n"),
      },
    ]);
    resultSummary.textContent = "Worker를 연결하면 동일한 payload가 실제 전송됩니다.";
    setStatus("Worker API가 없어 payload 준비만 완료했습니다.", false, true);
    return;
  }

  state.submitting = true;
  uploadButton.disabled = true;
  setStatus("Cloudflare Worker로 업로드 요청을 전송하는 중입니다.");

  try {
    const responsePayload = await submitPayload(payload);
    renderWorkerResponse(responsePayload);
    setStatus("Worker 응답을 받았습니다.", false, true);
  } catch (error) {
    console.error(error);
    renderResultCards([
      {
        type: "error",
        title: "전송 실패",
        message: error.message || "Worker 요청 중 오류가 발생했습니다.",
      },
    ]);
    resultSummary.textContent = "Worker 요청이 실패했습니다.";
    setStatus(error.message || "Worker 요청에 실패했습니다.", true);
  } finally {
    state.submitting = false;
    uploadButton.disabled = false;
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-active");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();

    if (eventName === "drop" && event.dataTransfer?.files?.length) {
      mergeFiles(event.dataTransfer.files);
    }

    dropZone.classList.remove("is-active");
  });
});

function mergeFiles(fileList) {
  const nextFiles = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
  const existingKeys = new Set(state.files.map(fileKey));
  let skippedCount = 0;

  nextFiles.forEach((file) => {
    const key = fileKey(file);

    if (existingKeys.has(key)) {
      return;
    }

    if (state.files.length >= maxFiles) {
      skippedCount += 1;
      return;
    }

    state.files.push(file);
    existingKeys.add(key);
  });

  renderSelectedFiles();
  syncComputedState();

  if (skippedCount > 0) {
    setStatus(`최대 ${maxFiles}장까지만 선택할 수 있어 일부 파일은 제외했습니다.`, true);
    return;
  }

  if (state.files.length) {
    setStatus(`${state.files.length}/${maxFiles}개의 이미지가 준비되었습니다.`);
  }
}

function renderSelectedFiles() {
  selectedFiles.replaceChildren();

  if (!state.files.length) {
    selectionSummary.textContent = `아직 선택된 이미지가 없습니다. 최대 ${maxFiles}장까지 가능합니다.`;
    return;
  }

  selectionSummary.textContent = `${state.files.length}/${maxFiles} 이미지가 업로드 대기 중입니다.`;

  state.files.forEach((file) => {
    const card = document.createElement("article");
    card.className = "selected-card";

    const image = document.createElement("img");
    image.alt = file.name;
    image.src = URL.createObjectURL(file);
    image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });

    const body = document.createElement("div");
    body.className = "selected-card-body";

    const name = document.createElement("p");
    name.className = "selected-card-name";
    name.textContent = file.name;

    const meta = document.createElement("p");
    meta.className = "selected-card-meta";
    meta.textContent = formatFileSize(file.size);

    const pathNode = document.createElement("p");
    pathNode.className = "selected-card-path";
    pathNode.textContent = buildTargetPath(file.name);

    body.append(name, meta, pathNode);
    card.append(image, body);
    selectedFiles.append(card);
  });
}

function syncComputedState() {
  const date = readDate();
  const sampleFile = state.files[0]?.name || "filename.ext";
  const previewPath = buildTargetPath(sampleFile);

  pathPreview.textContent = previewPath;
  incomingPrefixValue.textContent = `incoming/${date}/`;
  renderPayloadPreview();
}

function renderPayloadPreview(payload = buildPayloadSummary()) {
  payloadPreview.textContent = JSON.stringify(payload, null, 2);
  payloadSummary.textContent = workerApiUrl
    ? "Worker가 연결되면 이 payload가 그대로 전송됩니다."
    : "현재는 Worker가 없어서 payload 구조만 준비합니다.";
}

function buildPayloadSummary() {
  return {
    repoName,
    galleryBaseUrl,
    workerApiUrl: workerApiUrl || null,
    date: readDate(),
    passwordProvided: Boolean(passwordInput.value.trim()),
    maxFiles,
    fileCount: state.files.length,
    files: state.files.map((file) => ({
      originalName: file.name,
      sanitizedName: sanitizeFilename(file.name),
      sizeBytes: file.size,
      mimeType: file.type,
      targetPath: buildTargetPath(file.name),
    })),
  };
}

async function submitPayload(payload) {
  const formData = new FormData();
  formData.set("repoName", payload.repoName);
  formData.set("date", payload.date);
  formData.set("password", passwordInput.value.trim());

  state.files.forEach((file) => {
    formData.append("files", file, sanitizeFilename(file.name));
  });

  const response = await fetch(workerApiUrl, {
    method: "POST",
    body: formData,
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(responsePayload.message || `Worker returned ${response.status}`);
  }

  return responsePayload;
}

function renderWorkerResponse(payload) {
  const cards = [];

  if (Array.isArray(payload.files) && payload.files.length) {
    payload.files.forEach((file) => {
      cards.push({
        type: "success",
        title: file.filename || "uploaded",
        message: file.path || file.url || "Worker가 파일 정보를 반환했습니다.",
      });
    });
  } else {
    cards.push({
      type: "success",
      title: "Worker 응답",
      message: JSON.stringify(payload, null, 2),
    });
  }

  renderResultCards(cards);
  resultSummary.textContent = `${cards.length}개의 응답 항목을 표시합니다.`;
}

function renderResultCards(items) {
  resultList.replaceChildren();

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = `result-card${item.type === "error" ? " is-error" : " is-success"}`;

    const body = document.createElement("div");
    body.className = "result-card-body";

    const title = document.createElement("p");
    title.className = "result-card-title";
    title.textContent = item.title;

    const message = document.createElement("p");
    message.className = "result-card-meta";
    message.textContent = item.message;

    body.append(title, message);
    card.append(body);
    resultList.append(card);
  });
}

function validateForm() {
  if (!state.files.length) {
    return "업로드할 이미지를 먼저 선택하세요.";
  }

  if (state.files.length > maxFiles) {
    return `한 번에 최대 ${maxFiles}장까지 업로드할 수 있습니다.`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(readDate())) {
    return "날짜는 YYYY-MM-DD 형식이어야 합니다.";
  }

  if (!passwordInput.value.trim()) {
    return "업로드 암호를 입력하세요.";
  }

  return "";
}

function buildTargetPath(filename) {
  return `incoming/${readDate()}/${sanitizeFilename(filename)}`;
}

function sanitizeFilename(filename) {
  const extension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")).toLowerCase() : "";
  const stem = filename.includes(".") ? filename.slice(0, filename.lastIndexOf(".")) : filename;
  const safeStem = stem
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${safeStem || "image"}${extension}`;
}

function readDate() {
  return dateInput.value || formatDate(new Date());
}

function setStatus(message, isError = false, isSuccess = false) {
  statusBanner.textContent = message;
  statusBanner.classList.toggle("is-error", isError);
  statusBanner.classList.toggle("is-success", !isError && isSuccess);
}

function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function inferGalleryBaseUrl() {
  const { origin, pathname } = window.location;
  const cleanPath = pathname.replace(/\/upload\/?$/, "").replace(/index\.html$/, "");
  return `${origin}${cleanPath}`.replace(/\/+$/, "");
}

function inferRepoName() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  return pathParts[0] || "filter-images-template";
}
