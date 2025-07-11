# Flux 게임 클라이언트: 문학적 인터페이스 비전

## 핵심 철학: 마음의 눈이 우선

우리 게임 클라이언트는 전통적인 MUD 인터페이스를 **문학적 독서 경험**으로 재상상하여 세계의 시스템에서 자연스럽게 이야기가 나오도록 합니다. 숫자는 서사를 돕되, 결코 그 반대가 되지 않습니다. 우리는 가장 강력한 시각화 엔진인 마음의 눈을 위해 주로 설계하면서도 시각 장애가 있는 플레이어를 위한 완전한 접근성을 보장합니다.

## 설계에 의한 오픈 소스

**완전한 투명성**: 신뢰와 투명성이라는 우리의 제1원칙에 따라, 우리의 문학적 게임 클라이언트와 전체 `flux-game` 패키지는 MIT 라이선스 하에 **완전히 오픈 소스**입니다. 이는 단순한 기술적 개방성이 아니라 투명성을 통한 신뢰 구축과 커뮤니티가 원하는 게임 경험을 구축할 수 있도록 하는 것입니다.

**오픈 소스가 중요한 이유**:
- **투명성을 통한 신뢰**: 플레이어가 자신의 클라이언트가 어떻게 작동하는지 정확히 볼 수 있음
- **커뮤니티 혁신**: 개발자들이 우리의 구현을 학습하고, 개선하고, 확장할 수 있음
- **접근성 우선**: 오픈 소스는 전문화된 접근성 도구와 개선을 가능하게 함
- **프로토콜 발전**: 커뮤니티 기여가 Facts 시스템의 발전을 돕음
- **보안 보장**: 공개 코드 리뷰가 견고한 보안 관행을 보장함

## 설계 원칙

### 1. 전자책 읽기 경험
- **넓은 여백**이 여백을 만들고 텍스트에 집중도를 높임
- **선명하고 가독성이 뛰어난 세리프 타이포그래피**로 따뜻함과 가독성을 위해 Zilla Slab 사용
- **넉넉한 줄 간격** (1.6-1.8)으로 편안한 읽기
- **최적의 줄 길이** (45-75자)로 눈의 피로 방지
- **타자기 효과**가 텍스트를 점진적으로 드러내어 기대감과 리듬을 만들어냄

### 2. 핵심 설계로서의 접근성
- **스크린 리더 최적화**로 적절한 ARIA 라벨과 의미론적 HTML 제공
- **고대비 모드**로 사용자 정의 가능한 색상 구성표 제공
- **확장 가능한 타이포그래피**로 레이아웃을 깨뜨리지 않고 12pt에서 32pt까지 조정
- **키보드 우선 탐색**으로 직관적인 단축키 제공
- **오디오 내레이션**으로 자연스러운 음성 합성 제공
- **음성 명령 인식**으로 핸즈프리 상호작용 제공
- **촉각 피드백**을 지원하는 장치에 제공

### 3. 내러티브 풍부화
원시 플레이어 명령은 클라이언트 측 풍부화를 통해 문학적 산문으로 변환됩니다:

```
플레이어 입력: say "give me ur ration"
클라이언트 표시: Cassius가 말합니다, "배고파요, Darrow. 빵 좀 주세요."

플레이어 입력: n
클라이언트 표시: 당신은 조약돌 거리를 북쪽으로 걸어가며,
                좁은 벽에 발자국 소리가 메아리칩니다.

플레이어 입력: look
클라이언트 표시: 시장터가 당신 앞에 펼쳐져 있으며, 상인들의 떠들썩한
                소리와 제빵점의 신선한 빵 냄새가 생생합니다.
```

### 4. 투명한 메커니즘: 전투 로그
기본 경험은 내러티브 몰입을 우선시하지만, **모든 계산은 수학적으로 정확하고 발견 가능**합니다. 전투 로그는 메커니즘을 이해하고 싶은 사람들에게 완전한 투명성을 제공합니다:

**내러티브 뷰 (기본값):**
```
고블린이 당신을 향해 무작정 휘두르지만, 당신은 능숙하게 조잡한 칼날을 피합니다.
당신의 반격이 목표를 찾아내고, 고블린이 상처 입은 어깨를 붙잡으며 뒤로 비틀거립니다.
```

**전투 로그 (선택사항):**
```
═══ 전투 로그 ═══
[턴 1] 고블린이 플레이어를 공격
  • 기본 공격: 1d20 + 2 (STR) = 14 + 2 = 16
  • 플레이어 AC: 18 (10 + 5 방어구 + 2 DEX + 1 회피)
  • 결과: 빗나감 (16 < 18)

[턴 1] 플레이어 반격 발동 (≤2 차이로 빗나감)
  • 반격 공격: 1d20 + 4 (DEX) + 2 (무기) = 11 + 4 + 2 = 17
  • 고블린 AC: 15 (10 + 3 가죽 + 2 DEX)
  • 결과: 명중 (17 ≥ 15)
  • 데미지: 1d6 + 2 (STR) = 4 + 2 = 6 관통
  • 위치: 오른쪽 어깨 (73/100 굴림)
  • 고블린 HP: 22 → 16
═══════════════════
```

**주요 특징:**
- **기본적으로 숨김**으로 내러티브 몰입 유지
- **토글 가능**으로 키보드 단축키 (`Ctrl+M`) 또는 음성 명령으로 접근
- **소급 세부사항** - 과거 행동에 대한 메커니즘 보기
- **수학적 정확성**으로 모든 주사위 굴림, 수정자, 계산 표시
- **접근 가능한 형식**으로 명확한 제목과 구조화된 데이터
- **교육적 가치**로 플레이어가 기본 시스템을 이해하는 데 도움

## 인터페이스 레이아웃: 두 가지 서로 다른 경험

### 전자책 모드: 문학적 몰입

**전자책 모드 특징:**
- **중앙 텍스트 열**로 양쪽에 4-6em 여백
- **미묘한 상태 표시줄**로 하단에 필수 정보 표시
- **커서 표시기** (▊)로 입력 위치 표시
- **점진적 텍스트 드러내기**로 타자기 효과 제공
- **부드러운 스크롤**로 읽기 흐름 유지
- **문학적 타이포그래피**로 Zilla Slab 세리프 폰트 사용
- **몰입형 내러티브**로 클라이언트 측 풍부화 제공

### 터미널 호환성 모드: 클래식 MUD 경험

**터미널 호환성 모드 특징:**

**등폭 폰트 옵션**으로 전통적인 형식 제공:
- **Consolas**: 뛰어난 가독성을 가진 Microsoft의 프로그래밍 폰트
- **SF Mono**: macOS용 Apple의 시스템 등폭 폰트
- **Cascadia Code**: 연결 문자를 가진 Microsoft의 현대적 터미널 폰트
- **시스템 기본값**: 사용자의 터미널 폰트 설정 존중
- **사용자 정의 가능한 크기**: 픽셀 퍼펙트 렌더링으로 10-16pt

**즉시 텍스트 표시**로 애니메이션 지연 없음:
- **제로 지연 시간**: 최대 효율성을 위해 텍스트가 즉시 나타남
- **타자기 효과 없음**: 모든 애니메이션 지연 제거
- **일괄 렌더링**: 큰 텍스트 블록이 즉시 나타남
- **스크롤백 버퍼**: 대용량 텍스트의 효율적 처리

**컴팩트 정보 밀도**로 최소한의 시각적 장식:
- **화면당 최대 텍스트**: 정보 처리량을 위해 최적화
- **최소 여백**: 터미널 폭을 완전히 활용
- **밀집 형식**: 전통적인 MUD 스타일 레이아웃
- **구조화된 출력**: 게임 요소 간의 명확한 분리

**완전한 키보드 탐색**으로 광범위한 단축키 지원:
- **클래식 MUD 단축키**: 탭 완성, 명령 기록 (↑/↓)
- **파워 유저 명령**: Ctrl+R (반복), Ctrl+L (지우기), Ctrl+U (줄 지우기)
- **창 관리**: Alt+Tab (창 전환), Ctrl+PageUp/Down (스크롤)
- **접근성 단축키**: 모든 기능이 키보드로 접근 가능

**원시 명령 입력**으로 클라이언트 측 수정 없음:
- **직접 명령 전송**: 풍부화나 수정 없음
- **별칭과 트리거**: 강제 개선 없이 사용자 정의 자동화
- **명령 기록**: 퍼지 매칭으로 지능적인 리콜
- **탭 완성**: 서버 제공 완성 제안

**전통적인 MUD 형식**으로 친숙한 상태 표시기:
- **상태 표시줄**: 친숙한 형식의 HP/MP/위치
- **프롬프트 사용자 정의**: 사용자 정의 프롬프트 스타일
- **색상 지원**: ANSI 색상 및 터미널 테마
- **호환성**: 기존 MUD 근육 기억과 함께 작동

**Vim 스타일 모달 명령** (선택 기능):
- **모달 편집 패러다임**: 명령 모드와 삽입 모드 간 전환
- **일반 모드**: 기록 탐색, 명령 실행, 버퍼 관리
- **삽입 모드**: 명령 및 채팅을 위한 표준 텍스트 입력
- **명령 모드**: 메타 명령 실행 (`:alias`, `:trigger`, `:settings`)
- **비주얼 모드**: 텍스트 블록 선택 및 조작
- **친숙한 키 바인딩**: `hjkl` 탐색, `dd` 줄 삭제, `yy` 복사
- **버퍼 관리**: `:b1`, `:b2` 등으로 다중 명령 버퍼
- **검색 및 바꾸기**: `/pattern` 검색, `:%s/old/new/g` 바꾸기
- **매크로 녹화**: `q`로 녹화, `@`로 명령 시퀀스 재생
- **분할 창**: `:split` 수평, `:vsplit` 수직 패널
- **탭 관리**: `:tabnew`, `:tabnext`로 다중 세션

**파워 유저를 위한 Vim 모드 장점**:
```typescript
// 터미널 모드에서 Vim 스타일 명령 예시
일반 모드:
  k/j           - 명령 기록 위/아래 탐색
  dd            - 현재 명령 줄 삭제
  yy            - 현재 명령을 클립보드에 복사
  /pattern      - 명령 기록 검색
  :alias gn go north  - 별칭 생성
  :trigger "You are hungry" "eat bread"  - 트리거 생성

삽입 모드:
  i             - 명령 입력을 위한 삽입 모드 진입
  ESC           - 일반 모드로 돌아가기

명령 모드:
  :w            - 현재 세션 저장
  :q            - 우아하게 종료
  :settings     - 설정 패널 열기
  :plugins      - 플러그인 관리
  :help vim     - Vim 키 바인딩 참조
```

**선택적 활성화**:
- **기본적으로 비활성화**: 친숙한 MUD 경험 유지
- **쉬운 토글**: `:set vim`으로 활성화, `:set novim`으로 비활성화
- **프로필별 설정**: 특정 사용자 프로필에서 활성화 가능
- **학습 곡선**: 도움 힌트로 부드러운 소개
- **폴백 모드**: 필요한 경우 항상 표준 편집으로 폴백

### 모드 전환

**완벽한 전환**: 플레이어가 모드 간 즉시 전환 가능:
- **키보드 단축키**: `Ctrl+Alt+M`으로 모드 간 토글
- **음성 명령**: "터미널 모드로 전환" 또는 "전자책 모드로 전환"
- **설정 메뉴**: 모드별 사용자 정의로 지속적인 기본 설정
- **상황 인식**: 일부 플레이어는 탐험에는 전자책, 전투에는 터미널을 선호

**공유 기능**: 두 모드 모두 동일한 기본 Facts 시스템 사용:
- **동일한 게임 데이터**: 세계 정보에 동일한 액세스
- **동일한 XMPP 연결**: 재연결 불필요
- **동일한 접근성 기능**: 두 모드 모두에서 스크린 리더 작동
- **동일한 명령 처리**: 두 인터페이스 모두에서 모든 명령 사용 가능

### 모드 비교

| 특징 | 전자책 모드 | 터미널 호환성 모드 |
|------|-------------|-------------|
| **대상 사용자** | 신규 플레이어, 내러티브 집중 | MUD 베테랑, 효율성 집중 |
| **타이포그래피** | Zilla Slab 세리프, 16-18pt | 등폭 옵션, 12-14pt |
| **레이아웃** | 중앙 열, 넓은 여백 | 전폭, 최소 여백 |
| **텍스트 표시** | 타자기 효과, 속도 조절 | 즉시 표시, 제로 지연 |
| **명령 입력** | 풍부화 ("say hello" → 문학적 산문) | 원시 입력 ("say hello" → "You say, 'hello'") |
| **시각적 스타일** | 따뜻한 종이, 책 같은 느낌 | 터미널, 고대비 |
| **정보 밀도** | 분위기 있는, 서술적 | 컴팩트, 구조화된 |
| **키보드 탐색** | 읽기 중심 단축키 | 광범위한 MUD 단축키 + 선택적 Vim 모드 |
| **애니메이션 지연** | 선택적 타자기 효과 | 없음, 즉시 표시 |
| **모달 편집** | 해당 없음 | 선택적 Vim 스타일 모달 명령 |
| **접근성** | 읽기 중심, 몰입형 | 효율성 중심, 구조화된 |

### 두 세계의 장점

**통합 경험**: 동일한 Facts 시스템이 두 모드 모두를 구동하여 다음을 보장:
- **모든 인터페이스에서 일관된 게임 상태**
- **공정한 플레이** - 어느 모드에도 이점 없음
- **접근 가능한 설계** - 두 모드 모두 스크린 리더 지원
- **플레이어 선택** - 기분, 상황 또는 선호도에 따라 전환

**기술적 구현**: 모드 전환은 순전히 클라이언트 측:
```typescript
// 단일 Facts 처리, 다중 프레젠테이션 모드
interface PresentationMode {
  renderFacts(facts: Fact[]): string;
  getInputStyle(): InputStyle;
  getTypography(): Typography;
}

const ebookMode: PresentationMode = {
  renderFacts: (facts) => enrichedNarrativeRenderer(facts),
  getInputStyle: () => ({ typewriter: true, enrichment: true }),
  getTypography: () => ({ font: 'Zilla Slab', size: '18px' })
};

const terminalMode: PresentationMode = {
  renderFacts: (facts) => traditionalMudRenderer(facts),
  getInputStyle: () => ({ typewriter: false, enrichment: false }),
  getTypography: () => ({ font: 'monospace', size: '14px' })
};
```

## 타이포그래피 및 시각 디자인

### 폰트 계층
- **본문 텍스트**: Zilla Slab Regular, 16-18pt
- **플레이어 행동**: Zilla Slab Medium, 16-18pt, 구별되는 색상
- **시스템 메시지**: Zilla Slab Light, 14-16pt, 음소거
- **강조**: 중요한 정보에 Zilla Slab SemiBold

### 색상 구성표 (접근성 우선)
```css
/* 기본 테마: 따뜻한 종이 */
--bg-primary: #faf8f5;        /* 따뜻한 종이 흰색 */
--text-primary: #2d2d2d;      /* 풍부한 숯색 */
--text-secondary: #666666;    /* 중간 회색 */
--accent: #8b4513;            /* 따뜻한 갈색 */
--player-action: #1a472a;     /* 깊은 숲 녹색 */

/* 고대비 테마 */
--bg-primary: #000000;        /* 순수한 검정 */
--text-primary: #ffffff;      /* 순수한 흰색 */
--text-secondary: #cccccc;    /* 밝은 회색 */
--accent: #ffff00;            /* 밝은 노란색 */
--player-action: #00ff00;     /* 밝은 녹색 */

/* 다크 테마 */
--bg-primary: #1a1a1a;        /* 깊은 회색 */
--text-primary: #e8e8e8;      /* 따뜻한 흰색 */
--text-secondary: #b0b0b0;    /* 중간 회색 */
--accent: #d4a574;            /* 따뜻한 금색 */
--player-action: #7fb069;     /* 세이지 녹색 */
```

## 접근성 기능

### 스크린 리더 지원
- **의미론적 HTML 구조**로 적절한 제목과 랜드마크 제공
- **라이브 영역**으로 동적 콘텐츠 업데이트
- **모든 시각적 요소에 대한 서술적 대체 텍스트**
- **효율적인 브라우징을 위한 탐색 건너뛰기** 링크
- **논리적 흐름을 위한 읽기 순서 최적화**

### 시각적 접근성
- **색상 대비비에 대한 WCAG AAA 준수**
- **12pt에서 32pt 텍스트까지 작동하는 확장 가능한 UI**
- **고대비 모드** 토글
- **전정 장애가 있는 사용자를 위한 움직임 감소** 옵션
- **명확하게 보이는 포커스 표시기**

### 오디오 기능
- **텍스트 음성 변환을 위한 자연스러운 음성 합성**
- **다양한 유형의 콘텐츠에 대한 오디오 큐**:
  - 새 메시지에 대한 부드러운 차임
  - 플레이어 행동에 대한 구별되는 소리
  - 분위기 있는 몰입을 위한 앰비언트 오디오
- **읽기 속도 제어** (0.5x에서 2x까지)
- **다양한 내레이터 음성으로 음성 선택**

### 입력 방법
- **모든 기능에 대한 키보드 단축키**:
  - `Tab` / `Shift+Tab`: 요소 탐색
  - `Ctrl+L`: 명령 줄 포커스
  - `Ctrl+R`: 마지막 명령 반복
  - `Ctrl+H`: 도움말 액세스
  - `Ctrl+S`: 음성 토글
  - `Ctrl+Plus/Minus`: 글꼴 크기 조정
- **핸즈프리 플레이를 위한 음성 명령**
- **보조 장치를 위한 스위치 탐색** 지원

## 기술적 구현

### Tauri + React 19: 완벽한 기반

**독립형 데스크톱 애플리케이션**: 우리의 문학적 게임 클라이언트는 React 19 프론트엔드와 Rust 백엔드를 결합한 **Tauri 애플리케이션**으로 구축되어 웹 기술로 네이티브 데스크톱 경험을 제공합니다.

**믿을 수 없을 정도로 가벼움**: 약 **10MB**의 다운로드 크기로 대부분의 모바일 앱보다 작지만 브라우저 기반 클라이언트보다 더 강력합니다.

**왜 Tauri + React 19인가?**
- **네이티브 성능**: Rust 백엔드가 시스템 수준 기능 제공
- **현대적 UI**: React 19의 동시성 기능으로 부드러운 애니메이션
- **크로스 플랫폼**: 단일 코드베이스로 Windows, macOS, Linux에서 실행
- **기본적으로 보안**: Tauri의 보안 모델이 많은 웹 취약점 방지
- **시스템 통합**: 웹 클라이언트가 단순히 할 수 없는 깊은 OS 통합

### Rust 백엔드 기능: 다른 MMO가 할 수 없는 것

**시스템 수준 오디오 처리**:
```rust
// 몰입형 사운드스케이프를 위한 실시간 오디오 처리
use cpal::traits::StreamTrait;

pub fn create_spatial_audio_stream(facts: &[Fact]) -> Result<Stream, AudioError> {
    // 대기 데이터를 3D 위치 오디오로 처리
    // 환경에 따른 실시간 필터 적용
    // 하드웨어 가속으로 다중 오디오 소스 믹싱
}
```

**고급 접근성 기능**:
```rust
// 네이티브 스크린 리더 통합
use windows::Win32::UI::Accessibility::*;

pub fn register_accessibility_hooks() {
    // Windows Narrator, macOS VoiceOver와 직접 통합
    // 감정적 억양을 가진 사용자 정의 TTS 음성
    // 고대비 모드를 위한 하드웨어 가속 텍스트 렌더링
}
```

**지능적인 캐싱 및 오프라인 지원**:
```rust
// SQLite 기반 로컬 세계 상태 캐싱
use sqlx::sqlite::SqlitePool;

pub async fn cache_world_state(facts: &[Fact]) -> Result<(), CacheError> {
    // 오프라인 검토를 위한 세계 상태의 지능적 캐싱
    // 가능한 콘텐츠의 예측적 사전 로딩
    // 대역폭을 최소화하는 효율적인 차이 기반 업데이트
}
```

**하드웨어 통합**:
```rust
// 몰입형 피드백을 위한 직접 하드웨어 액세스
use gilrs::{Gilrs, GamepadId};

pub fn initialize_haptic_feedback() -> Result<HapticController, HardwareError> {
    // 전투 피드백을 위한 게임 컨트롤러 진동
    // 다양한 이벤트에 대한 사용자 정의 촉각 패턴
    // 전문화된 접근성 하드웨어와의 통합
}
```

### 웹 클라이언트가 단순히 일치시킬 수 없는 기능

**🔊 실시간 오디오 처리**
- **공간 오디오**: 세계 좌표에 기반한 3D 위치 사운드
- **동적 믹싱**: 환경에 따른 실시간 오디오 필터 (동굴의 에코, 물속의 음소거)
- **사용자 정의 음성 합성**: 캐릭터 기분에 따른 TTS의 감정적 억양
- **하드웨어 가속**: 제로 지연 시간 처리를 위한 네이티브 오디오 API

**♿ 고급 접근성**
- **네이티브 스크린 리더 통합**: Windows Narrator, macOS VoiceOver에 직접 API 액세스
- **시스템 수준 키보드 후크**: 앱이 포커스되지 않아도 작동하는 전역 핫키
- **하드웨어 장치 지원**: 전문화된 접근성 하드웨어와의 직접 통합
- **고성능 텍스트 렌더링**: 품질 손실 없이 GPU 가속 텍스트 확장

**💾 지능적인 로컬 저장소**
- **SQLite 통합**: 세계 상태 및 명령 기록의 효율적인 로컬 캐싱
- **예측적 사전 로딩**: 플레이어 패턴을 기반으로 가능한 콘텐츠 예측
- **오프라인 모드**: 연결이 끊어진 상태에서 과거 세션 검토 및 명령 준비
- **암호화된 저장소**: 민감한 게임 데이터의 안전한 로컬 저장소

**🎮 시스템 통합**
- **게임 컨트롤러 지원**: 사용자 정의 촉각 피드백을 가진 네이티브 게임패드 통합
- **OS 알림**: 중요한 게임 이벤트에 대한 시스템 수준 알림
- **파일 시스템 액세스**: 게임 로그, 스크린샷, 구성의 가져오기/내보내기
- **전원 관리**: 노트북 게임을 위한 스마트 배터리 최적화

**⚡ 성능 이점**
- **네이티브 멀티스레딩**: 부드러운 UI 업데이트를 위한 Rust의 두려움 없는 동시성
- **제로 복사 파싱**: 대용량 Facts 배치의 효율적인 처리
- **GPU 가속**: 하드웨어 가속 텍스트 렌더링 및 효과
- **메모리 안전성**: 다른 네이티브 클라이언트를 괴롭히는 충돌 방지

### 클라이언트 측 풍부화 엔진
```typescript
interface EnrichmentEngine {
  // 원시 명령을 문학적 산문으로 변환
  enrichCommand(raw: string, context: GameContext): string;

  // 세계 상태를 기반으로 대기 세부사항 추가
  addAtmosphere(location: Location, weather: Weather, time: Time): string;

  // 시스템 메시지를 자연어로 변환
  humanizeSystem(message: SystemMessage): string;

  // 내러티브 일관성 유지
  maintainVoice(text: string, character: Character): string;
}
```

### 향상된 타자기 효과
- **하드웨어 가속 렌더링**: 대용량 텍스트 블록에도 부드러운 애니메이션
- **구성 가능한 속도** (10-100 WPM)로 문자별 타이밍 제어
- **지능적인 일시 정지**: 구두점과 문장 구조를 기반으로 한 자연스러운 리듬
- **접근성 통합**: 원활한 스크린 리더 동기화
- **오디오 동기화**: 완벽한 타이밍을 위한 TTS와 조정

### 고급 상태 관리
- **지속적인 설정**: 접근성 기본 설정을 위한 암호화된 로컬 저장소
- **지능적인 명령 기록**: 전문 텍스트 검색을 가진 SQLite 기반 기록
- **세션 복원**: 완전한 컨텍스트로 중단된 게임 재개
- **오프라인 모드**: 연결이 끊어진 상태에서 과거 세션 검토 및 명령 준비
- **예측적 캐싱**: 플레이어 패턴을 기반으로 가능한 콘텐츠 사전 로딩

## 고급 기능: 별칭, 트리거 및 플러그인 시스템

### 완전한 별칭 및 트리거 지원

**하드코어 MUD 애호가 기능**: 우리는 Mudlet과 같은 클라이언트를 그렇게 인기 있게 만드는 파워 유저 기능을 현대적인 타입 안전성과 성능으로 구현하여 완전히 지원합니다.

**별칭**: 간단한 키 입력을 복잡한 명령으로 변환
```typescript
// 간단한 텍스트 교체
addAlias("gn", "go north");
addAlias("k", "kill");

// 변수 치환
addAlias("k %1", "kill $1");
addAlias("tell %1 %2", "tell $1 $2");

// 스크립팅을 가진 다중 라인 별칭
addAlias("heal", `
  if (health < 50) {
    cast('heal');
    drink('health potion');
  }
`);
```

**트리거**: 특정 게임 이벤트에 자동으로 반응
```typescript
// 텍스트 패턴 트리거
addTrigger("^You are hungry", "eat bread");
addTrigger("^(.+) enters the room", "say Welcome, $1!");

// Fact 기반 트리거 (우리의 풍부한 데이터 활용)
addTrigger((fact) => {
  if (fact.kind === 'event' && fact.subject?.type === 'COMBAT_ATTACK') {
    if (fact.subject.target === myActor.id) {
      return "dodge"; // 공격받을 때 자동 회피
    }
  }
});

// 복잡한 조건부 트리거
addTrigger((facts) => {
  const combatFacts = facts.filter(f => f.kind === 'event' && f.subject?.type?.includes('COMBAT'));
  if (combatFacts.length > 0) {
    enableCombatMode();
    return "wield sword";
  }
});
```

**고급 트리거 기능**:
- **정규 표현식 지원**: 완전한 정규 표현식 패턴 매칭
- **Fact 기반 트리거**: 단순한 텍스트가 아닌 구조화된 게임 이벤트에 반응
- **조건부 논리**: 복잡한 if/then/else 시나리오
- **속도 제한**: 쿨다운 타이머로 스팸 방지
- **우선순위 시스템**: 트리거 실행 순서 제어
- **상태 관리**: 트리거별 변수 유지

### 타입 안전 클라이언트 플러그인 시스템

**현대적인 플러그인 아키텍처**: 전통적인 MUD 클라이언트와 달리, 우리의 플러그인 시스템은 완전한 타입 안전성과 IDE 지원을 위해 TypeScript로 구축됩니다.

```typescript
// 완전한 타입 안전성을 가진 플러그인 인터페이스
interface FluxPlugin {
  name: string;
  version: string;
  author: string;

  // 라이프사이클 후크
  onInitialize?(context: PluginContext): void;
  onFactsReceived?(facts: Fact[], context: PluginContext): void;
  onCommandSent?(command: string, context: PluginContext): string | void;
  onModeChanged?(mode: 'ebook' | 'terminal', context: PluginContext): void;

  // UI 확장
  renderUI?(container: HTMLElement): void;

  // 사용자 정의 트리거 및 별칭
  triggers?: TriggerDefinition[];
  aliases?: AliasDefinition[];
}

// 풍부한 API 액세스를 가진 플러그인 컨텍스트
interface PluginContext {
  // 게임 상태 액세스
  getWorldState(): WorldState;
  getPlayerState(): PlayerState;

  // 명령 실행
  sendCommand(command: string): void;

  // UI 조작
  displayMessage(message: string, style?: MessageStyle): void;
  createNotification(text: string, type: 'info' | 'warning' | 'error'): void;

  // 저장소
  getPluginData<T>(key: string): T | undefined;
  setPluginData<T>(key: string, value: T): void;

  // 이벤트 시스템
  on<T>(event: string, handler: (data: T) => void): void;
  emit<T>(event: string, data: T): void;
}
```

**플러그인 예시**:

```typescript
// 전투 지원 플러그인
const CombatAssistant: FluxPlugin = {
  name: "전투 지원",
  version: "1.0.0",
  author: "커뮤니티",

  onFactsReceived(facts, context) {
    const combatFacts = facts.filter(f =>
      f.kind === 'event' && f.subject?.type?.includes('COMBAT')
    );

    if (combatFacts.length > 0) {
      this.analyzeCombat(combatFacts, context);
    }
  },

  analyzeCombat(facts, context) {
    // 체력이 낮을 때 자동 치유
    const healthFact = facts.find(f => f.subject?.health);
    if (healthFact?.subject?.health < 30) {
      context.sendCommand('cast heal');
    }
  }
};

// 지도 플러그인
const AutoMapper: FluxPlugin = {
  name: "자동 지도",
  version: "1.0.0",
  author: "커뮤니티",

  onFactsReceived(facts, context) {
    const movementFacts = facts.filter(f =>
      f.kind === 'event' && f.subject?.type === 'ACTOR_DID_MOVE'
    );

    movementFacts.forEach(fact => {
      this.updateMap(fact.subject, context);
    });
  },

  renderUI(container) {
    // 대화형 지도 위젯 렌더링
    const mapDiv = document.createElement('div');
    mapDiv.className = 'minimap';
    container.appendChild(mapDiv);
  }
};
```

**플러그인 배포**:
- **내장 플러그인 관리자**: 간단한 UI로 설치/제거
- **커뮤니티 저장소**: 다른 플레이어와 플러그인 공유
- **버전 관리**: 자동 업데이트 및 종속성 해결
- **보안 샌드박싱**: 플러그인이 격리된 컨텍스트에서 실행
- **성능 모니터링**: 플러그인 리소스 사용량 추적

### 선택적 기능 및 사용자 정의

**완전히 구성 가능한 경험**: 모든 향상 기능은 선택적이며 플레이어 기본 설정에 맞게 조정할 수 있습니다.

#### 타자기 텍스트 효과
```typescript
interface TypewriterSettings {
  enabled: boolean;           // 기본값: 전자책 모드에서 true, 터미널에서 false
  speed: number;              // 10-100 WPM, 기본값: 60
  pauseOnPunctuation: boolean; // 기본값: true
  skipOnScroll: boolean;      // 기본값: true
  audioCues: boolean;         // 기본값: false
}
```

**타자기 사용자 정의**:
- **속도 제어**: 10 WPM (드라마틱)에서 100 WPM (효율적)까지
- **구두점 일시 정지**: 자연스러운 리듬 또는 일정한 속도
- **건너뛰기 트리거**: 스크롤, 클릭 또는 키 입력으로 애니메이션 건너뛰기
- **오디오 동기화**: 완벽한 타이밍을 위한 TTS와 조정
- **접근성 재정의**: 스크린 리더에 대해 자동으로 비활성화

#### LLM을 통한 입력 풍부화
```typescript
interface EnrichmentSettings {
  enabled: boolean;           // 기본값: false (옵트인)
  model: 'gpt-4' | 'claude' | 'local'; // 기본값: 'local'
  creativityLevel: number;    // 0-100, 기본값: 50
  preserveIntent: boolean;    // 기본값: true
  contextWindow: number;      // 컨텍스트 줄 수, 기본값: 10
}
```

**입력 풍부화 기능**:
- **완전히 선택적**: 기본적으로 비활성화, 명시적 옵트인
- **의도 보존**: 명령의 의미를 절대 바꾸지 않음
- **컨텍스트 인식**: 더 나은 풍부화를 위해 최근 대화 사용
- **다중 모델**: 다양한 AI 제공자 또는 로컬 모델 지원
- **창의성 제어**: 효율성과 문학적 멋 사이의 조절

**풍부화 예시**:
```typescript
// 풍부화 없음 (기본값)
입력: "say hello"
출력: "You say, 'hello'"

// 풍부화 있음 (선택사항)
입력: "say hello"
컨텍스트: [긴 여행 후 피곤함에 대한 이전 대화]
출력: "당신은 지친 듯하지만 진심 어린 미소를 지으며 말합니다. '안녕하세요,'
      라고 말하며, 당신의 목소리에는 최근 여행의 피로가 담겨 있습니다."
```

### 구성 및 기본 설정

**세밀한 제어**: 모든 기능을 독립적으로 구성할 수 있습니다:

```typescript
interface ClientPreferences {
  // 모드 설정
  defaultMode: 'ebook' | 'terminal';

  // 텍스트 프레젠테이션
  typewriter: TypewriterSettings;
  enrichment: EnrichmentSettings;

  // 접근성
  accessibility: AccessibilitySettings;

  // 고급 기능
  aliases: AliasDefinition[];
  triggers: TriggerDefinition[];
  plugins: PluginConfiguration[];

  // 전투 로그
  combatLog: CombatLogSettings;
}
```

**프로필 시스템**: 다양한 플레이 스타일을 위한 다양한 구성 저장:
- **몰입형 프로필**: 전자책 모드, 완전한 타자기, 선택적 풍부화
- **효율적인 프로필**: 터미널 모드, 최소 애니메이션, 광범위한 별칭
- **파워 유저 프로필**: Vim 명령을 가진 터미널 모드, 고급 트리거, 플러그인 확장
- **접근 가능한 프로필**: 스크린 리더 및 보조 기술에 최적화
- **전투 프로필**: 트리거 활성화, 전투 로그 표시, 빠른 응답

## 콘텐츠 전략

### 내러티브 보이스
- **일관된 3인칭 시점**으로 몰입 유지
- **풍부한 감각적 세부사항**으로 다중 감각 참여
- **캐릭터 상호작용의 감정적 공명**
- **대기 설명을 통한 환경적 스토리텔링**

### 정보 아키텍처
- **필수 정보**가 쉽게 접근 가능하도록 유지
- **점진적 공개**로 인지 과부하 방지
- **필요할 때 도움을 제공하는 상황별 도움말**
- **핵심 기능이 모든 곳에서 작동하는 우아한 성능 저하**

## 사용자 경험 흐름

### 초회 플레이어
1. **온보딩 중 접근성 기본 설정** 설정
2. **내러티브 컨텍스트를 가진 튜토리얼 통합**
3. **풍부화 기능의 부드러운 소개**
4. **최적의 경험을 위한 사용자 정의 지침**

### 재방문 플레이어
1. **컨텍스트 알림을 가진 원활한 세션 복원**
2. **장치 간 기본 설정 동기화**
3. **새로운 기능의 점진적 향상**
4. **근육 기억을 유지하는 친숙한 상호작용 패턴**

## 성공 지표

### 접근성 지표
- **스크린 리더 호환성** 테스트 점수
- **키보드 탐색** 효율성 측정
- **사용자 기본 설정 채택** 비율
- **접근성 피드백** 만족도 점수

### 참여 지표
- **세션 지속 시간** 및 참여 깊이
- **텍스트 대 행동 비율**로 내러티브 풍부함 측정
- **다양한 접근성 요구에 걸친 플레이어 유지**
- **몰입 품질에 대한 커뮤니티 피드백**

## 사용자 정의 클라이언트 개발: 열린 생태계

### 범용 프로토콜이 플레이어 혁신을 가능하게 함

우리 Facts 시스템의 가장 강력한 측면 중 하나는 플레이어가 자신만의 사용자 정의 게임 클라이언트를 구축할 수 있는 **범용 프로토콜**을 만든다는 것입니다. 아키텍처는 보안과 내러티브 일관성을 유지하면서 완전히 개방적이고 확장 가능하도록 설계되었습니다.
