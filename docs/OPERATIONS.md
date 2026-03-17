# Operations Guide

## 비전공자 업로드 흐름

1. 업로드 페이지를 엽니다.
2. 이미지를 끌어다 놓거나 파일 선택 버튼을 누릅니다.
3. 업로드 암호를 입력합니다.
4. 날짜를 확인합니다. 기본값은 오늘입니다.
5. 필요하면 폴더명을 입력합니다.
   - 예: `seoul-forest`
6. 업로드 버튼을 누릅니다.
7. 암호가 맞으면 서버가 인증 세션을 만들고 업로드를 진행합니다.
8. 완료 후 표시되는 URL 또는 Markdown을 복사해 블로그 글에 붙여 넣습니다.

## 운영자가 활성 이미지 저장소를 바꾸는 방법

1. 업로드 API 배포 서비스의 환경변수에서 `ACTIVE_IMAGE_REPO`를 수정합니다.
2. 예: `filter-images-1` -> `filter-images-2`
3. API를 재배포하거나 환경변수 적용을 기다립니다.
4. 이후 새 업로드만 새 저장소로 들어갑니다.

## 새 이미지 저장소를 템플릿에서 생성하는 방법

1. GitHub에서 `filter-images-template`의 `Settings -> General`로 이동합니다.
2. `Template repository`를 체크합니다.
3. 저장소 상단의 `Use this template`를 눌러 `filter-images-2` 같은 새 저장소를 만듭니다.
4. 새 저장소에서 GitHub Pages를 `main` branch root로 활성화합니다.
5. Actions가 활성화되어 있는지 확인합니다.
6. 업로드 API의 `ACTIVE_IMAGE_REPO`를 새 저장소로 바꿉니다.

## 기존 URL 유지 방식

1. 기존 이미지 레포의 파일은 절대 이동하지 않습니다.
2. 새 저장소는 새 업로드의 목적지로만 사용합니다.
3. 따라서 예전 글에 들어간 이미지 URL은 유지됩니다.

## 업로드 암호 운영

1. 업로드 API 환경변수에 `UPLOAD_PASSWORD`를 설정합니다.
2. 필요하면 `UPLOAD_SESSION_SECRET`도 따로 설정합니다.
3. 암호가 바뀌면 기존 세션은 자연스럽게 무효화되도록 API를 재배포합니다.
4. 암호는 업로드 권한이 있는 사람에게만 별도로 전달합니다.

## GitHub Pages 설정

각 `filter-images-*` 저장소에서:

1. `Settings -> Pages`
2. `Build and deployment -> Deploy from a branch`
3. Branch는 `main`, folder는 `/ (root)` 선택
4. 저장 후 공개 URL 확인

## GitHub App 설정

권장 설정:

1. GitHub App 생성
2. Repository permissions
   - `Contents: Read and write`
   - `Metadata: Read-only`
3. App 설치 대상은 `filter-images-*` 저장소만 선택
4. App ID, Installation ID, Private Key를 업로드 API 환경변수에 저장

## 블로그 연동

- `filter-log.github.io`에는 업로드 포털 링크를 고정 메뉴로 추가
- 이미지 삽입은 업로드 결과 Markdown을 그대로 사용
- 여러 이미지 저장소가 생기면 블로그에는 "이미지 아카이브" 인덱스 페이지를 두고 각 저장소 갤러리 링크를 모읍니다.
