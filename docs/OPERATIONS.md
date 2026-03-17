# Operations Guide

## 비전공자 업로드 흐름

1. 해당 이미지 레포의 `/upload/` 페이지를 연다.
2. 이미지를 끌어다 놓거나 파일 선택 버튼을 누른다.
3. 한 번에 최대 100장까지 선택한다.
4. 업로드 암호를 입력한다.
5. 날짜를 확인한다. 기본값은 오늘이다.
6. 필요하면 폴더명을 입력한다.
7. 업로드를 누른다.
8. 진행률이 표시되고, 완료 후 성공/실패 목록과 URL/Markdown 복사 버튼이 나온다.

## 새 이미지 레포를 템플릿에서 생성하는 방법

1. `filter-images-template`의 `Settings -> General`로 이동한다.
2. `Template repository`를 체크한다.
3. `Use this template`를 눌러 `filter-images-2` 같은 새 저장소를 만든다.
4. 새 저장소에서 `Settings -> Pages`로 이동한다.
5. `main` branch root를 배포 대상으로 설정한다.
6. 새 레포 전용 업로드 API를 별도로 배포한다.
7. 그 API에 `TARGET_REPO=filter-images-2`를 설정한다.
8. 새 레포의 [upload/config.js](/Users/seobeen/workspace/filter-images-template/upload/config.js#L1)와 같은 파일에서 API 주소를 실제 값으로 바꾼다.

## 새 레포에서 꼭 해야 하는 수동 설정

1. GitHub Pages 활성화
2. GitHub Actions 허용
3. 업로드 API용 secret/env 등록
4. 업로드 API에 GitHub App 설치 또는 fine-grained token 연결
5. 업로드 페이지의 `authEndpoint`, `uploadEndpoint` 설정

## 레포별 env / secret 목록

업로드 API에 필요:

- `TARGET_REPO`
- `PUBLIC_REPOSITORY_NAME`
- `GITHUB_OWNER`
- `GITHUB_BRANCH`
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

선택 대안:

- `GITHUB_FINE_GRAINED_TOKEN`

## 자기 레포에만 저장되도록 보장하는 방법

1. 각 업로드 API는 `TARGET_REPO`를 하나만 가진다.
2. 업로드 페이지는 그 레포 전용 API URL만 사용한다.
3. GitHub App은 가능하면 해당 레포 하나에만 설치한다.
4. 따라서 `filter-images-1/upload/`는 `filter-images-1` 이외를 수정하지 못한다.

## 업로드 암호 운영

1. 업로드 API 환경변수에 `UPLOAD_PASSWORD`를 설정한다.
2. 세션 서명용으로 `UPLOAD_SESSION_SECRET`를 별도로 두는 것이 좋다.
3. 암호를 바꾸면 API를 재배포한다.
4. 암호는 업로드 권한이 있는 사람에게만 전달한다.

## 주소 확인 방법

- 갤러리 주소: `https://filter-log.github.io/<repo>/`
- 업로드 주소: `https://filter-log.github.io/<repo>/upload/`
- API 주소: 배포한 Vercel/Netlify/Cloud Run URL

## 블로그 연동

- `filter-log.github.io`에는 각 이미지 레포의 갤러리 링크를 모아 둔다.
- 글 작성 시 업로드 결과의 Markdown을 그대로 붙여 넣는다.
- 새 저장소가 생기면 갤러리 링크와 업로드 링크를 함께 정리한다.
