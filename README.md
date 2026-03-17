# filter-images-template

GitHub Pages + GitHub Actions + GitHub REST API 기반의 이미지 저장소 템플릿입니다. 이 저장소를 template repository로 지정하면 `filter-images-1`, `filter-images-2`, `filter-images-3` 같은 공개 이미지 저장소를 반복 생성할 수 있습니다.

## 이 저장소가 제공하는 것

- 공개 갤러리 정적 사이트
- 날짜별(연/월) 필터
- 원본 보기, URL 복사, Markdown 복사
- `incoming/` 기준 자동 후처리
- WebP 변환, 1600px 리사이즈, 400px 썸네일 생성
- `data/images.json` 자동 갱신
- 업로드 포털 및 업로드 API 참조 스캐폴드
- 서버측 업로드 암호 검증 구조

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
└── index.html
```

## 권장 저장소 역할

1. `filter-log.github.io`
   - 블로그 본체
   - 업로드 포털 링크 또는 업로드 포털 자체 호스팅
2. `filter-upload-api`
   - `platform/upload-api`를 복사해 서버리스 배포
   - `UPLOAD_PASSWORD`, GitHub App secret, `ACTIVE_IMAGE_REPO` 보관
3. `filter-images-1`, `filter-images-2`, ...
   - 이 템플릿에서 생성한 실제 이미지 저장소
   - GitHub Pages 공개 갤러리 제공

## 업로드 인증 방식

1. 업로드 페이지는 공개 정적 페이지입니다.
2. 사용자는 업로드 암호를 입력합니다.
3. 포털은 `/api/auth`로 암호를 전송합니다.
4. 서버가 `UPLOAD_PASSWORD`와 비교해 맞으면 짧은 HttpOnly 세션 쿠키를 발급합니다.
5. `/api/upload`는 이 세션 쿠키가 없으면 본문 파싱 전에 401로 거부합니다.
6. GitHub App private key, token, 업로드 암호는 모두 서버측 env에만 존재합니다.

## 업로드 흐름

1. 사용자가 이미지, 날짜, 선택 폴더, 업로드 암호를 입력합니다.
2. 서버리스 API가 암호를 검증하고 세션을 발급합니다.
3. 업로드 API는 `ACTIVE_IMAGE_REPO`를 읽어 현재 활성 저장소를 선택합니다.
4. 원본은 `incoming/YYYY/MM/optional-folder/filename.ext`에 저장됩니다.
5. GitHub Actions가 이를 `images/`와 `thumbs/`의 WebP 파일로 변환합니다.
6. `data/images.json`이 재생성되고 GitHub Pages 갤러리에 반영됩니다.

## 환경변수 설계

업로드 API 핵심 env:

- `UPLOAD_PASSWORD`
- `UPLOAD_SESSION_SECRET`
- `UPLOAD_SESSION_TTL_SECONDS`
- `ACTIVE_IMAGE_REPO`
- `GITHUB_OWNER`
- `GITHUB_BRANCH`
- `PUBLIC_PAGES_BASE_PATTERN`
- `UPLOAD_PORTAL_ORIGIN`
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_FINE_GRAINED_TOKEN`

이미지 처리 워크플로 env:

- `IMAGE_LONG_EDGE`
- `THUMB_LONG_EDGE`
- `WEBP_QUALITY`

## template repository 사용 방법

### 1. `filter-images-template`를 template repository로 지정

1. GitHub에서 이 저장소의 `Settings -> General`로 이동합니다.
2. `Template repository`를 체크합니다.

### 2. 새 이미지 저장소 생성

1. 저장소 상단의 `Use this template`를 클릭합니다.
2. 예: `filter-images-2` 이름으로 새 저장소를 만듭니다.
3. 새 저장소의 기본 브랜치는 `main`으로 유지합니다.

### 3. GitHub Pages 활성화

1. 새 저장소의 `Settings -> Pages`로 이동합니다.
2. `Build and deployment -> Deploy from a branch`를 선택합니다.
3. Branch는 `main`, folder는 `/ (root)`를 지정합니다.

### 4. 업로드 대상 저장소 전환

1. 업로드 API의 `ACTIVE_IMAGE_REPO`를 기존 값에서 새 저장소로 바꿉니다.
2. 예: `filter-images-1` -> `filter-images-2`
3. 이후 새 업로드만 새 저장소로 들어갑니다.
4. 기존 이미지 URL은 기존 저장소에 남아 그대로 유지됩니다.

## 빠른 시작

1. 이 저장소를 template repository로 설정합니다.
2. `filter-images-1` 저장소를 템플릿에서 생성합니다.
3. 해당 저장소에서 GitHub Pages를 활성화합니다.
4. `platform/upload-api`를 별도 배포 대상으로 옮겨 환경변수를 채웁니다.
5. `platform/upload-portal`의 `assets/config.js`에 `authEndpoint`, `uploadEndpoint`를 넣고 배포합니다.

## GitHub에서 수동으로 해야 하는 설정

1. `filter-images-template`를 template repository로 체크
2. 각 `filter-images-*` 저장소에서 GitHub Pages 활성화
3. GitHub Actions 사용 허용
4. GitHub App 생성 및 `filter-images-*` 저장소에만 설치
5. 업로드 API에 `UPLOAD_PASSWORD`, GitHub secret, `ACTIVE_IMAGE_REPO` 등록
6. 블로그에 업로드 포털 링크 추가

## 문서

- 아키텍처: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 운영 가이드: [docs/OPERATIONS.md](docs/OPERATIONS.md)
- 업로드 포털 스캐폴드: [platform/upload-portal/README.md](platform/upload-portal/README.md)
- 업로드 API 스캐폴드: [platform/upload-api/README.md](platform/upload-api/README.md)
