# Architecture

## 현재 단계의 범위

이 저장소는 `filter-images-1`, `filter-images-2`, `filter-images-3` 같은 실제 이미지 저장소를 만들기 위한 템플릿이다. 현재 단계에서는 템플릿 저장소만 완성한다.

포함되는 것:

- GitHub Pages 공개 갤러리
- `/upload/` 업로드 준비 UI
- `incoming/` 기준 GitHub Actions 후처리
- `data/images.json` 자동 생성

포함되지 않는 것:

- Cloudflare Worker 구현
- 서버측 암호 검증
- 실제 업로드 API 배포

## 핵심 구조

1. 정적 갤러리
   - `/`
   - `data/images.json`을 읽는다.
   - 날짜별 필터와 카드형 썸네일 UI를 렌더링한다.

2. 정적 업로드 페이지
   - `/upload/`
   - 파일 선택, 드래그앤드롭, 날짜 입력, 암호 입력을 받는다.
   - `incoming/YYYY-MM-DD/...` 경로 미리보기를 보여준다.
   - Worker URL이 있으면 POST 요청을 보낼 준비가 되어 있다.

3. 이미지 후처리 스크립트
   - `scripts/process-images.mjs`
   - `incoming/2026-03-18/file.jpg`를 읽는다.
   - `images/2026-03-18/file.webp`
   - `thumbs/2026-03-18/file.webp`
   - 위 두 경로로 결과를 만든다.

4. 데이터 생성 스크립트
   - `scripts/generate-images-json.mjs`
   - `images/`를 스캔해 `data/images.json`을 생성한다.
   - 각 항목은 `src`, `thumb`, `date`, `title`, `filename`을 가진다.

## 날짜 구조

전체 구조는 `YYYY-MM-DD` 단일 날짜 폴더 기준이다.

- `incoming/2026-03-18/filename.ext`
- `images/2026-03-18/filename.webp`
- `thumbs/2026-03-18/filename.webp`

즉, 이전처럼 `YYYY/MM` 또는 `YYYY/MM/DD`를 나누지 않는다.

## Worker 연동 지점

Cloudflare Worker는 나중에 [assets/js/upload.js](/Users/seobeen/workspace/filter-images-template/assets/js/upload.js#L1)에서 연결한다.

현재 업로드 페이지는 [assets/js/config.js](/Users/seobeen/workspace/filter-images-template/assets/js/config.js#L1)의 `workerApiUrl`을 읽는다.

- 값이 비어 있으면 payload만 준비한다.
- 값이 있으면 해당 URL로 `FormData` POST 요청을 보낸다.

따라서 다음 단계에서는:

1. Worker 엔드포인트를 만든다.
2. `workerApiUrl`에 그 주소를 넣는다.
3. Worker가 `date`, `password`, `files`를 받아 GitHub에 기록하게 한다.

## 템플릿 복제 후 수정 포인트

새 레포를 만들면 가장 먼저 바꿀 것은 [assets/js/config.js](/Users/seobeen/workspace/filter-images-template/assets/js/config.js#L1)다.

- `repoName`
- `galleryBaseUrl`
- `workerApiUrl`
- `maxFiles`

이 네 값만 바꿔도 정적 UI는 자기 레포 기준으로 바로 동작한다.
