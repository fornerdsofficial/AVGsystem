/**
* map-editor.js - 맵 에디터 및 라우팅 페이지 스크립트
*/

// 맵 에디터 클래스
class MapEditor {
  constructor() {
    // 맵 그리드 설정
    this.mapGrid = document.getElementById('mapGrid');
    this.gridSizeX = 20;
    this.gridSizeY = 20;
    this.cellSize = 30; // 픽셀 단위

    // 맵 데이터 (0: 빈 공간, 1: 장애물, 2: 충전소, 3: 작업장)
    this.mapData = Array(this.gridSizeY).fill().map(() => Array(this.gridSizeX).fill(0));

    // 현재 선택된 도구
    this.currentTool = 'select';

    // 경로 정보
    this.startPoint = null;
    this.endPoint = null;
    this.calculatedPath = null;
    this.visitedNodes = [];

    // 맵 줌 및 이동 설정
    this.zoomLevel = 1;
    this.isPanning = false;
    this.lastPanPoint = { x: 0, y: 0 };

    // 시뮬레이션 설정
    this.isSimulating = false;
    this.simulationInterval = null;
    this.currentPathIndex = 0;
    this.agvPosition = null;
    this.agvBatteryLevel = 100;
    this.agvSpeed = 5; // 초당 셀 수
    this.batteryConsumption = 1; // 셀당 배터리 소모율 (%)
    this.chargingRate = 5; // 초당 충전율 (%)

    // 이벤트 핸들러 설정
    this.setupEventListeners();

    // 초기 맵 생성
    this.createMapGrid();
    this.updateGridSize();
  }

  /**
   * 이벤트 핸들러 설정
   */
  setupEventListeners() {
    // 도구 버튼 클릭 이벤트
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.setCurrentTool(button.getAttribute('data-tool'));
      });
    });

    // 경로 계산 버튼 클릭 이벤트
    document.getElementById('calculateRouteButton').addEventListener('click', () => {
      this.calculateRoute();
    });

    // 시뮬레이션 시작 버튼 클릭 이벤트
    document.getElementById('startSimulationButton').addEventListener('click', () => {
      this.toggleSimulation();
    });

    // 맵 크기 입력 이벤트
    document.getElementById('mapSizeX').addEventListener('change', () => {
      this.updateMapSize();
    });

    document.getElementById('mapSizeY').addEventListener('change', () => {
      this.updateMapSize();
    });

    // 맵 줌 컨트롤 이벤트
    document.getElementById('zoomInButton').addEventListener('click', () => {
      this.zoomIn();
    });

    document.getElementById('zoomOutButton').addEventListener('click', () => {
      this.zoomOut();
    });

    document.getElementById('resetViewButton').addEventListener('click', () => {
      this.resetView();
    });

    // 맵 초기화 버튼 이벤트
    document.getElementById('clearMapButton').addEventListener('click', () => {
      this.clearMap();
    });

    // 맵 저장/불러오기 이벤트
    document.getElementById('saveMapButton').addEventListener('click', () => {
      this.saveMap();
    });

    document.getElementById('exportMapButton').addEventListener('click', () => {
      this.exportMap();
    });

    document.getElementById('importMapButton').addEventListener('click', () => {
      this.showImportModal();
    });

    document.getElementById('importDataButton').addEventListener('click', () => {
      this.importMap();
    });

    document.getElementById('copyDataButton').addEventListener('click', () => {
      this.copyMapData();
    });

    document.getElementById('downloadMapButton').addEventListener('click', () => {
      this.downloadMap();
    });

    // 맵 선택 불러오기 이벤트
    document.getElementById('mapSelect').addEventListener('change', (e) => {
      const selectedMap = e.target.value;
      if (selectedMap) {
        this.loadPredefinedMap(selectedMap);
      }
    });

    // 출발점/도착점 선택 버튼 이벤트
    document.getElementById('selectStartButton').addEventListener('click', () => {
      this.setCurrentTool('setStart');
    });

    document.getElementById('selectEndButton').addEventListener('click', () => {
      this.setCurrentTool('setEnd');
    });

    // 경로 시뮬레이션 버튼 이벤트
    document.getElementById('simulateRouteButton').addEventListener('click', () => {
      this.startSimulation();
    });

    // 알고리즘 선택 이벤트
    document.getElementById('algorithmSelect').addEventListener('change', (e) => {
      this.updateAlgorithmInfo(e.target.value);
    });

    // 시뮬레이션 매개변수 입력 이벤트
    document.getElementById('agvSpeed').addEventListener('input', (e) => {
      this.agvSpeed = parseInt(e.target.value);
      document.getElementById('agvSpeedValue').textContent = this.agvSpeed;
    });

    document.getElementById('batteryConsumption').addEventListener('input', (e) => {
      this.batteryConsumption = parseFloat(e.target.value);
      document.getElementById('batteryConsumptionValue').textContent = this.batteryConsumption.toFixed(1);
    });

    document.getElementById('chargingRate').addEventListener('input', (e) => {
      this.chargingRate = parseInt(e.target.value);
      document.getElementById('chargingRateValue').textContent = this.chargingRate.toFixed(1);
    });

    // 맵 그리드 팬(이동) 이벤트
    this.mapGrid.addEventListener('mousedown', (e) => {
      // 중간 버튼 또는 Shift + 왼쪽 버튼으로 팬 시작
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        this.isPanning = true;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.mapGrid.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = e.clientX - this.lastPanPoint.x;
        const dy = e.clientY - this.lastPanPoint.y;
        
        const mapWrapper = document.querySelector('.map-wrapper');
        mapWrapper.scrollLeft -= dx;
        mapWrapper.scrollTop -= dy;
        
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
      }
      
      // 커서 위치 표시
      this.updateCursorPosition(e);
    });

    document.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.mapGrid.style.cursor = '';
      }
    });

    // 맵 그리드 크기 표시 업데이트
    this.updateGridSize();
  }

  /**
   * 커서 위치 정보 업데이트
   * @param {MouseEvent} e - 마우스 이벤트
   */
  updateCursorPosition(e) {
    const mapRect = this.mapGrid.getBoundingClientRect();
    const x = Math.floor((e.clientX - mapRect.left) / (this.cellSize * this.zoomLevel));
    const y = Math.floor((e.clientY - mapRect.top) / (this.cellSize * this.zoomLevel));

    if (x >= 0 && x < this.gridSizeX && y >= 0 && y < this.gridSizeY) {
      document.getElementById('cursorPosition').textContent = `X: ${x}, Y: ${y}`;
    }
  }

  /**
   * 그리드 크기 정보 업데이트
   */
  updateGridSize() {
    document.getElementById('gridSize').textContent = `그리드: ${this.gridSizeX} × ${this.gridSizeY}`;
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

    // 스크롤 위치도 초기화
    const mapWrapper = document.querySelector('.map-wrapper');
    mapWrapper.scrollTop = 0;
    mapWrapper.scrollLeft = 0;
  }

  /**
   * 줌 레벨 적용
   */
  applyZoom() {
    this.mapGrid.style.transform = `scale(${this.zoomLevel})`;
  }

  /**
   * 현재 도구 설정
   * @param {string} tool - 선택할 도구명
   */
  setCurrentTool(tool) {
    this.currentTool = tool;

    // 도구 버튼 UI 업데이트
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-tool') === tool);
    });

    // 선택/설정 모드에 따른 커서 스타일 변경
    switch (tool) {
      case 'select':
        this.mapGrid.style.cursor = 'pointer';
        break;
      case 'setStart':
        this.mapGrid.style.cursor = 'crosshair';
        break;
      case 'setEnd':
        this.mapGrid.style.cursor = 'crosshair';
        break;
      default:
        this.mapGrid.style.cursor = 'cell';
        break;
    }
  }

  /**
   * 맵 그리드 생성
   */
  createMapGrid() {
    // 기존 그리드 비우기
    this.mapGrid.innerHTML = '';

    // 그리드 컨테이너 스타일 설정
    this.mapGrid.style.gridTemplateColumns = `repeat(${this.gridSizeX}, ${this.cellSize}px)`;
    this.mapGrid.style.gridTemplateRows = `repeat(${this.gridSizeY}, ${this.cellSize}px)`;

    // 각 셀 생성
    for (let y = 0; y < this.gridSizeY; y++) {
      for (let x = 0; x < this.gridSizeX; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell empty';
        cell.setAttribute('data-x', x);
        cell.setAttribute('data-y', y);
        
        // 좌표 표시 (선택 사항)
        const coords = document.createElement('span');
        coords.className = 'grid-coordinates';
        coords.textContent = `${x},${y}`;
        cell.appendChild(coords);
        
        // 셀 클릭 이벤트
        cell.addEventListener('click', () => {
          this.handleCellClick(x, y);
        });
        
        // 드래그로 그리기 위한 이벤트
        cell.addEventListener('mouseenter', (e) => {
          if (e.buttons === 1 && this.currentTool !== 'select') {
            this.handleCellClick(x, y);
          }
        });
        
        this.mapGrid.appendChild(cell);
      }
    }

    // 맵 데이터에 따라 셀 상태 업데이트
    this.updateGridFromData();
  }

  /**
   * 맵 데이터로부터 그리드 시각화 업데이트
   */
  updateGridFromData() {
    for (let y = 0; y < this.gridSizeY; y++) {
      for (let x = 0; x < this.gridSizeX; x++) {
        const cellType = this.mapData[y][x];
        const cell = this.getCell(x, y);
        
        if (cell) {
          // 이전 클래스 제거
          cell.className = 'grid-cell';
          
          // 셀 타입에 따른 클래스 추가
          switch (cellType) {
            case 0:
              cell.classList.add('empty');
              cell.innerHTML = '<span class="grid-coordinates">' + x + ',' + y + '</span>';
              break;
            case 1:
              cell.classList.add('obstacle');
              cell.innerHTML = '<i class="fas fa-ban"></i><span class="grid-coordinates">' + x + ',' + y + '</span>';
              break;
            case 2:
              cell.classList.add('charging');
              cell.innerHTML = '<i class="fas fa-battery-half"></i><span class="grid-coordinates">' + x + ',' + y + '</span>';
              break;
            case 3:
              cell.classList.add('workstation');
              cell.innerHTML = '<i class="fas fa-briefcase"></i><span class="grid-coordinates">' + x + ',' + y + '</span>';
              break;
            case 9:
              cell.classList.add('path');
              cell.innerHTML = '<span class="grid-coordinates">' + x + ',' + y + '</span>';
              break;
          }
          
          // 시작점/종료점 표시
          if (this.startPoint && x === this.startPoint[0] && y === this.startPoint[1]) {
            cell.classList.add('start');
            cell.innerHTML = '<i class="fas fa-map-marker-alt"></i><span class="grid-coordinates">' + x + ',' + y + '</span>';
          }
          
          if (this.endPoint && x === this.endPoint[0] && y === this.endPoint[1]) {
            cell.classList.add('end');
            cell.innerHTML = '<i class="fas fa-flag-checkered"></i><span class="grid-coordinates">' + x + ',' + y + '</span>';
          }
        }
      }
    }
  }

  /**
   * 좌표로 셀 요소 가져오기
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   * @returns {HTMLElement} 셀 요소
   */
  getCell(x, y) {
    return this.mapGrid.querySelector(`[data-x="${x}"][data-y="${y}"]`);
  }

  /**
   * 셀 클릭 이벤트 처리
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   */
  handleCellClick(x, y) {
    switch (this.currentTool) {
      case 'select':
        // 셀 정보 표시 또는 선택 로직
        this.selectCell(x, y);
        break;
      case 'obstacle':
        this.mapData[y][x] = 1;
        break;
      case 'charging':
        this.mapData[y][x] = 2;
        break;
      case 'workstation':
        this.mapData[y][x] = 3;
        break;
      case 'erase':
        this.mapData[y][x] = 0;
        break;
      case 'setStart':
        // 이전 시작점 지우기
        if (this.startPoint) {
          const [prevX, prevY] = this.startPoint;
          // 경로인 경우 경로 유지, 아니면 빈 공간으로
          this.mapData[prevY][prevX] = this.calculatedPath && this.isInPath(prevX, prevY) ? 9 : 0;
        }
        
        this.startPoint = [x, y];
        document.getElementById('startPointX').value = x;
        document.getElementById('startPointY').value = y;
        // 도구를 선택으로 되돌림
        this.setCurrentTool('select');
        break;
      case 'setEnd':
        // 이전 종료점 지우기
        if (this.endPoint) {
          const [prevX, prevY] = this.endPoint;
          // 경로인 경우 경로 유지, 아니면 빈 공간으로
          this.mapData[prevY][prevX] = this.calculatedPath && this.isInPath(prevX, prevY) ? 9 : 0;
        }
        
        this.endPoint = [x, y];
        document.getElementById('endPointX').value = x;
        document.getElementById('endPointY').value = y;
        // 도구를 선택으로 되돌림
        this.setCurrentTool('select');
        break;
    }

    // 그리드 시각화 업데이트
    this.updateGridFromData();

    // 경로 있으면 무효화 (선택, 시작점, 종료점 설정 외 동작)
    if (['obstacle', 'charging', 'workstation', 'erase'].includes(this.currentTool)) {
      this.invalidatePath();
    }
  }

  /**
   * 셀 선택 처리
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   */
  selectCell(x, y) {
    const cellType = this.mapData[y][x];
    let cellInfo = '';

    // 셀 타입에 따른 정보 구성
    switch (cellType) {
      case 0:
        cellInfo = '빈 공간';
        break;
      case 1:
        cellInfo = '장애물';
        break;
      case 2:
        cellInfo = '충전소';
        break;
      case 3:
        cellInfo = '작업장';
        break;
      case 9:
        cellInfo = '경로';
        break;
    }

    // 시작점 또는 종료점인 경우 추가 정보
    if (this.startPoint && x === this.startPoint[0] && y === this.startPoint[1]) {
      cellInfo += ' (출발점)';
    }

    if (this.endPoint && x === this.endPoint[0] && y === this.endPoint[1]) {
      cellInfo += ' (도착점)';
    }

    // 선택한 셀 좌표와 정보 표시
    console.log(`선택한 셀: [${x}, ${y}] - ${cellInfo}`);

    // 나중에 정보 패널에 표시 기능 추가 가능
  }

  /**
   * 경로 무효화 (맵 변경 시)
   */
  invalidatePath() {
    // 경로가 있으면 지우기
    if (this.calculatedPath) {
      // 경로 셀 원래대로 복원
      for (const [x, y] of this.calculatedPath) {
        // 시작점과 종료점은 유지
        if ((this.startPoint && x === this.startPoint[0] && y === this.startPoint[1]) ||
            (this.endPoint && x === this.endPoint[0] && y === this.endPoint[1])) {
          continue;
        }
        
        // 경로 표시 지우기
        this.mapData[y][x] = 0;
      }
      
      // 경로 정보 초기화
      this.calculatedPath = null;
      this.visitedNodes = [];
      
      // 경로 정보 패널 업데이트
      document.getElementById('routeInfo').innerHTML = `
        <div class="text-center p-3">
          <p>경로가 계산되지 않았습니다.</p>
          <p>출발점과 도착점을 선택한 후 경로를 계산하세요.</p>
        </div>
      `;
      
      // 시뮬레이션 버튼 비활성화
      document.getElementById('startSimulationButton').disabled = true;
      
      // 그리드 시각화 업데이트
      this.updateGridFromData();
    }
  }

  /**
   * 좌표가 계산된 경로에 포함되는지 확인
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   * @returns {boolean} 경로 포함 여부
   */
  isInPath(x, y) {
    if (!this.calculatedPath) return false;

    return this.calculatedPath.some(point => point[0] === x && point[1] === y);
  }

  /**
   * 맵 크기 업데이트
   */
  updateMapSize() {
    const newSizeX = parseInt(document.getElementById('mapSizeX').value);
    const newSizeY = parseInt(document.getElementById('mapSizeY').value);

    // 유효성 검사
    if (newSizeX < 5 || newSizeX > 50 || newSizeY < 5 || newSizeY > 50) {
      showNotification('맵 크기는 5x5에서 50x50 사이여야 합니다.', 'warning');
      return;
    }

    // 맵 데이터 크기 조정
    const newMapData = Array(newSizeY).fill().map(() => Array(newSizeX).fill(0));

    // 기존 데이터 복사 (가능한 부분만)
    for (let y = 0; y < Math.min(this.gridSizeY, newSizeY); y++) {
      for (let x = 0; x < Math.min(this.gridSizeX, newSizeX); x++) {
        newMapData[y][x] = this.mapData[y][x];
      }
    }

    // 시작점과 종료점이 새 맵 크기를 벗어나면 초기화
    if (this.startPoint && (this.startPoint[0] >= newSizeX || this.startPoint[1] >= newSizeY)) {
      this.startPoint = null;
      document.getElementById('startPointX').value = '';
      document.getElementById('startPointY').value = '';
    }

    if (this.endPoint && (this.endPoint[0] >= newSizeX || this.endPoint[1] >= newSizeY)) {
      this.endPoint = null;
      document.getElementById('endPointX').value = '';
      document.getElementById('endPointY').value = '';
    }

    // 맵 데이터 업데이트
    this.mapData = newMapData;
    this.gridSizeX = newSizeX;
    this.gridSizeY = newSizeY;

    // 그리드 재생성
    this.createMapGrid();
    this.updateGridSize();

    // 경로 무효화
    this.invalidatePath();

    showNotification('맵 크기가 변경되었습니다.', 'success');
  }

  /**
   * 맵 초기화
   */
  clearMap() {
    if (confirm('맵을 초기화하시겠습니까? 모든 셀이 비워집니다.')) {
      // 맵 데이터 초기화
      this.mapData = Array(this.gridSizeY).fill().map(() => Array(this.gridSizeX).fill(0));
      
      // 시작/종료점 초기화
      this.startPoint = null;
      this.endPoint = null;
      document.getElementById('startPointX').value = '';
      document.getElementById('startPointY').value = '';
      document.getElementById('endPointX').value = '';
      document.getElementById('endPointY').value = '';
      
      // 경로 무효화
      this.invalidatePath();
      
      // 그리드 시각화 업데이트
      this.updateGridFromData();
      
      showNotification('맵이 초기화되었습니다.', 'success');
    }
  }

  /**
   * 맵 저장
   */
  saveMap() {
    const mapName = prompt('저장할 맵 이름을 입력하세요:', 'my-map');

    if (mapName) {
      const mapData = {
        name: mapName,
        sizeX: this.gridSizeX,
        sizeY: this.gridSizeY,
        grid: this.mapData,
        startPoint: this.startPoint,
        endPoint: this.endPoint
      };
      
      // LocalStorage에 맵 저장
      storage.set(`map_${mapName}`, mapData);
      
      showNotification(`맵 "${mapName}"이 저장되었습니다.`, 'success');
    }
  }

  /**
   * 맵 내보내기 모달 표시
   */
  exportMap() {
    const modal = document.getElementById('exportModal');
    modal.style.display = 'block';

    // 기본 맵 이름 설정
    document.getElementById('exportName').value = 'my-map';

    // 맵 데이터 생성
    this.generateExportData();
  }

  /**
   * 내보낼 맵 데이터 생성
   */
  generateExportData() {
    const format = document.getElementById('exportFormat').value;
    const exportName = document.getElementById('exportName').value || 'my-map';

    const mapData = {
      name: exportName,
      sizeX: this.gridSizeX,
      sizeY: this.gridSizeY,
      grid: this.mapData,
      startPoint: this.startPoint,
      endPoint: this.endPoint,
      timestamp: new Date().toISOString()
    };

    let exportData = '';

    if (format === 'json') {
      exportData = JSON.stringify(mapData, null, 2);
    } else if (format === 'csv') {
      // 헤더 정보
      exportData = `# Map Name: ${exportName}\n`;
      exportData += `# Size: ${this.gridSizeX}x${this.gridSizeY}\n`;
      exportData += `# Start: ${this.startPoint ? this.startPoint.join(',') : 'none'}\n`;
      exportData += `# End: ${this.endPoint ? this.endPoint.join(',') : 'none'}\n`;
      exportData += `# Date: ${new Date().toISOString()}\n`;
      exportData += `# Legend: 0=Empty, 1=Obstacle, 2=Charging, 3=Workstation\n`;
      
      // 맵 데이터
      for (let y = 0; y < this.gridSizeY; y++) {
        exportData += this.mapData[y].join(',') + '\n';
      }
    }

    document.getElementById('exportData').value = exportData;
  }

  /**
   * 맵 데이터 복사
   */
  copyMapData() {
    const exportData = document.getElementById('exportData');
    exportData.select();
    document.execCommand('copy');

    showNotification('맵 데이터가 클립보드에 복사되었습니다.', 'success');
  }

  /**
   * 맵 데이터 다운로드
   */
  downloadMap() {
    const format = document.getElementById('exportFormat').value;
    const exportName = document.getElementById('exportName').value || 'my-map';
    const exportData = document.getElementById('exportData').value;

    // 다운로드 링크 생성
    const blob = new Blob([exportData], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName}.${format}`;
    a.click();

    // 메모리 정리
    setTimeout(() => URL.revokeObjectURL(url), 100);

    showNotification(`맵이 "${exportName}.${format}" 파일로 다운로드되었습니다.`, 'success');
  }

  /**
   * 맵 가져오기 모달 표시
   */
  showImportModal() {
    const modal = document.getElementById('importModal');
    modal.style.display = 'block';
  }

  /**
   * 맵 가져오기
   */
  importMap() {
    const format = document.getElementById('importFormat').value;
    const importData = document.getElementById('importData').value;

    if (!importData.trim()) {
      showNotification('가져올 맵 데이터가 없습니다.', 'warning');
      return;
    }

    try {
      if (format === 'json') {
        this.importMapFromJson(importData);
      } else if (format === 'csv') {
        this.importMapFromCsv(importData);
      }
      
      // 모달 닫기
      document.getElementById('importModal').style.display = 'none';
      
      showNotification('맵을 성공적으로 가져왔습니다.', 'success');
    } catch (error) {
      console.error('맵 가져오기 오류:', error);
      showNotification('맵 데이터 형식이 잘못되었습니다: ' + error.message, 'danger');
    }
  }

  /**
   * JSON 형식에서 맵 가져오기
   * @param {string} jsonData - JSON 맵 데이터
   */
  importMapFromJson(jsonData) {
    const mapData = JSON.parse(jsonData);

    // 필수 필드 확인
    if (!mapData.grid || !Array.isArray(mapData.grid) || !mapData.sizeX || !mapData.sizeY) {
      throw new Error('필수 맵 데이터가 없거나 형식이 잘못되었습니다.');
    }

    // 맵 크기 업데이트
    this.gridSizeX = mapData.sizeX;
    this.gridSizeY = mapData.sizeY;
    document.getElementById('mapSizeX').value = this.gridSizeX;
    document.getElementById('mapSizeY').value = this.gridSizeY;

    // 맵 데이터 복사
    this.mapData = JSON.parse(JSON.stringify(mapData.grid));

    // 시작점/종료점 설정
    this.startPoint = mapData.startPoint;
    this.endPoint = mapData.endPoint;

    if (this.startPoint) {
      document.getElementById('startPointX').value = this.startPoint[0];
      document.getElementById('startPointY').value = this.startPoint[1];
    } else {
      document.getElementById('startPointX').value = '';
      document.getElementById('startPointY').value = '';
    }

    if (this.endPoint) {
      document.getElementById('endPointX').value = this.endPoint[0];
      document.getElementById('endPointY').value = this.endPoint[1];
    } else {
      document.getElementById('endPointX').value = '';
      document.getElementById('endPointY').value = '';
    }

    // 그리드 재생성
    this.createMapGrid();
    this.updateGridSize();

    // 경로 무효화
    this.invalidatePath();
  }

  /**
   * CSV 형식에서 맵 가져오기
   * @param {string} csvData - CSV 맵 데이터
   */
  importMapFromCsv(csvData) {
    // CSV 처리 로직
    const lines = csvData.split('\n');
    let metadataLines = 0;
    let mapSizeX = this.gridSizeX;
    let mapSizeY = this.gridSizeY;
    let startPoint = null;
    let endPoint = null;

    // 메타데이터 처리
    while (lines[metadataLines] && lines[metadataLines].startsWith('#')) {
      const metaLine = lines[metadataLines].substring(1).trim();
      
      if (metaLine.startsWith('Size:')) {
        const sizeStr = metaLine.substring(5).trim();
        const [x, y] = sizeStr.split('x').map(s => parseInt(s));
        mapSizeX = x;
        mapSizeY = y;
      } else if (metaLine.startsWith('Start:')) {
        const startStr = metaLine.substring(6).trim();
        if (startStr !== 'none') {
          startPoint = startStr.split(',').map(s => parseInt(s));
        }
      } else if (metaLine.startsWith('End:')) {
        const endStr = metaLine.substring(4).trim();
        if (endStr !== 'none') {
          endPoint = endStr.split(',').map(s => parseInt(s));
        }
      }
      
      metadataLines++;
    }

    // 맵 데이터 처리
    const gridData = [];
    for (let i = metadataLines; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const rowData = line.split(',').map(s => parseInt(s));
        gridData.push(rowData);
      }
    }

    // 맵 크기 확인
    if (gridData.length !== mapSizeY || gridData.some(row => row.length !== mapSizeX)) {
      throw new Error('맵 크기가 일치하지 않습니다.');
    }

    // 데이터 업데이트
    this.gridSizeX = mapSizeX;
    this.gridSizeY = mapSizeY;
    document.getElementById('mapSizeX').value = this.gridSizeX;
    document.getElementById('mapSizeY').value = this.gridSizeY;

    this.mapData = gridData;
    this.startPoint = startPoint;
    this.endPoint = endPoint;

    if (this.startPoint) {
      document.getElementById('startPointX').value = this.startPoint[0];
      document.getElementById('startPointY').value = this.startPoint[1];
    } else {
      document.getElementById('startPointX').value = '';
      document.getElementById('startPointY').value = '';
    }

    if (this.endPoint) {
      document.getElementById('endPointX').value = this.endPoint[0];
      document.getElementById('endPointY').value = this.endPoint[1];
    } else {
      document.getElementById('endPointX').value = '';
      document.getElementById('endPointY').value = '';
    }

    // 그리드 재생성
    this.createMapGrid();
    this.updateGridSize();

    // 경로 무효화
    this.invalidatePath();
  }

  /**
   * 사전 정의된 맵 로드
   * @param {string} mapName - 맵 이름
   */
  loadPredefinedMap(mapName) {
    let mapData;

    switch (mapName) {
      case 'default':
        mapData = this.getPredefinedMap_Default();
        break;
      case 'warehouse':
        mapData = this.getPredefinedMap_Warehouse();
        break;
      case 'factory':
        mapData = this.getPredefinedMap_Factory();
        break;
      default:
        showNotification('알 수 없는 맵 유형입니다.', 'warning');
        return;
    }

    // 맵 크기 업데이트
    this.gridSizeX = mapData.sizeX;
    this.gridSizeY = mapData.sizeY;
    document.getElementById('mapSizeX').value = this.gridSizeX;
    document.getElementById('mapSizeY').value = this.gridSizeY;

    // 맵 데이터 복사
    this.mapData = JSON.parse(JSON.stringify(mapData.grid));

    // 시작점/종료점 설정
    this.startPoint = mapData.startPoint;
    this.endPoint = mapData.endPoint;

    if (this.startPoint) {
      document.getElementById('startPointX').value = this.startPoint[0];
      document.getElementById('startPointY').value = this.startPoint[1];
    } else {
      document.getElementById('startPointX').value = '';
      document.getElementById('startPointY').value = '';
    }

    if (this.endPoint) {
      document.getElementById('endPointX').value = this.endPoint[0];
      document.getElementById('endPointY').value = this.endPoint[1];
    } else {
      document.getElementById('endPointX').value = '';
      document.getElementById('endPointY').value = '';
    }

    // 그리드 재생성
    this.createMapGrid();
    this.updateGridSize();

    // 경로 무효화
    this.invalidatePath();

    showNotification(`"${mapData.name}" 맵이 로드되었습니다.`, 'success');
  }

  /**
   * 기본 맵 데이터 반환
   * @returns {Object} 맵 데이터
   */
  getPredefinedMap_Default() {
    // 20x20 맵, 간단한 장애물이 있는 기본 맵
    const mapSize = 20;
    const grid = Array(mapSize).fill().map(() => Array(mapSize).fill(0));

    // 몇 개의 장애물 추가
    for (let i = 5; i < 15; i++) {
      grid[5][i] = 1; // 가로 벽
      grid[15][i] = 1; // 가로 벽
    }

    for (let i = 5; i < 15; i++) {
      grid[i][5] = 1; // 세로 벽
      grid[i][15] = 1; // 세로 벽
    }

    // 통로 만들기
    grid[10][5] = 0;
    grid[10][15] = 0;
    grid[5][10] = 0;
    grid[15][10] = 0;

    // 충전소 추가
    grid[3][3] = 2;
    grid[3][17] = 2;
    grid[17][3] = 2;
    grid[17][17] = 2;

    // 작업장 추가
    grid[10][10] = 3;
    grid[8][8] = 3;
    grid[8][12] = 3;
    grid[12][8] = 3;
    grid[12][12] = 3;

    return {
      name: '기본 맵',
      sizeX: mapSize,
      sizeY: mapSize,
      grid: grid,
      startPoint: [2, 2],
      endPoint: [18, 18]
    };
  }

  /**
   * 창고 맵 데이터 반환
   * @returns {Object} 맵 데이터
   */
  getPredefinedMap_Warehouse() {
    // 25x20 맵, 창고 레이아웃
    const sizeX = 25;
    const sizeY = 20;
    const grid = Array(sizeY).fill().map(() => Array(sizeX).fill(0));

    // 외벽
    for (let i = 0; i < sizeX; i++) {
      grid[0][i] = 1;
      grid[sizeY-1][i] = 1;
    }

    for (let i = 0; i < sizeY; i++) {
      grid[i][0] = 1;
      grid[i][sizeX-1] = 1;
    }

    // 입구/출구
    grid[0][5] = 0;
    grid[0][20] = 0;
    grid[sizeY-1][12] = 0;

    // 선반 (장애물) 배치
    for (let i = 3; i <= 21; i += 6) {
      for (let j = 3; j <= 16; j += 4) {
        // 가로 선반
        for (let k = 0; k < 4; k++) {
          grid[j][i+k] = 1;
        }
      }
    }

    // 충전소
    grid[1][2] = 2;
    grid[1][22] = 2;
    grid[18][2] = 2;

    // 작업장
    grid[9][12] = 3;
    grid[14][6] = 3;
    grid[5][18] = 3;

    return {
      name: '창고 레이아웃',
      sizeX: sizeX,
      sizeY: sizeY,
      grid: grid,
      startPoint: [5, 1],
      endPoint: [12, 18]
    };
  }

  /**
   * 공장 맵 데이터 반환
   * @returns {Object} 맵 데이터
   */
  getPredefinedMap_Factory() {
    // 30x25 맵, 공장 레이아웃
    const sizeX = 30;
    const sizeY = 25;
    const grid = Array(sizeY).fill().map(() => Array(sizeX).fill(0));

    // 외벽
    for (let i = 0; i < sizeX; i++) {
      grid[0][i] = 1;
      grid[sizeY-1][i] = 1;
    }

    for (let i = 0; i < sizeY; i++) {
      grid[i][0] = 1;
      grid[i][sizeX-1] = 1;
    }

    // 입구/출구
    grid[0][10] = 0;
    grid[sizeY-1][20] = 0;

    // 생산 라인 (장애물)
    for (let i = 5; i <= 25; i += 10) {
      for (let j = 5; j <= 20; j += 5) {
        // 생산 설비 (3x3 블록)
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            grid[j+y][i+x] = 1;
          }
        }
        
        // 작업장 (생산 설비 주변)
        if (j < 20) {
          grid[j+3][i+1] = 3;
        }
      }
    }

    // 중앙 통로
    for (let i = 1; i < sizeY-1; i++) {
      grid[i][15] = 0;
    }

    // 수평 통로
    for (let i = 1; i < sizeX-1; i++) {
      grid[12][i] = 0;
    }

    // 충전소
    grid[2][2] = 2;
    grid[2][27] = 2;
    grid[22][2] = 2;
    grid[22][27] = 2;

    return {
      name: '공장 레이아웃',
      sizeX: sizeX,
      sizeY: sizeY,
      grid: grid,
      startPoint: [10, 1],
      endPoint: [20, 23]
    };
  }

  /**
   * 경로 계산
   */
  calculateRoute() {
    // 입력된 시작점/종료점 좌표 가져오기
    let startX = document.getElementById('startPointX').value;
    let startY = document.getElementById('startPointY').value;
    let endX = document.getElementById('endPointX').value;
    let endY = document.getElementById('endPointY').value;

    // 좌표가 입력되었는지 확인
    if (!startX || !startY || !endX || !endY) {
      showNotification('출발점과 도착점을 모두 입력하세요.', 'warning');
      return;
    }

    // 문자열을 숫자로 변환
    startX = parseInt(startX);
    startY = parseInt(startY);
    endX = parseInt(endX);
    endY = parseInt(endY);

    // 좌표 유효성 검사
    if (
      startX < 0 || startX >= this.gridSizeX || startY < 0 || startY >= this.gridSizeY ||
      endX < 0 || endX >= this.gridSizeX || endY < 0 || endY >= this.gridSizeY
    ) {
      showNotification('유효하지 않은 좌표입니다. 맵 범위 내의 좌표를 입력하세요.', 'danger');
      return;
    }

    // 시작점과 종료점 업데이트
    this.startPoint = [startX, startY];
    this.endPoint = [endX, endY];

    // 이전 경로 지우기
    this.clearPath();

    // 알고리즘 선택
    const algorithm = document.getElementById('algorithmSelect').value;

    // 경로 찾기 알고리즘 인스턴스 생성
    const pathfinder = new DijkstraAlgorithm(this.mapData);
    let result;

    // 선택한 알고리즘으로 경로 계산
    switch (algorithm) {
      case 'dijkstra':
        result = pathfinder.findShortestPath(this.startPoint, this.endPoint);
        break;
      case 'astar':
        result = pathfinder.findShortestPathAStar(this.startPoint, this.endPoint);
        break;
      case 'bfs':
        result = pathfinder.findShortestPathBFS(this.startPoint, this.endPoint);
        break;
      default:
        result = pathfinder.findShortestPath(this.startPoint, this.endPoint);
        break;
    }

    // 방문한 노드 기록
    this.visitedNodes = result.visitedNodes;

    // 경로가 없는 경우
    if (!result.path) {
      showNotification(result.message, 'warning');
      
      // 경로 정보 패널 업데이트
      document.getElementById('routeInfo').innerHTML = `
        <div class="text-center p-3">
          <p class="text-danger"><i class="fas fa-exclamation-triangle"></i> ${result.message}</p>
          <p>출발점 또는 도착점을 변경하거나, 장애물을 제거하세요.</p>
        </div>
      `;
      
      return;
    }

    // 경로 저장
    this.calculatedPath = result.path;

    // 경로 표시 (시작점과 종료점 제외)
    for (let i = 1; i < result.path.length - 1; i++) {
      const [x, y] = result.path[i];
      this.mapData[y][x] = 9; // 9는 경로를 나타냄
    }

    // 그리드 시각화 업데이트
    this.updateGridFromData();

    // 경로 정보 패널 업데이트
    this.updateRouteInfo(result);

    // 시뮬레이션 버튼 활성화
    document.getElementById('startSimulationButton').disabled = false;

    showNotification('경로 계산이 완료되었습니다.', 'success');
  }

  /**
   * 경로 정보 패널 업데이트
   * @param {Object} result - 경로 계산 결과
   */
  updateRouteInfo(result) {
    const routeInfo = document.getElementById('routeInfo');

    // 경로 길이와 예상 이동 시간 계산
    const pathLength = result.path.length - 1; // 시작점 제외
    const speed = this.agvSpeed; // 초당 셀 수
    const estimatedTime = pathLength / speed;

    // 배터리 소모량 계산
    const batteryConsumption = pathLength * this.batteryConsumption;
    const batteryLeft = Math.max(0, 100 - batteryConsumption);

    // 충전소를 통과하는지 확인
    const passesChargingStation = result.path.some(([x, y]) => this.mapData[y][x] === 2);

    let routeInfoHtml = `
      <div class="route-stats">
        <div class="route-stat">
          <span class="route-stat-label">경로 길이:</span>
          <span class="route-stat-value">${pathLength} 셀</span>
        </div>
        <div class="route-stat">
          <span class="route-stat-label">예상 소요 시간:</span>
          <span class="route-stat-value">${estimatedTime.toFixed(1)} 초</span>
        </div>
        <div class="route-stat">
          <span class="route-stat-label">배터리 소모:</span>
          <span class="route-stat-value">${batteryConsumption.toFixed(1)}%</span>
        </div>
        <div class="route-stat">
          <span class="route-stat-label">도착 시 배터리:</span>
          <span class="route-stat-value ${batteryLeft < 20 ? 'text-danger' : ''}">${batteryLeft.toFixed(1)}%</span>
        </div>
        <div class="route-stat">
          <span class="route-stat-label">충전소 경유:</span>
          <span class="route-stat-value">${passesChargingStation ? '예' : '아니오'}</span>
        </div>
      </div>
      
      <h4 class="mt-3">상세 경로</h4>
      <div class="route-path">
    `;

    // 상세 경로 표시
    for (let i = 0; i < result.path.length; i++) {
      const [x, y] = result.path[i];
      let stepClass = '';
      let stepLabel = '';
      
      if (i === 0) {
        stepClass = 'text-primary';
        stepLabel = '출발';
      } else if (i === result.path.length - 1) {
        stepClass = 'text-danger';
        stepLabel = '도착';
      } else {
        // 셀 유형에 따른 표시
        switch (this.mapData[y][x]) {
          case 2:
            stepClass = 'text-warning';
            stepLabel = '충전소';
            break;
          case 3:
            stepClass = 'text-success';
            stepLabel = '작업장';
            break;
          default:
            stepLabel = `${i}`;
            break;
        }
      }
      
      routeInfoHtml += `<span class="path-step ${stepClass}">[${x},${y}] ${stepLabel}</span>`;
    }

    routeInfoHtml += `
      </div>
    `;

    routeInfo.innerHTML = routeInfoHtml;
  }

  /**
   * 이전 경로 지우기
   */
  clearPath() {
    // 이전 계산된 경로가 있으면 지우기
    if (this.calculatedPath) {
      for (const [x, y] of this.calculatedPath) {
        // 시작점과 종료점을 제외하고 경로 제거
        if (
          (this.startPoint && x === this.startPoint[0] && y === this.startPoint[1]) ||
          (this.endPoint && x === this.endPoint[0] && y === this.endPoint[1])
        ) {
          continue;
        }
        
        this.mapData[y][x] = 0; // 빈 공간으로 초기화
      }
      
      // 경로 정보 초기화
      this.calculatedPath = null;
      this.visitedNodes = [];
    }
  }

  /**
   * 알고리즘 정보 업데이트
   * @param {string} algorithm - 선택된 알고리즘
   */
  updateAlgorithmInfo(algorithm) {
    const algorithmInfo = document.getElementById('algorithmInfo');
    let infoHtml = '';

    switch (algorithm) {
      case 'dijkstra':
        infoHtml = `
          <h4>Dijkstra 알고리즘</h4>
          <p>모든 노드 간의 최단 경로를 찾는 알고리즘으로, 가중치가 있는 그래프에서 특히 유용합니다.</p>
          <ul>
            <li>가능한 모든 경로를 탐색</li>
            <li>최단 거리를 보장</li>
            <li>계산 비용이 높을 수 있음</li>
          </ul>
        `;
        break;
      case 'astar':
        infoHtml = `
          <h4>A* (A-Star) 알고리즘</h4>
          <p>휴리스틱을 사용해 목표 방향으로 효율적으로 탐색하는 알고리즘입니다.</p>
          <ul>
            <li>목표까지의 예상 거리를 고려</li>
            <li>대체로 Dijkstra보다 효율적</li>
            <li>최단 경로를 보장(적절한 휴리스틱 사용 시)</li>
          </ul>
        `;
        break;
      case 'bfs':
        infoHtml = `
          <h4>BFS (너비 우선 탐색)</h4>
          <p>가까운 노드부터 탐색하는 알고리즘으로, 가중치가 없는 그래프에서 사용합니다.</p>
          <ul>
            <li>레벨 단위로 모든 노드 탐색</li>
            <li>단순한 구현</li>
            <li>가중치가 모두 동일할 때 최단 거리 보장</li>
          </ul>
        `;
        break;
    }

    algorithmInfo.innerHTML = infoHtml;
  }

  /**
   * 경로 시뮬레이션 시작
   */
  startSimulation() {
    // 계산된 경로가 없으면 경로 계산 먼저 실행
    if (!this.calculatedPath) {
      this.calculateRoute();
      if (!this.calculatedPath) return; // 경로 계산 실패 시 종료
    }

    // 시뮬레이션 초기화
    this.isSimulating = true;
    this.currentPathIndex = 0;
    this.agvPosition = this.startPoint;
    this.agvBatteryLevel = 100;

    // 시뮬레이션 버튼 텍스트 변경
    const simButton = document.getElementById('startSimulationButton');
    simButton.innerHTML = '<i class="fas fa-stop"></i> 시뮬레이션 중지';

    // 시뮬레이션 간격 설정 (AGV 속도에 따라)
    const updateInterval = 1000 / this.agvSpeed; // 밀리초

    // 맵 위에 AGV 아이콘 표시
    this.showAgvOnMap();

    // 일정 간격으로 위치 업데이트
    this.simulationInterval = setInterval(() => {
      this.updateSimulation();
    }, updateInterval);
  }

  /**
   * 시뮬레이션 토글 (시작/중지)
   */
  toggleSimulation() {
    if (this.isSimulating) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }

  /**
   * 시뮬레이션 중지
   */
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    this.isSimulating = false;

    // 시뮬레이션 버튼 텍스트 복원
    const simButton = document.getElementById('startSimulationButton');
    simButton.innerHTML = '<i class="fas fa-play"></i> 시뮬레이션 시작';

    // AGV 아이콘 제거
    this.removeAgvFromMap();

    // 맵 원래 상태로 복원
    this.updateGridFromData();
  }

  /**
   * 시뮬레이션 상태 업데이트
   */
  updateSimulation() {
    // 마지막 위치에 도달한 경우 시뮬레이션 종료
    if (this.currentPathIndex >= this.calculatedPath.length - 1) {
      showNotification('목적지에 도착했습니다!', 'success');
      this.stopSimulation();
      return;
    }

    // 다음 위치로 이동
    this.currentPathIndex++;
    this.agvPosition = this.calculatedPath[this.currentPathIndex];

    // 배터리 소모 계산
    this.agvBatteryLevel -= this.batteryConsumption;

    // 충전소에 있는 경우 배터리 충전
    const [x, y] = this.agvPosition;
    if (this.mapData[y][x] === 2) { // 충전소
      this.agvBatteryLevel = Math.min(100, this.agvBatteryLevel + this.chargingRate);
    }

    // 배터리가 없는 경우 시뮬레이션 중단
    if (this.agvBatteryLevel <= 0) {
      showNotification('배터리가 소진되었습니다. 시뮬레이션을 중단합니다.', 'danger');
      this.stopSimulation();
      return;
    }

    // AGV 위치 업데이트
    this.showAgvOnMap();
  }

  /**
   * 맵에 AGV 아이콘 표시
   */
  showAgvOnMap() {
    // 이전 AGV 아이콘 제거
    this.removeAgvFromMap();

    if (!this.agvPosition) return;

    // AGV가 위치한 셀 가져오기
    const [x, y] = this.agvPosition;
    const cell = this.getCell(x, y);

    if (cell) {
      // AGV 아이콘 추가
      const agvIcon = document.createElement('div');
      agvIcon.className = 'agv-icon';
      agvIcon.innerHTML = `
        <i class="fas fa-robot"></i>
        <div class="agv-battery-indicator" style="width: ${this.agvBatteryLevel}%"></div>
      `;
      
      // 배터리 수준에 따른 색상 설정
      if (this.agvBatteryLevel < 20) {
        agvIcon.classList.add('low-battery');
      } else if (this.agvBatteryLevel < 50) {
        agvIcon.classList.add('medium-battery');
      }
      
      cell.appendChild(agvIcon);
    }
  }

  /**
   * 맵에서 AGV 아이콘 제거
   */
  removeAgvFromMap() {
    const agvIcons = document.querySelectorAll('.agv-icon');
    agvIcons.forEach(icon => icon.remove());
  }
}

// 문서 로드 완료 후 맵 에디터 인스턴스 생성
document.addEventListener('DOMContentLoaded', function() {
  const mapEditor = new MapEditor();

  // 모달 닫기 버튼 이벤트
  const modalCloses = document.querySelectorAll('.modal-close');
  modalCloses.forEach(close => {
    close.addEventListener('click', function() {
      const modal = this.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });

  // 모달 외부 클릭 시 닫기
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.addEventListener('click', function(event) {
      if (event.target === this) {
        this.style.display = 'none';
      }
    });
  });

  // 내보내기 형식 변경 시 데이터 갱신
  document.getElementById('exportFormat').addEventListener('change', function() {
    mapEditor.generateExportData();
  });

  // 내보내기 이름 입력 시 데이터 갱신
  document.getElementById('exportName').addEventListener('input', function() {
    mapEditor.generateExportData();
  });
}); 