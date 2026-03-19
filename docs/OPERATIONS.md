# Operations Guide

## 새 저장소 생성 절차

1. `filter-archive-template` 저장소의 `Settings -> General`로 이동합니다.
2. `Template repository`를 체크합니다.
3. `Use this template`를 눌러 `filter-archive-2` 같은 새 저장소를 만듭니다.
4. 새 저장소의 `Settings -> Pages`에서 `main` branch root를 배포 대상으로 설정합니다.
5. 새 저장소의 [assets/js/config.js](../assets/js/config.js)에서 `workerApiUrl`을 실제 Worker URL로 채웁니다.

## 새 레포에서 수정해야 하는 값

표준 GitHub Pages 배포라면 보통 아래 정도면 충분합니다.

```js
window.UPLOAD_CONFIG = {
  repoName: "filter-archive-template",
  galleryBaseUrl: "https://filter-log.github.io/filter-archive-template",
  workerApiUrl: "https://archive-worker.filter-log.workers.dev",
  maxFiles: 100,
};
```

`repoName`과 `galleryBaseUrl`는 실제 배포된 `filter-archive-*` 경로에서 자동 감지됩니다.

직접 덮어써야 하는 경우:

- 커스텀 도메인 구조가 일반적인 `/<repo>/` 패턴이 아닌 경우
- 로컬 개발에서 특정 레포명을 강제해야 하는 경우

## 업로드 흐름

1. `/upload/` 페이지를 엽니다.
2. 업로드 날짜를 선택합니다.
3. 이미지를 끌어다 놓거나 여러 장 선택합니다.
4. 암호를 입력합니다.
5. `incoming/YYYY-MM-DD/...` 경로 미리보기를 확인합니다.
6. 업로드 버튼을 누릅니다.
7. 업로드 페이지가 `/auth`로 암호를 검증합니다.
8. 발급된 Bearer 토큰으로 `/upload`를 호출합니다.
9. 결과 화면에서 성공/실패 파일별 응답을 확인합니다.

## 날짜 운영 규칙

- 날짜는 항상 `YYYY-MM-DD`
- 날짜는 업로드 페이지에서 사용자가 직접 선택
- 이미지 경로는 날짜 폴더 하나만 사용
- 장소 정보나 추가 폴더는 사용하지 않음

예:

- `incoming/2026-03-19/raw.jpg`
- `images/2026-03-19/raw.webp`
- `thumbs/2026-03-19/raw.webp`

## Worker 연동 체크리스트

1. GitHub Pages 활성화
2. GitHub Actions 허용 상태 확인
3. `workerApiUrl`이 배포된 Worker base URL인지 확인
4. Worker의 `ALLOWED_ORIGINS`에 현재 origin이 포함돼 있는지 확인
5. 업로드 요청의 `repoName`이 `filter-archive-*`로 전송되는지 확인

## GitHub Actions가 하는 일

1. `incoming/**` 변경을 감지합니다.
2. 원본 이미지를 읽습니다.
3. 긴 변 1600px 이하로 리사이즈합니다.
4. WebP로 변환합니다.
5. 썸네일을 400px 수준으로 만듭니다.
6. `data/images.json`을 다시 생성합니다.
