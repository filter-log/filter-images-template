const config = window.UPLOAD_CONFIG || {};
const maxFiles = Number(config.maxFiles || 100);
const repoName = config.repoName || inferRepoName();
const galleryBaseUrl = normalizeBaseUrl(config.galleryBaseUrl || inferGalleryBaseUrl());
const workerApiBaseUrl = normalizeWorkerBaseUrl(config.workerApiUrl || "");
const authEndpoint = workerApiBaseUrl ? `${workerApiBaseUrl}/auth` : "";
const uploadEndpoint = workerApiBaseUrl ? `${workerApiBaseUrl}/upload` : "";

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
workerEndpointValue.textContent = workerApiBaseUrl || "Not configured";
maxFilesPill.textContent = `최대 ${maxFiles}장`;

if (workerApiBaseUrl) {
  workerState.textContent = "연결됨";
  workerStateCopy.textContent = `${authEndpoint} 인증 후 ${uploadEndpoint} 업로드를 사용합니다.`;
} else {
  workerState.textContent = "미연결";
  workerStateCopy.textContent = "현재는 Worker API가 비어 있어 payload만 미리보기로 확인합니다.";
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

  if (!workerApiBaseUrl) {
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
    resultSummary.textContent = "Worker base URL을 설정하면 같은 파일 정보가 실제로 전송됩니다.";
    setStatus("Worker API가 없어 payload 준비만 완료했습니다.", false, true);
    return;
  }

  state.submitting = true;
  uploadButton.disabled = true;
  setStatus("비밀번호를 확인하고 Cloudflare Worker로 업로드 요청을 전송하는 중입니다.");

  try {
    const authToken = await authenticateWithWorker();
    const responsePayload = await submitPayload(payload, authToken);
    renderWorkerResponse(responsePayload);
    const hasFailures = Number(responsePayload.failedCount || 0) > 0;
    setStatus(
      hasFailures ? "일부 파일 업로드에 실패했습니다." : "모든 파일 업로드가 완료되었습니다.",
      hasFailures,
      !hasFailures,
    );
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
  payloadSummary.textContent = workerApiBaseUrl
    ? "비밀번호 인증 후 같은 파일 정보가 /upload 엔드포인트로 전송됩니다."
    : "현재는 Worker가 없어서 payload 구조만 준비합니다.";
}

function buildPayloadSummary() {
  return {
    repoName,
    galleryBaseUrl,
    workerApiBaseUrl: workerApiBaseUrl || null,
    authEndpoint: authEndpoint || null,
    uploadEndpoint: uploadEndpoint || null,
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

async function authenticateWithWorker() {
  const response = await fetch(authEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password: passwordInput.value.trim(),
    }),
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok || !responsePayload.ok || typeof responsePayload.authToken !== "string") {
    throw new Error(responsePayload.error || responsePayload.message || `Auth failed with ${response.status}`);
  }

  return responsePayload.authToken;
}

async function submitPayload(payload, authToken) {
  const formData = new FormData();
  formData.set("repoName", payload.repoName);
  formData.set("date", payload.date);

  state.files.forEach((file) => {
    formData.append("files[]", file, sanitizeFilename(file.name));
  });

  const response = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(responsePayload.error || responsePayload.message || `Upload failed with ${response.status}`);
  }

  return responsePayload;
}

function renderWorkerResponse(payload) {
  const cards = [];

  if (Array.isArray(payload.uploaded) || Array.isArray(payload.failed)) {
    (payload.uploaded || []).forEach((file) => {
      cards.push({
        type: "success",
        title: file.savedFileName || file.originalName || "uploaded",
        message: file.savedPath || file.htmlUrl || "업로드에 성공했습니다.",
      });
    });

    (payload.failed || []).forEach((file) => {
      cards.push({
        type: "error",
        title: file.originalName || "upload failed",
        message: file.error || "업로드에 실패했습니다.",
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
  if (Array.isArray(payload.uploaded) || Array.isArray(payload.failed)) {
    resultSummary.textContent = `성공 ${payload.uploadedCount || 0}건, 실패 ${payload.failedCount || 0}건`;
  } else {
    resultSummary.textContent = `${cards.length}개의 응답 항목을 표시합니다.`;
  }
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

function normalizeWorkerBaseUrl(value) {
  return normalizeBaseUrl(value).replace(/\/(?:auth|upload)$/, "");
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
