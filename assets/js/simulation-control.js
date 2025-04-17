/**
* simulation-control.js - 시뮬레이션 실행/제어 페이지 스크립트
*/

// 시뮬레이션 컨트롤러 클래스
class SimulationController {
constructor() {
// 시뮬레이션 상태
this.isRunning = false;
this.isPaused = false;
this.simulationTime = 0; // 초 단위
this.simulationSpeed = 2; // 기본 2배속
this.simulationInterval = null;

// 맵 설정
this.gridSizeX = 20;
this.gridSizeY = 20;
this.cellSize = 30; // 픽셀 단위
this.zoomLevel = 1.0;

// 시나리오 설정
this.agvCount = 5;
this.taskCount = 10;
this.schedulingAlgorithm = 'fifo';
this.failureRate = 5; // 퍼센트

// 시뮬레이션 데이터
this.mapData = []; // 맵 데이터 (0: 빈 공간, 1: 장애물, 2: 충전소, 3: 작업장)
this.agvs = []; // AGV 목록
this.tasks = []; // 작업 목록
this.events = []; // 이벤트 로그

// 통계
this.pendingTaskCount = 0;
this.inProgressTaskCount = 0;
this.completedTaskCount = 0;

// 이벤트 리스너 설정
this.setupEventListeners();

// 시뮬레이션 초기화
this.initSimulation();
}

/**
* AGV 상태 업데이트
*/
updateAgvStates() {
this.agvs.forEach(agv => {
  // 배터리 소모 (가동 중일 때만)
  if (agv.status === 'active') {
    agv.battery = Math.max(0, agv.battery - 0.2);
    
    // 배터리 부족 경고
    if (agv.battery < 20 && agv.battery >= 19.8) {
      this.addEventLog(`${agv.id}의 배터리가 부족합니다. (${agv.battery.toFixed(1)}%)`, 'warning');
    }
    
    // 배터리 완전 방전
    if (agv.battery === 0) {
      agv.status = 'maintenance';
      agv.currentTask = null;
      this.addEventLog(`${agv.id}가 배터리 부족으로 정지되었습니다.`, 'error');
    }
  }
  
  // 충전 중일 때 배터리 충전
  if (agv.status === 'charging') {
    agv.battery = Math.min(100, agv.battery + 0.5);
    
    // 충전 완료
    if (agv.battery === 100) {
      agv.status = 'idle';
      this.addEventLog(`${agv.id}의 충전이 완료되었습니다.`, 'success');
    }
  }
  
  // 이동 경로 있으면 이동
  if (agv.path && agv.path.length > 0 && agv.status === 'active') {
    // 다음 위치로 이동
    agv.position = agv.path.shift();
    
    // 목적지 도착 확인
    if (agv.path.length === 0) {
      // 작업 완료 처리
      if (agv.currentTask) {
        const task = this.tasks.find(t => t.id === agv.currentTask);
        if (task) {
          task.status = 'completed';
          task.progress = 100;
          
          // 카운터 업데이트
          this.inProgressTaskCount--;
          this.completedTaskCount++;
          
          this.addEventLog(`${agv.id}가 작업 ${task.id}를 완료했습니다.`, 'success');
        }
        
        // AGV 상태 업데이트
        agv.currentTask = null;
        agv.status = 'idle';
      }
    }
  }
  
  // 배터리 낮은 AGV는 가까운 충전소로 이동
  if (agv.status === 'active' && agv.battery < 15 && !agv.isChargingTrip) {
    this.sendAgvToCharging(agv);
  }
});
}

/**
* 작업 할당 및 진행 업데이트
*/
updateTaskAssignments() {
// 대기 중인 작업 확인
const pendingTasks = this.tasks.filter(task => task.status === 'pending');

// 대기 중인 AGV 확인
const idleAgvs = this.agvs.filter(agv => agv.status === 'idle' && agv.battery > 20);

// 작업이 없거나 대기 중인 AGV가 없으면 종료
if (pendingTasks.length === 0 || idleAgvs.length === 0) return;

// 스케줄링 알고리즘에 따라 작업 할당
switch (this.schedulingAlgorithm) {
  case 'fifo':
    this.fifoScheduling(pendingTasks, idleAgvs);
    break;
  case 'priority':
    this.priorityScheduling(pendingTasks, idleAgvs);
    break;
  case 'nearest':
    this.nearestScheduling(pendingTasks, idleAgvs);
    break;
  default:
    this.fifoScheduling(pendingTasks, idleAgvs);
    break;
}
}

/**
* FIFO 스케줄링 (먼저 들어온 작업 먼저 처리)
* @param {Array} pendingTasks - 대기 중인 작업 목록
* @param {Array} idleAgvs - 대기 중인 AGV 목록
*/
fifoScheduling(pendingTasks, idleAgvs) {
// 가장 오래된 작업부터 처리
pendingTasks.sort((a, b) => a.createdAt - b.createdAt);

for (let i = 0; i < Math.min(pendingTasks.length, idleAgvs.length); i++) {
  const task = pendingTasks[i];
  const agv = idleAgvs[i];
  
  this.assignTaskToAgv(task, agv);
}
}

/**
* 우선순위 기반 스케줄링
* @param {Array} pendingTasks - 대기 중인 작업 목록
* @param {Array} idleAgvs - 대기 중인 AGV 목록
*/
priorityScheduling(pendingTasks, idleAgvs) {
// 우선순위 순으로 정렬 (high > medium > low)
const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
pendingTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

for (let i = 0; i < Math.min(pendingTasks.length, idleAgvs.length); i++) {
  const task = pendingTasks[i];
  const agv = idleAgvs[i];
  
  this.assignTaskToAgv(task, agv);
}
}

/**
* 최근접 위치 기반 스케줄링
* @param {Array} pendingTasks - 대기 중인 작업 목록
* @param {Array} idleAgvs - 대기 중인 AGV 목록
*/
nearestScheduling(pendingTasks, idleAgvs) {
// 각 AGV마다 가장 가까운 작업 찾기
for (const agv of idleAgvs) {
  if (pendingTasks.length === 0) break;
  
  // AGV 위치에서 각 작업 시작점까지의 거리 계산
  let nearestTask = null;
  let minDistance = Infinity;
  
  for (const task of pendingTasks) {
    const distance = this.calculateDistance(agv.position, task.startPoint);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestTask = task;
    }
  }
  
  // 가장 가까운 작업 할당
  if (nearestTask) {
    this.assignTaskToAgv(nearestTask, agv);
    
    // 할당된 작업 목록에서 제거
    pendingTasks.splice(pendingTasks.indexOf(nearestTask), 1);
  }
}
}

/**
* 두 점 사이의 맨해튼 거리 계산
* @param {Array} point1 - 첫 번째 점 [x, y]
* @param {Array} point2 - 두 번째 점 [x, y]
* @returns {number} 두 점 사이의 거리
*/
calculateDistance(point1, point2) {
return Math.abs(point1[0] - point2[0]) + Math.abs(point1[1] - point2[1]);
}

/**
* 작업을 AGV에 할당
* @param {Object} task - 할당할 작업
* @param {Object} agv - 할당받을 AGV
*/
assignTaskToAgv(task, agv) {
// 작업 상태 업데이트
task.status = 'in-progress';
task.assignedTo = agv.id;
task.progress = 0;

// AGV 상태 업데이트
agv.status = 'active';
agv.currentTask = task.id;

// 출발지로 이동 경로 계산
const path = this.findPath(agv.position, task.startPoint);

// 작업 완료를 위한 경로 계산 (출발지에서 도착지까지)
const taskPath = this.findPath(task.startPoint, task.endPoint);

// 전체 경로 설정 (출발지로 이동 + 작업 수행)
agv.path = path ? [...path, ...taskPath] : taskPath;

// 카운터 업데이트
this.pendingTaskCount--;
this.inProgressTaskCount++;

// 로그 추가
this.addEventLog(`작업 ${task.id}가 ${agv.id}에 할당되었습니다.`);
}

/**
* 경로 찾기 (단순 직선 경로 - 실제 구현에서는 PathFinding.js 등 사용)
* @param {Array} start - 시작 지점 [x, y]
* @param {Array} end - 목표 지점 [x, y]
* @returns {Array} 경로 배열
*/
findPath(start, end) {
const path = [];
const [startX, startY] = start;
const [endX, endY] = end;

// 현재 위치
let currentX = startX;
let currentY = startY;

// 단순 직선 경로 생성 (X 축 이동 후 Y 축 이동)
// 실제 구현에서는 A* 등의 알고리즘으로 장애물 회피 구현

// X 축 이동
while (currentX !== endX) {
  currentX += currentX < endX ? 1 : -1;
  
  // 장애물 검사
  if (this.isObstacle(currentX, currentY)) {
    // 장애물 우회 (실제 구현에서는 복잡한 알고리즘 필요)
    if (currentY > 0 && !this.isObstacle(currentX, currentY - 1)) {
      path.push([currentX, --currentY]);
    } else if (currentY < this.gridSizeY - 1 && !this.isObstacle(currentX, currentY + 1)) {
      path.push([currentX, ++currentY]);
    } else {
      // 우회 불가능한 경우 이전 위치로 롤백
      currentX += currentX < endX ? -1 : 1;
      continue;
    }
  }
  
  path.push([currentX, currentY]);
}

// Y 축 이동
while (currentY !== endY) {
  currentY += currentY < endY ? 1 : -1;
  
  // 장애물 검사
  if (this.isObstacle(currentX, currentY)) {
    // 장애물 우회
    if (currentX > 0 && !this.isObstacle(currentX - 1, currentY)) {
      path.push([--currentX, currentY]);
    } else if (currentX < this.gridSizeX - 1 && !this.isObstacle(currentX + 1, currentY)) {
      path.push([++currentX, currentY]);
    } else {
      // 우회 불가능한 경우 이전 위치로 롤백
      currentY += currentY < endY ? -1 : 1;
      continue;
    }
  }
  
  path.push([currentX, currentY]);
}

return path;
}

/**
* 장애물 여부 확인
* @param {number} x - X 좌표
* @param {number} y - Y 좌표
* @returns {boolean} 장애물 여부
*/
isObstacle(x, y) {
// 맵 범위 확인
if (x < 0 || x >= this.gridSizeX || y < 0 || y >= this.gridSizeY) {
  return true;
}

// 장애물 확인 (맵 데이터 값이 1인 경우)
return this.mapData[y][x] === 1;
}

/**
* AGV를 충전소로 보내기
* @param {Object} agv - 충전이 필요한 AGV
*/
sendAgvToCharging(agv) {
// 가장 가까운 충전소 찾기
const chargingStations = [];

for (let y = 0; y < this.gridSizeY; y++) {
  for (let x = 0; x < this.gridSizeX; x++) {
    if (this.mapData[y][x] === 2) { // 충전소
      chargingStations.push([x, y]);
    }
  }
}

// 충전소가 없으면 종료
if (chargingStations.length === 0) return;

// 가장 가까운 충전소 찾기
let nearestStation = null;
let minDistance = Infinity;

for (const station of chargingStations) {
  const distance = this.calculateDistance(agv.position, station);
  
  if (distance < minDistance) {
    minDistance = distance;
    nearestStation = station;
  }
}

// 충전소로 가는 경로 계산
if (nearestStation) {
  // 현재 작업이 있으면 작업 중단 (중단된 작업은 다시 대기 상태로)
  if (agv.currentTask) {
    const task = this.tasks.find(t => t.id === agv.currentTask);
    if (task) {
      task.status = 'pending';
      task.assignedTo = null;
      
      // 카운터 업데이트
      this.pendingTaskCount++;
      this.inProgressTaskCount--;
      
      this.addEventLog(`${agv.id}의 배터리 부족으로 작업 ${task.id}가 중단되었습니다.`, 'warning');
    }
  }
  
  // 충전소로 이동 설정
  agv.path = this.findPath(agv.position, nearestStation);
  agv.isChargingTrip = true;
  
  // 충전소에 도착하면 충전 시작
  if (agv.path.length === 0) {
    agv.status = 'charging';
    agv.isChargingTrip = false;
    this.addEventLog(`${agv.id}가 충전소에 도착했습니다.`);
  }
  
  this.addEventLog(`${agv.id}가 배터리 부족으로 충전소로 이동합니다.`, 'warning');
}
}

/**
* 특정 AGV에 포커스
* @param {Object} agv - 포커스할 AGV
*/
focusOnAgv(agv) {
// AGV 주변에 포커스 효과 추가 (간단한 깜빡임 효과)
const [x, y] = agv.position;
const cell = document.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);

if (cell) {
  // 기존 포커스 제거
  const focused = document.querySelector('.cell-focus');
  if (focused) {
    focused.classList.remove('cell-focus');
  }
  
  // 새 포커스 추가
  cell.classList.add('cell-focus');
  
  // 로그 추가
  this.addEventLog(`${agv.id}에 포커스되었습니다.`);
}
}

/**
* 작업 세부 정보 표시
* @param {Object} task - 세부 정보를 표시할 작업
*/
showTaskDetails(task) {
// 실제 구현에서는 세부 정보 패널 또는 모달 표시
console.log('작업 세부 정보:', task);

// 로그 추가
this.addEventLog(`작업 ${task.id} 정보가 표시되었습니다.`);
}

/**
* 맵 줌 인
*/
zoomIn() {
if (this.zoomLevel < 2.0) {
  this.zoomLevel += 0.1;
  this.applyZoom();
}
}

/**
* 맵 줌 아웃
*/
zoomOut() {
if (this.zoomLevel > 0.5) {
  this.zoomLevel -= 0.1;
  this.applyZoom();
}
}

/**
* 맵 보기 초기화
*/
resetView() {
this.zoomLevel = 1.0;
this.applyZoom();
}

/**
* 줌 레벨 적용
*/
applyZoom() {
const grid = document.querySelector('.simulation-grid');
if (grid) {
  grid.style.transform = `scale(${this.zoomLevel})`;
}
}

/**
* 시나리오 설정 적용
*/
applyScenarioSettings() {
// 시뮬레이션 실행 중에는 설정 변경 금지
if (this.isRunning) {
  showNotification('시뮬레이션이 실행 중입니다. 중지 후 설정을 변경하세요.', 'warning');
  return;
}

// AGV 수 업데이트
this.agvCount = parseInt(document.getElementById('agvCount').value);
document.getElementById('agvCountBadge').textContent = this.agvCount;

// 작업 수 업데이트
this.taskCount = parseInt(document.getElementById('taskCount').value);
document.getElementById('taskCountBadge').textContent = this.taskCount;

// 스케줄링 알고리즘 업데이트
this.schedulingAlgorithm = document.getElementById('schedulingAlgorithm').value;

// 장애 발생률 업데이트
this.failureRate = parseInt(document.getElementById('failureRate').value);
document.getElementById('failureRateValue').textContent = `${this.failureRate}%`;

// 시뮬레이션 재초기화
this.initSimulation();

// 알림
this.addEventLog('시나리오 설정이 적용되었습니다.', 'success');
showNotification('시나리오 설정이 적용되었습니다.', 'success');
}

/**
* 시나리오 로드
* @param {string} scenarioId - 시나리오 ID
*/
loadScenario(scenarioId) {
// 시뮬레이션 실행 중에는 설정 변경 금지
if (this.isRunning) {
  showNotification('시뮬레이션이 실행 중입니다. 중지 후 설정을 변경하세요.', 'warning');
  return;
}

switch (scenarioId) {
  case 'scenario1': // 기본 시나리오
    this.agvCount = 5;
    this.taskCount = 10;
    this.schedulingAlgorithm = 'fifo';
    this.failureRate = 5;
    break;
  case 'scenario2': // 고부하 시나리오
    this.agvCount = 8;
    this.taskCount = 20;
    this.schedulingAlgorithm = 'priority';
    this.failureRate = 10;
    break;
  case 'scenario3': // 장애 대응 시나리오
    this.agvCount = 3;
    this.taskCount = 8;
    this.schedulingAlgorithm = 'nearest';
    this.failureRate = 20;
    break;
  case 'custom':
    // 사용자 정의 시나리오는 현재 설정 유지
    return;
  default:
    return;
}

// UI 업데이트
document.getElementById('agvCount').value = this.agvCount;
document.getElementById('agvCountBadge').textContent = this.agvCount;

document.getElementById('taskCount').value = this.taskCount;
document.getElementById('taskCountBadge').textContent = this.taskCount;

document.getElementById('schedulingAlgorithm').value = this.schedulingAlgorithm;

document.getElementById('failureRate').value = this.failureRate;
document.getElementById('failureRateValue').textContent = `${this.failureRate}%`;

// 시뮬레이션 재초기화
this.initSimulation();

// 알림
this.addEventLog(`시나리오 "${document.getElementById('scenarioSelect').selectedOptions[0].text}"가 로드되었습니다.`, 'success');
showNotification('시나리오가 로드되었습니다.', 'success');
}

/**
* 무작위 이벤트 생성
*/
generateRandomEvent() {
const eventTypes = ['obstacle', 'battery', 'breakdown', 'highPriority'];
const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

// 무작위 AGV 선택
const activeAgvs = this.agvs.filter(agv => agv.status === 'active');
if (activeAgvs.length === 0) return;

const randomAgv = activeAgvs[Math.floor(Math.random() * activeAgvs.length)];

switch (eventType) {
  case 'obstacle': // 경로상 장애물 발생
    this.addEventLog(`${randomAgv.id}의 경로에 장애물이 발생했습니다.`, 'warning');
    break;
  case 'battery': // 배터리 급감
    randomAgv.battery = Math.max(5, randomAgv.battery - 20);
    this.addEventLog(`${randomAgv.id}의 배터리가 급격히 감소했습니다. (${randomAgv.battery.toFixed(1)}%)`, 'warning');
    break;
  case 'breakdown': // AGV 고장
    randomAgv.status = 'maintenance';
    this.addEventLog(`${randomAgv.id}가 고장으로 정지되었습니다.`, 'error');
    break;
  case 'highPriority': // 긴급 작업 발생
    // 새 작업 생성
    const taskId = `TASK-E${(this.tasks.length + 1).toString().padStart(2, '0')}`;
    
    // 작업장 위치 찾기
    const workstations = [];
    for (let y = 0; y < this.gridSizeY; y++) {
      for (let x = 0; x < this.gridSizeX; x++) {
        if (this.mapData[y][x] === 3) {
          workstations.push([x, y]);
        }
      }
    }
    
    // 임의의 출발지와 도착지 선택
    const startIdx = Math.floor(Math.random() * workstations.length);
    let endIdx;
    do {
      endIdx = Math.floor(Math.random() * workstations.length);
    } while (endIdx === startIdx && workstations.length > 1);
    
    const newTask = {
      id: taskId,
      startPoint: workstations[startIdx],
      endPoint: workstations[endIdx],
      status: 'pending',
      priority: 'high',
      assignedTo: null,
      progress: 0,
      createdAt: this.simulationTime
    };
    
    this.tasks.push(newTask);
    this.pendingTaskCount++;
    this.addEventLog(`긴급 작업 ${taskId}가 생성되었습니다.`, 'error');
    break;
}
}

/**
* 사용자 정의 이벤트 생성
*/
createCustomEvent() {
const eventType = document.getElementById('eventType').value;
const target = document.getElementById('eventTarget').value;

// 대상 AGV 선택
let targetAgv;
if (target === 'random') {
  const activeAgvs = this.agvs.filter(agv => agv.status === 'active');
  if (activeAgvs.length === 0) {
    showNotification('활성화된 AGV가 없습니다.', 'warning');
    return;
  }
  targetAgv = activeAgvs[Math.floor(Math.random() * activeAgvs.length)];
} else {
  targetAgv = this.agvs.find(agv => agv.id === target);
  if (!targetAgv) {
    showNotification('선택한 AGV를 찾을 수 없습니다.', 'warning');
    return;
  }
}

switch (eventType) {
  case 'obstacle': // 경로상 장애물 발생
    this.addEventLog(`${targetAgv.id}의 경로에 장애물이 발생했습니다.`, 'warning');
    showNotification(`${targetAgv.id}의 경로에 장애물이 발생했습니다.`, 'warning');
    break;
  case 'battery': // 배터리 급감
    targetAgv.battery = Math.max(5, targetAgv.battery - 30);
    this.addEventLog(`${targetAgv.id}의 배터리가 급격히 감소했습니다. (${targetAgv.battery.toFixed(1)}%)`, 'warning');
    showNotification(`${targetAgv.id}의 배터리가 급격히 감소했습니다.`, 'warning');
    break;
  case 'breakdown': // AGV 고장
    targetAgv.status = 'maintenance';
    targetAgv.currentTask = null;
    this.addEventLog(`${targetAgv.id}가 고장으로 정지되었습니다.`, 'error');
    showNotification(`${targetAgv.id}가 고장으로 정지되었습니다.`, 'danger');
    break;
  case 'highPriority': // 긴급 작업 발생
    // 새 작업 생성
    const taskId = `TASK-E${(this.tasks.length + 1).toString().padStart(2, '0')}`;
    
    // 작업장 위치 찾기
    const workstations = [];
    for (let y = 0; y < this.gridSizeY; y++) {
      for (let x = 0; x < this.gridSizeX; x++) {
        if (this.mapData[y][x] === 3) {
          workstations.push([x, y]);
        }
      }
    }
    
    // 임의의 출발지와 도착지 선택
    const startIdx = Math.floor(Math.random() * workstations.length);
    let endIdx;
    do {
      endIdx = Math.floor(Math.random() * workstations.length);
    } while (endIdx === startIdx && workstations.length > 1);
    
    const newTask = {
      id: taskId,
      startPoint: workstations[startIdx],
      endPoint: workstations[endIdx],
      status: 'pending',
      priority: 'high',
      assignedTo: null,
      progress: 0,
      createdAt: this.simulationTime
    };
    
    this.tasks.push(newTask);
    this.pendingTaskCount++;
    this.updateTaskCounters();
    this.addEventLog(`긴급 작업 ${taskId}가 생성되었습니다.`, 'error');
    showNotification(`긴급 작업 ${taskId}가 생성되었습니다.`, 'danger');
    break;
}

// UI 업데이트
this.renderAgvStatusList();
this.renderTaskList();
this.updateAgvPositions();
}

/**
* 시뮬레이션 결과 표시
*/
showResults() {
const resultModal = document.getElementById('resultModal');
resultModal.style.display = 'block';

// 결과 데이터 설정
document.getElementById('totalSimulationTime').textContent = this.formatTime(this.simulationTime);
document.getElementById('totalTasksProcessed').textContent = `${this.completedTaskCount} / ${this.tasks.length}`;

// 평균 대기 시간 계산
const completedTasks = this.tasks.filter(task => task.status === 'completed');
let totalWaitingTime = 0;

completedTasks.forEach(task => {
  totalWaitingTime += task.startProcessingTime - task.createdAt;
});

const avgWaitingTime = completedTasks.length > 0 ? 
  Math.round(totalWaitingTime / completedTasks.length / 60) : 0; // 분 단위

document.getElementById('avgWaitingTime').textContent = `${avgWaitingTime}분`;

// AGV 가동률 계산
const totalPossibleTime = this.agvCount * this.simulationTime;
const totalActiveTime = this.agvs.reduce((sum, agv) => sum + agv.activeTime, 0);
const utilizationRate = totalPossibleTime > 0 ? 
  Math.round((totalActiveTime / totalPossibleTime) * 100) : 0;

document.getElementById('agvUtilization').textContent = `${utilizationRate}%`;

// 차트는 실제 구현에서 Plotly 또는 Chart.js 등으로 구현
this.createResultCharts();
}

/**
* 결과 차트 생성
*/
createResultCharts() {
// 작업 완료 차트
const taskCompletionChart = document.getElementById('taskCompletionChart');
taskCompletionChart.innerHTML = '<div class="text-center p-3">작업 완료 차트가 여기에 표시됩니다.</div>';

// AGV 가동률 차트
const agvUtilizationChart = document.getElementById('agvUtilizationChart');
agvUtilizationChart.innerHTML = '<div class="text-center p-3">AGV 가동률 차트가 여기에 표시됩니다.</div>';
}

/**
* 시뮬레이션 결과 내보내기
*/
exportResults() {
// JSON 형식으로 결과 데이터 구성
const resultData = {
  simulationTime: this.simulationTime,
  agvCount: this.agvCount,
  taskCount: this.tasks.length,
  completedTaskCount: this.completedTaskCount,
  schedulingAlgorithm: this.schedulingAlgorithm,
  failureRate: this.failureRate,
  agvs: this.agvs.map(agv => ({
    id: agv.id,
    status: agv.status,
    battery: agv.battery
  })),
  tasks: this.tasks.map(task => ({
    id: task.id,
    status: task.status,
    priority: task.priority,
    assignedTo: task.assignedTo,
    progress: task.progress
  })),
  events: this.events
};

// 결과 데이터를 JSON 문자열로 변환
const resultJson = JSON.stringify(resultData, null, 2);

// 현재 날짜로 파일명 생성
const now = new Date();
const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
const filename = `simulation_result_${dateStr}_${timeStr}.json`;

// 다운로드 링크 생성
const element = document.createElement('a');
element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(resultJson));
element.setAttribute('download', filename);
element.style.display = 'none';

document.body.appendChild(element);
element.click();
document.body.removeChild(element);

showNotification('시뮬레이션 결과가 내보내기되었습니다.', 'success');
}

/**
* 시뮬레이션 저장
*/
saveSimulation() {
// 현재 시뮬레이션 상태 저장
const simulationState = {
  simulationTime: this.simulationTime,
  agvCount: this.agvCount,
  taskCount: this.tasks.length,
  schedulingAlgorithm: this.schedulingAlgorithm,
  failureRate: this.failureRate,
  mapData: this.mapData,
  agvs: this.agvs,
  tasks: this.tasks,
  events: this.events
};

// LocalStorage에 저장
const saved = storage.set('simulation_state', simulationState);

if (saved) {
  showNotification('시뮬레이션 상태가 저장되었습니다.', 'success');
} else {
  showNotification('시뮬레이션 저장 중 오류가 발생했습니다.', 'danger');
}
}

/**
* 이벤트 리스너 설정
*/
setupEventListeners() {
// 시뮬레이션 제어 버튼
document.getElementById('startSimulationButton').addEventListener('click', () => {
  this.startSimulation();
});

document.getElementById('pauseSimulationButton').addEventListener('click', () => {
  this.pauseSimulation();
});

document.getElementById('stopSimulationButton').addEventListener('click', () => {
  this.stopSimulation();
});

// 시뮬레이션 속도 버튼
const speedButtons = document.querySelectorAll('.speed-btn');
speedButtons.forEach(button => {
  button.addEventListener('click', () => {
    this.setSimulationSpeed(parseInt(button.getAttribute('data-speed')));
  });
});

// 시나리오 설정
document.getElementById('scenarioSelect').addEventListener('change', (e) => {
  this.loadScenario(e.target.value);
});

document.getElementById('agvCount').addEventListener('change', (e) => {
  this.agvCount = parseInt(e.target.value);
  document.getElementById('agvCountBadge').textContent = this.agvCount;
});

document.getElementById('taskCount').addEventListener('change', (e) => {
  this.taskCount = parseInt(e.target.value);
  document.getElementById('taskCountBadge').textContent = this.taskCount;
});

document.getElementById('schedulingAlgorithm').addEventListener('change', (e) => {
  this.schedulingAlgorithm = e.target.value;
});

document.getElementById('failureRate').addEventListener('input', (e) => {
  this.failureRate = parseInt(e.target.value);
  document.getElementById('failureRateValue').textContent = `${this.failureRate}%`;
});

// 설정 적용 버튼
document.getElementById('applyScenarioButton').addEventListener('click', () => {
  this.applyScenarioSettings();
});

// 이벤트 생성 버튼
document.getElementById('createEventButton').addEventListener('click', () => {
  this.createCustomEvent();
});

// 로그 지우기 버튼
document.getElementById('clearLogButton').addEventListener('click', () => {
  this.clearEventLog();
});

// 결과 내보내기 버튼
document.getElementById('exportResultButton').addEventListener('click', () => {
  this.exportResults();
});

// 결과 모달 닫기 버튼
document.getElementById('closeResultButton').addEventListener('click', () => {
  document.getElementById('resultModal').style.display = 'none';
});

// 작업 필터링
document.getElementById('taskListFilter').addEventListener('change', () => {
  this.filterTaskList();
});

// 맵 줌 컨트롤
document.getElementById('zoomInButton').addEventListener('click', () => {
  this.zoomIn();
});

document.getElementById('zoomOutButton').addEventListener('click', () => {
  this.zoomOut();
});

document.getElementById('resetViewButton').addEventListener('click', () => {
  this.resetView();
});

// 시뮬레이션 저장 버튼
document.getElementById('saveSimulationButton').addEventListener('click', () => {
  this.saveSimulation();
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
}

/**
* 시뮬레이션 초기화
*/
initSimulation() {
// 로딩 표시
this.showLoading(true);

// 맵 데이터 초기화
this.initMapData();

// 시나리오 기본 설정 적용
setTimeout(() => {
  // AGVs 생성
  this.initAgvs();
  
  // 작업 생성
  this.initTasks();
  
  // 맵 생성
  this.createSimulationMap();
  
  // AGV 목록 렌더링
  this.renderAgvStatusList();
  
  // 작업 목록 렌더링
  this.renderTaskList();
  
  // 로딩 숨기기
  this.showLoading(false);
  
  // 이벤트 로그 추가
  this.addEventLog('시뮬레이션이 초기화되었습니다.');
  
  // 시뮬레이션 상태 업데이트
  this.updateSimulationStatus('준비 완료');
}, 1000);
}

/**
* 맵 데이터 초기화
*/
initMapData() {
// 맵 데이터 생성 (0: 빈 공간, 1: 장애물, 2: 충전소, 3: 작업장)
this.mapData = Array(this.gridSizeY).fill().map(() => Array(this.gridSizeX).fill(0));

// 장애물 생성 (테두리 벽)
for (let i = 0; i < this.gridSizeX; i++) {
  this.mapData[0][i] = 1; // 상단 벽
  this.mapData[this.gridSizeY - 1][i] = 1; // 하단 벽
}

for (let i = 0; i < this.gridSizeY; i++) {
  this.mapData[i][0] = 1; // 좌측 벽
  this.mapData[i][this.gridSizeX - 1] = 1; // 우측 벽
}

// 충전소 추가
this.mapData[2][2] = 2;
this.mapData[2][this.gridSizeX - 3] = 2;
this.mapData[this.gridSizeY - 3][2] = 2;
this.mapData[this.gridSizeY - 3][this.gridSizeX - 3] = 2;

// 작업장 추가
this.mapData[5][5] = 3;
this.mapData[5][this.gridSizeX - 6] = 3;
this.mapData[this.gridSizeY - 6][5] = 3;
this.mapData[this.gridSizeY - 6][this.gridSizeX - 6] = 3;
this.mapData[Math.floor(this.gridSizeY / 2)][Math.floor(this.gridSizeX / 2)] = 3;

// 추가 장애물 (내부 벽)
for (let i = 3; i < this.gridSizeX - 3; i++) {
  if (i === 10) continue; // 통로
  this.mapData[8][i] = 1;
  this.mapData[this.gridSizeY - 9][i] = 1;
}

for (let i = 3; i < this.gridSizeY - 3; i++) {
  if (i === 10) continue; // 통로
  this.mapData[i][8] = 1;
  this.mapData[i][this.gridSizeX - 9] = 1;
}
}

/**
* AGV 초기화
*/
initAgvs() {
this.agvs = [];

// AGV 위치 후보
const positions = [
  [3, 3],
  [3, this.gridSizeX - 4],
  [this.gridSizeY - 4, 3],
  [this.gridSizeY - 4, this.gridSizeX - 4],
  [Math.floor(this.gridSizeY / 2), 3],
  [Math.floor(this.gridSizeY / 2), this.gridSizeX - 4],
  [3, Math.floor(this.gridSizeX / 2)],
  [this.gridSizeY - 4, Math.floor(this.gridSizeX / 2)]
];

// AGV 생성
for (let i = 0; i < this.agvCount; i++) {
  const agvId = `AGV-${(i + 1).toString().padStart(3, '0')}`;
  const position = positions[i % positions.length];
  
  this.agvs.push({
    id: agvId,
    position: position,
    status: 'idle', // idle, active, charging, maintenance
    battery: 85 + Math.floor(Math.random() * 16), // 85-100%
    currentTask: null,
    destination: null,
    path: []
  });
}
}

/**
* 작업 초기화
*/
initTasks() {
this.tasks = [];

// 작업장 위치 찾기
const workstations = [];
for (let y = 0; y < this.gridSizeY; y++) {
  for (let x = 0; x < this.gridSizeX; x++) {
    if (this.mapData[y][x] === 3) {
      workstations.push([x, y]);
    }
  }
}

// 작업 생성
for (let i = 0; i < this.taskCount; i++) {
  const taskId = `TASK-${(i + 1).toString().padStart(3, '0')}`;
  
  // 출발점과 도착점을 다른 작업장에서 선택
  const startIdx = Math.floor(Math.random() * workstations.length);
  let endIdx;
  do {
    endIdx = Math.floor(Math.random() * workstations.length);
  } while (endIdx === startIdx);
  
  const startPoint = workstations[startIdx];
  const endPoint = workstations[endIdx];
  
  // 우선순위 무작위 선택
  const priorities = ['high', 'medium', 'low'];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  
  this.tasks.push({
    id: taskId,
    startPoint: startPoint,
    endPoint: endPoint,
    status: 'pending', // pending, in-progress, completed
    priority: priority,
    assignedTo: null,
    progress: 0,
    createdAt: this.simulationTime
  });
}

// 통계 업데이트
this.pendingTaskCount = this.tasks.length;
this.inProgressTaskCount = 0;
this.completedTaskCount = 0;

this.updateTaskCounters();
}

/**
* 시뮬레이션 맵 생성
*/
createSimulationMap() {
const mapContainer = document.getElementById('simulationMapContainer');

// 기존 맵 제거
const existingGrid = mapContainer.querySelector('.simulation-grid');
if (existingGrid) {
  existingGrid.remove();
}

// 그리드 컨테이너 생성
const grid = document.createElement('div');
grid.className = 'simulation-grid';
grid.style.gridTemplateColumns = `repeat(${this.gridSizeX}, ${this.cellSize}px)`;
grid.style.gridTemplateRows = `repeat(${this.gridSizeY}, ${this.cellSize}px)`;
grid.style.transform = `scale(${this.zoomLevel})`;

// 셀 생성
for (let y = 0; y < this.gridSizeY; y++) {
  for (let x = 0; x < this.gridSizeX; x++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.setAttribute('data-x', x);
    cell.setAttribute('data-y', y);
    
    // 셀 유형에 따른 클래스 추가
    const cellType = this.mapData[y][x];
    switch (cellType) {
      case 1: // 장애물
        cell.innerHTML = '<div class="cell-content cell-obstacle"></div>';
        break;
      case 2: // 충전소
        cell.innerHTML = '<div class="cell-content cell-charging"><i class="fas fa-charging-station"></i></div>';
        break;
      case 3: // 작업장
        cell.innerHTML = '<div class="cell-content cell-task"><i class="fas fa-briefcase"></i></div>';
        break;
      default: // 빈 공간
        cell.innerHTML = '';
        break;
    }
    
    grid.appendChild(cell);
  }
}

mapContainer.appendChild(grid);

// AGV 위치 표시
this.updateAgvPositions();
}

/**
* AGV 위치 업데이트
*/
updateAgvPositions() {
// 기존 AGV 아이콘 제거
const agvIcons = document.querySelectorAll('.cell-agv');
agvIcons.forEach(icon => {
  const parent = icon.parentElement;
  if (parent) {
    parent.innerHTML = '';
  }
});

// 각 AGV 위치에 아이콘 추가
this.agvs.forEach(agv => {
  const [x, y] = agv.position;
  const cell = document.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
  
  if (cell) {
    // 셀 유형 확인
    const cellType = this.mapData[y][x];
    let iconHtml = '';
    
    // AGV 상태에 따른 아이콘
    const statusIcon = 
      agv.status === 'active' ? 'fa-truck' : 
      agv.status === 'charging' ? 'fa-battery-half' : 
      agv.status === 'maintenance' ? 'fa-tools' : 'fa-robot';
    
    // 배터리 수준에 따른 색상
    const batteryClass = 
      agv.battery < 20 ? 'text-danger' : 
      agv.battery < 50 ? 'text-warning' : '';
    
    // 셀 유형에 맞는 배경 위에 AGV 아이콘 추가
    switch (cellType) {
      case 2: // 충전소
        iconHtml = `<div class="cell-content cell-charging">
                      <div class="cell-agv ${batteryClass}">
                        <i class="fas ${statusIcon}"></i>
                      </div>
                    </div>`;
        break;
      case 3: // 작업장
        iconHtml = `<div class="cell-content cell-task">
                      <div class="cell-agv ${batteryClass}">
                        <i class="fas ${statusIcon}"></i>
                      </div>
                    </div>`;
        break;
      default: // 빈 공간
        iconHtml = `<div class="cell-agv ${batteryClass}">
                      <i class="fas ${statusIcon}"></i>
                    </div>`;
        break;
    }
    
    cell.innerHTML = iconHtml;
  }
});
}

/**
* AGV 상태 목록 렌더링
*/
renderAgvStatusList() {
const agvStatusList = document.getElementById('agvStatusList');
agvStatusList.innerHTML = '';

this.agvs.forEach(agv => {
  const statusClass = 
    agv.status === 'active' ? 'badge-success' : 
    agv.status === 'charging' ? 'badge-warning' : 
    agv.status === 'maintenance' ? 'badge-danger' : 'badge-info';
  
  const statusText = 
    agv.status === 'active' ? '가동 중' : 
    agv.status === 'charging' ? '충전 중' : 
    agv.status === 'maintenance' ? '점검 중' : '대기 중';
  
  const batteryClass = 
    agv.battery < 20 ? 'battery-low' : 
    agv.battery < 50 ? 'battery-medium' : 'battery-high';
  
  const agvItem = document.createElement('div');
  agvItem.className = 'agv-status-item';
  agvItem.innerHTML = `
    <div class="agv-icon">
      <i class="fas fa-robot"></i>
    </div>
    <div class="agv-info">
      <div class="agv-name">${agv.id}</div>
      <div class="agv-details">
        <span class="badge ${statusClass}">${statusText}</span>
        ${agv.currentTask ? `<span class="ml-1">작업: ${agv.currentTask}</span>` : ''}
      </div>
    </div>
    <div class="agv-battery">
      ${agv.battery}%
      <div class="battery-indicator">
        <div class="battery-level ${batteryClass}" style="width: ${agv.battery}%;"></div>
      </div>
    </div>
  `;
  
  // AGV 항목 클릭 이벤트
  agvItem.addEventListener('click', () => {
    // AGV 위치로 맵 중앙 이동 (실제 구현에서 추가)
    this.focusOnAgv(agv);
  });
  
  agvStatusList.appendChild(agvItem);
});
}

/**
* 작업 목록 렌더링
*/
renderTaskList() {
const taskList = document.getElementById('taskList');

// 필터 적용
const filter = document.getElementById('taskListFilter').value;
const filteredTasks = filter === 'all' ? 
  this.tasks : 
  this.tasks.filter(task => task.status === filter);

// 목록 초기화
taskList.innerHTML = '';

// 작업이 없는 경우
if (filteredTasks.length === 0) {
  taskList.innerHTML = '<div class="text-center p-3">표시할 작업이 없습니다.</div>';
  return;
}

// 각 작업 항목 생성
filteredTasks.forEach(task => {
  const statusClass = 
    task.status === 'pending' ? 'badge-warning' : 
    task.status === 'in-progress' ? 'badge-success' : 'badge-info';
  
  const statusText = 
    task.status === 'pending' ? '대기 중' : 
    task.status === 'in-progress' ? '진행 중' : '완료';
  
  const priorityClass = 
    task.priority === 'high' ? 'text-danger' : 
    task.priority === 'medium' ? 'text-warning' : 'text-info';
  
  const priorityText = 
    task.priority === 'high' ? '높음' : 
    task.priority === 'medium' ? '중간' : '낮음';
  
  const taskItem = document.createElement('div');
  taskItem.className = 'task-item';
  taskItem.innerHTML = `
    <div class="task-left">
      <div class="task-name">${task.id}</div>
      <div class="task-item-details">
        <span class="${priorityClass}">우선순위: ${priorityText}</span>
        ${task.assignedTo ? `<span class="ml-1">AGV: ${task.assignedTo}</span>` : ''}
      </div>
    </div>
    <div class="task-right">
      <div class="task-item-status badge ${statusClass}">${statusText}</div>
      ${task.status === 'in-progress' ? `<div class="text-center">${task.progress}%</div>` : ''}
    </div>
  `;
  
  // 작업 항목 클릭 이벤트
  taskItem.addEventListener('click', () => {
    // 작업 세부 정보 표시 (실제 구현에서 추가)
    this.showTaskDetails(task);
  });
  
  taskList.appendChild(taskItem);
});
}

/**
* 작업 목록 필터링
*/
filterTaskList() {
this.renderTaskList();
}

/**
* 작업 카운터 업데이트
*/
updateTaskCounters() {
document.getElementById('pendingTaskCount').textContent = this.pendingTaskCount;
document.getElementById('inProgressTaskCount').textContent = this.inProgressTaskCount;
document.getElementById('completedTaskCount').textContent = this.completedTaskCount;
document.getElementById('taskCountBadge').textContent = this.tasks.length;
}

/**
* 시뮬레이션 상태 메시지 업데이트
* @param {string} status - 상태 메시지
*/
updateSimulationStatus(status) {
document.getElementById('simulationStatus').textContent = status;
}

/**
* 이벤트 로그 추가
* @param {string} message - 로그 메시지
* @param {string} type - 로그 유형 (info, warning, error, success)
*/
addEventLog(message, type = 'info') {
const eventLog = document.getElementById('eventLog');
const time = this.formatTime(this.simulationTime);

// 이벤트 객체 생성
const event = {
  time: this.simulationTime,
  message: message,
  type: type
};

// 이벤트 배열에 추가
this.events.push(event);

// 이벤트 로그 항목 생성
const logItem = document.createElement('div');
logItem.className = 'event-log-item';
logItem.innerHTML = `
  <div class="event-time">${time}</div>
  <div class="event-message ${type}">${message}</div>
`;

// 로그 목록에 추가
eventLog.appendChild(logItem);

// 스크롤을 아래로 이동
eventLog.scrollTop = eventLog.scrollHeight;
}

/**
* 이벤트 로그 지우기
*/
clearEventLog() {
const eventLog = document.getElementById('eventLog');
eventLog.innerHTML = '';

// 시스템 메시지 추가
this.addEventLog('이벤트 로그가 지워졌습니다.');
}

/**
* 시간 포맷 변환 (초 -> HH:MM:SS)
* @param {number} seconds - 초 단위 시간
* @returns {string} 포맷된 시간 문자열
*/
formatTime(seconds) {
const hours = Math.floor(seconds / 3600);
const minutes = Math.floor((seconds % 3600) / 60);
const secs = seconds % 60;

return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
* 로딩 오버레이 표시/숨김
* @param {boolean} show - 표시 여부
*/
showLoading(show) {
const loadingOverlay = document.querySelector('.loading-overlay');
if (loadingOverlay) {
  loadingOverlay.style.display = show ? 'flex' : 'none';
}
}

/**
* 시뮬레이션 시작
*/
startSimulation() {
if (this.isRunning && this.isPaused) {
  // 일시 정지 상태에서 재개
  this.isPaused = false;
  this.updateSimulationStatus('실행 중');
  this.addEventLog('시뮬레이션이 재개되었습니다.', 'success');
} else if (!this.isRunning) {
  // 새로운 시뮬레이션 시작
  this.isRunning = true;
  this.isPaused = false;
  this.updateSimulationStatus('실행 중');
  this.addEventLog('시뮬레이션이 시작되었습니다.', 'success');
  
  // 시뮬레이션 실행 간격 설정 (기본 1초에 한 번)
  const updateInterval = 1000 / this.simulationSpeed;
  this.simulationInterval = setInterval(() => {
    this.updateSimulation();
  }, updateInterval);
}

// 버튼 상태 업데이트
document.getElementById('startSimulationButton').disabled = true;
document.getElementById('pauseSimulationButton').disabled = false;
document.getElementById('stopSimulationButton').disabled = false;
}

/**
* 시뮬레이션 일시 정지
*/
pauseSimulation() {
if (this.isRunning && !this.isPaused) {
  this.isPaused = true;
  this.updateSimulationStatus('일시 정지');
  this.addEventLog('시뮬레이션이 일시 정지되었습니다.', 'warning');
  
  // 버튼 상태 업데이트
  document.getElementById('startSimulationButton').disabled = false;
  document.getElementById('pauseSimulationButton').disabled = true;
}
}

/**
* 시뮬레이션 중지
*/
stopSimulation() {
if (this.isRunning) {
  this.isRunning = false;
  this.isPaused = false;
  
  // 타이머 정지
  if (this.simulationInterval) {
    clearInterval(this.simulationInterval);
    this.simulationInterval = null;
  }
  
  this.updateSimulationStatus('중지됨');
  this.addEventLog('시뮬레이션이 중지되었습니다.', 'error');
  
  // 버튼 상태 업데이트
  document.getElementById('startSimulationButton').disabled = false;
  document.getElementById('pauseSimulationButton').disabled = true;
  document.getElementById('stopSimulationButton').disabled = true;
  
  // 결과 모달 표시
  this.showResults();
}
}

/**
* 시뮬레이션 속도 설정
* @param {number} speed - 속도 배율 (1, 2, 4, 8)
*/
setSimulationSpeed(speed) {
// 속도 버튼 스타일 업데이트
const speedButtons = document.querySelectorAll('.speed-btn');
speedButtons.forEach(button => {
  button.classList.remove('active');
  if (parseInt(button.getAttribute('data-speed')) === speed) {
    button.classList.add('active');
  }
});

const oldSpeed = this.simulationSpeed;
this.simulationSpeed = speed;

// 실행 중인 경우 타이머 재설정
if (this.isRunning && !this.isPaused && this.simulationInterval) {
  clearInterval(this.simulationInterval);
  
  const updateInterval = 1000 / this.simulationSpeed;
  this.simulationInterval = setInterval(() => {
    this.updateSimulation();
  }, updateInterval);
}

this.addEventLog(`시뮬레이션 속도가 ${oldSpeed}x에서 ${speed}x로 변경되었습니다.`);
}

/**
* 시뮬레이션 업데이트 (매 틱마다 호출)
*/
updateSimulation() {
// 일시 정지 상태에서는 업데이트 생략
if (this.isPaused) return;

// 시뮬레이션 시간 증가
this.simulationTime++;

// 시간 표시 업데이트
document.getElementById('simulationTime').textContent = this.formatTime(this.simulationTime);

// AGV 상태 업데이트
this.updateAgvStates();

// 작업 할당 및 진행 업데이트
this.updateTaskAssignments();

// 화면 업데이트
if (this.simulationTime % 2 === 0) { // 성능을 위해 2틱마다 업데이트
  this.updateAgvPositions();
  this.renderAgvStatusList();
  this.renderTaskList();
}

// 무작위 이벤트 생성 (매 60틱마다 확률로 발생)
if (this.simulationTime % 60 === 0 && Math.random() * 100 < this.failureRate) {
  this.generateRandomEvent();
}

// 모든 작업이 완료되면 시뮬레이션 종료
if (this.completedTaskCount === this.tasks.length && this.tasks.length > 0) {
  this.addEventLog('모든 작업이 완료되었습니다.', 'success');
  this.stopSimulation();
}
}
}

// 문서 로드 완료 후 시뮬레이션 컨트롤러 인스턴스 생성
document.addEventListener('DOMContentLoaded', function() {
window.simulationController = new SimulationController();
});