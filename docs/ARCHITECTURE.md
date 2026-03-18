# Architecture

## 현재 단계의 범위

이 저장소는 `filter-images-1`, `filter-images-2`, `filter-images-3` 같은 실제 이미지 저장소를 만들기 위한 템플릿이다. 현재 단계에서는 템플릿 저장소만 완성한다.

포함되는 것:

- GitHub Pages 공개 갤러리
- `/upload/` Worker 연동 업로드 UI
- `incoming/` 기준 GitHub Actions 후처리
- `data/images.json` 자동 생성

포함되지 않는 것:

- Cloudflare Worker 구현
- 서버측 이미지 변환

## 핵심 구조

1. 정적 갤러리
   - `/`
   - `data/images.json`을 읽는다.
   - 날짜별 필터와 카드형 썸네일 UI를 렌더링한다.

2. 정적 업로드 페이지
   - `/upload/`
   - 파일 선택, 드래그앤드롭, 날짜 입력, 암호 입력을 받는다.
   - `incoming/YYYY-MM-DD/...` 경로 미리보기를 보여준다.
   - Worker base URL이 있으면 `/auth`와 `/upload`를 호출한다.

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

현재 업로드 페이지는 [assets/js/config.js](/Users/seobeen/workspace/filter-images-template/assets/js/config.js#L1)의 `workerApiUrl`을 읽는다.

- 값이 비어 있으면 payload만 준비한다.
- 값이 있으면 `${workerApiUrl}/auth`로 암호를 검증하고 `${workerApiUrl}/upload`로 파일을 전송한다.

Worker는 다음 계약을 가진다.

1. `/auth`
   - JSON body의 `password`를 검증한다.
   - 짧은 Bearer 토큰을 발급한다.
2. `/upload`
   - `Authorization: Bearer <token>`를 받는다.
   - `repoName`, `date`, `files[]`를 받아 GitHub에 기록한다.
   - 최종 저장 경로는 `incoming/YYYY-MM-DD/...`다.

## 템플릿 복제 후 수정 포인트

새 레포를 만들면 가장 먼저 바꿀 것은 [assets/js/config.js](/Users/seobeen/workspace/filter-images-template/assets/js/config.js#L1)다.

- `repoName`
- `galleryBaseUrl`
- `workerApiUrl`
- `maxFiles`

이 네 값만 바꿔도 정적 UI는 자기 레포 기준으로 바로 동작한다.
