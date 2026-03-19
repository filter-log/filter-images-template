# filter-archive-template

`filter-archive-template`는 GitHub Pages로 공개 갤러리를 배포하고, GitHub Actions로 이미지를 후처리하는 이미지 저장소 템플릿입니다.

이 저장소를 template repository로 지정한 뒤 `filter-archive-1`, `filter-archive-2`, `filter-archive-demo` 같은 실제 배포용 저장소를 반복 생성하는 것이 목적입니다.

현재 템플릿은 `정적 갤러리 + Worker 연동 업로드 UI + 후처리 파이프라인`을 함께 제공합니다.

## 기본 동작

- `/` 정적 공개 갤러리
- `/upload/` 업로드 페이지
- `incoming/YYYY-MM-DD/` 유입 경로
- `images/YYYY-MM-DD/` 공개 이미지 경로
- `thumbs/YYYY-MM-DD/` 썸네일 경로
- `data/images.json` 기반 날짜별 탐색 UI
- `incoming/`을 처리하는 GitHub Actions 워크플로

## 자동 repo 인식

템플릿 기본 설정은 아래처럼 템플릿 이름을 갖고 있지만, 실제 배포된 `filter-archive-*` 저장소에서는 URL 기준 자동 감지가 우선 적용됩니다.

```js
window.UPLOAD_CONFIG = {
  repoName: "filter-archive-template",
  galleryBaseUrl: "https://filter-log.github.io/filter-archive-template",
  workerApiUrl: "",
  maxFiles: 100,
};
```

즉:

- `https://filter-log.github.io/filter-archive-template/`에서는 `filter-archive-template`로 동작
- `https://filter-log.github.io/filter-archive-7/`에서는 자동으로 `filter-archive-7`로 동작
- 업로드 요청도 `repoName=filter-archive-7`처럼 자기 저장소 이름으로 전송

표준 GitHub Pages 경로라면 새 저장소에서 보통 `workerApiUrl`만 채우면 됩니다.

## 날짜 구조

이 템플릿은 날짜를 반드시 하나의 폴더명으로 사용합니다.

- 유입 경로: `incoming/2026-03-19/filename.ext`
- 공개 경로: `images/2026-03-19/filename.webp`
- 썸네일 경로: `thumbs/2026-03-19/filename.webp`

중요:

- `YYYY/MM/DD` 분리 구조를 쓰지 않음
- 업로드 페이지 입력값도 `YYYY-MM-DD`
- `images.json`도 `date` 문자열 하나로 그룹핑

## 저장소 구조

```text
.
├── .github/workflows/process-images.yml
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── config.js
│       ├── gallery.js
│       └── upload.js
├── data/images.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── OPERATIONS.md
├── images/.gitkeep
├── incoming/.gitkeep
├── scripts/
│   ├── generate-images-json.mjs
│   └── process-images.mjs
├── thumbs/.gitkeep
├── upload/index.html
└── index.html
```

## 템플릿 사용 방법

### 1. 템플릿 저장소로 지정

1. GitHub에서 `filter-archive-template` 저장소의 `Settings -> General`로 이동합니다.
2. `Template repository`를 체크합니다.

### 2. 새 이미지 레포 생성

1. 저장소 상단의 `Use this template`를 클릭합니다.
2. 예: `filter-archive-2` 같은 이름으로 새 저장소를 만듭니다.
3. 기본 브랜치는 `main`으로 유지합니다.

### 3. GitHub Pages 활성화

1. 새 저장소의 `Settings -> Pages`로 이동합니다.
2. `Deploy from a branch`를 선택합니다.
3. Branch는 `main`, folder는 `/ (root)`를 선택합니다.

### 4. 가장 먼저 바꿀 값

표준 GitHub Pages 배포라면 [assets/js/config.js](assets/js/config.js)에서 보통 `workerApiUrl`만 먼저 채우면 됩니다.

```js
window.UPLOAD_CONFIG = {
  repoName: "filter-archive-template",
  galleryBaseUrl: "https://filter-log.github.io/filter-archive-template",
  workerApiUrl: "https://archive-worker.your-subdomain.workers.dev",
  maxFiles: 100,
};
```

다만 아래 경우에는 `repoName`과 `galleryBaseUrl`도 직접 덮어쓸 수 있습니다.

- GitHub Pages 표준 경로를 쓰지 않는 경우
- 로컬 preview 환경에서 강제로 특정 레포명을 써야 하는 경우
- 커스텀 도메인 구조가 일반적인 `/<repo>/` 패턴이 아닌 경우

## 비전공자 사용 흐름

1. 업로드 페이지 `/upload/`를 엽니다.
2. 날짜를 선택합니다.
3. 이미지를 드래그앤드롭하거나 여러 장 선택합니다.
4. 암호를 입력합니다.
5. 화면에서 `incoming/YYYY-MM-DD/...` 경로 미리보기를 확인합니다.
6. 업로드 버튼을 누릅니다.
7. 페이지가 Worker의 `/auth`로 암호를 검증합니다.
8. 같은 화면에서 Worker의 `/upload`로 파일을 전송합니다.
9. 업로드된 파일은 현재 레포의 `incoming/YYYY-MM-DD/...` 경로에 저장됩니다.
10. 해당 레포의 GitHub Actions가 `images/`, `thumbs/`, `data/images.json`을 갱신합니다.

## Worker 연결 규칙

- `workerApiUrl`에는 Worker base URL만 넣습니다.
- 프론트엔드는 `${workerApiUrl}/auth`와 `${workerApiUrl}/upload`를 사용합니다.
- 업로드 요청에는 현재 저장소 이름이 `repoName`으로 들어갑니다.
- `archive_worker`는 기본적으로 `filter-archive`로 시작하는 `repoName`을 모두 허용합니다.

## 참고 문서

- 아키텍처: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 운영 가이드: [docs/OPERATIONS.md](docs/OPERATIONS.md)
