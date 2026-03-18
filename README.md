# filter-images-template

`filter-images-template`는 GitHub Pages로 공개 갤러리를 배포하고, GitHub Actions로 이미지를 후처리하는 이미지 저장소 템플릿이다. 이 저장소를 template repository로 지정한 뒤 `filter-images-1`, `filter-images-2`, `filter-images-3` 같은 실제 배포용 저장소를 반복 생성하는 것이 목적이다.

현재 템플릿은 `정적 갤러리 + Worker 연동 업로드 UI + 후처리 파이프라인`을 함께 제공한다. 새 레포를 만든 뒤 `assets/js/config.js`의 `repoName`, `galleryBaseUrl`, `workerApiUrl`만 자기 레포 기준으로 맞추면 된다.

## 이 템플릿이 만드는 것

- `/` 정적 공개 갤러리
- `/upload/` Worker 연동 업로드 페이지
- `YYYY-MM-DD` 단일 날짜 폴더 구조
- `incoming/2026-03-18/file.jpg` 같은 유입 경로
- `images/2026-03-18/file.webp` 공개 이미지 경로
- `thumbs/2026-03-18/file.webp` 썸네일 경로
- `data/images.json` 기반 날짜별 탐색 UI
- `incoming/`을 처리하는 GitHub Actions 워크플로

## 날짜 구조

이 템플릿은 날짜를 반드시 하나의 폴더명으로 사용한다.

- 유입 경로: `incoming/2026-03-18/filename.ext`
- 공개 경로: `images/2026-03-18/filename.webp`
- 썸네일 경로: `thumbs/2026-03-18/filename.webp`

중요:

- `YYYY/MM/DD` 분리 구조를 쓰지 않는다.
- 업로드 페이지의 날짜 입력값도 `YYYY-MM-DD`다.
- `images.json`도 `date` 문자열 하나로 그룹핑한다.

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

### 1. `filter-images-template`를 template repository로 지정

1. GitHub에서 `filter-images-template` 저장소의 `Settings -> General`로 이동한다.
2. `Template repository`를 체크한다.

### 2. 새 이미지 레포 생성

1. 저장소 상단의 `Use this template`를 클릭한다.
2. 예: `filter-images-2` 같은 이름으로 새 저장소를 만든다.
3. 기본 브랜치는 `main`으로 유지한다.

### 3. 새 레포에서 GitHub Pages 켜기

1. 새 저장소의 `Settings -> Pages`로 이동한다.
2. `Deploy from a branch`를 선택한다.
3. Branch는 `main`, folder는 `/ (root)`를 선택한다.

### 4. 새 레포에서 가장 먼저 바꿀 값

새 저장소를 만든 뒤 [assets/js/config.js](assets/js/config.js)를 열어 아래 값만 자기 레포 기준으로 수정하면 된다.

- `repoName`
- `galleryBaseUrl`
- `workerApiUrl`
- `maxFiles`

예:

```js
window.UPLOAD_CONFIG = {
  repoName: "filter-images-2",
  galleryBaseUrl: "https://filter-log.github.io/filter-images-2",
  workerApiUrl: "",
  maxFiles: 100,
};
```

템플릿 저장소 자체에서는 `workerApiUrl`을 비워 두지만, 실제 배포용 새 레포에서는 업로드 Worker base URL을 넣어야 한다.

## 비전공자 사용 흐름

1. 업로드 페이지 `/upload/`를 연다.
2. 날짜를 선택한다. 기본값은 오늘 날짜다.
3. 이미지를 드래그앤드롭하거나 여러 장 선택한다.
4. 암호를 입력한다.
5. 화면에서 `incoming/YYYY-MM-DD/...` 경로 미리보기를 확인한다.
6. 업로드 버튼을 누른다.
7. 업로드 페이지가 Worker의 `/auth`로 암호를 검증해 짧은 Bearer 토큰을 발급받는다.
8. 같은 화면에서 Worker의 `/upload`로 파일을 전송한다.
9. 업로드된 파일은 `incoming/YYYY-MM-DD/...` 경로에 저장된다.
10. 해당 레포의 GitHub Actions가 `images/`, `thumbs/`, `data/images.json`을 갱신한다.

## 공개 갤러리 동작

갤러리는 [data/images.json](data/images.json)을 읽어 날짜별 필터와 카드 UI를 렌더링한다.

각 카드에서 제공하는 기능:

- 썸네일 보기
- 원본 보기
- URL 복사
- Markdown 복사

Markdown 예시:

```md
![a](https://filter-log.github.io/filter-images-template/images/2026-03-18/a.webp)
```

## GitHub Actions 후처리 구조

[.github/workflows/process-images.yml](.github/workflows/process-images.yml)은 `incoming/**` 변경을 감지한다.

워크플로가 실행되면:

1. `incoming/2026-03-18/*.jpg` 같은 원본을 읽는다.
2. 긴 변 1600px 이하로 리사이즈한다.
3. WebP로 변환한다.
4. 400px 수준의 썸네일을 만든다.
5. `images/2026-03-18/`와 `thumbs/2026-03-18/`에 결과를 쓴다.
6. `data/images.json`을 다시 생성한다.

## Worker 연결 규칙

- `workerApiUrl`에는 Worker의 base URL만 넣는다.
- 프론트엔드는 `${workerApiUrl}/auth`와 `${workerApiUrl}/upload`를 사용한다.
- `repoName`은 각 레포 이름과 정확히 같아야 한다.
- Worker의 `ALLOWED_REPOS`에 새 레포 이름이 포함돼 있어야 한다.

## 운영자 메모

- 업로드 경로 규칙은 코드 전체에서 `YYYY-MM-DD` 한 단계 폴더 구조로 통일돼 있다.
- 장소 정보나 별도 폴더 정보는 넣지 않는다.
- 템플릿에서 새 레포를 만든 뒤에는 `assets/js/config.js`만 먼저 바꿔도 UI는 바로 자기 레포 기준으로 보이게 된다.

## 참고 문서

- 아키텍처: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 운영 가이드: [docs/OPERATIONS.md](docs/OPERATIONS.md)
