/**
 * dashboard.js - 대시보드 페이지 스크립트
 * 
 * 의존성: common.js
 */

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // 초기 데이터 로드
    loadDashboardData();
    
    // 새로고침 버튼 이벤트 핸들러
    document.getElementById('refreshButton').addEventListener('click', function() {
      loadDashboardData(true);
    });
    
    // 각 섹션의 전체 보기 버튼 이벤트 핸들러
    document.getElementById('viewAllAgvButton').addEventListener('click', function() {
      // AGV 관리 페이지로 이동 (실제 구현에서 추가)
      window.location.href = 'task-scheduling.html?view=agv';
    });
    
    document.getElementById('viewAllTasksButton').addEventListener('click', function() {
      // 작업 관리 페이지로 이동
      window.location.href = 'task-scheduling.html';
    });
    
    document.getElementById('viewAllAlertsButton').addEventListener('click', function() {
      // 알림 로그 페이지로 이동 (실제 구현에서 추가)
      // 여기서는 시뮬레이션 화면으로 이동
      window.location.href = 'simulation-control.html?view=events';
    });
  });
  
  /**
   * 대시보드 데이터 로드
   * @param {boolean} showLoader - 로딩 인디케이터 표시 여부
   */
  function loadDashboardData(showLoader = false) {
    if (showLoader) {
      showLoadingIndicators();
    }
    
    // AGV 상태 데이터 로드
    apiRequest('/api/agv/status')
      .then(response => {
        updateAgvStatusSection(response.data);
        updateSummaryInfo(response.data);
        updateAgvStatusChart(response.data);
      })
      .catch(error => {
        console.error('AGV 상태 데이터 로드 실패:', error);
        showNotification('AGV 상태 데이터를 불러오는 중 오류가 발생했습니다.', 'danger');
      });
    
    // 작업 데이터 로드
    apiRequest('/api/tasks')
      .then(response => {
        updateTaskList(response.data);
      })
      .catch(error => {
        console.error('작업 데이터 로드 실패:', error);
        showNotification('작업 데이터를 불러오는 중 오류가 발생했습니다.', 'danger');
      });
    
    // 이벤트/알림 데이터 로드
    apiRequest('/api/events')
      .then(response => {
        updateEventList(response.data);
      })
      .catch(error => {
        console.error('이벤트 데이터 로드 실패:', error);
        showNotification('이벤트 데이터를 불러오는 중 오류가 발생했습니다.', 'danger');
      });

    // 데이터가 모두 로드된 후 알림
    if (showLoader) {
      setTimeout(() => {
        showNotification('대시보드 데이터가 업데이트되었습니다.', 'success');
      }, 1000);
    }
  }
  
  /**
   * 로딩 인디케이터 표시
   */
  function showLoadingIndicators() {
    // 각 섹션에 로딩 인디케이터 추가
    const sections = [
      'agvStatusGrid',
      'agvStatusChart',
      'taskList',
      'eventList'
    ];
    
    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.innerHTML = '<div class="text-center p-4"><div class="spinner"></div><p class="mt-2">데이터 로딩 중...</p></div>';
      }
    });
  }
  
  /**
   * 요약 정보 업데이트
   * @param {Array} agvData - AGV 상태 데이터
   */
  function updateSummaryInfo(agvData) {
    // 총 AGV 수
    document.getElementById('totalAgvCount').innerText = agvData.length;
    
    // 가동 중인 AGV 수
    const activeAgvCount = agvData.filter(agv => agv.status === 'active').length;
    document.getElementById('activeAgvCount').innerText = activeAgvCount;
    
    // 진행 중인 작업 수 - AGV 데이터에서 추출
    const activeTaskCount = agvData.filter(agv => agv.currentTask !== null).length;
    document.getElementById('activeTaskCount').innerText = activeTaskCount;
    
    // 오류/경고 수
    const alertCount = agvData.filter(agv => agv.status === 'maintenance' || agv.status === 'error').length;
    document.getElementById('alertCount').innerText = alertCount;
  }
  
  /**
   * AGV 상태 섹션 업데이트
   * @param {Array} agvData - AGV 상태 데이터
   */
  function updateAgvStatusSection(agvData) {
    const agvStatusGrid = document.getElementById('agvStatusGrid');
    
    // 기존 내용 비우기
    agvStatusGrid.innerHTML = '';
    
    // 각 AGV별 상태 카드 생성
    agvData.forEach(agv => {
      const batteryClass = getBatteryLevelClass(agv.battery);
      const statusClass = getStatusBadgeClass(agv.status);
      const statusText = getStatusText(agv.status);
      
      const agvCard = document.createElement('div');
      agvCard.className = 'agv-status-card fade-in';
      agvCard.innerHTML = `
        <div class="agv-status-header">
          <span class="agv-id">${agv.id}</span>
          <span class="badge ${statusClass}">${statusText}</span>
        </div>
        <div class="agv-details">
          <div class="agv-detail-item">
            <span class="agv-detail-label">위치:</span>
            <span class="agv-detail-value">${agv.location}</span>
          </div>
          <div class="agv-detail-item">
            <span class="agv-detail-label">작업:</span>
            <span class="agv-detail-value">${agv.currentTask || '없음'}</span>
          </div>
          <div class="agv-battery">
            <div class="battery-level">
              <div class="battery-fill ${batteryClass}" style="width: ${agv.battery}%;"></div>
            </div>
            <div class="battery-text">
              <span>배터리</span>
              <span>${agv.battery}%</span>
            </div>
          </div>
        </div>
      `;
      
      agvStatusGrid.appendChild(agvCard);
    });
  }
  
  /**
   * 배터리 수준에 따른 클래스 반환
   * @param {number} batteryLevel - 배터리 수준 (0-100)
   * @returns {string} CSS 클래스명
   */
  function getBatteryLevelClass(batteryLevel) {
    if (batteryLevel >= 70) {
      return 'battery-high';
    } else if (batteryLevel >= 30) {
      return 'battery-medium';
    } else {
      return 'battery-low';
    }
  }
  
  /**
   * 상태 코드 텍스트 변환
   * @param {string} statusCode - 상태 코드
   * @returns {string} 상태 텍스트
   */
  function getStatusText(statusCode) {
    const statusMap = {
      'active': '가동 중',
      'idle': '대기 중',
      'charging': '충전 중',
      'maintenance': '점검 중',
      'error': '오류'
    };
    
    return statusMap[statusCode] || statusCode;
  }
  
  /**
   * AGV 상태 차트 업데이트
   * @param {Array} agvData - AGV 상태 데이터
   */
  function updateAgvStatusChart(agvData) {
    const chartContainer = document.getElementById('agvStatusChart');
    
    // 상태별 AGV 수 계산
    const statusCounts = {
      active: 0,
      charging: 0,
      idle: 0,
      maintenance: 0
    };
    
    agvData.forEach(agv => {
      if (statusCounts.hasOwnProperty(agv.status)) {
        statusCounts[agv.status]++;
      } else {
        statusCounts.maintenance++;
      }
    });
    
    // SVG 도넛 차트 생성
    const svgSize = 200;
    const donutRadius = 80;
    const donutWidth = 30;
    const centerX = svgSize / 2;
    const centerY = svgSize / 2;
    
    // 색상 정의
    const colors = {
      active: getComputedStyle(document.documentElement).getPropertyValue('--success-color') || '#4caf50',
      charging: getComputedStyle(document.documentElement).getPropertyValue('--warning-color') || '#ff9800',
      idle: getComputedStyle(document.documentElement).getPropertyValue('--info-color') || '#2196f3',
      maintenance: getComputedStyle(document.documentElement).getPropertyValue('--danger-color') || '#f44336'
    };
    
    // 데이터 준비
    const data = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0) // 0인 항목 제외
      .map(([status, count]) => ({
        status,
        count,
        color: colors[status] || '#999'
      }));
    
    const total = data.reduce((sum, item) => sum + item.count, 0);
    
    // SVG 생성
    let svg = `<svg class="donut-chart" viewBox="0 0 ${svgSize} ${svgSize}">`;
    
    // 도넛 세그먼트 생성
    let startAngle = 0;
    data.forEach((item, index) => {
      if (total === 0) return; // 방어 코드
      
      const percentage = item.count / total;
      const angleSize = percentage * Math.PI * 2;
      const endAngle = startAngle + angleSize;
      const largeArcFlag = angleSize > Math.PI ? 1 : 0;
      
      // 원호 계산
      const startX = centerX + donutRadius * Math.sin(startAngle);
      const startY = centerY - donutRadius * Math.cos(startAngle);
      const endX = centerX + donutRadius * Math.sin(endAngle);
      const endY = centerY - donutRadius * Math.cos(endAngle);
      
      // 내부 원호 계산
      const innerRadius = donutRadius - donutWidth;
      const innerStartX = centerX + innerRadius * Math.sin(endAngle);
      const innerStartY = centerY - innerRadius * Math.cos(endAngle);
      const innerEndX = centerX + innerRadius * Math.sin(startAngle);
      const innerEndY = centerY - innerRadius * Math.cos(startAngle);
      
      // 패스 생성
      const path = `
        M ${startX} ${startY}
        A ${donutRadius} ${donutRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}
        L ${innerStartX} ${innerStartY}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEndX} ${innerEndY}
        Z
      `;
      
      // 세그먼트 추가
      svg += `<path class="donut-segment" d="${path}" fill="${item.color}" />`;
      
      // 다음 세그먼트 시작 각도 업데이트
      startAngle = endAngle;
    });
    
    // 중앙 텍스트 추가
    svg += `
      <text class="donut-text" x="${centerX}" y="${centerY - 10}" text-anchor="middle">${total}</text>
      <text class="donut-label" x="${centerX}" y="${centerY + 15}" text-anchor="middle">총 AGV</text>
    `;
    
    svg += `</svg>`;
    
    // 차트 컨테이너에 추가
    chartContainer.innerHTML = svg;
  }
  
  /**
   * 작업 리스트 업데이트
   * @param {Array} taskData - 작업 데이터
   */
  function updateTaskList(taskData) {
    const taskList = document.getElementById('taskList');
    
    // 기존 내용 비우기
    taskList.innerHTML = '';
    
    // 진행 중인 작업만 필터링
    const activeTasks = taskData.filter(task => task.status === 'in-progress' || task.status === 'pending');
    
    if (activeTasks.length === 0) {
      taskList.innerHTML = '<div class="text-center p-3">현재 진행 중인 작업이 없습니다.</div>';
      return;
    }
    
    // 각 작업별 항목 생성
    activeTasks.forEach(task => {
      const priorityClass = getStatusBadgeClass(task.priority);
      
      const taskItem = document.createElement('div');
      taskItem.className = 'task-item fade-in';
      taskItem.innerHTML = `
        <div class="task-header">
          <span class="task-id">${task.id}</span>
          <span class="badge ${priorityClass}">${getPriorityText(task.priority)}</span>
        </div>
        <div class="task-details">
          <div>${task.startPoint} → ${task.endPoint}</div>
          <div>할당: ${task.assignedTo || '미할당'}</div>
        </div>
        <div class="task-progress">
          <div class="progress">
            <div class="progress-bar ${task.progress < 30 ? 'progress-danger' : task.progress < 70 ? 'progress-warning' : 'progress-success'}" style="width: ${task.progress}%;"></div>
          </div>
          <div class="progress-info">
            <span>진행률: ${task.progress}%</span>
            <span>${getTaskStatusText(task.status)}</span>
          </div>
        </div>
      `;
      
      taskList.appendChild(taskItem);
    });
  }
  
  /**
   * 우선순위 텍스트 변환
   * @param {string} priority - 우선순위 코드
   * @returns {string} 우선순위 텍스트
   */
  function getPriorityText(priority) {
    const priorityMap = {
      'high': '높음',
      'medium': '중간',
      'low': '낮음'
    };
    
    return priorityMap[priority] || priority;
  }
  
  /**
   * 작업 상태 텍스트 변환
   * @param {string} status - 상태 코드
   * @returns {string} 상태 텍스트
   */
  function getTaskStatusText(status) {
    const statusMap = {
      'in-progress': '진행 중',
      'pending': '대기 중',
      'completed': '완료됨'
    };
    
    return statusMap[status] || status;
  }
  
  /**
   * 이벤트 리스트 업데이트
   * @param {Array} eventData - 이벤트 데이터
   */
  function updateEventList(eventData) {
    const eventList = document.getElementById('eventList');
    
    // 기존 내용 비우기
    eventList.innerHTML = '';
    
    if (eventData.length === 0) {
      eventList.innerHTML = '<div class="text-center p-3">최근 이벤트가 없습니다.</div>';
      return;
    }
    
    // 최근 이벤트 순으로 정렬
    const sortedEvents = [...eventData].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // 각 이벤트별 항목 생성
    sortedEvents.forEach(event => {
      const eventIcon = getEventIcon(event.type);
      const eventIconClass = getEventIconClass(event.type);
      
      const eventItem = document.createElement('div');
      eventItem.className = 'event-item fade-in';
      eventItem.innerHTML = `
        <div class="event-icon ${eventIconClass}">
          <i class="${eventIcon}"></i>
        </div>
        <div class="event-content">
          <div class="event-header">
            <span class="event-title">${getEventTypeText(event.type)}</span>
            <span class="event-time">${formatEventTime(event.timestamp)}</span>
          </div>
          <div class="event-message">${event.message}</div>
          <div class="event-agv">AGV: ${event.agvId}</div>
        </div>
      `;
      
      eventList.appendChild(eventItem);
    });
  }
  
  /**
   * 이벤트 타입에 따른 아이콘 클래스 반환
   * @param {string} eventType - 이벤트 타입
   * @returns {string} Font Awesome 아이콘 클래스
   */
  function getEventIcon(eventType) {
    const iconMap = {
      'error': 'fas fa-exclamation-circle',
      'warning': 'fas fa-exclamation-triangle',
      'info': 'fas fa-info-circle',
      'success': 'fas fa-check-circle'
    };
    
    return iconMap[eventType] || 'fas fa-bell';
  }
  
  /**
   * 이벤트 타입에 따른 아이콘 배경 클래스 반환
   * @param {string} eventType - 이벤트 타입
   * @returns {string} CSS 클래스명
   */
  function getEventIconClass(eventType) {
    const classMap = {
      'error': 'bg-danger',
      'warning': 'bg-warning',
      'info': 'bg-info',
      'success': 'bg-success'
    };
    
    return classMap[eventType] || 'bg-secondary';
  }
  
  /**
   * 이벤트 타입 텍스트 변환
   * @param {string} eventType - 이벤트 타입
   * @returns {string} 이벤트 타입 텍스트
   */
  function getEventTypeText(eventType) {
    const typeMap = {
      'error': '오류',
      'warning': '경고',
      'info': '정보',
      'success': '성공'
    };
    
    return typeMap[eventType] || eventType;
  }
  
  /**
   * 이벤트 시간 포맷
   * @param {string} timestamp - 타임스탬프
   * @returns {string} 포맷된 시간
   */
  function formatEventTime(timestamp) {
    const eventDate = new Date(timestamp);
    const now = new Date();
    
    // 오늘 날짜인 경우 시간만 표시
    if (eventDate.toDateString() === now.toDateString()) {
      return `오늘 ${eventDate.getHours().toString().padStart(2, '0')}:${eventDate.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 어제 날짜인 경우
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (eventDate.toDateString() === yesterday.toDateString()) {
      return `어제 ${eventDate.getHours().toString().padStart(2, '0')}:${eventDate.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 그 외 날짜
    return formatDate(timestamp, 'MM-DD HH:mm');
  }