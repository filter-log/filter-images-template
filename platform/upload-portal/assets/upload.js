const config = window.UPLOAD_PORTAL_CONFIG || {};
const uploadEndpoint = config.uploadEndpoint || "";
const authEndpoint = config.authEndpoint || uploadEndpoint.replace(/\/upload$/, "/auth");

const state = {
  files: [],
  uploading: false,
  authenticated: false,
  authExpiresAt: null,
};

const form = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const pickFilesButton = document.getElementById("pick-files-button");
const uploadButton = document.getElementById("upload-button");
const dropZone = document.getElementById("drop-zone");
const passwordInput = document.getElementById("password-input");
const dateInput = document.getElementById("date-input");
const folderInput = document.getElementById("folder-input");
const previewGrid = document.getElementById("preview-grid");
const previewSummary = document.getElementById("preview-summary");
const resultList = document.getElementById("result-list");
const resultSummary = document.getElementById("result-summary");
const statusBanner = document.getElementById("status-banner");
const authStateDisplay = document.getElementById("auth-state-display");
const authStateHelp = document.getElementById("auth-state-help");

dateInput.value = new Date().toISOString().slice(0, 10);
renderAuthState();
renderPreviews();
bootstrapSession();

pickFilesButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => {
  mergeFiles(event.target.files);
  fileInput.value = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (state.uploading) {
    return;
  }

  if (!uploadEndpoint) {
    setStatus("`assets/config.js`에 uploadEndpoint를 먼저 설정해야 합니다.", true);
    return;
  }

  if (!authEndpoint) {
    setStatus("`assets/config.js`에 authEndpoint를 먼저 설정해야 합니다.", true);
    return;
  }

  if (!state.files.length) {
    setStatus("업로드할 이미지를 먼저 선택하세요.", true);
    return;
  }

  if (!state.authenticated && !passwordInput.value.trim()) {
    setStatus("업로드 암호를 입력하세요.", true);
    passwordInput.focus();
    return;
  }

  state.uploading = true;
  uploadButton.disabled = true;
  setStatus(state.authenticated ? "업로드 중입니다. 잠시만 기다리세요." : "암호를 확인하는 중입니다.");

  try {
    if (!state.authenticated) {
      await authenticate();
    }

    const formData = new FormData();
    formData.set("date", dateInput.value);
    formData.set("folder", folderInput.value.trim());
    state.files.forEach((file) => formData.append("files", file));

    const response = await fetch(uploadEndpoint, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        resetAuthentication();
      }
      throw new Error(payload.error || "업로드에 실패했습니다.");
    }

    if (payload.repository) {
      authStateHelp.textContent = `인증됨 · 현재 활성 저장소 ${payload.repository}`;
    }

    renderResults(payload.items || []);
    state.files = [];
    renderPreviews();
    setStatus(`업로드가 완료되었습니다. ${payload.items?.length || 0}개 파일이 등록되었습니다.`, false, true);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "업로드 중 오류가 발생했습니다.", true);
  } finally {
    state.uploading = false;
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

async function bootstrapSession() {
  if (!authEndpoint) {
    return;
  }

  try {
    const response = await fetch(authEndpoint, {
      method: "GET",
      credentials: "include",
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return;
    }

    state.authenticated = Boolean(payload.authenticated);
    state.authExpiresAt = payload.expiresAt || null;
    renderAuthState();

    if (payload.repository && state.authenticated) {
      authStateHelp.textContent = `인증 세션 유지 중 · 현재 활성 저장소 ${payload.repository}`;
    }
  } catch (error) {
    console.error(error);
  }
}

function mergeFiles(fileList) {
  const nextFiles = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
  const existingKeys = new Set(state.files.map(fileKey));

  nextFiles.forEach((file) => {
    const key = fileKey(file);
    if (!existingKeys.has(key)) {
      state.files.push(file);
      existingKeys.add(key);
    }
  });

  renderPreviews();
  setStatus(`${state.files.length}개의 이미지가 선택되었습니다.`);
}

function renderPreviews() {
  previewGrid.replaceChildren();

  if (!state.files.length) {
    previewSummary.textContent = "아직 선택된 이미지가 없습니다.";
    return;
  }

  previewSummary.textContent = `${state.files.length}개의 이미지가 업로드 대기 중입니다.`;

  state.files.forEach((file) => {
    const card = document.createElement("article");
    card.className = "preview-card";

    const image = document.createElement("img");
    image.alt = file.name;
    image.src = URL.createObjectURL(file);
    image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });

    const body = document.createElement("div");
    body.className = "preview-card-body";

    const name = document.createElement("p");
    name.className = "preview-card-name";
    name.textContent = file.name;

    const size = document.createElement("p");
    size.className = "preview-card-size";
    size.textContent = formatFileSize(file.size);

    body.append(name, size);
    card.append(image, body);
    previewGrid.append(card);
  });
}

function renderResults(items) {
  resultList.replaceChildren();

  if (!items.length) {
    resultSummary.textContent = "업로드 응답은 받았지만 표시할 결과가 없습니다.";
    return;
  }

  resultSummary.textContent = `${items.length}개의 이미지가 공개 경로 기준으로 준비되었습니다.`;

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const header = document.createElement("div");
    header.className = "result-card-header";
    header.textContent = "Processing queued";

    const body = document.createElement("div");
    body.className = "result-card-body";

    const name = document.createElement("p");
    name.className = "result-card-name";
    name.textContent = item.filename;

    const meta = document.createElement("p");
    meta.className = "result-card-meta";
    meta.textContent = `${item.repository} · ${item.relativePath}`;

    const actions = document.createElement("div");
    actions.className = "result-actions";

    const openLink = document.createElement("a");
    openLink.className = "quiet-button";
    openLink.href = item.publicUrl;
    openLink.target = "_blank";
    openLink.rel = "noreferrer";
    openLink.textContent = "원본 보기";

    const copyUrl = document.createElement("button");
    copyUrl.className = "quiet-button";
    copyUrl.type = "button";
    copyUrl.textContent = "URL 복사";
    copyUrl.addEventListener("click", () => copyText(item.publicUrl, copyUrl));

    const copyMarkdown = document.createElement("button");
    copyMarkdown.className = "quiet-button";
    copyMarkdown.type = "button";
    copyMarkdown.textContent = "Markdown 복사";
    copyMarkdown.addEventListener("click", () => copyText(item.markdown, copyMarkdown));

    actions.append(openLink, copyUrl, copyMarkdown);
    body.append(name, meta, actions);
    card.append(header, body);
    resultList.append(card);
  });
}

async function authenticate() {
  const response = await fetch(authEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      password: passwordInput.value,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "업로드 암호 확인에 실패했습니다.");
  }

  state.authenticated = true;
  state.authExpiresAt = payload.expiresAt || null;
  passwordInput.value = "";
  renderAuthState();

  if (payload.repository) {
    authStateHelp.textContent = `인증 완료 · 현재 활성 저장소 ${payload.repository}`;
  }
}

async function copyText(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    const previous = button.textContent;
    button.textContent = "복사됨";
    button.classList.add("is-success");
    setTimeout(() => {
      button.textContent = previous;
      button.classList.remove("is-success");
    }, 1200);
  } catch (error) {
    console.error(error);
    setStatus("클립보드 복사에 실패했습니다.", true);
  }
}

function renderAuthState() {
  const isAuthenticated =
    state.authenticated && (!state.authExpiresAt || new Date(state.authExpiresAt).getTime() > Date.now());

  authStateDisplay.textContent = isAuthenticated ? "인증됨" : "암호 필요";
  authStateDisplay.classList.toggle("is-authenticated", isAuthenticated);
  authStateDisplay.classList.toggle("is-locked", !isAuthenticated);
}

function resetAuthentication() {
  state.authenticated = false;
  state.authExpiresAt = null;
  renderAuthState();
  authStateHelp.textContent = "세션이 없거나 만료되었습니다. 업로드 암호를 다시 입력하세요.";
}

function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setStatus(message, isError = false, isSuccess = false) {
  statusBanner.textContent = message;
  statusBanner.classList.toggle("is-error", isError);
  statusBanner.classList.toggle("is-success", isSuccess && !isError);
}
