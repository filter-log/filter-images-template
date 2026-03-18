# Operations Guide

## 새 이미지 레포를 템플릿에서 만드는 방법

1. `filter-images-template` 저장소의 `Settings -> General`로 이동한다.
2. `Template repository`를 체크한다.
3. `Use this template`를 눌러 `filter-images-2` 같은 새 저장소를 만든다.
4. 새 저장소의 `Settings -> Pages`에서 `main` branch root를 배포 대상으로 설정한다.
5. 새 저장소의 [assets/js/config.js](/Users/seobeen/workspace/filter-images-template/assets/js/config.js#L1)를 자기 레포 기준으로 수정한다.

## 새 레포에서 수정해야 하는 값

예를 들어 `filter-images-2`를 만들었다면:

```js
window.UPLOAD_CONFIG = {
  repoName: "filter-images-2",
  galleryBaseUrl: "https://filter-log.github.io/filter-images-2",
  workerApiUrl: "https://filter-image-upload-worker.filter-log.workers.dev",
  maxFiles: 100,
};
```

`workerApiUrl`에는 Worker base URL만 넣는다. `/auth`나 `/upload`를 직접 붙이지 않는다.

## 비전공자 업로드 흐름

1. `/upload/` 페이지를 연다.
2. 업로드 날짜를 선택한다.
3. 이미지를 끌어다 놓거나 여러 장 선택한다.
4. 암호를 입력한다.
5. `incoming/YYYY-MM-DD/...` 경로 미리보기를 확인한다.
6. 업로드 버튼을 누른다.
7. 업로드 페이지가 `/auth`로 암호를 검증한다.
8. 발급된 Bearer 토큰으로 `/upload`를 호출한다.
9. 결과 화면에서 성공/실패 파일별 응답을 확인한다.

## 날짜 운영 규칙

- 날짜는 항상 `YYYY-MM-DD`
- 날짜는 업로드 페이지에서 사용자가 직접 선택
- 이미지 경로는 날짜 폴더 하나만 사용
- 장소 정보나 추가 폴더는 사용하지 않음

예:

- `incoming/2026-03-18/raw.jpg`
- `images/2026-03-18/raw.webp`
- `thumbs/2026-03-18/raw.webp`

## GitHub Actions가 하는 일

1. `incoming/**` 변경을 감지한다.
2. 원본 이미지를 읽는다.
3. 긴 변 1600px 이하로 리사이즈한다.
4. WebP로 변환한다.
5. 썸네일을 400px 수준으로 만든다.
6. `data/images.json`을 다시 생성한다.

## 확인해야 할 수동 설정

1. GitHub Pages 활성화
2. GitHub Actions 허용 상태 확인
3. `assets/js/config.js` 수정
4. `workerApiUrl`이 배포된 Worker base URL인지 확인
5. Worker의 `ALLOWED_REPOS`에 현재 레포 이름이 포함돼 있는지 확인

## 블로그 연동

- `filter-log.github.io` 블로그에는 각 이미지 저장소의 갤러리 주소를 링크로 두면 된다.
- 글 작성 시 갤러리 카드의 `Markdown 복사`를 사용해 이미지를 붙여 넣는다.
