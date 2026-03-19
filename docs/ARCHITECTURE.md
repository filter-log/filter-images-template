# Architecture

## 현재 범위

이 저장소는 `filter-archive-1`, `filter-archive-2`, `filter-archive-demo` 같은 실제 이미지 저장소를 만들기 위한 템플릿입니다.

포함되는 것:

- GitHub Pages 공개 갤러리
- `/upload/` Worker 연동 업로드 UI
- `incoming/` 기준 GitHub Actions 후처리
- `data/images.json` 자동 생성

포함되지 않는 것:

- Cloudflare Worker 구현 자체
- 서버측 이미지 변환 서비스

## 핵심 구조

1. 정적 갤러리
   - `/`
   - `data/images.json`을 읽어 날짜별 필터와 카드 UI를 렌더링합니다.

2. 정적 업로드 페이지
   - `/upload/`
   - 파일 선택, 날짜 입력, 암호 입력을 받습니다.
   - `incoming/YYYY-MM-DD/...` 경로 미리보기를 보여줍니다.
   - Worker base URL이 있으면 `/auth`와 `/upload`를 호출합니다.

3. 이미지 후처리 스크립트
   - `scripts/process-images.mjs`
   - `incoming/YYYY-MM-DD/file.jpg`를 읽어 `images/`와 `thumbs/`를 만듭니다.

4. 데이터 생성 스크립트
   - `scripts/generate-images-json.mjs`
   - `images/`를 스캔해 `data/images.json`을 생성합니다.

## 날짜 구조

전체 구조는 `YYYY-MM-DD` 단일 날짜 폴더 기준입니다.

- `incoming/2026-03-19/filename.ext`
- `images/2026-03-19/filename.webp`
- `thumbs/2026-03-19/filename.webp`

## Worker 연동 지점

업로드 페이지는 [assets/js/config.js](../assets/js/config.js)의 `workerApiUrl`을 읽습니다.

- 값이 비어 있으면 payload만 준비합니다.
- 값이 있으면 `${workerApiUrl}/auth`로 암호를 검증하고 `${workerApiUrl}/upload`로 파일을 전송합니다.

Worker 계약:

1. `/auth`
   - JSON body의 `password`를 검증합니다.
   - 짧은 Bearer 토큰을 발급합니다.
2. `/upload`
   - `Authorization: Bearer <token>`을 받습니다.
   - `repoName`, `date`, `files[]`를 받아 GitHub에 기록합니다.
   - 최종 저장 경로는 `incoming/YYYY-MM-DD/...`입니다.

## repoName 결정 방식

기본 설정은 템플릿 이름을 가지고 있지만, 실제 배포 시에는 URL 기반 자동 감지가 우선 적용됩니다.

- `filter-archive-template` 저장소는 그대로 템플릿 이름으로 동작
- `filter-archive-xxx` 저장소는 URL에서 `filter-archive-xxx`를 읽어 자기 이름으로 동작
- 따라서 생성된 저장소는 업로드 시 Worker에 자기 `repoName`을 전달합니다.

표준 GitHub Pages 경로가 아니라면 `repoName`과 `galleryBaseUrl`를 직접 설정해 덮어쓸 수 있습니다.
