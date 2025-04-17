아래 예시는 프로젝트 요구사항에 맞춰 각 화면(또는 모듈)에서 어떤 기능과 어떤 컴포넌트들이 필요한지 간략하게 정리한 것입니다. 
---
## 1. 대시보드(Dashboard)
### 화면 개요
- 전체 AGV 운영 현황과 시스템 상태를 직관적으로 파악할 수 있는 메인 화면  
- 현재 활성화된 AGV, 진행 중인 작업(Task), 시스템 알림 등을 한눈에 확인 가능
### 주요 기능
1. AGV 요약 현황  
   - 등록된 AGV 대수, 가동 중인 AGV 수, 대기 중인 AGV 수 표시  
   - 각 AGV별 상태(충전, 이동, 정지 등) 요약 
2. 진행 중인 작업(Task) 요약  
   - 현재 스케줄러에서 할당된 작업 리스트  
   - 작업 우선순위, 예상 완료 시간, 할당된 AGV 정보 등 표시  
3. 시스템 알림/이벤트 로그  
   - 장애나 에러, 중요 이벤트 알림을 대시보드에서 즉시 확인  
4. 빠른 이동(Quick Access)  
   - 관리자 설정에 따라 자주 접근하는 기능(예: 스케줄링 화면, 맵 에디터 등)으로 이동할 수 있는 단축 메뉴
### 주요 컴포넌트
- AGV 상태 카드(Card) 혹은 리스트(List) 컴포넌트  
  - AGV 정보를 시각적으로 표시(아이콘, AGV 이름, 상태 등)
- 작업(Task) 리스트 테이블 혹은 카드  
  - 작업 우선순위, 예상 소요 시간, 진행도 등 표시
- 알림(Notification) 컴포넌트  
  - 실시간 장애, 경고, 중요 이벤트 팝업/리스트
- 그래프/차트(간단한 통계)  
  - 하루/주간 운영 현황 요약 그래프, 간단한 파이차트나 바차트
---
## 2. 맵 에디터 및 라우팅(Map & Routing View)
### 화면 개요
- n x n 그리드 맵에서 AGV 이동 경로 시뮬레이션 및 편집이 가능한 화면  
- Dijkstra 알고리즘을 적용해 최적 경로를 계산하고, 경로 시각화
### 주요 기능
1. 맵 편집(에디터) 기능  
   - 장애물(Obstacle), 충전소(Charging Station), 작업 구역(Workstation) 등을 자유롭게 배치/수정  
   - 맵 저장/불러오기
2. 경로 계산 및 시각화  
   - Dijkstra 알고리즘으로 특정 지점 간 최적 경로 계산  
   - 계산된 경로를 맵 위에 시각적으로 표시  
3. AGV 이동 시뮬레이션  
   - 실제 AGV가 이동한다고 가정하고 맵 위에서 경로를 따라 움직이는 애니메이션  
   - 경로 이동 중 예상 시간, 거리, 사용 에너지(충전 고려) 등 표시
### 주요 컴포넌트
- 맵 그리드(Grid) 컴포넌트  
  - HTML5 Canvas, SVG, 혹은 React 기반의 라이브러리(예: react-canvas, react-three-fiber 등)를 활용  
  - 각 셀(또는 노드)의 속성(빈 공간, 장애물, 출입금지, 충전소 등)을 편집
- 경로 하이라이트(Path Highlight) 컴포넌트  
  - 계산된 경로를 시각적으로 강조  
  - 경로 상의 각 노드(또는 셀)의 방문 순서나 비용 정보 표시 가능
- 도구 패널(Tool Panel)  
  - 장애물 추가, 충전소 추가, Task 포인트 지정 등의 액션 버튼  
- 맵 저장/불러오기  
  - JSON, CSV 등 다양한 형식으로 맵 구조를 Import/Export  
---
## 3. 작업 할당/스케줄링 화면(Task Scheduling & Dispatch)
### 화면 개요
- Task(운송 작업) 생성, 관리, AGV 할당, 스케줄링 전략 설정 등을 종합적으로 처리하는 화면  
- Naive, FIFO 방식 등 다양한 스케줄링 로직을 시나리오별로 적용 가능
### 주요 기능
1. 작업(Task) 생성 및 관리  
   - 작업 이름, 위치(출발지/도착지), 우선순위, 마감 시간 등 상세 정보 입력  
2. 스케줄링 알고리즘 선택  
   - Naive, FIFO 등 미리 설정된 알고리즘을 선택해 자동 할당  
   - 향후 알고리즘 추가/확장 가능성을 고려(Plug-in 방식)
3. AGV 할당/재할당  
   - 자동 혹은 수동으로 특정 AGV에 작업 할당  
   - 작업 중 우선순위 변경 시 재할당 로직 적용
4. 실시간 진행 상황 모니터링  
   - 현재 진행 중인 작업, 대기 중인 작업 목록 표시  
   - 각 작업별 예상 완료 시간, 작업 진행도 표시
### 주요 컴포넌트
- 작업 리스트/테이블  
  - 생성된 작업을 페이징/필터링/정렬 기능과 함께 표시  
  - 우선순위, 할당 상태, 할당된 AGV 등 주요 필드를 열로 구성
- 스케줄링 알고리즘 선택 드롭다운  
  - Naive, FIFO, (추후 추가될) Other Algorithms 등
- AGV 할당 UI  
  - 드래그앤드롭, 혹은 테이블 내 버튼 클릭 방식  
  - 재할당/취소 기능 포함
- 상태 모니터(Progress Bar, Status Tag 등)  
  - 작업별 상태를 시각적으로 표현
---
## 4. 시뮬레이션 실행/제어 화면(Simulation Control)
### 화면 개요
- 실제로 AGV들이 생성된 작업을 수행하는 시뮬레이션을 실행, 중지, 일시정지, 재개 등을 컨트롤할 수 있는 화면  
- Dispatcher, Router, Scheduler 모듈이 어떻게 동작하는지 확인 가능
### 주요 기능
1. 시뮬레이션 실행 및 종료  
   - 일정 시간(시뮬레이션 시계)에 따라 AGV가 작업을 수행  
2. 속도 조절  
   - 시뮬레이션 시간 배속(1x, 2x, 4x 등)  
3. AGV 상태 모니터링  
   - 각 AGV의 위치, 배터리 잔량, 이동 경로, 현재 작업 상태  
4. 이벤트 로그 확인  
   - 작업 완료, 충전 시작/종료, 장애물 충돌 등 시뮬레이션 중 발생하는 이벤트
### 주요 컴포넌트
- 시뮬레이션 컨트롤 패널  
  - Play/Stop/Pause/Resume 등 버튼  
  - 속도 조절 슬라이더/버튼
- AGV 실시간 상태 표시 컴포넌트  
  - 리스트 형태 혹은 맵 상에서 아이콘으로 표기  
- 이벤트 로그 창  
  - 시뮬레이션 중 발생한 주요 이벤트의 시간, 유형, 상세 내용 표시
---
## 5. 3D 시뮬레이션 및 통계 시각화(Frontend Visualization)
### 화면 개요
- Plotly를 활용해 3D 애니메이션 형태로 AGV 움직임을 시각화하거나, 시뮬레이션 결과를 그래프로 분석  
- 운영자/관리자/설계자가 한눈에 시뮬레이션 결과를 직관적으로 파악
### 주요 기능
1. 3D 애니메이션  
   - 시간에 따라 AGV가 맵에서 이동하는 모습을 3D로 표현  
   - 시뮬레이션 재생/멈춤/배속 조절
2. 시뮬레이션 결과 통계 시각화  
   - 작업별 이동 경로, 이동 거리, 처리 시간 등의 지표를 시각적 그래프/차트로 표현  
   - Scatter plot, Bar chart, Line chart 등 다양한 차트 유형 지원  
3. 드릴다운 기능  
   - 특정 AGV나 특정 Task를 클릭하면, 세부 정보를 확인할 수 있는 팝업/툴팁 등 제공
### 주요 컴포넌트
- 3D 시뮬레이션 뷰어(Plotly의 3D Scatter, 3D Surface 등 활용)  
  - 맵 형태(지형 또는 평면), AGV 위치를 좌표로 매핑  
- 차트/그래프 컴포넌트  
  - AGV 이동 궤적(Time Series), 작업 처리량(Bar/Line), 총 이동거리/소요시간 비교
- 툴팁/상세 팝업  
  - 마우스 오버 시 해당 지점의 시간, AGV 상태 등 상세 정보 표시