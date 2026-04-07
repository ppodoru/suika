# 🍉 Suika Game Web (수박 게임 웹)

![Suika Game Preview](https://github.com/ppodoru/suika/raw/main/public/fruits/11_watermelon.png)

닌텐도 스위치의 인기 게임인 **'수박 게임(Suika Game)'**을 웹 환경에서 즐길 수 있도록 구현한 프로젝트입니다. Matter.js 물리 엔진을 사용하여 과일들의 역동적인 움직임과 합치기 시스템을 재현했습니다.

## 🔗 라이브 데모
- [GitHub Pages에서 플레이하기](https://ppodoru.github.io/suika/)

## 🎮 게임 목표
과일을 상자 안으로 떨어뜨려 같은 종류끼리 합쳐 더 큰 과일로 진화시키세요! 최종적으로 가장 큰 **'수박'**을 만드는 것이 목표입니다. 과일이 상단 데드라인을 넘지 않도록 주의하며 최고 점수에 도전해 보세요.

### 🍎 과일 진화 순서
1. 체리 🍒
2. 딸기 🍓
3. 포도 🍇
4. 귤 🍊
5. 감 🍊
6. 사과 🍎
7. 배 🍐
8. 복숭아 🍑
9. 파인애플 🍍
10. 멜론 🍈
11. 수박 🍉 (최종!)

> [!TIP]
> **수박과 수박이 만나면?** 두 수박이 합쳐지면서 사라지고 엄청난 점수를 획득합니다!

## ✨ 주요 기능
- **물리 시뮬레이션:** Matter.js를 이용한 리얼한 과일 충돌 및 반동 효과. 모든 과일은 실제 게임처럼 동일한 질량(`mass: 1`)을 가집니다.
- **점수 시스템:** 과일이 진화할 때마다 점수가 누적됩니다.
- **반응형 디자인:** PC 마우스 조작과 모바일 터치 조작을 모두 지원합니다.
- **배경 음악 & 사운드:** 몰입감을 높여주는 배경 음악과 효과음이 포함되어 있습니다.

## 🛠 기술 스택
- **Framework:** [React 19](https://react.dev/)
- **Bundler:** [Vite](https://vitejs.dev/)
- **Physics Engine:** [Matter.js](https://brm.io/matter-js/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Language:** TypeScript

## 🚀 로컬 실행 방법

프로젝트를 로컬에서 실행해보려면 다음 명령어를 입력하세요.

```bash
# 저장소 복제
git clone https://github.com/ppodoru/suika.git

# 폴더 이동
cd suika

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

이후 브라우저에서 `http://localhost:5173` 접속하여 확인할 수 있습니다.

## 📜 라이선스
이 프로젝트는 교육 및 포트폴리오 목적으로 제작되었습니다.
