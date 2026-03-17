# filter-images-template

GitHub Pages + GitHub Actions + GitHub REST API 기반의 레포 독립형 이미지 저장소 템플릿이다. 이 저장소를 template repository로 지정해 `filter-images-1`, `filter-images-2`, `filter-images-3`를 만들면, 각 저장소는 자기 갤러리와 자기 업로드 페이지를 함께 가진다.

## 이번 구조의 핵심

- 중앙 업로드 레포 개념 제거
- 각 이미지 레포가 자기 Pages 사이트 안에 `/upload/` 보유
- 각 업로드 페이지는 자기 전용 업로드 API와만 연결
- 업로드 결과는 자기 레포의 `incoming/`에만 저장
- 업로드 후 자기 레포의 Actions가 WebP/썸네일/`images.json` 갱신
- 한 번에 최대 100장 업로드 지원

## 템플릿에서 만들어지는 기능

- `/` 공개 갤러리
- `/upload/` 업로드 페이지
- 날짜별 필터, 카드형 썸네일, URL 복사, Markdown 복사
- `incoming/` 기준 자동 후처리
- 1600px 리사이즈, WebP 변환, 400px 썸네일 생성
- `data/images.json` 자동 갱신
- 레포 전용 업로드 API 스캐폴드

## 저장소 구조

```text
.
├── .github/workflows/process-images.yml
├── assets/
│   ├── css/style.css
│   └── js/gallery.js
├── data/images.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── OPERATIONS.md
├── images/
├── incoming/
├── platform/
│   ├── upload-api/
│   └── upload-portal/
├── scripts/
│   ├── generate-images-json.mjs
│   └── process-images.mjs
├── thumbs/
├── upload/
│   ├── config.js
│   └── index.html
└── index.html
```

## 각 레포가 동작하는 방식

1. 사용자는 해당 레포의 `https://filter-log.github.io/<repo>/upload/`에 접속한다.
2. 업로드 페이지는 이 레포 전용 서버리스 API의 `auth`와 `upload` 엔드포인트를 사용한다.
3. API는 서버측 `UPLOAD_PASSWORD`를 검증하고 HttpOnly 세션 쿠키를 발급한다.
4. API는 `TARGET_REPO`로 자기 레포 이름만 알고 있으며, 그 레포에만 GitHub REST API로 기록한다.
5. 업로드 파일은 `incoming/YYYY/MM/optional-folder/filename.ext`로 들어간다.
6. GitHub Actions가 이를 `images/`와 `thumbs/`의 WebP로 변환하고 `data/images.json`을 갱신한다.
7. GitHub Pages 갤러리에서 월별로 바로 볼 수 있다.

## 업로드 API 핵심 env / secrets

- `TARGET_REPO`
- `PUBLIC_REPOSITORY_NAME`
- `GITHUB_OWNER`
- `GITHUB_BRANCH`
- `PUBLIC_PAGES_BASE_PATTERN`
- `UPLOAD_PORTAL_ORIGIN`
- `UPLOAD_PASSWORD`
- `UPLOAD_SESSION_SECRET`
- `UPLOAD_SESSION_TTL_SECONDS`
- `MAX_FILES_PER_REQUEST`
- `MAX_FILE_SIZE_MB`
- `BLOB_UPLOAD_CONCURRENCY`
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_FINE_GRAINED_TOKEN`

## images.json 필드

- `src`
- `thumb`
- `year`
- `month`
- `folder`
- `title`
- `filename`

## template repository 사용 방법

### 1. `filter-images-template`를 template repository로 지정

1. GitHub에서 `Settings -> General`로 이동한다.
2. `Template repository`를 체크한다.

### 2. 새 이미지 레포 생성

1. 저장소 상단의 `Use this template`를 클릭한다.
2. 예: `filter-images-2` 이름으로 새 저장소를 만든다.
3. 생성 후 기본 브랜치는 `main`으로 유지한다.

### 3. GitHub Pages 켜기

1. 새 저장소의 `Settings -> Pages`로 이동한다.
2. `Deploy from a branch`를 선택한다.
3. Branch는 `main`, folder는 `/ (root)`를 선택한다.

### 4. 새 레포 전용 업로드 API 준비

1. `platform/upload-api`를 별도 배포 대상으로 복사한다.
2. `TARGET_REPO`를 새 레포 이름으로 설정한다.
3. `UPLOAD_PASSWORD`와 GitHub App 또는 fine-grained token을 등록한다.
4. `upload/config.js`의 `authEndpoint`, `uploadEndpoint`를 이 API URL로 수정한다.

### 5. 주소 확인

- 갤러리: `https://filter-log.github.io/<repo>/`
- 업로드 페이지: `https://filter-log.github.io/<repo>/upload/`

## 새 레포에서 꼭 해야 하는 수동 설정

1. GitHub Pages 활성화
2. GitHub Actions 사용 허용
3. GitHub App을 해당 레포에 설치하거나 fine-grained token 준비
4. 업로드 API env에 `TARGET_REPO`, `UPLOAD_PASSWORD` 등 등록
5. `upload/config.js`에 새 레포 전용 API 주소 입력

## 문서

- 아키텍처: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 운영 가이드: [docs/OPERATIONS.md](docs/OPERATIONS.md)
- 업로드 자산 안내: [platform/upload-portal/README.md](platform/upload-portal/README.md)
- 업로드 API 스캐폴드: [platform/upload-api/README.md](platform/upload-api/README.md)
