# Architecture

## 전체 구성

이 구조는 레포 단위로 완전히 독립 동작한다.

1. GitHub Pages 갤러리
   - `/`
   - `data/images.json` 기준 월별 탐색
2. GitHub Pages 업로드 페이지
   - `/upload/`
   - 드래그앤드롭, 최대 100장, 날짜/폴더/암호 입력
3. 레포 전용 서버리스 업로드 API
   - `TARGET_REPO`가 고정된 자기 레포 전용 엔드포인트
   - 서버측 암호 검증
   - GitHub REST API로 `incoming/` 기록
4. GitHub Actions 후처리
   - WebP 변환
   - 썸네일 생성
   - `images.json` 갱신

## 중앙 업로드 구조에서 바뀐 점

이전:

- 중앙 업로드 페이지
- 운영자가 중앙 대상 레포를 바꿔 업로드를 분기

현재:

- 각 레포가 자기 업로드 페이지를 가짐
- 각 레포가 자기 전용 업로드 API를 가짐
- 업로드 API는 자기 레포 이름만 알고 있음
- `filter-images-1/upload/`는 `filter-images-1`만 수정
- `filter-images-2/upload/`는 `filter-images-2`만 수정

## 요청 흐름

1. 사용자가 `/<repo>/upload/` 페이지에서 이미지, 날짜, 선택 폴더, 암호를 입력한다.
2. 업로드 페이지가 `/api/auth`로 암호를 보낸다.
3. 서버가 `UPLOAD_PASSWORD`를 검증하고 HttpOnly 세션 쿠키를 발급한다.
4. 업로드 페이지가 같은 세션으로 `/api/upload`에 최대 100장의 파일을 보낸다.
5. `/api/upload`는 인증이 없으면 401로 거부한다.
6. API는 `TARGET_REPO` 기준으로 자기 레포만 대상으로 삼는다.
7. API는 파일명을 정리하고 `incoming/YYYY/MM/optional-folder/`에 원본을 넣는다.
8. 이때 GitHub Git Data API를 사용해 여러 파일을 한 커밋 흐름으로 기록한다.
9. 레포의 GitHub Actions가 push를 감지한다.
10. Actions가 아래 경로를 생성한다.
   - `images/YYYY/MM/optional-folder/filename.webp`
   - `thumbs/YYYY/MM/optional-folder/filename.webp`
11. 같은 워크플로에서 `data/images.json`을 다시 만든다.
12. GitHub Pages 갤러리가 월별 카드 UI로 이를 보여준다.

## 저장소 역할

### `filter-images-template`

- 템플릿 본체
- 갤러리 페이지
- 업로드 페이지
- 후처리 스크립트
- GitHub Actions 워크플로
- 운영 문서

### `filter-images-1`, `filter-images-2`, ...

- 템플릿에서 생성된 실제 이미지 저장소
- 자기 갤러리와 자기 업로드 페이지 보유
- 자기 업로드 API와 연결

### 각 레포 전용 업로드 API 배포

- 업로드 암호와 세션 secret 보관
- GitHub App 또는 token 보관
- `TARGET_REPO`를 통해 자기 레포만 수정

## 보안 모델

- 업로드 암호 검증은 서버에서만 수행
- 브라우저에는 GitHub token, App private key, 암호가 저장되지 않음
- `/api/upload`는 인증 쿠키가 없으면 본문 파싱 전 차단
- API는 `TARGET_REPO`가 가리키는 단일 레포만 수정
- GitHub App은 가능하면 해당 레포에만 설치
- GitHub Pages는 정적 읽기 전용 공개 경로만 제공
