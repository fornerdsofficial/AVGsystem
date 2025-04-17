/**
 * common.js - 모든 페이지에서 공통으로 사용하는 JavaScript 함수
 */

// 문서가 로드된 후 실행
document.addEventListener("DOMContentLoaded", function() {
  // 현재 페이지 활성화
  const currentPage = window.location.pathname.split("/").pop();
  const menuItems = document.querySelectorAll(".sidebar-menu-item");
  
  menuItems.forEach(item => {
    const link = item.getAttribute("data-page");
    if ((currentPage === "" && link === "index.html") || currentPage === link) {
      item.classList.add("active");
    }
    
    // 사이드바 메뉴 클릭 이벤트 처리
    item.addEventListener("click", function() {
      const pageUrl = this.getAttribute("data-page");
      window.location.href = pageUrl;
    });
  });
  
  // 모바일 메뉴 토글
  const mobileToggle = document.querySelector(".mobile-toggle");
  const sidebar = document.querySelector(".sidebar");
  
  if (mobileToggle) {
    mobileToggle.addEventListener("click", function() {
      sidebar.classList.toggle("active");
    });
    
    // 메인 컨텐츠 클릭 시 사이드바 닫기 (모바일)
    document.querySelector(".main-content").addEventListener("click", function() {
      if (sidebar.classList.contains("active") && window.innerWidth <= 768) {
        sidebar.classList.remove("active");
      }
    });
  }
  
  // 모달 초기화
  initModals();
});

/**
 * 모달 초기화 함수
 */
function initModals() {
  // 모든 모달 가져오기
  const modals = document.querySelectorAll('.modal');
  
  // 닫기 버튼 이벤트 설정
  const closeButtons = document.querySelectorAll('.modal-close');
  closeButtons.forEach(button => {
    button.addEventListener('click', function() {
      const modal = this.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // 모달 외부 클릭 시 닫기
  window.addEventListener('click', function(event) {
    modals.forEach(modal => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

/**
 * API 요청 모킹 함수 (실제 서버 연동 전까지 사용)
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} options - 요청 옵션 (method, body 등)
 * @returns {Promise} - 모킹된 데이터로 해결되는 Promise
 */
function apiRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    // 요청 지연 시간 (실제 API 호출 시뮬레이션)
    const delay = Math.random() * 500 + 300; // 300~800ms
    
    setTimeout(() => {
      try {
        const method = options.method || 'GET';
        
        // GET 요청 처리
        if (method === 'GET') {
          // 각 엔드포인트별 모킹 데이터 반환
          switch(endpoint) {
            case '/api/agv/status':
              resolve({
                status: 'success',
                data: getMockAgvData()
              });
              break;
            case '/api/tasks':
              resolve({
                status: 'success',
                data: getMockTaskData()
              });
              break;
            case '/api/events':
              resolve({
                status: 'success',
                data: getMockEventData()
              });
              break;
            default:
              reject(new Error('알 수 없는 엔드포인트: ' + endpoint));
          }
        } 
        // POST 요청 처리
        else if (method === 'POST') {
          // 작업 생성
          if (endpoint === '/api/tasks/create') {
            resolve({
              status: 'success',
              data: {
                id: 'TASK-' + Date.now().toString().slice(-6),
                ...JSON.parse(options.body),
                createdAt: new Date().toISOString()
              }
            });
          }
          // AGV 생성
          else if (endpoint === '/api/agv/create') {
            resolve({
              status: 'success',
              data: {
                id: 'AGV-' + Date.now().toString().slice(-4),
                ...JSON.parse(options.body),
                createdAt: new Date().toISOString()
              }
            });
          }
          // 작업 할당
          else if (endpoint === '/api/tasks/assign') {
            const body = JSON.parse(options.body);
            resolve({
              status: 'success',
              data: {
                taskId: body.taskId,
                agvId: body.agvId,
                assignedAt: new Date().toISOString()
              }
            });
          }
          else {
            reject(new Error('알 수 없는 엔드포인트: ' + endpoint));
          }
        }
        // PUT/DELETE 요청 처리
        else if (method === 'PUT' || method === 'DELETE') {
          resolve({
            status: 'success',
            message: '작업이 성공적으로 처리되었습니다.'
          });
        }
        else {
          reject(new Error('지원되지 않는 HTTP 메소드: ' + method));
        }
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

/**
 * 상태 배지 클래스 반환
 * @param {string} status - 상태 코드
 * @returns {string} CSS 클래스명
 */
function getStatusBadgeClass(status) {
  const classMap = {
    'active': 'badge-success',
    'idle': 'badge-info',
    'charging': 'badge-warning',
    'maintenance': 'badge-secondary',
    'error': 'badge-danger',
    'pending': 'badge-secondary',
    'in-progress': 'badge-primary',
    'completed': 'badge-success',
    'cancelled': 'badge-danger',
    'failed': 'badge-danger',
    'high': 'badge-danger',
    'medium': 'badge-warning',
    'low': 'badge-info'
  };
  
  return classMap[status] || 'badge-secondary';
}

/**
 * 날짜 포맷 함수
 * @param {string|Date} date - 변환할 날짜/시간
 * @param {string} format - 날짜 형식 (예: YYYY-MM-DD HH:mm)
 * @returns {string} 포맷된 날짜/시간 문자열
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '-';
  
  const d = new Date(date);
  
  // 유효한 날짜인지 확인
  if (isNaN(d.getTime())) return '-';
  
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  // 간단한 포맷 치환
  const formatMap = {
    'YYYY': year.toString(),
    'MM': month,
    'DD': day,
    'HH': hours,
    'mm': minutes,
    'ss': seconds
  };
  
  let result = format;
  for (const [key, value] of Object.entries(formatMap)) {
    result = result.replace(key, value);
  }
  
  return result;
}

/**
 * 공통 알림 표시 함수
 * @param {string} message - 알림 메시지
 * @param {string} type - 알림 유형 (success, info, warning, danger)
 */
function showNotification(message, type = 'info') {
  // 이미 알림 컨테이너가 있는지 확인
  let notificationContainer = document.querySelector('.notification-container');
  
  // 없으면 생성
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
  
  // 알림 요소 생성
  const notification = document.createElement('div');
  notification.className = `notification notification-${type} fade-in`;
  
  // 알림 아이콘
  const icon = getNotificationIcon(type);
  
  // 알림 HTML 구성
  notification.innerHTML = `
    <div class="notification-icon">
      <i class="${icon}"></i>
    </div>
    <div class="notification-content">
      <p>${message}</p>
    </div>
    <div class="notification-close">
      <i class="fas fa-times"></i>
    </div>
  `;
  
  // 컨테이너에 알림 추가
  notificationContainer.appendChild(notification);
  
  // 닫기 버튼 이벤트
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', function() {
    notification.classList.remove('fade-in');
    notification.classList.add('fade-out');
    
    // 애니메이션 후 제거
    setTimeout(() => {
      notification.remove();
    }, 300);
  });
  
  // 3초 후 자동으로 사라짐
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.remove('fade-in');
      notification.classList.add('fade-out');
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
}

/**
 * 알림 타입에 따른 아이콘 반환
 * @param {string} type - 알림 유형
 * @returns {string} 아이콘 클래스
 */
function getNotificationIcon(type) {
  const icons = {
    'success': 'fas fa-check-circle',
    'info': 'fas fa-info-circle',
    'warning': 'fas fa-exclamation-triangle',
    'danger': 'fas fa-exclamation-circle'
  };
  
  return icons[type] || icons.info;
}

/**
 * AGV 더미 데이터 생성
 * @returns {Array} AGV 상태 데이터 배열
 */
function getMockAgvData() {
  return [
    {
      id: "AGV-001",
      status: "active",
      battery: 85,
      location: "구역 A-3",
      currentTask: "TASK-100023",
      type: "standard"
    },
    {
      id: "AGV-002",
      status: "charging",
      battery: 25,
      location: "충전소 1",
      currentTask: null,
      type: "heavy"
    },
    {
      id: "AGV-003",
      status: "maintenance",
      battery: 45,
      location: "정비소",
      currentTask: null,
      type: "standard"
    },
    {
      id: "AGV-004",
      status: "idle",
      battery: 65,
      location: "대기 위치 B-2",
      currentTask: null,
      type: "compact"
    },
    {
      id: "AGV-005",
      status: "active",
      battery: 90,
      location: "구역 C-7",
      currentTask: "TASK-100024",
      type: "heavy"
    }
  ];
}

/**
 * 작업 더미 데이터 생성
 * @returns {Array} 작업 데이터 배열
 */
function getMockTaskData() {
  const now = new Date();
  
  return [
    {
      id: "TASK-100023",
      name: "자재 운송",
      priority: "high",
      startPoint: "창고-1",
      endPoint: "작업장-2",
      status: "in-progress",
      progress: 65,
      assignedTo: "AGV-001",
      createdAt: new Date(now.getTime() - 3600000).toISOString(),
      updatedAt: new Date(now.getTime() - 1800000).toISOString(),
      deadline: new Date(now.getTime() + 7200000).toISOString()
    },
    {
      id: "TASK-100024",
      name: "완제품 이동",
      priority: "medium",
      startPoint: "조립라인-3",
      endPoint: "출하장-1",
      status: "in-progress",
      progress: 30,
      assignedTo: "AGV-005",
      createdAt: new Date(now.getTime() - 7200000).toISOString(),
      updatedAt: new Date(now.getTime() - 3600000).toISOString()
    },
    {
      id: "TASK-100025",
      name: "설비 부품 운송",
      priority: "low",
      startPoint: "입고장-2",
      endPoint: "정비소",
      status: "pending",
      progress: 0,
      assignedTo: null,
      createdAt: new Date(now.getTime() - 10800000).toISOString(),
      updatedAt: new Date(now.getTime() - 10800000).toISOString()
    },
    {
      id: "TASK-100026",
      name: "불량품 반송",
      priority: "high",
      startPoint: "검수장-1",
      endPoint: "창고-3",
      status: "pending",
      progress: 0,
      assignedTo: null,
      createdAt: new Date(now.getTime() - 14400000).toISOString(),
      updatedAt: new Date(now.getTime() - 14400000).toISOString(),
      deadline: new Date(now.getTime() + 3600000).toISOString()
    },
    {
      id: "TASK-100022",
      name: "원자재 이동",
      priority: "medium",
      startPoint: "창고-2",
      endPoint: "작업장-1",
      status: "completed",
      progress: 100,
      assignedTo: "AGV-003",
      createdAt: new Date(now.getTime() - 21600000).toISOString(),
      updatedAt: new Date(now.getTime() - 18000000).toISOString()
    }
  ];
}

/**
 * 이벤트 더미 데이터 생성
 * @returns {Array} 이벤트 데이터 배열
 */
function getMockEventData() {
  const now = new Date();
  
  return [
    {
      id: "EVT-001",
      type: "task-assigned",
      description: "작업 TASK-100023이 AGV-001에 할당됨",
      timestamp: new Date(now.getTime() - 3600000).toISOString(),
      severity: "info"
    },
    {
      id: "EVT-002",
      type: "agv-charging",
      description: "AGV-002 충전 시작",
      timestamp: new Date(now.getTime() - 7200000).toISOString(),
      severity: "info"
    },
    {
      id: "EVT-003",
      type: "task-completed",
      description: "작업 TASK-100022 완료됨",
      timestamp: new Date(now.getTime() - 18000000).toISOString(),
      severity: "success"
    },
    {
      id: "EVT-004",
      type: "agv-maintenance",
      description: "AGV-003 정비 시작",
      timestamp: new Date(now.getTime() - 36000000).toISOString(),
      severity: "warning"
    },
    {
      id: "EVT-005",
      type: "system-error",
      description: "통신 오류 발생",
      timestamp: new Date(now.getTime() - 43200000).toISOString(),
      severity: "danger"
    }
  ];
}

/**
 * 디바운스 함수
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (밀리초)
 * @returns {Function} 디바운스된 함수
 */
function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
