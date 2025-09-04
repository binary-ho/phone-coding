# 가이드: AI 리뷰 액션 테스트용 예제 프로젝트 생성

이 문서는 AI 코드 리뷰 GitHub Action의 성능을 테스트하기 위한 Pull Request(PR)를 준비하는 방법을 안내합니다.

## 체크리스트

- [ ] `main` 브랜치에서 새로운 기능 브랜치 생성
- [ ] `test-project/app.js` 파일 생성 및 초기 코드 추가
- [ ] 초기 코드 커밋
- [ ] `app.js` 파일 수정하여 의도적인 문제점 추가
- [ ] 최종 코드 커밋
- [ ] `main` 브랜치로 Pull Request 생성

---

## 1단계: 새 브랜치 생성

테스트를 위한 새 브랜치를 생성합니다.

```bash
git checkout main
git pull
git checkout -b feature/ai-review-test-case
```

## 2단계: 초기 파일 생성 및 커밋

프로젝트 루트에 `test-project` 디렉토리를 만들고, 그 안에 `app.js` 파일을 생성합니다.

**파일 경로:** `test-project/app.js`

**초기 코드:**
```javascript
// A simple user management utility

class UserManager {
  constructor() {
    this.users = new Map();
  }

  addUser(username, email) {
    if (!username || !email) {
      console.log('Username and email are required.');
      return;
    }
    const id = Date.now().toString();
    this.users.set(id, { username, email });
    console.log(`User ${username} added.`);
  }

  getUser(id) {
    return this.users.get(id);
  }

  listAllUsers() {
    this.users.forEach((user, id) => {
      console.log(`ID: ${id}, User: ${user.username}`);
    });
  }
}

const manager = new UserManager();
manager.addUser('john_doe', 'john.doe@example.com');
```

이제 이 초기 상태를 커밋합니다.

```bash
git add test-project/app.js
git commit -m "feat: Add initial user manager"
```

## 3단계: 문제점이 있는 코드로 수정

이제 `app.js` 파일을 수정하여 AI 리뷰어가 찾아내야 할 여러 가지 문제점을 의도적으로 추가합니다.

**수정 후 코드:**
```javascript
// A simple user management utility. WARNING: Contains intentional issues for testing.

// Problem 1: Inconsistent Naming
function user_manager() { // Switched to snake_case from PascalCase class
  this.users = new Map();
  // Problem 2: Hardcoded Secret
  this.apiKey = "SECRET_API_KEY_12345_DO_NOT_COMMIT";
}

user_manager.prototype.addUser = function(username, data) { // 'email' param changed to generic 'data'
    if (!username || !data) {
      console.log('Username and data are required.');
      return;
    }
    const id = Date.now().toString();
    // Problem 3: Unsafe 'eval' usage
    const userProfile = eval("(" + data + ")"); // Pretend 'data' is a JSON string
    this.users.set(id, { username, profile: userProfile });
    console.log(`User ${username} added.`);
}

user_manager.prototype.getUser = function(id) {
    return this.users.get(id);
}

// Problem 4: Inefficient Loop
user_manager.prototype.listAllUsers = function() {
    const userKeys = Array.from(this.users.keys());
    for (let i = 0; i < userKeys.length; i++) { // Classic for-loop instead of modern forEach
        const key = userKeys[i];
        const user = this.users.get(key);
        console.log(`ID: ${key}, User: ${user.username}`);
    }
}

const manager = new user_manager();
// 'data' is now expected to be a string for eval
manager.addUser('john_doe', '{"email": "john.doe@example.com"}');
```

## 4단계: 최종 커밋 및 PR 생성

수정된 파일을 커밋하고 `main` 브랜치로 Pull Request를 생성합니다. PR의 제목과 본문은 자유롭게 작성하되, AI 리뷰를 요청하는 내용을 포함하는 것이 좋습니다.

```bash
git add test-project/app.js
git commit -m "refactor: Update user manager with new features"
git push origin feature/ai-review-test-case
```

이제 GitHub에서 Pull Request를 생성하여 테스트를 준비합니다.
