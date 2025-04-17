/**
* visualization.js - 3D 시뮬레이션 및 통계 시각화 페이지 스크립트
*/

// 시각화 컨트롤러 클래스
class VisualizationController {
constructor() {
  // 애니메이션 상태
  this.isPlaying = false;
  this.animationSpeed = 1;
  this.animationTime = 0;
  this.animationInterval = null;

  // 3D 시각화 설정
  this.showObstacles = true;
  this.showPaths = true;
  this.showLabels = true;
  this.showSurface = true;
  this.viewMode = '3d';

  // 하이라이트 설정
  this.highlightedAgv = null;
  this.highlightedTask = null;

  // 시뮬레이션 데이터
  this.simulationData = null;
  this.agvs = [];
  this.tasks = [];
  this.events = [];
  this.mapData = [];

  // 3D 플롯 객체
  this.plot3d = null;

  // 통계 차트 객체
  this.taskCompletionChart = null;
  this.agvUtilizationChart = null;
  this.waitingTimeChart = null;
  this.batteryUsageChart = null;
  this.movementTrackPlot = null;
  this.distanceTimeChart = null;
  this.efficiencyChart = null;

  // 이벤트 리스너 설정
  this.setupEventListeners();

  // 초기 데이터 로드 및 시각화
  this.loadDemoData();
}

/**
* 이벤트 리스너 설정
*/
setupEventListeners() {
  // 탭 전환 이벤트
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      this.switchTab(button.getAttribute('data-tab'));
    });
  });

  // 3D 시뮬레이션 제어 버튼
  document.getElementById('play3dButton').addEventListener('click', () => {
    this.playAnimation();
  });

  document.getElementById('pause3dButton').addEventListener('click', () => {
    this.pauseAnimation();
  });

  document.getElementById('reset3dButton').addEventListener('click', () => {
    this.resetAnimation();
  });

  // 애니메이션 속도 버튼
  const speedButtons = document.querySelectorAll('.speed-btn');
  speedButtons.forEach(button => {
    button.addEventListener('click', () => {
      this.setAnimationSpeed(parseFloat(button.getAttribute('data-speed')));
    });
  });

  // 표시 설정 체크박스
  document.getElementById('showObstacles').addEventListener('change', (e) => {
    this.showObstacles = e.target.checked;
    this.update3dVisualization();
  });

  document.getElementById('showPaths').addEventListener('change', (e) => {
    this.showPaths = e.target.checked;
    this.update3dVisualization();
  });

  document.getElementById('showLabels').addEventListener('change', (e) => {
    this.showLabels = e.target.checked;
    this.update3dVisualization();
  });

  document.getElementById('showSurface').addEventListener('change', (e) => {
    this.showSurface = e.target.checked;
    this.update3dVisualization();
  });

  // 보기 모드 변경
  document.getElementById('viewMode').addEventListener('change', (e) => {
    this.viewMode = e.target.value;
    this.update3dVisualization();
  });

  // AGV 하이라이트
  document.getElementById('highlightAgv').addEventListener('change', (e) => {
    this.highlightedAgv = e.target.value || null;
    this.update3dVisualization();
    this.updateAgvInfo();
  });

  // 작업 하이라이트
  document.getElementById('highlightTask').addEventListener('change', (e) => {
    this.highlightedTask = e.target.value || null;
    this.update3dVisualization();
    this.updateTaskInfo();
  });

  // 이동 궤적 AGV 선택
  document.getElementById('trackAgvSelect').addEventListener('change', (e) => {
    this.updateMovementTrackPlot(e.target.value);
  });

  // 데이터 불러오기 버튼
  document.getElementById('loadDataButton').addEventListener('click', () => {
    document.getElementById('loadDataModal').style.display = 'block';
  });

  // 데이터 내보내기 버튼
  document.getElementById('exportDataButton').addEventListener('click', () => {
    this.exportVisualizationData();
  });

  // 데이터 불러오기 확인 버튼
  document.getElementById('confirmLoadButton').addEventListener('click', () => {
    this.loadDataFromUserInput();
  });

  // 모달 닫기 버튼
  const modalCloses = document.querySelectorAll('.modal-close');
  modalCloses.forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modal = closeBtn.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });

  // 모달 외부 클릭 시 닫기
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // 윈도우 리사이즈 이벤트
  window.addEventListener('resize', debounce(() => {
    this.resizeCharts();
  }, 250));
}

/**
* 탭 전환
* @param {string} tabName - 활성화할 탭 이름
*/
switchTab(tabName) {
  // 모든 탭 버튼 비활성화
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });

  // 모든 탭 콘텐츠 숨기기
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabPanes.forEach(pane => {
    pane.classList.remove('active');
  });

  // 선택한 탭 활성화
  const selectedButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (selectedButton) {
    selectedButton.classList.add('active');
  }

  const selectedPane = document.getElementById(`${tabName}-tab`);
  if (selectedPane) {
    selectedPane.classList.add('active');
  }

  // 탭 전환 시 필요한 차트 초기화
  if (tabName === 'statistics' && this.simulationData) {
    this.initializeStatisticsCharts();
  } else if (tabName === 'tracks' && this.simulationData) {
    this.initializeTrackCharts();
  } else if (tabName === '3d-view' && this.simulationData) {
    // 3D 뷰 리사이즈 트리거
    this.resizeCharts();
  }
}

/**
* 데모 데이터 로드
*/
loadDemoData() {
  // 맵 데이터 생성 및 초기화 코드는 유지 
  // 실제 구현에서는 데모 데이터를 서버에서 가져오거나 미리 정의된 데이터 사용
  // 여기서는 간단한 예시 데이터 생성

  // 맵 데이터
  const gridSize = 20;
  this.mapData = Array(gridSize).fill().map(() => Array(gridSize).fill(0));

  // 테두리 벽 생성
  for (let i = 0; i < gridSize; i++) {
    this.mapData[0][i] = 1; // 상단 벽
    this.mapData[gridSize - 1][i] = 1; // 하단 벽
    this.mapData[i][0] = 1; // 좌측 벽
    this.mapData[i][gridSize - 1] = 1; // 우측 벽
  }

  // 내부 장애물, 충전소, 작업장 추가
  this.mapData[5][5] = 1;
  this.mapData[5][6] = 1;
  this.mapData[6][5] = 1;
  this.mapData[15][15] = 1;
  this.mapData[14][15] = 1;
  this.mapData[15][14] = 1;

  this.mapData[3][3] = 2; // 충전소
  this.mapData[3][16] = 2;
  this.mapData[16][3] = 2;
  this.mapData[16][16] = 2;

  this.mapData[8][8] = 3; // 작업장
  this.mapData[8][12] = 3;
  this.mapData[12][8] = 3;
  this.mapData[12][12] = 3;

  // AGV 데이터
  this.agvs = [
    {
      id: 'AGV-001',
      positions: [
        [3, 3, 0],  // 초기 위치 (충전소)
        [3, 4, 1],
        [3, 5, 2],
        [4, 5, 3],
        [5, 5, 4],
        [6, 5, 5],
        [7, 5, 6],
        [8, 5, 7],
        [8, 6, 8],
        [8, 7, 9],
        [8, 8, 10], // 작업장 도착
        [9, 8, 11],
        [10, 8, 12],
        [11, 8, 13],
        [12, 8, 14], // 작업장 도착
        [12, 9, 15],
        [12, 10, 16],
        [12, 11, 17],
        [12, 12, 18], // 작업장 도착
        [11, 12, 19],
        [10, 12, 20],
        [9, 12, 21],
        [8, 12, 22], // 작업장 도착
        [7, 12, 23],
        [6, 12, 24],
        [5, 12, 25],
        [4, 12, 26],
        [3, 12, 27],
        [3, 13, 28],
        [3, 14, 29],
        [3, 15, 30],
        [3, 16, 31] // 충전소 도착
      ],
      battery: [
        100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90,
        89, 88, 87, 86, 85, 84, 83, 82, 81, 80,
        79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69
      ],
      status: [
        'idle', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active',
        'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active',
        'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'charging'
      ],
      tasks: ['TASK-001', 'TASK-002', 'TASK-003', 'TASK-004']
    },
    {
      id: 'AGV-002',
      positions: [
        [16, 3, 0], // 초기 위치 (충전소)
        [15, 3, 1],
        [14, 3, 2],
        [13, 3, 3],
        [12, 3, 4],
        [12, 4, 5],
        [12, 5, 6],
        [12, 6, 7],
        [12, 7, 8],
        [12, 8, 9], // 작업장 도착
        [11, 8, 10],
        [10, 8, 11],
        [9, 8, 12],
        [8, 8, 13], // 작업장 도착
        [8, 9, 14],
        [8, 10, 15],
        [8, 11, 16],
        [8, 12, 17], // 작업장 도착
        [9, 12, 18],
        [10, 12, 19],
        [11, 12, 20],
        [12, 12, 21], // 작업장 도착
        [13, 12, 22],
        [14, 12, 23],
        [15, 12, 24],
        [16, 12, 25],
        [16, 13, 26],
        [16, 14, 27],
        [16, 15, 28],
        [16, 16, 29] // 충전소 도착
      ],
      battery: [
        95, 94, 93, 92, 91, 90, 89, 88, 87, 86,
        85, 84, 83, 82, 81, 80, 79, 78, 77, 76,
        75, 74, 73, 72, 71, 70, 69, 68, 67, 66
      ],
      status: [
        'idle', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active',
        'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active',
        'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'charging'
      ],
      tasks: ['TASK-005', 'TASK-006', 'TASK-007', 'TASK-008']
    },
    {
      id: 'AGV-003',
      positions: [
        [16, 16, 0], // 초기 위치 (충전소)
        [15, 16, 1],
        [14, 16, 2],
        [13, 16, 3],
        [12, 16, 4],
        [12, 15, 5],
        [12, 14, 6],
        [12, 13, 7],
        [12, 12, 8], // 작업장 도착
        [11, 12, 9],
        [10, 12, 10],
        [9, 12, 11],
        [8, 12, 12], // 작업장 도착
        [7, 12, 13],
        [6, 12, 14],
        [5, 12, 15],
        [5, 11, 16],
        [5, 10, 17],
        [5, 9, 18],
        [5, 8, 19]  // 고장 발생
      ],
      battery: [
        90, 89, 88, 87, 86, 85, 84, 83, 82, 81,
        80, 79, 78, 77, 76, 75, 74, 73, 72, 10
      ],
      status: [
        'idle', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active',
        'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'maintenance'
      ],
      tasks: ['TASK-009', 'TASK-010']
    }
  ];

  // 작업 데이터
  this.tasks = [
    {
      id: 'TASK-001',
      startPoint: [3, 3],
      endPoint: [8, 8],
      assignedTo: 'AGV-001',
      status: 'completed',
      priority: 'high',
      startTime: 0,
      endTime: 10
    },
    {
      id: 'TASK-002',
      startPoint: [8, 8],
      endPoint: [12, 8],
      assignedTo: 'AGV-001',
      status: 'completed',
      priority: 'medium',
      startTime: 10,
      endTime: 14
    },
    {
      id: 'TASK-003',
      startPoint: [12, 8],
      endPoint: [12, 12],
      assignedTo: 'AGV-001',
      status: 'completed',
      priority: 'medium',
      startTime: 14,
      endTime: 18
    },
    {
      id: 'TASK-004',
      startPoint: [12, 12],
      endPoint: [8, 12],
      assignedTo: 'AGV-001',
      status: 'completed',
      priority: 'low',
      startTime: 18,
      endTime: 22
    },
    {
      id: 'TASK-005',
      startPoint: [16, 3],
      endPoint: [12, 8],
      assignedTo: 'AGV-002',
      status: 'completed',
      priority: 'high',
      startTime: 0,
      endTime: 9
    },
    {
      id: 'TASK-006',
      startPoint: [12, 8],
      endPoint: [8, 8],
      assignedTo: 'AGV-002',
      status: 'completed',
      priority: 'low',
      startTime: 9,
      endTime: 13
    },
    {
      id: 'TASK-007',
      startPoint: [8, 8],
      endPoint: [8, 12],
      assignedTo: 'AGV-002',
      status: 'completed',
      priority: 'medium',
      startTime: 13,
      endTime: 17
    },
    {
      id: 'TASK-008',
      startPoint: [8, 12],
      endPoint: [12, 12],
      assignedTo: 'AGV-002',
      status: 'completed',
      priority: 'high',
      startTime: 17,
      endTime: 21
    },
    {
      id: 'TASK-009',
      startPoint: [16, 16],
      endPoint: [12, 12],
      assignedTo: 'AGV-003',
      status: 'completed',
      priority: 'high',
      startTime: 0,
      endTime: 8
    },
    {
      id: 'TASK-010',
      startPoint: [12, 12],
      endPoint: [8, 12],
      assignedTo: 'AGV-003',
      status: 'completed',
      priority: 'medium',
      startTime: 8,
      endTime: 12
    },
    {
      id: 'TASK-011',
      startPoint: [8, 12],
      endPoint: [5, 5],
      assignedTo: 'AGV-003',
      status: 'failed',
      priority: 'low',
      startTime: 12,
      endTime: null
    }
  ];

  // 이벤트 데이터
  this.events = [
    {
      time: 0,
      message: '시뮬레이션 시작',
      type: 'info'
    },
    {
      time: 0,
      message: 'AGV-001이 작업 TASK-001을 시작합니다.',
      type: 'info'
    },
    {
      time: 0,
      message: 'AGV-002가 작업 TASK-005를 시작합니다.',
      type: 'info'
    },
    {
      time: 0,
      message: 'AGV-003이 작업 TASK-009를 시작합니다.',
      type: 'info'
    },
    {
      time: 8,
      message: 'AGV-003이 작업 TASK-009를 완료했습니다.',
      type: 'success'
    },
    {
      time: 8,
      message: 'AGV-003이 작업 TASK-010을 시작합니다.',
      type: 'info'
    },
    {
      time: 9,
      message: 'AGV-002가 작업 TASK-005를 완료했습니다.',
      type: 'success'
    },
    {
      time: 9,
      message: 'AGV-002가 작업 TASK-006을 시작합니다.',
      type: 'info'
    },
    {
      time: 10,
      message: 'AGV-001이 작업 TASK-001을 완료했습니다.',
      type: 'success'
    },
    {
      time: 10,
      message: 'AGV-001이 작업 TASK-002를 시작합니다.',
      type: 'info'
    },
    {
      time: 12,
      message: 'AGV-003이 작업 TASK-010을 완료했습니다.',
      type: 'success'
    },
    {
      time: 12,
      message: 'AGV-003이 작업 TASK-011을 시작합니다.',
      type: 'info'
    },
    {
      time: 13,
      message: 'AGV-002가 작업 TASK-006을 완료했습니다.',
      type: 'success'
    },
    {
      time: 13,
      message: 'AGV-002가 작업 TASK-007을 시작합니다.',
      type: 'info'
    },
    {
      time: 14,
      message: 'AGV-001이 작업 TASK-002를 완료했습니다.',
      type: 'success'
    },
    {
      time: 14,
      message: 'AGV-001이 작업 TASK-003을 시작합니다.',
      type: 'info'
    },
    {
      time: 17,
      message: 'AGV-002가 작업 TASK-007을 완료했습니다.',
      type: 'success'
    },
    {
      time: 17,
      message: 'AGV-002가 작업 TASK-008을 시작합니다.',
      type: 'info'
    },
    {
      time: 18,
      message: 'AGV-001이 작업 TASK-003을 완료했습니다.',
      type: 'success'
    },
    {
      time: 18,
      message: 'AGV-001이 작업 TASK-004를 시작합니다.',
      type: 'info'
    },
    {
      time: 19,
      message: 'AGV-003의 배터리가 급격히 감소했습니다.',
      type: 'warning'
    },
    {
      time: 19,
      message: 'AGV-003이 고장으로 정지되었습니다.',
      type: 'error'
    },
    {
      time: 19,
      message: '작업 TASK-011이 실패했습니다.',
      type: 'error'
    },
    {
      time: 21,
      message: 'AGV-002가 작업 TASK-008을 완료했습니다.',
      type: 'success'
    },
    {
      time: 21,
      message: 'AGV-002가 충전소로 이동합니다.',
      type: 'info'
    },
    {
      time: 22,
      message: 'AGV-001이 작업 TASK-004를 완료했습니다.',
      type: 'success'
    },
    {
      time: 22,
      message: 'AGV-001이 충전소로 이동합니다.',
      type: 'info'
    },
    {
      time: 29,
      message: 'AGV-002가 충전소에 도착했습니다.',
      type: 'info'
    },
    {
      time: 31,
      message: 'AGV-001이 충전소에 도착했습니다.',
      type: 'info'
    },
    {
      time: 32,
      message: '시뮬레이션 종료',
      type: 'info'
    }
  ];

  // 통합 시뮬레이션 데이터 구성
  this.simulationData = {
    mapData: this.mapData,
    agvs: this.agvs,
    tasks: this.tasks,
    events: this.events,
    gridSize: 20,
    maxTime: 32
  };

  // AGV 선택 드롭다운 업데이트
  this.updateAgvSelects();

  // 작업 선택 드롭다운 업데이트
  this.updateTaskSelects();

  // 3D 시각화 초기화
  this.initialize3DVisualization();

  // 통계 차트 초기화
  this.initializeStatisticsCharts();

  // 트랙 차트 초기화
  this.initializeTrackCharts();

  // 현재 상태 패널 업데이트
  this.updateStatusPanel();
}

/**
* AGV 선택 드롭다운 업데이트
*/
updateAgvSelects() {
  const highlightAgvSelect = document.getElementById('highlightAgv');
  const trackAgvSelect = document.getElementById('trackAgvSelect');

  // 기존 옵션 제거 (첫 번째 "선택" 옵션 유지)
  while (highlightAgvSelect.options.length > 1) {
    highlightAgvSelect.remove(1);
  }

  // trackAgvSelect 옵션 제거 (첫 번째 "모든 AGV" 옵션 유지)
  while (trackAgvSelect.options.length > 1) {
    trackAgvSelect.remove(1);
  }

  // 새 AGV 옵션 추가
  this.agvs.forEach(agv => {
    const option1 = document.createElement('option');
    option1.value = agv.id;
    option1.textContent = agv.id;
    highlightAgvSelect.appendChild(option1);
    
    const option2 = document.createElement('option');
    option2.value = agv.id;
    option2.textContent = agv.id;
    trackAgvSelect.appendChild(option2);
  });
}

/**
* 작업 선택 드롭다운 업데이트
*/
updateTaskSelects() {
  const highlightTaskSelect = document.getElementById('highlightTask');

  // 기존 옵션 제거 (첫 번째 "선택" 옵션 유지)
  while (highlightTaskSelect.options.length > 1) {
    highlightTaskSelect.remove(1);
  }

  // 새 작업 옵션 추가
  this.tasks.forEach(task => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = task.id;
    highlightTaskSelect.appendChild(option);
  });
}

/**
* 3D 시각화 초기화
*/
initialize3DVisualization() {
  // Plotly.js를 사용하여 3D 시각화 생성
  const plotContainer = document.getElementById('3d-plot');

  // 맵 데이터 준비 (표면 메쉬용)
  const mapData = this.simulationData.mapData;
  const gridSize = this.simulationData.gridSize;

  // 표면 데이터
  const surfaceZ = Array(gridSize).fill().map(() => Array(gridSize).fill(0));

  // 장애물, 충전소, 작업장 좌표 추출
  const obstacles = [];
  const chargingStations = [];
  const workstations = [];

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cellType = mapData[y][x];
      
      if (cellType === 1) { // 장애물
        obstacles.push([x, y]);
      } else if (cellType === 2) { // 충전소
        chargingStations.push([x, y]);
      } else if (cellType === 3) { // 작업장
        workstations.push([x, y]);
      }
    }
  }

  // 데이터 트레이스 생성
  const data = [];

  // 표면 트레이스
  if (this.showSurface) {
    data.push({
      type: 'surface',
      z: surfaceZ,
      x: Array(gridSize).fill().map((_, i) => i),
      y: Array(gridSize).fill().map((_, i) => i),
      colorscale: 'Greys',
      showscale: false,
      opacity: 0.8,
      hoverinfo: 'none',
      name: '맵 표면'
    });
  }

  // 장애물 트레이스
  if (this.showObstacles && obstacles.length > 0) {
    data.push({
      type: 'scatter3d',
      x: obstacles.map(o => o[0]),
      y: obstacles.map(o => o[1]),
      z: obstacles.map(() => 0.5),
      mode: 'markers',
      marker: {
        symbol: 'square',
        size: 10,
        color: '#424242',
        opacity: 0.8,
        line: {
          width: 1,
          color: '#212121'
        }
      },
      hoverinfo: 'text',
      hovertext: obstacles.map(o => `장애물 [${o[0]}, ${o[1]}]`),
      name: '장애물'
    });
  }

  // 충전소 트레이스
  if (chargingStations.length > 0) {
    data.push({
      type: 'scatter3d',
      x: chargingStations.map(s => s[0]),
      y: chargingStations.map(s => s[1]),
      z: chargingStations.map(() => 0.1),
      mode: 'markers',
      marker: {
        symbol: 'diamond',
        size: 12,
        color: '#ffca28',
        opacity: 0.9,
        line: {
          width: 1,
          color: '#f57f17'
        }
      },
      hoverinfo: 'text',
      hovertext: chargingStations.map(s => `충전소 [${s[0]}, ${s[1]}]`),
      name: '충전소'
    });
  }

  // 작업장 트레이스
  if (workstations.length > 0) {
    data.push({
      type: 'scatter3d',
      x: workstations.map(w => w[0]),
      y: workstations.map(w => w[1]),
      z: workstations.map(() => 0.1),
      mode: 'markers',
      marker: {
        symbol: 'circle',
        size: 10,
        color: '#66bb6a',
        opacity: 0.9,
        line: {
          width: 1,
          color: '#2e7d32'
        }
      },
      hoverinfo: 'text',
      hovertext: workstations.map(w => `작업장 [${w[0]}, ${w[1]}]`),
      name: '작업장'
    });
  }

  // AGV 현재 위치 표시 (초기 위치)
  const agvs = this.simulationData.agvs;
  const agvX = [];
  const agvY = [];
  const agvZ = [];
  const agvTexts = [];
  const agvColors = [];

  agvs.forEach(agv => {
    const initialPos = agv.positions[0];
    agvX.push(initialPos[0]);
    agvY.push(initialPos[1]);
    agvZ.push(0.2); // 높이는 바닥보다 약간 위에
    agvTexts.push(`${agv.id}`);
    
    // 상태에 따른 색상
    const status = agv.status[0];
    const color = 
      status === 'active' ? '#5c6bc0' : 
      status === 'charging' ? '#ffca28' :
      status === 'maintenance' ? '#ef5350' : '#78909c';
      
    agvColors.push(color);
  });

  data.push({
    type: 'scatter3d',
    x: agvX,
    y: agvY,
    z: agvZ,
    mode: this.showLabels ? 'markers+text' : 'markers',
    marker: {
      size: 12,
      color: agvColors,
      symbol: 'circle',
      opacity: 0.9,
      line: {
        width: 1,
        color: '#1a237e'
      }
    },
    text: agvTexts,
    textposition: 'top center',
    textfont: {
      size: 12,
      color: '#212121'
    },
    hoverinfo: 'text',
    hovertext: agvs.map((agv, idx) => 
      `${agv.id}<br>상태: ${this.getStatusText(agv.status[0])}<br>배터리: ${agv.battery[0]}%<br>위치: [${agvX[idx]}, ${agvY[idx]}]`
    ),
    name: 'AGVs'
  });

  // 레이아웃 설정
  const layout = {
    scene: {
      xaxis: {
        range: [-1, gridSize],
        title: 'X',
        dtick: 1
      },
      yaxis: {
        range: [-1, gridSize],
        title: 'Y',
        dtick: 1
      },
      zaxis: {
        range: [0, 3],
        title: 'Z',
        dtick: 1
      },
      aspectratio: {
        x: 1,
        y: 1,
        z: 0.3
      },
      camera: this.getCamera3DView()
    },
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0,
      pad: 0
    },
    showlegend: false,
    hovermode: 'closest'
  };

  // 플롯 생성
  Plotly.newPlot(plotContainer, data, layout, {responsive: true});

  // 플롯 참조 저장
  this.plot3d = plotContainer;

  // 타임 디스플레이 초기화
  document.getElementById('animationTime').textContent = this.formatTime(0);
}

/**
* 3D 보기 모드에 따른 카메라 위치 반환
* @returns {Object} 카메라 설정
*/
getCamera3DView() {
  switch(this.viewMode) {
    case '3d':
      return {
        eye: {x: 1.5, y: -1.5, z: 1},
        center: {x: this.simulationData.gridSize / 2, y: this.simulationData.gridSize / 2, z: 0},
        up: {x: 0, y: 0, z: 1}
      };
    case 'top':
      return {
        eye: {x: this.simulationData.gridSize / 2, y: this.simulationData.gridSize / 2, z: 2.5},
        center: {x: this.simulationData.gridSize / 2, y: this.simulationData.gridSize / 2, z: 0},
        up: {x: 0, y: 1, z: 0}
      };
    case 'side':
      return {
        eye: {x: -1.5, y: this.simulationData.gridSize / 2, z: 0.5},
        center: {x: this.simulationData.gridSize / 2, y: this.simulationData.gridSize / 2, z: 0},
        up: {x: 0, y: 0, z: 1}
      };
    default:
      return {
        eye: {x: 1.5, y: -1.5, z: 1},
        center: {x: this.simulationData.gridSize / 2, y: this.simulationData.gridSize / 2, z: 0},
        up: {x: 0, y: 0, z: 1}
      };
  }
}

/**
* 3D 시각화 업데이트
*/
update3dVisualization() {
  if (!this.plot3d || !this.simulationData) return;

  // 현재 시간에 맞는 AGV 위치와 상태 업데이트
  const time = this.animationTime;
  const agvs = this.simulationData.agvs;

  // AGV 위치 데이터 준비
  const agvX = [];
  const agvY = [];
  const agvZ = [];
  const agvTexts = [];
  const agvColors = [];

  agvs.forEach(agv => {
    // 현재 시간에 해당하는 위치 찾기
    const timePoints = agv.positions.map(pos => pos[2]);
    const posIndex = timePoints.findIndex(t => t >= time);
    
    let position;
    let status;
    let battery;
    
    if (posIndex === -1) {
      // 시간을 초과하면 마지막 위치 사용
      position = agv.positions[agv.positions.length - 1];
      status = agv.status[agv.status.length - 1];
      battery = agv.battery[agv.battery.length - 1];
    } else if (posIndex === 0) {
      // 첫 번째 시간이면 첫 번째 위치 사용
      position = agv.positions[0];
      status = agv.status[0];
      battery = agv.battery[0];
    } else {
      // 시간 보간으로 위치 계산
      const prevTime = agv.positions[posIndex - 1][2];
      const nextTime = agv.positions[posIndex][2];
      const ratio = (time - prevTime) / (nextTime - prevTime);
      
      const prevPos = agv.positions[posIndex - 1];
      const nextPos = agv.positions[posIndex];
      
      // 위치 보간 (선형)
      position = [
        prevPos[0] + ratio * (nextPos[0] - prevPos[0]),
        prevPos[1] + ratio * (nextPos[1] - prevPos[1]),
        time
      ];
      
      status = agv.status[posIndex - 1];
      battery = agv.battery[posIndex - 1];
    }
    
    agvX.push(position[0]);
    agvY.push(position[1]);
    agvZ.push(0.2); // 높이는 바닥보다 약간 위에
    agvTexts.push(`${agv.id}`);
    
    // 상태에 따른 색상
    const color = 
      status === 'active' ? '#5c6bc0' : 
      status === 'charging' ? '#ffca28' :
      status === 'maintenance' ? '#ef5350' : '#78909c';
      
    // 하이라이트된 AGV는 색상 강조
    if (this.highlightedAgv === agv.id) {
      agvColors.push('#ff4081'); // 핑크색으로 강조
    } else {
      agvColors.push(color);
    }
  });

  // AGV 위치 업데이트
  Plotly.update(this.plot3d, {
    x: [null, null, null, null, agvX],
    y: [null, null, null, null, agvY],
    z: [null, null, null, null, agvZ],
    'marker.color': [null, null, null, null, agvColors],
    'mode': [null, null, null, null, this.showLabels ? 'markers+text' : 'markers']
  }, {});

  // 카메라 위치 업데이트 (보기 모드가 변경된 경우)
  Plotly.relayout(this.plot3d, {
    'scene.camera': this.getCamera3DView()
  });
}

/**
* 통계 차트 초기화
*/
initializeStatisticsCharts() {
  if (!this.simulationData) return;

  // 통계 데이터 계산
  this.calculateStatistics();

  // 차트 초기화
  this.initializeTaskCompletionChart();
  this.initializeAgvUtilizationChart();
  this.initializeWaitingTimeChart();
  this.initializeBatteryUsageChart();
}

/**
* 통계 데이터 계산
*/
calculateStatistics() {
  // 기본 통계 업데이트
  document.getElementById('totalTaskCount').textContent = this.tasks.length;

  const completedTasks = this.tasks.filter(task => task.status === 'completed');
  document.getElementById('completedTaskCount').textContent = completedTasks.length;

  document.getElementById('totalAgvCount').textContent = this.agvs.length;

  document.getElementById('totalSimTime').textContent = this.formatTime(this.simulationData.maxTime);
}

/**
* 작업 완료 차트 초기화
*/
initializeTaskCompletionChart() {
  const data = [
    {
      x: this.tasks.map(task => task.id),
      y: this.tasks.map(task => task.endTime ? task.endTime - task.startTime : null),
      type: 'bar',
      marker: {
        color: this.tasks.map(task => {
          if (task.status === 'completed') return '#4caf50';
          if (task.status === 'failed') return '#f44336';
          return '#9e9e9e';
        })
      },
      text: this.tasks.map(task => task.endTime ? `${task.endTime - task.startTime}초` : 'N/A'),
      textposition: 'auto',
      hoverinfo: 'text',
      hovertext: this.tasks.map(task => 
        `작업 ID: ${task.id}<br>우선순위: ${this.getPriorityText(task.priority)}<br>상태: ${this.getTaskStatusText(task.status)}<br>${task.endTime ? `소요 시간: ${task.endTime - task.startTime}초` : ''}`
      )
    }
  ];

  const layout = {
    title: '작업별 처리 시간',
    xaxis: {
      title: '작업 ID'
    },
    yaxis: {
      title: '소요 시간 (초)'
    },
    margin: {
      l: 50,
      r: 20,
      b: 50,
      t: 50,
      pad: 4
    }
  };

  Plotly.newPlot('task-completion-chart', data, layout, {responsive: true});
}

/**
* AGV 가동률 차트 초기화
*/
initializeAgvUtilizationChart() {
  // AGV별 상태 비율 계산
  const agvUtilization = this.agvs.map(agv => {
    const statusCounts = {
      active: 0,
      idle: 0,
      charging: 0,
      maintenance: 0
    };
    
    // 각 상태의 지속 시간 계산
    agv.status.forEach((status, index) => {
      // 현재 상태의 지속 시간 계산
      let duration = 1; // 기본 1초로 가정
      
      // 다음 상태 변경 시간 또는 시뮬레이션 종료 시간까지의 지속 시간
      if (index < agv.status.length - 1) {
        duration = agv.positions[index + 1][2] - agv.positions[index][2];
      }
      
      // 해당 상태의 카운트 증가
      statusCounts[status] += duration;
    });
    
    // 총 시간 계산
    const totalTime = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    // 비율 계산
    return {
      id: agv.id,
      active: (statusCounts.active / totalTime) * 100,
      idle: (statusCounts.idle / totalTime) * 100,
      charging: (statusCounts.charging / totalTime) * 100,
      maintenance: (statusCounts.maintenance / totalTime) * 100
    };
  });

  // 차트 데이터 준비
  const data = [
    {
      x: agvUtilization.map(u => u.id),
      y: agvUtilization.map(u => u.active),
      name: '가동 중',
      type: 'bar',
      marker: { color: '#4caf50' }
    },
    {
      x: agvUtilization.map(u => u.id),
      y: agvUtilization.map(u => u.idle),
      name: '대기 중',
      type: 'bar',
      marker: { color: '#2196f3' }
    },
    {
      x: agvUtilization.map(u => u.id),
      y: agvUtilization.map(u => u.charging),
      name: '충전 중',
      type: 'bar',
      marker: { color: '#ff9800' }
    },
    {
      x: agvUtilization.map(u => u.id),
      y: agvUtilization.map(u => u.maintenance),
      name: '점검 중',
      type: 'bar',
      marker: { color: '#f44336' }
    }
  ];

  const layout = {
    title: 'AGV별 상태 비율',
    barmode: 'stack',
    xaxis: {
      title: 'AGV ID'
    },
    yaxis: {
      title: '비율 (%)',
      range: [0, 100]
    },
    margin: {
      l: 50,
      r: 20,
      b: 50,
      t: 50,
      pad: 4
    }
  };

  Plotly.newPlot('agv-utilization-chart', data, layout, {responsive: true});
}

/**
* 작업 대기 시간 분포 차트 초기화
*/
initializeWaitingTimeChart() {
  // 대기 시간 데이터 계산 (실제 구현에서는 작업 대기 시간을 계산)
  // 여기서는 간단히 우선순위별로 가상의 대기 시간을 생성

  // 우선순위별 작업 분류
  const highPriorityTasks = this.tasks.filter(task => task.priority === 'high');
  const mediumPriorityTasks = this.tasks.filter(task => task.priority === 'medium');
  const lowPriorityTasks = this.tasks.filter(task => task.priority === 'low');

  // 가상의 대기 시간 생성 (실제 구현에서는 실제 데이터 사용)
  const highPriorityWaitTimes = highPriorityTasks.map(() => Math.floor(Math.random() * 3 + 1)); // 1-3초
  const mediumPriorityWaitTimes = mediumPriorityTasks.map(() => Math.floor(Math.random() * 5 + 3)); // 3-7초
  const lowPriorityWaitTimes = lowPriorityTasks.map(() => Math.floor(Math.random() * 7 + 5)); // 5-11초

  // 차트 데이터 준비
  const data = [
    {
      y: highPriorityWaitTimes,
      type: 'box',
      name: '높음',
      marker: { color: '#f44336' }
    },
    {
      y: mediumPriorityWaitTimes,
      type: 'box',
      name: '중간',
      marker: { color: '#ff9800' }
    },
    {
      y: lowPriorityWaitTimes,
      type: 'box',
      name: '낮음',
      marker: { color: '#2196f3' }
    }
  ];

  const layout = {
    title: '우선순위별 작업 대기 시간',
    yaxis: {
      title: '대기 시간 (초)'
    },
    margin: {
      l: 50,
      r: 20,
      b: 50,
      t: 50,
      pad: 4
    }
  };

  Plotly.newPlot('waiting-time-chart', data, layout, {responsive: true});
}

/**
* 배터리 사용 차트 초기화
*/
initializeBatteryUsageChart() {
  // 시간별 배터리 사용 데이터 추출
  const data = this.agvs.map(agv => ({
    x: agv.positions.map(pos => pos[2]), // 시간
    y: agv.battery,                      // 배터리 수준
    type: 'scatter',
    mode: 'lines+markers',
    name: agv.id,
    marker: {
      size: 6
    },
    line: {
      shape: 'spline',
      smoothing: 0.3
    }
  }));

  const layout = {
    title: 'AGV별 배터리 사용 추이',
    xaxis: {
      title: '시간 (초)'
    },
    yaxis: {
      title: '배터리 잔량 (%)',
      range: [0, 100]
    },
    margin: {
      l: 50,
      r: 20,
      b: 50,
      t: 50,
      pad: 4
    }
  };

  Plotly.newPlot('battery-usage-chart', data, layout, {responsive: true});
}

/**
* 트랙 차트 초기화
*/
initializeTrackCharts() {
  if (!this.simulationData) return;

  // 이동 경로 플롯 초기화
  this.initializeMovementTrackPlot('all');

  // 거리/시간 차트 초기화
  this.initializeDistanceTimeChart();

  // 효율성 차트 초기화
  this.initializeEfficiencyChart();
}

/**
* 이동 궤적 플롯 초기화
* @param {string} agvId - 표시할 AGV ID ('all'인 경우 모든 AGV)
*/
initializeMovementTrackPlot(agvId) {
  const plotContainer = document.getElementById('movement-track-plot');

  // 맵 데이터 준비
  const mapData = this.simulationData.mapData;
  const gridSize = this.simulationData.gridSize;

  // 장애물, 충전소, 작업장 좌표 추출
  const obstacles = [];
  const chargingStations = [];
  const workstations = [];

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cellType = mapData[y][x];
      
      if (cellType === 1) { // 장애물
        obstacles.push([x, y]);
      } else if (cellType === 2) { // 충전소
        chargingStations.push([x, y]);
      } else if (cellType === 3) { // 작업장
        workstations.push([x, y]);
      }
    }
  }

  // 데이터 트레이스 생성
  const data = [];

  // 장애물 트레이스
  if (obstacles.length > 0) {
    data.push({
      type: 'scatter',
      x: obstacles.map(o => o[0]),
      y: obstacles.map(o => o[1]),
      mode: 'markers',
      marker: {
        symbol: 'square',
        size: 12,
        color: '#424242',
        opacity: 0.8,
        line: {
          width: 1,
          color: '#212121'
        }
      },
      hoverinfo: 'text',
      hovertext: obstacles.map(o => `장애물 [${o[0]}, ${o[1]}]`),
      name: '장애물'
    });
  }

  // 충전소 트레이스
  if (chargingStations.length > 0) {
    data.push({
      type: 'scatter',
      x: chargingStations.map(s => s[0]),
      y: chargingStations.map(s => s[1]),
      mode: 'markers',
      marker: {
        symbol: 'diamond',
        size: 14,
        color: '#ffca28',
        opacity: 0.9,
        line: {
          width: 1,
          color: '#f57f17'
        }
      },
      hoverinfo: 'text',
      hovertext: chargingStations.map(s => `충전소 [${s[0]}, ${s[1]}]`),
      name: '충전소'
    });
  }

  // 작업장 트레이스
  if (workstations.length > 0) {
    data.push({
      type: 'scatter',
      x: workstations.map(w => w[0]),
      y: workstations.map(w => w[1]),
      mode: 'markers',
      marker: {
        symbol: 'circle',
        size: 12,
        color: '#66bb6a',
        opacity: 0.9,
        line: {
          width: 1,
          color: '#2e7d32'
        }
      },
      hoverinfo: 'text',
      hovertext: workstations.map(w => `작업장 [${w[0]}, ${w[1]}]`),
      name: '작업장'
    });
  }

  // AGV 이동 경로 트레이스
  const agvs = this.simulationData.agvs;

  // 특정 AGV 또는 모든 AGV 표시
  const agvsToShow = agvId === 'all' ? agvs : [agvs.find(a => a.id === agvId)].filter(Boolean);

  const colors = ['#e91e63', '#4caf50', '#2196f3'];

  agvsToShow.forEach((agv, index) => {
    // 이동 경로 데이터
    const pathX = agv.positions.map(pos => pos[0]);
    const pathY = agv.positions.map(pos => pos[1]);
    
    data.push({
      type: 'scatter',
      x: pathX,
      y: pathY,
      mode: 'lines+markers',
      line: {
        color: colors[index % colors.length],
        width: 3,
        dash: 'solid'
      },
      marker: {
        symbol: 'circle',
        size: 8,
        color: colors[index % colors.length],
        opacity: 0.7
      },
      text: agv.positions.map(pos => `${agv.id} - 시간: ${pos[2]}초`),
      hoverinfo: 'text',
      name: agv.id
    });
    
    // 시작점과 끝점 강조
    data.push({
      type: 'scatter',
      x: [pathX[0], pathX[pathX.length - 1]],
      y: [pathY[0], pathY[pathY.length - 1]],
      mode: 'markers',
      marker: {
        symbol: ['circle', 'star'],
        size: [12, 14],
        color: colors[index % colors.length],
        opacity: 1,
        line: {
          width: 2,
          color: '#fff'
        }
      },
      text: ['시작', '종료'],
      hoverinfo: 'text',
      showlegend: false
    });
  });

  // 레이아웃 설정
  const layout = {
    title: `AGV 이동 궤적${agvId !== 'all' ? ` - ${agvId}` : ''}`,
    xaxis: {
      range: [-1, gridSize],
      title: 'X',
      dtick: 1
    },
    yaxis: {
      range: [-1, gridSize],
      title: 'Y',
      dtick: 1,
      scaleanchor: 'x',
      scaleratio: 1
    },
    showlegend: true,
    hovermode: 'closest',
    margin: {
      l: 50,
      r: 20,
      b: 50,
      t: 50,
      pad: 4
    }
  };

  // 플롯 생성
  Plotly.newPlot(plotContainer, data, layout, {responsive: true});

  // 플롯 참조 저장
  this.movementTrackPlot = plotContainer;
}

/**
* 이동 궤적 플롯 업데이트
* @param {string} agvId - 표시할 AGV ID ('all'인 경우 모든 AGV)
*/
updateMovementTrackPlot(agvId) {
  // 새로운 이동 궤적 플롯 생성
  this.initializeMovementTrackPlot(agvId);

  // 이동 거리 표시 업데이트
  this.updateMovementDistanceInfo(agvId);
}

/**
* 이동 거리 정보 업데이트
* @param {string} agvId - 표시할 AGV ID ('all'인 경우 모든 AGV)
*/
updateMovementDistanceInfo(agvId) {
  const agvs = this.simulationData.agvs;

  // 특정 AGV 또는 모든 AGV 
  const agvsToShow = agvId === 'all' ? agvs : [agvs.find(a => a.id === agvId)].filter(Boolean);

  // 각 AGV의 이동 거리 계산
  const agvDistances = agvsToShow.map(agv => {
    let totalDistance = 0;
    
    // 각 위치 간의 거리 합산
    for (let i = 1; i < agv.positions.length; i++) {
      const prevPos = agv.positions[i - 1];
      const currPos = agv.positions[i];
      
      // 맨해튼 거리 사용
      const distance = Math.abs(currPos[0] - prevPos[0]) + Math.abs(currPos[1] - prevPos[1]);
      totalDistance += distance;
    }
    
    // 총 이동 시간 계산
    const startTime = agv.positions[0][2];
    const endTime = agv.positions[agv.positions.length - 1][2];
    const totalTime = endTime - startTime;
    
    // 평균 속도 계산
    const avgSpeed = totalTime > 0 ? totalDistance / totalTime : 0;
    
    return {
      id: agv.id,
      distance: totalDistance,
      time: totalTime,
      avgSpeed: avgSpeed
    };
  });

  // 총 이동 거리
  let totalDistance = 0;
  agvDistances.forEach(agv => {
    totalDistance += agv.distance;
  });

  document.getElementById('totalDistance').textContent = `${totalDistance.toFixed(1)} units`;

  // 평균 속도
  const totalTime = agvDistances.reduce((sum, agv) => sum + agv.time, 0);
  const avgSpeed = totalTime > 0 ? totalDistance / totalTime : 0;
  document.getElementById('avgSpeed').textContent = `${avgSpeed.toFixed(2)} units/s`;

  // 최대/최소 이동 거리 AGV
  if (agvDistances.length > 0) {
    let maxDistanceAgv = agvDistances[0];
    let minDistanceAgv = agvDistances[0];
    
    agvDistances.forEach(agv => {
      if (agv.distance > maxDistanceAgv.distance) {
        maxDistanceAgv = agv;
      }
      if (agv.distance < minDistanceAgv.distance) {
        minDistanceAgv = agv;
      }
    });
    
    document.getElementById('maxDistanceAgv').textContent = 
      `${maxDistanceAgv.id} (${maxDistanceAgv.distance.toFixed(1)} units)`;
    
    document.getElementById('minDistanceAgv').textContent = 
      `${minDistanceAgv.id} (${minDistanceAgv.distance.toFixed(1)} units)`;
  }
}

/**
* 거리/시간 차트 초기화
*/
initializeDistanceTimeChart() {
  const agvs = this.simulationData.agvs;

  // 각 AGV의 누적 이동 거리 계산
  const data = agvs.map(agv => {
    const times = [0];
    const distances = [0];
    let cumulativeDistance = 0;
    
    // 각 위치 간의 거리 누적
    for (let i = 1; i < agv.positions.length; i++) {
      const prevPos = agv.positions[i - 1];
      const currPos = agv.positions[i];
      
      // 맨해튼 거리 사용
      const distance = Math.abs(currPos[0] - prevPos[0]) + Math.abs(currPos[1] - prevPos[1]);
      cumulativeDistance += distance;
      
      // 시간과 누적 거리 기록
      times.push(currPos[2]);
      distances.push(cumulativeDistance);
    }
    
    return {
      x: times,
      y: distances,
      type: 'scatter',
      mode: 'lines',
      name: agv.id
    };
  });

  const layout = {
    title: '시간별 이동 거리',
    xaxis: {
      title: '시간 (초)'
    },
    yaxis: {
      title: '누적 이동 거리'
    },
    margin: {
      l: 50,
      r: 20,
      b: 50,
      t: 50,
      pad: 4
    }
  };

  Plotly.newPlot('distance-time-chart', data, layout, {responsive: true});
}

/**
* 효율성 차트 초기화
*/
initializeEfficiencyChart() {
  const agvs = this.simulationData.agvs;

  // 효율성 데이터 계산 (실제 이동 거리 / 최적 이동 거리)
  // 여기서는 간단한 모의 데이터 사용
  const efficiencyData = agvs.map(agv => {
    // 실제 이동 거리 계산
    let actualDistance = 0;
    for (let i = 1; i < agv.positions.length; i++) {
      const prevPos = agv.positions[i - 1];
      const currPos = agv.positions[i];
      actualDistance += Math.abs(currPos[0] - prevPos[0]) + Math.abs(currPos[1] - prevPos[1]);
    }
    
    // 시작점과 끝점
    const startPos = agv.positions[0];
    const endPos = agv.positions[agv.positions.length - 1];
    
    // 최적 거리 (맨해튼 거리로 가정)
    const optimalDistance = Math.abs(endPos[0] - startPos[0]) + Math.abs(endPos[1] - startPos[1]);
    
    // 효율성 계산 (100% = 최적, 작을수록 효율적)
    const efficiency = optimalDistance > 0 ? (optimalDistance / actualDistance) * 100 : 0;
    
    return {
      id: agv.id,
      efficiency: efficiency
    };
  });

  const data = [
    {
      x: efficiencyData.map(d => d.id),
      y: efficiencyData.map(d => d.efficiency),
      type: 'bar',
      marker: {
        color: efficiencyData.map(d => {
          if (d.efficiency >= 80) return '#4caf50';
          if (d.efficiency >= 60) return '#ffeb3b';
          return '#f44336';
        })
      }
    }
  ];

  const layout = {
    title: 'AGV 이동 효율성',
    xaxis: {
      title: 'AGV ID'
    },
    yaxis: {
      title: '효율성 (%)',
      range: [0, 100]
    },
    margin: {
      l: 50,
      r: 20,
      b: 50,
      t: 50,
      pad: 4
    }
  };

  Plotly.newPlot('efficiency-chart', data, layout, {responsive: true});
}

/**
* 애니메이션 재생
*/
playAnimation() {
  if (!this.simulationData) return;

  // 이미 끝까지 재생한 경우 처음부터 다시 시작
  if (this.animationTime >= this.simulationData.maxTime) {
    this.animationTime = 0;
  }

  // 재생 중인 경우 중복 실행 방지
  if (this.isPlaying) return;

  this.isPlaying = true;

  // 버튼 상태 업데이트
  document.getElementById('play3dButton').disabled = true;
  document.getElementById('pause3dButton').disabled = false;

  // 시간 간격 설정 (기본 0.1초마다 업데이트, 속도에 따라 조정)
  const updateInterval = 100 / this.animationSpeed;

  // 애니메이션 간격 설정
  this.animationInterval = setInterval(() => {
    // 시간 증가 (0.1초씩)
    this.animationTime += 0.1;
    
    // 시간 디스플레이 업데이트 (초 단위 정수로 표시)
    document.getElementById('animationTime').textContent = this.formatTime(Math.floor(this.animationTime));
    
    // 3D 시각화 업데이트
    this.update3dVisualization();
    
    // AGV 정보 패널 업데이트
    this.updateAgvInfo();
    
    // 작업 정보 패널 업데이트
    this.updateTaskInfo();
    
    // 현재 상태 패널 업데이트 (매 초마다)
    if (Math.floor(this.animationTime * 10) % 10 === 0) {
      this.updateStatusPanel();
    }
    
    // 끝에 도달한 경우 정지
    if (this.animationTime >= this.simulationData.maxTime) {
      this.pauseAnimation();
    }
  }, updateInterval);
}

/**
* 애니메이션 일시 정지
*/
pauseAnimation() {
  if (!this.isPlaying) return;

  this.isPlaying = false;

  // 타이머 정지
  if (this.animationInterval) {
    clearInterval(this.animationInterval);
    this.animationInterval = null;
  }

  // 버튼 상태 업데이트
  document.getElementById('play3dButton').disabled = false;
  document.getElementById('pause3dButton').disabled = true;
}

/**
* 애니메이션 초기화
*/
resetAnimation() {
  // 애니메이션 정지
  this.pauseAnimation();

  // 시간 초기화
  this.animationTime = 0;

  // 시간 디스플레이 업데이트
  document.getElementById('animationTime').textContent = this.formatTime(0);

  // 3D 시각화 업데이트
  this.update3dVisualization();

  // 기본 카메라 위치로 리셋
  if (this.plot3d) {
    Plotly.relayout(this.plot3d, {
      'scene.camera': this.getCamera3DView()
    });
  }

  // AGV 정보 패널 업데이트
  this.updateAgvInfo();

  // 작업 정보 패널 업데이트
  this.updateTaskInfo();

  // 현재 상태 패널 업데이트
  this.updateStatusPanel();
}

/**
* 애니메이션 속도 설정
* @param {number} speed - 속도 배율 (0.5, 1, 2, 4)
*/
setAnimationSpeed(speed) {
  // 속도 버튼 스타일 업데이트
  const speedButtons = document.querySelectorAll('.speed-btn');
  speedButtons.forEach(button => {
    button.classList.remove('active');
    if (parseFloat(button.getAttribute('data-speed')) === speed) {
      button.classList.add('active');
    }
  });

  const oldSpeed = this.animationSpeed;
  this.animationSpeed = speed;

  // 애니메이션 실행 중인 경우 간격 재설정
  if (this.isPlaying && this.animationInterval) {
    clearInterval(this.animationInterval);
    
    const updateInterval = 100 / this.animationSpeed;
    this.animationInterval = setInterval(() => {
      this.animationTime += 0.1;
      document.getElementById('animationTime').textContent = this.formatTime(Math.floor(this.animationTime));
      this.update3dVisualization();
      
      // AGV 정보 패널 업데이트
      this.updateAgvInfo();
      
      // 작업 정보 패널 업데이트
      this.updateTaskInfo();
      
      // 매 초마다 현재 상태 패널 업데이트
      if (Math.floor(this.animationTime * 10) % 10 === 0) {
        this.updateStatusPanel();
      }
      
      if (this.animationTime >= this.simulationData.maxTime) {
        this.pauseAnimation();
      }
    }, updateInterval);
  }
}

/**
* 현재 상태 패널 업데이트
*/
updateStatusPanel() {
  const statusContainer = document.getElementById('currentStatus');

  if (!this.simulationData) {
    statusContainer.innerHTML = '<div class="loading">데이터가 로드되지 않았습니다.</div>';
    return;
  }

  // 현재 시간의 이벤트 찾기
  const currentTime = Math.floor(this.animationTime);
  const currentEvents = this.events.filter(event => Math.floor(event.time) === currentTime);

  // 현재 AGV 상태 계산
  const agvs = this.simulationData.agvs;

  const agvStatus = {
    active: 0,
    idle: 0,
    charging: 0,
    maintenance: 0
  };

  agvs.forEach(agv => {
    // 현재 시간에 해당하는 상태 찾기
    const statusIndex = agv.positions.findIndex(pos => pos[2] > currentTime);
    const status = statusIndex > 0 ? agv.status[statusIndex - 1] : agv.status[0];
    
    agvStatus[status]++;
  });

  // 현재 작업 상태 계산
  const tasks = this.simulationData.tasks;

  const taskStatus = {
    pending: 0,
    'in-progress': 0,
    completed: 0,
    failed: 0
  };

  tasks.forEach(task => {
    if (task.startTime > currentTime) {
      // 아직 시작하지 않은 작업
      taskStatus.pending++;
    } else if (task.endTime && task.endTime <= currentTime) {
      // 종료된 작업
      if (task.status === 'failed') {
        taskStatus.failed++;
      } else {
        taskStatus.completed++;
      }
    } else {
      // 진행 중인 작업
      taskStatus['in-progress']++;
    }
  });

  // 현재 배터리 상태 (평균)
  let totalBattery = 0;
  let batteryCount = 0;

  agvs.forEach(agv => {
    // 현재 시간에 해당하는 배터리 찾기
    const batteryIndex = agv.positions.findIndex(pos => pos[2] > currentTime);
    
    let battery;
    if (batteryIndex === -1) {
      // 시간을 초과하면 마지막 배터리 사용
      battery = agv.battery[agv.battery.length - 1];
    } else if (batteryIndex === 0) {
      // 첫 번째 시간이면 첫 번째 배터리 사용
      battery = agv.battery[0];
    } else {
      battery = agv.battery[batteryIndex - 1];
    }
    
    totalBattery += battery;
    batteryCount++;
  });

  const avgBattery = batteryCount > 0 ? totalBattery / batteryCount : 0;

  // 상태 패널 업데이트
  let statusHtml = `
    <div class="status-row">
      <div class="status-label">시뮬레이션 시간:</div>
      <div class="status-value">${this.formatTime(currentTime)}</div>
    </div>
    <div class="status-row">
      <div class="status-label">AGV 상태:</div>
      <div class="status-value">
        <span class="badge badge-success">가동: ${agvStatus.active}</span>
        <span class="badge badge-info">대기: ${agvStatus.idle}</span>
        <span class="badge badge-warning">충전: ${agvStatus.charging}</span>
        <span class="badge badge-danger">점검: ${agvStatus.maintenance}</span>
      </div>
    </div>
    <div class="status-row">
      <div class="status-label">작업 상태:</div>
      <div class="status-value">
        <span class="badge badge-warning">대기: ${taskStatus.pending}</span>
        <span class="badge badge-success">진행: ${taskStatus['in-progress']}</span>
        <span class="badge badge-info">완료: ${taskStatus.completed}</span>
        <span class="badge badge-danger">실패: ${taskStatus.failed}</span>
      </div>
    </div>
    <div class="status-row">
      <div class="status-label">평균 배터리:</div>
      <div class="status-value">${avgBattery.toFixed(1)}%</div>
    </div>
  `;

  // 현재 이벤트 표시
  if (currentEvents.length > 0) {
    statusHtml += `<div class="status-row mt-2"><div class="status-label">현재 이벤트:</div></div>`;
    
    currentEvents.forEach(event => {
      const eventClass = 
        event.type === 'error' ? 'text-danger' :
        event.type === 'warning' ? 'text-warning' :
        event.type === 'success' ? 'text-success' : 'text-info';
      
      statusHtml += `
        <div class="status-row">
          <div class="status-value ${eventClass}">${event.message}</div>
        </div>
      `;
    });
  }

  statusContainer.innerHTML = statusHtml;
}

/**
* AGV 정보 패널 업데이트
*/
updateAgvInfo() {
  const agvInfoContainer = document.getElementById('agvInfo');

  // 하이라이트된 AGV가 없으면 기본 메시지 표시
  if (!this.highlightedAgv) {
    agvInfoContainer.innerHTML = '<div class="info-message">AGV를 선택하여 정보를 확인하세요.</div>';
    return;
  }

  // 선택된 AGV 찾기
  const agv = this.agvs.find(a => a.id === this.highlightedAgv);
  if (!agv) {
    agvInfoContainer.innerHTML = '<div class="info-message">선택한 AGV를 찾을 수 없습니다.</div>';
    return;
  }

  // 현재 시간에 해당하는 AGV 상태 찾기
  const currentTime = this.animationTime;

  // 현재 위치 찾기
  const posIndex = agv.positions.findIndex(pos => pos[2] > currentTime);

  let position;
  let status;
  let battery;

  if (posIndex === -1) {
    // 시간을 초과하면 마지막 위치 사용
    position = agv.positions[agv.positions.length - 1];
    status = agv.status[agv.status.length - 1];
    battery = agv.battery[agv.battery.length - 1];
  } else if (posIndex === 0) {
    // 첫 번째 시간이면 첫 번째 위치 사용
    position = agv.positions[0];
    status = agv.status[0];
    battery = agv.battery[0];
  } else {
    // 보간을 통한 위치 계산
    const prevTime = agv.positions[posIndex - 1][2];
    const nextTime = agv.positions[posIndex][2];
    const ratio = (currentTime - prevTime) / (nextTime - prevTime);
    
    const prevPos = agv.positions[posIndex - 1];
    const nextPos = agv.positions[posIndex];
    
    // 위치 보간 (선형)
    position = [
      prevPos[0] + ratio * (nextPos[0] - prevPos[0]),
      prevPos[1] + ratio * (nextPos[1] - prevPos[1]),
      currentTime
    ];
    
    status = agv.status[posIndex - 1];
    battery = agv.battery[posIndex - 1];
  }

  // 배터리 수준에 따른 클래스
  const batteryClass = 
    battery < 20 ? 'battery-low' : 
    battery < 50 ? 'battery-medium' : 'battery-high';

  // 상태에 따른 배지 클래스
  const statusClass = 
    status === 'active' ? 'badge-success' : 
    status === 'charging' ? 'badge-warning' :
    status === 'maintenance' ? 'badge-danger' : 'badge-info';

  // 현재 수행 중인 작업 찾기
  let currentTask = null;
  this.tasks.forEach(task => {
    if (task.assignedTo === agv.id && 
        task.startTime <= currentTime && 
        (!task.endTime || task.endTime > currentTime)) {
      currentTask = task;
    }
  });

  // AGV 정보 패널 업데이트
  let infoHtml = `
    <div class="agv-header">
      ${agv.id} <span class="agv-badge ${statusClass}">${this.getStatusText(status)}</span>
    </div>
    <div class="info-row">
      <div class="info-label">현재 위치:</div>
      <div class="info-value">[${position[0].toFixed(1)}, ${position[1].toFixed(1)}]</div>
    </div>
    <div class="info-row">
      <div class="info-label">배터리 수준:</div>
      <div class="info-value">${battery.toFixed(1)}%</div>
    </div>
    <div class="battery-bar">
      <div class="battery-level ${batteryClass}" style="width: ${battery}%;"></div>
    </div>
  `;

  if (currentTask) {
    infoHtml += `
      <div class="info-row mt-2">
        <div class="info-label">현재 작업:</div>
        <div class="info-value">${currentTask.id}</div>
      </div>
      <div class="info-row">
        <div class="info-label">경로:</div>
        <div class="info-value">[${currentTask.startPoint}] → [${currentTask.endPoint}]</div>
      </div>
    `;
  } else {
    infoHtml += `
      <div class="info-row mt-2">
        <div class="info-label">현재 작업:</div>
        <div class="info-value">없음</div>
      </div>
    `;
  }

  // 최근 완료한 작업 목록
  const completedTasks = this.tasks.filter(task => 
    task.assignedTo === agv.id && 
    task.endTime && 
    task.endTime <= currentTime
  );

  if (completedTasks.length > 0) {
    infoHtml += `<div class="info-row mt-2"><div class="info-label">완료한 작업:</div></div>`;
    
    // 최근 3개 작업만 표시
    const recentTasks = completedTasks.slice(-3);
    
    recentTasks.forEach(task => {
      infoHtml += `
        <div class="info-row">
          <div class="info-value">${task.id} (${task.startTime}s → ${task.endTime}s)</div>
        </div>
      `;
    });
  }

  agvInfoContainer.innerHTML = infoHtml;
}

/**
* 작업 정보 패널 업데이트
*/
updateTaskInfo() {
  const taskInfoContainer = document.getElementById('taskInfo');

  // 하이라이트된 작업이 없으면 기본 메시지 표시
  if (!this.highlightedTask) {
    taskInfoContainer.innerHTML = '<div class="info-message">작업을 선택하여 정보를 확인하세요.</div>';
    return;
  }

  // 선택된 작업 찾기
  const task = this.tasks.find(t => t.id === this.highlightedTask);
  if (!task) {
    taskInfoContainer.innerHTML = '<div class="info-message">선택한 작업을 찾을 수 없습니다.</div>';
    return;
  }

  // 현재 시간
  const currentTime = this.animationTime;

  // 작업 상태 계산
  let status;
  if (task.startTime > currentTime) {
    status = 'pending';
  } else if (task.endTime && task.endTime <= currentTime) {
    status = task.status; // completed 또는 failed
  } else {
    status = 'in-progress';
  }

  // 진행도 계산
  let progress = 0;
  if (status === 'pending') {
    progress = 0;
  } else if (status === 'completed' || status === 'failed') {
    progress = 100;
  } else {
    // 진행 중인 경우 시간 비율로 계산
    const totalTime = task.endTime - task.startTime;
    const elapsedTime = currentTime - task.startTime;
    progress = totalTime > 0 ? Math.min(100, (elapsedTime / totalTime) * 100) : 0;
  }

  // 상태에 따른 배지 클래스
  const statusClass = 
    status === 'pending' ? 'badge-warning' : 
    status === 'in-progress' ? 'badge-success' :
    status === 'failed' ? 'badge-danger' : 'badge-info';

  // 우선순위에 따른 클래스
  const priorityClass = 
    task.priority === 'high' ? 'text-danger' : 
    task.priority === 'medium' ? 'text-warning' : 'text-info';

  // 작업 정보 패널 업데이트
  let infoHtml = `
    <div class="task-header">
      ${task.id} <span class="task-badge ${statusClass}">${this.getTaskStatusText(status)}</span>
    </div>
    <div class="info-row">
      <div class="info-label">우선순위:</div>
      <div class="info-value ${priorityClass}">${this.getPriorityText(task.priority)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">경로:</div>
      <div class="info-value">[${task.startPoint}] → [${task.endPoint}]</div>
    </div>
    <div class="info-row">
      <div class="info-label">할당된 AGV:</div>
      <div class="info-value">${task.assignedTo || '없음'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">시작 시간:</div>
      <div class="info-value">${task.startTime}s</div>
    </div>
    <div class="info-row">
      <div class="info-label">종료 시간:</div>
      <div class="info-value">${task.endTime ? task.endTime + 's' : '미완료'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">진행도:</div>
      <div class="info-value">${progress.toFixed(1)}%</div>
    </div>
    <div class="battery-bar">
      <div class="battery-level ${status === 'failed' ? 'battery-low' : 'battery-high'}" style="width: ${progress}%;"></div>
    </div>
  `;

  taskInfoContainer.innerHTML = infoHtml;
}

/**
* 사용자 입력에서 데이터 로드
*/
loadDataFromUserInput() {
  const fileInput = document.getElementById('dataFileInput');
  const savedSelect = document.getElementById('savedSimulationSelect');

  if (fileInput.files.length > 0) {
    // 파일에서 로드
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        this.loadSimulationData(data);
        document.getElementById('loadDataModal').style.display = 'none';
      } catch (error) {
        console.error('파일 로드 오류:', error);
        showNotification('유효하지 않은 데이터 파일입니다.', 'danger');
      }
    };
    
    reader.readAsText(file);
  } else if (savedSelect.value) {
    // 저장된 시뮬레이션에서 로드
    this.loadSavedSimulation(savedSelect.value);
    document.getElementById('loadDataModal').style.display = 'none';
  } else {
    showNotification('데이터 파일을 선택하거나 저장된 시뮬레이션을 선택하세요.', 'warning');
  }
}

/**
* 저장된 시뮬레이션 로드
* @param {string} simId - 시뮬레이션 ID
*/
loadSavedSimulation(simId) {
  // 실제 구현에서는 서버 API 또는 LocalStorage에서 로드
  // 여기서는 데모 데이터만 다시 로드
  this.loadDemoData();

  showNotification('시뮬레이션 데이터가 로드되었습니다.', 'success');
}

/**
* 시뮬레이션 데이터 로드
* @param {Object} data - 시뮬레이션 데이터
*/
loadSimulationData(data) {
  // 데이터 유효성 검사
  if (!data.mapData || !data.agvs || !data.tasks) {
    showNotification('유효하지 않은 시뮬레이션 데이터입니다.', 'danger');
    return;
  }

  this.mapData = data.mapData;
  this.agvs = data.agvs;
  this.tasks = data.tasks;
  this.events = data.events || [];

  // 통합 시뮬레이션 데이터 구성
  this.simulationData = data;

  // 애니메이션 초기화
  this.resetAnimation();

  // AGV 선택 드롭다운 업데이트
  this.updateAgvSelects();

  // 작업 선택 드롭다운 업데이트
  this.updateTaskSelects();

  // 3D 시각화 초기화
  this.initialize3DVisualization();

  // 현재 활성화된 탭에 따라 차트 초기화
  const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
  if (activeTab === 'statistics') {
    this.initializeStatisticsCharts();
  } else if (activeTab === 'tracks') {
    this.initializeTrackCharts();
  }

  showNotification('시뮬레이션 데이터가 로드되었습니다.', 'success');
}

/**
* 시각화 데이터 내보내기
*/
exportVisualizationData() {
  if (!this.simulationData) {
    showNotification('내보낼 데이터가 없습니다.', 'warning');
    return;
  }

  // 내보낼 데이터 구성
  const exportData = {
    mapData: this.mapData,
    agvs: this.agvs,
    tasks: this.tasks,
    events: this.events,
    gridSize: this.simulationData.gridSize,
    maxTime: this.simulationData.maxTime,
    exportTime: new Date().toISOString()
  };

  // JSON 문자열로 변환
  const jsonData = JSON.stringify(exportData, null, 2);

  // 다운로드 링크 생성
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  // 파일명 설정
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const filename = `agv_simulation_${dateStr}_${timeStr}.json`;

  a.href = url;
  a.download = filename;
  a.click();

  // 메모리 정리
  setTimeout(() => URL.revokeObjectURL(url), 100);

  showNotification('시뮬레이션 데이터가 내보내기되었습니다.', 'success');
}

/**
* 차트 크기 조정
*/
resizeCharts() {
  // 활성화된 탭에 따라 다른 차트 리사이즈
  const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');

  if (activeTab === '3d-view' && this.plot3d) {
    Plotly.relayout(this.plot3d, {
      width: this.plot3d.clientWidth,
      height: this.plot3d.clientHeight
    });
  } else if (activeTab === 'statistics') {
    // 통계 차트 리사이즈
    if (document.getElementById('task-completion-chart').hasChildNodes()) {
      Plotly.relayout('task-completion-chart', {
        width: document.getElementById('task-completion-chart').clientWidth,
        height: document.getElementById('task-completion-chart').clientHeight
      });
    }
    
    if (document.getElementById('agv-utilization-chart').hasChildNodes()) {
      Plotly.relayout('agv-utilization-chart', {
        width: document.getElementById('agv-utilization-chart').clientWidth,
        height: document.getElementById('agv-utilization-chart').clientHeight
      });
    }
    
    if (document.getElementById('waiting-time-chart').hasChildNodes()) {
      Plotly.relayout('waiting-time-chart', {
        width: document.getElementById('waiting-time-chart').clientWidth,
        height: document.getElementById('waiting-time-chart').clientHeight
      });
    }
    
    if (document.getElementById('battery-usage-chart').hasChildNodes()) {
      Plotly.relayout('battery-usage-chart', {
        width: document.getElementById('battery-usage-chart').clientWidth,
        height: document.getElementById('battery-usage-chart').clientHeight
      });
    }
  } else if (activeTab === 'tracks') {
    // 트랙 차트 리사이즈
    if (document.getElementById('movement-track-plot').hasChildNodes()) {
      Plotly.relayout('movement-track-plot', {
        width: document.getElementById('movement-track-plot').clientWidth,
        height: document.getElementById('movement-track-plot').clientHeight
      });
    }
    
    if (document.getElementById('distance-time-chart').hasChildNodes()) {
      Plotly.relayout('distance-time-chart', {
        width: document.getElementById('distance-time-chart').clientWidth,
        height: document.getElementById('distance-time-chart').clientHeight
      });
    }
    
    if (document.getElementById('efficiency-chart').hasChildNodes()) {
      Plotly.relayout('efficiency-chart', {
        width: document.getElementById('efficiency-chart').clientWidth,
        height: document.getElementById('efficiency-chart').clientHeight
      });
    }
  }
}

/**
* 시간 포맷 변환 (초 -> HH:MM:SS)
* @param {number} seconds - 초 단위 시간
* @returns {string} 포맷된 시간 문자열
*/
formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
* AGV 상태 텍스트 변환
* @param {string} status - 상태 코드
* @returns {string} 상태 텍스트
*/
getStatusText(status) {
  const statusMap = {
    'active': '가동 중',
    'idle': '대기 중',
    'charging': '충전 중',
    'maintenance': '점검 중'
  };

  return statusMap[status] || status;
}

/**
* 작업 상태 텍스트 변환
* @param {string} status - 상태 코드
* @returns {string} 상태 텍스트
*/
getTaskStatusText(status) {
  const statusMap = {
    'pending': '대기 중',
    'in-progress': '진행 중',
    'completed': '완료됨',
    'failed': '실패'
  };

  return statusMap[status] || status;
}

/**
* 우선순위 텍스트 변환
* @param {string} priority - 우선순위 코드
* @returns {string} 우선순위 텍스트
*/
getPriorityText(priority) {
  const priorityMap = {
    'high': '높음',
    'medium': '중간',
    'low': '낮음'
  };

  return priorityMap[priority] || priority;
}
}

// 문서 로드 완료 후 시각화 컨트롤러 인스턴스 생성
document.addEventListener('DOMContentLoaded', function() {
  window.visualizationController = new VisualizationController();
});