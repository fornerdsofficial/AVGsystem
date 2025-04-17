/**
* task-scheduling.js - 작업 할당/스케줄링 페이지 스크립트
*/

// 작업 스케줄링 클래스
class TaskScheduler {
  constructor() {
    // 작업 및 AGV 데이터
    this.tasks = [];
    this.agvs = [];

    // 현재 선택된 작업 및 AGV
    this.selectedTask = null;
    this.selectedAgv = null;

    // 페이지네이션 설정
    this.currentPage = 1;
    this.itemsPerPage = 10;

    // 스케줄링 설정
    this.schedulingAlgorithm = 'fifo';
    this.autoAssignEnabled = false;
    this.urgencyWeight = 5;
    this.distanceWeight = 3;
    this.batteryWeight = 4;
    this.replanInterval = 30;

    // 이벤트 리스너 설정
    this.setupEventListeners();

    // 탭 초기화
    this.initTabs();

    // 초기 데이터 로드
    this.loadData();
  }

  /**
  * AGV 데이터 로드
  */
  loadAgvs() {
    // 로딩 표시
    document.getElementById('agvTable').querySelector('tbody').innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <div class="spinner"></div>
          <p class="mt-2">AGV 데이터를 불러오는 중...</p>
        </td>
      </tr>
    `;

    // API 호출 (모의 데이터)
    apiRequest('/api/agv/status')
      .then(response => {
        this.agvs = response.data || [];
        this.renderAgvTable();
      })
      .catch(error => {
        console.error('AGV 데이터 로드 실패:', error);
        showNotification('AGV 데이터를 불러오는 중 오류가 발생했습니다.', 'danger');
        
        // 오류 표시
        document.getElementById('agvTable').querySelector('tbody').innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-danger">
              <i class="fas fa-exclamation-circle"></i>
              <p>AGV 데이터를 불러오지 못했습니다. 다시 시도해주세요.</p>
            </td>
          </tr>
        `;
      });
  }

  /**
  * 작업 테이블 렌더링
  */
  renderTasksTable() {
    const tableBody = document.getElementById('tasksTable').querySelector('tbody');

    // 테이블 내용 초기화
    tableBody.innerHTML = '';

    // 작업이 없는 경우
    if (this.tasks.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="no-data-message">
            <i class="fas fa-clipboard-list"></i>
            <p>등록된 작업이 없습니다.</p>
            <button class="btn btn-sm btn-primary" onclick="document.getElementById('createTaskButton').click()">
              작업 생성하기
            </button>
          </td>
        </tr>
      `;
      return;
    }

    // 필터링 및 페이지네이션 적용
    const filteredTasks = this.getFilteredTasks();
    const paginatedTasks = this.getPaginatedItems(filteredTasks);

    // 테이블 행 생성
    paginatedTasks.forEach(task => {
      const row = document.createElement('tr');
      
      // 선택된 작업 강조
      if (this.selectedTask && this.selectedTask.id === task.id) {
        row.classList.add('selected');
      }
      
      // 클릭 이벤트
      row.addEventListener('click', () => {
        this.selectTask(task);
      });
      
      // 셀 내용 구성
      row.innerHTML = `
        <td>${task.id}</td>
        <td><span class="badge ${getStatusBadgeClass(task.status)}">${getTaskStatusText(task.status)}</span></td>
        <td><span class="priority-badge priority-${task.priority}">${getPriorityText(task.priority)}</span></td>
        <td>${task.startPoint}</td>
        <td>${task.endPoint}</td>
        <td>${task.assignedTo || '-'}</td>
        <td>
          <div class="progress-slim">
            <div class="progress-bar-slim ${task.progress < 30 ? 'bg-danger' : task.progress < 70 ? 'bg-warning' : 'bg-success'}" style="width: ${task.progress}%;"></div>
          </div>
          <div class="d-flex justify-content-between mt-1">
            <small>${task.progress}%</small>
            <small>${getTaskStatusText(task.status)}</small>
          </div>
        </td>
        <td>
          <button class="btn btn-sm btn-primary action-btn" data-action="edit" data-id="${task.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger action-btn" data-action="delete" data-id="${task.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      `;
      
      // 행 액션 버튼 이벤트
      const actionButtons = row.querySelectorAll('.action-btn');
      actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation(); // 행 클릭 이벤트 전파 방지
          const action = button.getAttribute('data-action');
          const taskId = button.getAttribute('data-id');
          
          if (action === 'edit') {
            this.editTask(taskId);
          } else if (action === 'delete') {
            this.deleteTask(taskId);
          }
        });
      });
      
      tableBody.appendChild(row);
    });

    // 페이지네이션 업데이트
    this.updatePagination(filteredTasks.length);
  }

  /**
  * AGV 테이블 렌더링
  */
  renderAgvTable() {
    const tableBody = document.getElementById('agvTable').querySelector('tbody');

    // 테이블 내용 초기화
    tableBody.innerHTML = '';

    // AGV가 없는 경우
    if (this.agvs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="no-data-message">
            <i class="fas fa-robot"></i>
            <p>등록된 AGV가 없습니다.</p>
            <button class="btn btn-sm btn-primary" onclick="document.getElementById('addAgvButton').click()">
              AGV 추가하기
            </button>
          </td>
        </tr>
      `;
      return;
    }

    // 테이블 행 생성
    this.agvs.forEach(agv => {
      const row = document.createElement('tr');
      
      // 선택된 AGV 강조
      if (this.selectedAgv && this.selectedAgv.id === agv.id) {
        row.classList.add('selected');
      }
      
      // 클릭 이벤트
      row.addEventListener('click', () => {
        this.selectAgv(agv);
      });
      
      // 배터리 수준에 따른 클래스
      const batteryClass = agv.battery >= 70 ? 'agv-battery-high' : 
                        agv.battery >= 30 ? 'agv-battery-medium' : 'agv-battery-low';
      
      // 셀 내용 구성
      row.innerHTML = `
        <td>${agv.id}</td>
        <td><span class="badge ${getStatusBadgeClass(agv.status)}">${getAgvStatusText(agv.status)}</span></td>
        <td>
          <div class="agv-battery-bar">
            <div class="agv-battery-fill ${batteryClass}" style="width: ${agv.battery}%;"></div>
          </div>
          <small>${agv.battery}%</small>
        </td>
        <td>${agv.location}</td>
        <td>${agv.currentTask || '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary action-btn" data-action="control" data-id="${agv.id}">
            <i class="fas fa-cog"></i>
          </button>
          <button class="btn btn-sm btn-danger action-btn" data-action="remove" data-id="${agv.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      `;
      
      // 행 액션 버튼 이벤트
      const actionButtons = row.querySelectorAll('.action-btn');
      actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation(); // 행 클릭 이벤트 전파 방지
          const action = button.getAttribute('data-action');
          const agvId = button.getAttribute('data-id');
          
          if (action === 'control') {
            this.controlAgv(agvId);
          } else if (action === 'remove') {
            this.removeAgv(agvId);
          }
        });
      });
      
      tableBody.appendChild(row);
    });
  }

  /**
  * 필터링된 작업 목록 가져오기
  * @returns {Array} 필터링된 작업 목록
  */
  getFilteredTasks() {
    const searchQuery = document.getElementById('taskSearchInput').value.toLowerCase();
    const statusFilter = document.getElementById('taskStatusFilter').value;

    return this.tasks.filter(task => {
      // 검색어 필터링
      const matchesSearch = 
        task.id.toLowerCase().includes(searchQuery) ||
        task.startPoint.toLowerCase().includes(searchQuery) ||
        task.endPoint.toLowerCase().includes(searchQuery) ||
        (task.assignedTo && task.assignedTo.toLowerCase().includes(searchQuery));
      
      // 상태 필터링
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  /**
  * 페이지네이션 적용된 항목 가져오기
  * @param {Array} items - 전체 항목 배열
  * @returns {Array} 현재 페이지에 표시할 항목 배열
  */
  getPaginatedItems(items) {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return items.slice(startIndex, endIndex);
  }

  /**
  * 페이지네이션 UI 업데이트
  * @param {number} totalItems - 전체 항목 수
  */
  updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    const paginationElement = document.getElementById('tasksPagination');

    // 페이지네이션 내용 초기화
    paginationElement.innerHTML = '';

    // 페이지가 1페이지밖에 없으면 페이지네이션 표시 안 함
    if (totalPages <= 1) {
      return;
    }

    // 이전 페이지 버튼
    const prevItem = document.createElement('div');
    prevItem.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
    prevItem.innerHTML = `<a class="page-link" href="#" ${this.currentPage === 1 ? 'tabindex="-1"' : ''}>&laquo;</a>`;
    if (this.currentPage > 1) {
      prevItem.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        this.goToPage(this.currentPage - 1);
      });
    }
    paginationElement.appendChild(prevItem);

    // 페이지 번호 버튼
    for (let i = 1; i <= totalPages; i++) {
      const pageItem = document.createElement('div');
      pageItem.className = `page-item ${this.currentPage === i ? 'active' : ''}`;
      pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      pageItem.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        this.goToPage(i);
      });
      paginationElement.appendChild(pageItem);
    }

    // 다음 페이지 버튼
    const nextItem = document.createElement('div');
    nextItem.className = `page-item ${this.currentPage === totalPages ? 'disabled' : ''}`;
    nextItem.innerHTML = `<a class="page-link" href="#" ${this.currentPage === totalPages ? 'tabindex="-1"' : ''}>&raquo;</a>`;
    if (this.currentPage < totalPages) {
      nextItem.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        this.goToPage(this.currentPage + 1);
      });
    }
    paginationElement.appendChild(nextItem);
  }

  /**
  * 페이지 이동
  * @param {number} pageNumber - 이동할 페이지 번호
  */
  goToPage(pageNumber) {
    this.currentPage = pageNumber;
    this.renderTasksTable();
  }

  /**
  * 작업 필터링
  */
  filterTasks() {
    this.currentPage = 1; // 필터링 시 첫 페이지로 이동
    this.renderTasksTable();
  }

  /**
  * 작업 선택
  * @param {Object} task - 선택할 작업 객체
  */
  selectTask(task) {
    this.selectedTask = task;

    // 테이블에서 선택된 행 강조
    const rows = document.querySelectorAll('#tasksTable tbody tr');
    rows.forEach(row => {
      row.classList.remove('selected');
    });

    // 선택된 작업 상세 정보 패널 업데이트
    this.updateTaskDetailsPanel();

    // 작업 할당 패널 업데이트
    this.updateTaskAssignmentPanel();

    // 작업 테이블 다시 렌더링
    this.renderTasksTable();
  }

  /**
  * AGV 선택
  * @param {Object} agv - 선택할 AGV 객체
  */
  selectAgv(agv) {
    this.selectedAgv = agv;

    // 테이블에서 선택된 행 강조
    const rows = document.querySelectorAll('#agvTable tbody tr');
    rows.forEach(row => {
      row.classList.remove('selected');
    });

    // 선택된 AGV 상세 정보 패널 업데이트
    this.updateAgvDetailsPanel();

    // AGV 제어 패널 업데이트
    this.updateAgvControlPanel();

    // AGV 테이블 다시 렌더링
    this.renderAgvTable();
  }

  /**
  * 작업 세부 정보 패널 업데이트
  */
  updateTaskDetailsPanel() {
    const detailsPanel = document.getElementById('taskDetailsPanel');
    
    if (!this.selectedTask) {
      detailsPanel.innerHTML = `
        <div class="text-center p-4">
          <i class="fas fa-info-circle text-light mb-3" style="font-size: 3rem;"></i>
          <p>작업을 선택하여 세부 정보를 확인하세요.</p>
        </div>
      `;
      return;
    }
    
    const task = this.selectedTask;
    const createdDate = new Date(task.createdAt);
    const updatedDate = new Date(task.updatedAt);
    let deadlineHtml = '';
    
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      const now = new Date();
      const isOverdue = deadlineDate < now && task.status !== 'completed';
      
      deadlineHtml = `
        <div class="detail-group">
          <div class="detail-label">마감 시간</div>
          <div class="detail-value ${isOverdue ? 'text-danger' : ''}">
            ${formatDate(task.deadline)}
            ${isOverdue ? ' <span class="badge badge-danger">지연</span>' : ''}
          </div>
        </div>
      `;
    }
    
    let descriptionHtml = '';
    if (task.description) {
      descriptionHtml = `
        <div class="task-description">
          ${task.description}
        </div>
      `;
    }
    
    detailsPanel.innerHTML = `
      <div class="task-details">
        <h3>${task.name || task.id}</h3>
        
        <div class="detail-group">
          <div class="detail-label">작업 ID</div>
          <div class="detail-value">${task.id}</div>
        </div>
        
        <div class="detail-group">
          <div class="detail-label">상태</div>
          <div class="detail-value">
            <span class="badge ${getStatusBadgeClass(task.status)}">${getTaskStatusText(task.status)}</span>
          </div>
        </div>
        
        <div class="detail-group">
          <div class="detail-label">우선순위</div>
          <div class="detail-value">
            <span class="priority-badge priority-${task.priority}">${getPriorityText(task.priority)}</span>
          </div>
        </div>
        
        <div class="detail-group">
          <div class="detail-label">출발 지점</div>
          <div class="detail-value">${task.startPoint}</div>
        </div>
        
        <div class="detail-group">
          <div class="detail-label">도착 지점</div>
          <div class="detail-value">${task.endPoint}</div>
        </div>
        
        <div class="detail-group">
          <div class="detail-label">할당된 AGV</div>
          <div class="detail-value">${task.assignedTo || '-'}</div>
        </div>
        
        <div class="detail-group">
          <div class="detail-label">진행도</div>
          <div class="detail-value">
            <div class="progress-slim">
              <div class="progress-bar-slim ${task.progress < 30 ? 'bg-danger' : task.progress < 70 ? 'bg-warning' : 'bg-success'}" style="width: ${task.progress}%;"></div>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <small>${task.progress}%</small>
              <small>${getTaskStatusText(task.status)}</small>
            </div>
          </div>
        </div>
        
        ${deadlineHtml}
        
        <div class="detail-group">
          <div class="detail-label">생성 시간</div>
          <div class="detail-value">${formatDate(task.createdAt)}</div>
        </div>
        
        <div class="detail-group">
          <div class="detail-label">최종 수정</div>
          <div class="detail-value">${formatDate(task.updatedAt)}</div>
        </div>
        
        ${descriptionHtml}
      </div>
    `;
  }

  /**
  * AGV 상세 정보 패널 업데이트
  */
  updateAgvDetailsPanel() {
    const detailsPanel = document.getElementById('agvDetailsPanel');

    if (!this.selectedAgv) {
      detailsPanel.innerHTML = `
        <div class="text-center p-4">
          <i class="fas fa-robot text-light mb-3" style="font-size: 3rem;"></i>
          <p>AGV를 선택하여 세부 정보를 확인하세요.</p>
        </div>
      `;
      return;
    }

    const agv = this.selectedAgv;

    // 배터리 수준에 따른 클래스
    const batteryClass = agv.battery >= 70 ? 'agv-battery-high' : 
                      agv.battery >= 30 ? 'agv-battery-medium' : 'agv-battery-low';

    // 배터리 상태 텍스트
    let batteryStatusText = '정상';
    if (agv.battery < 20) {
      batteryStatusText = '<span class="text-danger">충전 필요</span>';
    } else if (agv.battery < 50) {
      batteryStatusText = '<span class="text-warning">낮음</span>';
    }

    // 상태 표시 색상
    const statusColor = agv.status === 'active' ? 'var(--success-color)' :
                      agv.status === 'idle' ? 'var(--info-color)' :
                      agv.status === 'charging' ? 'var(--warning-color)' : 'var(--danger-color)';

    detailsPanel.innerHTML = `
      <div class="agv-details">
        <div class="mb-3">
          <h3>${agv.id}</h3>
          <div>
            <span class="agv-status-indicator" style="background-color: ${statusColor};"></span>
            <span class="badge ${getStatusBadgeClass(agv.status)}">${getAgvStatusText(agv.status)}</span>
          </div>
        </div>
        
        <div class="agv-detail-group">
          <div class="detail-label">AGV ID</div>
          <div class="detail-value">${agv.id}</div>
        </div>
        
        <div class="agv-detail-group">
          <div class="detail-label">현재 위치</div>
          <div class="detail-value">${agv.location}</div>
        </div>
        
        <div class="agv-detail-group">
          <div class="detail-label">현재 작업</div>
          <div class="detail-value">${agv.currentTask || '없음'}</div>
        </div>
        
        <div class="agv-detail-group">
          <div class="detail-label">배터리 상태</div>
          <div class="detail-value">
            <div class="agv-battery-bar">
              <div class="agv-battery-fill ${batteryClass}" style="width: ${agv.battery}%;"></div>
            </div>
            <div class="d-flex justify-content-between">
              <small>${agv.battery}%</small>
              <small>${batteryStatusText}</small>
            </div>
          </div>
        </div>
        
        <div class="agv-detail-group">
          <div class="detail-label">작업 이력</div>
          <div class="agv-task-history">
            <div class="history-item">
              <div>최근 작업 기록이 없습니다.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
  * 작업 할당 패널 업데이트
  */
  updateTaskAssignmentPanel() {
    const assignmentPanel = document.getElementById('taskAssignmentPanel');
    const assignButton = document.getElementById('assignTaskButton');

    if (!this.selectedTask) {
      assignmentPanel.innerHTML = `
        <div class="text-center p-3">
          <p>할당할 작업을 선택하세요.</p>
        </div>
      `;
      assignButton.disabled = true;
      return;
    }

    // 이미 할당된 작업이고 진행 중인 경우
    if (this.selectedTask.assignedTo && this.selectedTask.status === 'in-progress') {
      assignmentPanel.innerHTML = `
        <div class="text-center p-3">
          <p>이 작업은 이미 <strong>${this.selectedTask.assignedTo}</strong>에 할당되어 진행 중입니다.</p>
          <button class="btn btn-sm btn-warning" id="reassignTaskButton">
            <i class="fas fa-redo"></i> 재할당
          </button>
        </div>
      `;
      
      // 재할당 버튼 이벤트
      document.getElementById('reassignTaskButton').addEventListener('click', () => {
        this.showAgvOptions();
      });
      
      assignButton.disabled = true;
      return;
    }

    // 작업이 완료된 경우
    if (this.selectedTask.status === 'completed') {
      assignmentPanel.innerHTML = `
        <div class="text-center p-3">
          <p>이 작업은 이미 완료되었습니다.</p>
        </div>
      `;
      assignButton.disabled = true;
      return;
    }

    // AGV 옵션 표시
    this.showAgvOptions();
  }

  /**
  * AGV 옵션 표시
  */
  showAgvOptions() {
    const assignmentPanel = document.getElementById('taskAssignmentPanel');
    const assignButton = document.getElementById('assignTaskButton');

    // 사용 가능한 AGV 필터링 (상태가 idle이거나 현재 선택된 작업에 이미 할당된 AGV)
    const availableAgvs = this.agvs.filter(agv => 
      agv.status === 'idle' || 
      (this.selectedTask && agv.id === this.selectedTask.assignedTo)
    );

    if (availableAgvs.length === 0) {
      assignmentPanel.innerHTML = `
        <div class="text-center p-3">
          <p>현재 사용 가능한 AGV가 없습니다.</p>
        </div>
      `;
      assignButton.disabled = true;
      return;
    }

    let optionsHtml = `
      <div class="assignment-group">
        <div class="detail-label">작업:</div>
        <div class="detail-value">${this.selectedTask.id} (${this.selectedTask.startPoint} → ${this.selectedTask.endPoint})</div>
      </div>
      <div class="assignment-group">
        <div class="detail-label">사용 가능한 AGV:</div>
        <div class="agv-options">
    `;

    availableAgvs.forEach(agv => {
      // 배터리 수준에 따른 클래스
      const batteryClass = agv.battery >= 70 ? 'text-success' : 
                        agv.battery >= 30 ? 'text-warning' : 'text-danger';
      
      // 이미 선택된 AGV인지 확인
      const isSelected = this.selectedAgv && this.selectedAgv.id === agv.id;
      
      optionsHtml += `
        <div class="agv-option ${isSelected ? 'selected' : ''}" data-agv-id="${agv.id}">
          <div class="agv-option-icon">
            <i class="fas fa-robot"></i>
          </div>
          <div class="agv-option-info">
            <div class="agv-option-name">${agv.id}</div>
            <div class="agv-option-status">${agv.location}</div>
          </div>
          <div class="agv-option-battery ${batteryClass}">
            ${agv.battery}%
          </div>
        </div>
      `;
    });

    optionsHtml += `
        </div>
      </div>
    `;

    assignmentPanel.innerHTML = optionsHtml;

    // AGV 옵션 클릭 이벤트
    const agvOptions = assignmentPanel.querySelectorAll('.agv-option');
    agvOptions.forEach(option => {
      option.addEventListener('click', () => {
        // 모든 옵션에서 선택 클래스 제거
        agvOptions.forEach(opt => opt.classList.remove('selected'));
        
        // 클릭한 옵션에 선택 클래스 추가
        option.classList.add('selected');
        
        // 선택된 AGV ID 가져오기
        const agvId = option.getAttribute('data-agv-id');
        
        // 선택된 AGV 객체 찾기
        this.selectedAgv = this.agvs.find(agv => agv.id === agvId);
        
        // 할당 버튼 활성화
        assignButton.disabled = false;
      });
    });

    // 아무 AGV도 선택되지 않았으면 할당 버튼 비활성화
    assignButton.disabled = !this.selectedAgv;
  }

  /**
  * AGV 제어 패널 업데이트
  */
  updateAgvControlPanel() {
    const controlPanel = document.getElementById('agvControlPanel');

    if (!this.selectedAgv) {
      controlPanel.innerHTML = `
        <div class="text-center p-3">
          <p>AGV를 선택하여 상태를 변경하세요.</p>
        </div>
      `;
      return;
    }

    const agv = this.selectedAgv;

    controlPanel.innerHTML = `
      <div class="text-center mb-3">
        <h4>${agv.id} 제어</h4>
        <p>현재 상태: <span class="badge ${getStatusBadgeClass(agv.status)}">${getAgvStatusText(agv.status)}</span></p>
      </div>
      <div class="control-buttons">
        <button class="control-btn" data-status="idle" ${agv.status === 'idle' ? 'disabled' : ''}>
          <i class="fas fa-pause"></i> 대기 상태로 변경
        </button>
        <button class="control-btn" data-status="charging" ${agv.status === 'charging' ? 'disabled' : ''}>
          <i class="fas fa-charging-station"></i> 충전소로 이동
        </button>
        <button class="control-btn" data-status="maintenance" ${agv.status === 'maintenance' ? 'disabled' : ''}>
          <i class="fas fa-tools"></i> 점검 모드
        </button>
      </div>
    `;

    // 제어 버튼 이벤트
    const controlButtons = controlPanel.querySelectorAll('.control-btn');
    controlButtons.forEach(button => {
      if (!button.disabled) {
        button.addEventListener('click', () => {
          const newStatus = button.getAttribute('data-status');
          this.changeAgvStatus(agv.id, newStatus);
        });
      }
    });
  }

  /**
  * 작업 생성 모달 표시
  */
  showCreateTaskModal() {
    const modal = document.getElementById('createTaskModal');
    modal.style.display = 'block';

    // 폼 초기화
    document.getElementById('taskName').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskStartPoint').value = '';
    document.getElementById('taskEndPoint').value = '';
    document.getElementById('taskDeadline').value = '';
    document.getElementById('taskDescription').value = '';
  }

  /**
  * AGV 추가 모달 표시
  */
  showAddAgvModal() {
    const modal = document.getElementById('addAgvModal');
    modal.style.display = 'block';

    // 폼 초기화
    document.getElementById('agvId').value = '';
    document.getElementById('agvType').value = 'standard';
    document.getElementById('agvInitialLocation').value = '';
    document.getElementById('agvBatteryLevel').value = '100';
  }

  /**
  * 새 작업 저장
  */
  saveTask() {
    // 폼 데이터 가져오기
    const name = document.getElementById('taskName').value;
    const priority = document.getElementById('taskPriority').value;
    const startPoint = document.getElementById('taskStartPoint').value;
    const endPoint = document.getElementById('taskEndPoint').value;
    const deadline = document.getElementById('taskDeadline').value;
    const description = document.getElementById('taskDescription').value;

    // 필수 필드 검증
    if (!startPoint || !endPoint) {
      showNotification('출발 지점과 도착 지점은 필수 입력 항목입니다.', 'warning');
      return;
    }

    // 작업 데이터 구성
    const taskData = {
      name: name || `작업-${Date.now().toString().slice(-4)}`,
      priority,
      startPoint,
      endPoint,
      deadline: deadline || null,
      description,
      status: 'pending',
      progress: 0,
      assignedTo: null,
      createdAt: new Date().toISOString()
    };

    // 모달 닫기
    document.getElementById('createTaskModal').style.display = 'none';

    // 로딩 표시
    showNotification('작업을 생성 중입니다...', 'info');

    // 실제 구현에서는 API 호출
    setTimeout(() => {
      // 새 작업 ID 생성 (실제 구현에서는 서버에서 할당)
      const newTaskId = `TASK-${Date.now().toString().slice(-6)}`;
      taskData.id = newTaskId;
      
      // 작업 목록에 추가
      this.tasks.unshift(taskData);
      
      // 테이블 갱신
      this.renderTasksTable();
      
      showNotification('새 작업이 성공적으로 생성되었습니다.', 'success');
    }, 1000);
  }

  /**
  * 새 AGV 저장
  */
  saveAgv() {
    // 폼 데이터 가져오기
    const id = document.getElementById('agvId').value;
    const type = document.getElementById('agvType').value;
    const location = document.getElementById('agvInitialLocation').value;
    const battery = parseInt(document.getElementById('agvBatteryLevel').value);

    // 필수 필드 검증
    if (!id || !location) {
      showNotification('AGV ID와 초기 위치는 필수 입력 항목입니다.', 'warning');
      return;
    }

    // 중복 ID 검사
    if (this.agvs.some(agv => agv.id === id)) {
      showNotification('이미 존재하는 AGV ID입니다.', 'danger');
      return;
    }

    // AGV 데이터 구성
    const agvData = {
      id,
      type,
      location,
      battery,
      status: 'idle',
      currentTask: null
    };

    // 모달 닫기
    document.getElementById('addAgvModal').style.display = 'none';

    // 로딩 표시
    showNotification('AGV를 추가 중입니다...', 'info');

    // 실제 구현에서는 API 호출
    setTimeout(() => {
      // AGV 목록에 추가
      this.agvs.push(agvData);
      
      // 테이블 갱신
      this.renderAgvTable();
      
      showNotification('새 AGV가 성공적으로 추가되었습니다.', 'success');
    }, 1000);
  }

  /**
  * 작업을 AGV에 할당
  */
  assignTaskToAgv() {
    if (!this.selectedTask || !this.selectedAgv) {
      showNotification('작업과 AGV를 모두 선택해야 합니다.', 'warning');
      return;
    }

    const task = this.selectedTask;
    const agv = this.selectedAgv;

    // 이미 이 AGV에 할당된 경우
    if (task.assignedTo === agv.id && task.status === 'in-progress') {
      showNotification('이 작업은 이미 선택한 AGV에 할당되었습니다.', 'info');
      return;
    }

    // AGV가 이미 다른 작업 중인 경우
    if (agv.status === 'active' && agv.currentTask && agv.currentTask !== task.id) {
      showNotification(`${agv.id}는 이미 ${agv.currentTask} 작업 중입니다.`, 'warning');
      return;
    }

    // 로딩 표시
    showNotification('작업을 할당 중입니다...', 'info');

    // 실제 구현에서는 API 호출
    setTimeout(() => {
      // 작업 상태 업데이트
      task.status = 'in-progress';
      task.assignedTo = agv.id;
      task.progress = 0;
      task.updatedAt = new Date().toISOString();
      
      // AGV 상태 업데이트
      agv.status = 'active';
      agv.currentTask = task.id;
      
      // 테이블 갱신
      this.renderTasksTable();
      this.renderAgvTable();
      
      // 패널 업데이트
      this.updateTaskDetailsPanel();
      this.updateTaskAssignmentPanel();
      this.updateAgvDetailsPanel();
      this.updateAgvControlPanel();
      
      showNotification(`작업 ${task.id}가 AGV ${agv.id}에 성공적으로 할당되었습니다.`, 'success');
    }, 1000);
  }

  /**
  * 작업 편집
  * @param {string} taskId - 편집할 작업 ID
  */
  editTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    // 선택된 작업 업데이트
    this.selectedTask = task;

    // 작업 상세 정보 패널 및 할당 패널 업데이트
    this.updateTaskDetailsPanel();
    this.updateTaskAssignmentPanel();

    // 사용자에게 선택 알림
    showNotification(`${task.id} 작업이 선택되었습니다. 상세 정보를 확인하세요.`, 'info');
  }

  /**
  * 작업 삭제
  * @param {string} taskId - 삭제할 작업 ID
  */
  deleteTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!confirm(`작업 ${taskId}를 삭제하시겠습니까?`)) {
      return;
    }

    // 진행 중인 작업은 삭제 불가
    if (task.status === 'in-progress') {
      showNotification('진행 중인 작업은 삭제할 수 없습니다. 먼저 작업을 중단하세요.', 'warning');
      return;
    }

    // 로딩 표시
    showNotification('작업을 삭제 중입니다...', 'info');

    // 실제 구현에서는 API 호출
    setTimeout(() => {
      // 작업 목록에서 제거
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      
      // 선택된 작업이 삭제된 경우 초기화
      if (this.selectedTask && this.selectedTask.id === taskId) {
        this.selectedTask = null;
        this.updateTaskDetailsPanel();
        this.updateTaskAssignmentPanel();
      }
      
      // 테이블 갱신
      this.renderTasksTable();
      
      showNotification('작업이 성공적으로 삭제되었습니다.', 'success');
    }, 1000);
  }

  /**
  * AGV 제어/상태 변경
  * @param {string} agvId - AGV ID
  */
  controlAgv(agvId) {
    const agv = this.agvs.find(a => a.id === agvId);
    if (!agv) return;

    // 선택된 AGV 업데이트
    this.selectedAgv = agv;

    // AGV 상세 정보 패널 및 제어 패널 업데이트
    this.updateAgvDetailsPanel();
    this.updateAgvControlPanel();

    // 사용자에게 선택 알림
    showNotification(`${agv.id} AGV가 선택되었습니다. 제어 패널을 확인하세요.`, 'info');
  }

  /**
  * AGV 상태 변경
  * @param {string} agvId - AGV ID
  * @param {string} newStatus - 새 상태
  */
  changeAgvStatus(agvId, newStatus) {
    const agv = this.agvs.find(a => a.id === agvId);
    if (!agv) return;

    // 작업 중인 AGV는 상태 변경 불가
    if (agv.status === 'active' && agv.currentTask) {
      showNotification('작업 중인 AGV의 상태는 변경할 수 없습니다. 먼저 작업을 완료하거나 취소하세요.', 'warning');
      return;
    }

    // 로딩 표시
    showNotification('AGV 상태를 변경 중입니다...', 'info');

    // 실제 구현에서는 API 호출
    setTimeout(() => {
      // AGV 상태 업데이트
      agv.status = newStatus;
      
      // 테이블 갱신
      this.renderAgvTable();
      
      // 패널 업데이트
      this.updateAgvDetailsPanel();
      this.updateAgvControlPanel();
      
      showNotification(`AGV ${agv.id}의 상태가 ${getAgvStatusText(newStatus)}(으)로 변경되었습니다.`, 'success');
    }, 1000);
  }

  /**
  * AGV 제거
  * @param {string} agvId - 제거할 AGV ID
  */
  removeAgv(agvId) {
    const agv = this.agvs.find(a => a.id === agvId);
    if (!agv) return;

    if (!confirm(`AGV ${agvId}를 제거하시겠습니까?`)) {
      return;
    }

    // 작업 중인 AGV는 제거 불가
    if (agv.status === 'active' && agv.currentTask) {
      showNotification('작업 중인 AGV는 제거할 수 없습니다. 먼저 작업을 완료하거나 취소하세요.', 'warning');
      return;
    }

    // 로딩 표시
    showNotification('AGV를 제거 중입니다...', 'info');

    // 실제 구현에서는 API 호출
    setTimeout(() => {
      // AGV 목록에서 제거
      this.agvs = this.agvs.filter(a => a.id !== agvId);
      
      // 선택된 AGV가 제거된 경우 초기화
      if (this.selectedAgv && this.selectedAgv.id === agvId) {
        this.selectedAgv = null;
        this.updateAgvDetailsPanel();
        this.updateAgvControlPanel();
      }
      
      // 테이블 갱신
      this.renderAgvTable();
      
      showNotification('AGV가 성공적으로 제거되었습니다.', 'success');
    }, 1000);
  }

  /**
  * 탭 초기화
  */
  initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // 탭 버튼 활성화
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // 탭 내용 활성화
        const tabId = button.getAttribute('data-tab');
        tabPanes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabId}-tab`).classList.add('active');
      });
    });
  }

  /**
  * 초기 데이터 로드
  */
  loadData() {
    // 모의 API 호출 함수 (실제 구현시 대체 필요)
    const loadMockData = () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            tasks: this.generateMockTasks(),
            agvs: this.generateMockAgvs()
          });
        }, 1000);
      });
    };
    
    // 로딩 표시
    document.getElementById('tasksTable').querySelector('tbody').innerHTML = `
      <tr>
        <td colspan="8" class="text-center">
          <div class="spinner"></div>
          <p class="mt-2">데이터를 불러오는 중...</p>
        </td>
      </tr>
    `;
    
    // 모의 데이터 로드
    loadMockData()
      .then(data => {
        // 데이터 설정
        this.tasks = data.tasks;
        this.agvs = data.agvs;
        
        // 테이블 및 통계 렌더링
        this.renderTasksTable();
        this.renderAgvTable();
        this.updateStatistics();
        this.renderStatisticsChart();
        
        showNotification('데이터가 성공적으로 로드되었습니다.', 'success');
      })
      .catch(error => {
        console.error('데이터 로드 실패:', error);
        showNotification('데이터를 불러오는 중 오류가 발생했습니다.', 'danger');
      });
  }

  /**
  * 모의 작업 데이터 생성
  */
  generateMockTasks() {
    const mockTasks = [];
    const priorities = ['high', 'medium', 'low'];
    const statuses = ['pending', 'in-progress', 'completed'];
    const startPoints = ['A1', 'B3', 'C5', 'D2', 'E4', '창고-1', '창고-2', '출하장-1'];
    const endPoints = ['F6', 'G7', 'H2', 'I9', 'J4', '작업장-1', '작업장-2', '조립라인-3'];
    
    // 현재 시간
    const now = new Date();
    
    // 15개의 모의 작업 생성
    for (let i = 1; i <= 15; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const createdTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // 최대 1주일 전
      
      // 작업 객체 생성
      const task = {
        id: `TASK-${100000 + i}`,
        name: `작업-${i}`,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        startPoint: startPoints[Math.floor(Math.random() * startPoints.length)],
        endPoint: endPoints[Math.floor(Math.random() * endPoints.length)],
        status: status,
        progress: status === 'completed' ? 100 : status === 'in-progress' ? Math.floor(Math.random() * 80) + 10 : 0,
        assignedTo: status === 'pending' ? null : `AGV-${1000 + Math.floor(Math.random() * 5) + 1}`,
        createdAt: createdTime.toISOString(),
        updatedAt: status === 'pending' ? createdTime.toISOString() : new Date(createdTime.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString()
      };
      
      // 마감 시간 (일부 작업에만 설정)
      if (Math.random() > 0.6) {
        const deadline = new Date(now.getTime() + (Math.random() * 5 * 24 * 60 * 60 * 1000)); // 최대 5일 후
        task.deadline = deadline.toISOString();
      }
      
      // 설명 (일부 작업에만 설정)
      if (Math.random() > 0.7) {
        task.description = `작업 ${i}에 대한 상세 설명입니다. 이 작업은 ${task.startPoint}에서 시작하여 ${task.endPoint}에서 종료됩니다.`;
      }
      
      mockTasks.push(task);
    }
    
    return mockTasks;
  }

  /**
  * 모의 AGV 데이터 생성
  */
  generateMockAgvs() {
    const mockAgvs = [];
    const statuses = ['idle', 'active', 'charging', 'maintenance'];
    const locations = ['A1', 'B2', 'C3', 'D4', 'E5', '충전소-1', '충전소-2', '대기장-1'];
    const types = ['standard', 'heavy', 'compact'];
    
    // 5개의 모의 AGV 생성
    for (let i = 1; i <= 5; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      // AGV 객체 생성
      const agv = {
        id: `AGV-${1000 + i}`,
        type: types[Math.floor(Math.random() * types.length)],
        status: status,
        battery: Math.floor(Math.random() * 70) + 30, // 30~100%
        location: locations[Math.floor(Math.random() * locations.length)],
        currentTask: status === 'active' ? `TASK-${100000 + Math.floor(Math.random() * 5) + 1}` : null
      };
      
      mockAgvs.push(agv);
    }
    
    return mockAgvs;
  }

  /**
  * 알고리즘 설명 업데이트
  * @param {string} algorithm - 선택된 알고리즘
  */
  updateAlgorithmDescription(algorithm) {
    const descriptionElement = document.getElementById('algorithmDescription');
    
    switch (algorithm) {
      case 'fifo':
        descriptionElement.innerHTML = `
          <h4>FIFO (First In, First Out)</h4>
          <p>작업이 생성된 순서대로 처리하는 가장 기본적인 알고리즘입니다.</p>
          <ul>
            <li>간단하고 공정한 방식</li>
            <li>모든 작업을 순차적으로 처리</li>
            <li>우선순위나 효율성을 고려하지 않음</li>
          </ul>
        `;
        break;
        
      case 'priority':
        descriptionElement.innerHTML = `
          <h4>우선순위 기반</h4>
          <p>작업의 우선순위에 따라 처리 순서를 결정하는 알고리즘입니다.</p>
          <ul>
            <li>중요한 작업을 먼저 처리</li>
            <li>우선순위: 높음 > 중간 > 낮음</li>
            <li>동일 우선순위 내에서는 FIFO 방식 적용</li>
          </ul>
        `;
        break;
        
      case 'deadline':
        descriptionElement.innerHTML = `
          <h4>납기일 기반</h4>
          <p>작업의 마감 시간에 따라 처리 순서를 결정하는 알고리즘입니다.</p>
          <ul>
            <li>마감 시간이 임박한 작업을 먼저 처리</li>
            <li>마감 시간이 없는 작업은 후순위로 처리</li>
            <li>지연 시간 최소화에 효과적</li>
          </ul>
        `;
        break;
        
      case 'nearest':
        descriptionElement.innerHTML = `
          <h4>최근접 위치 기반</h4>
          <p>AGV의 현재 위치에서 가장 가까운 작업을 할당하는 알고리즘입니다.</p>
          <ul>
            <li>AGV 이동 거리 최소화</li>
            <li>에너지 효율 및 처리량 향상</li>
            <li>우선순위나 마감 시간을 고려하지 않음</li>
          </ul>
        `;
        break;
        
      case 'custom':
        descriptionElement.innerHTML = `
          <h4>사용자 정의 (가중치 기반)</h4>
          <p>시급성, 거리, 배터리 효율 등의 요소에 가중치를 적용한 알고리즘입니다.</p>
          <ul>
            <li>여러 요소를 종합적으로 고려</li>
            <li>가중치 조정을 통한 동작 최적화 가능</li>
            <li>슬라이더로 각 요소의 중요도 설정</li>
          </ul>
        `;
        break;
        
      default:
        descriptionElement.innerHTML = `
          <h4>알고리즘 설명</h4>
          <p>알고리즘을 선택하면 해당 알고리즘에 대한 설명이 표시됩니다.</p>
        `;
    }
  }

  /**
  * 스케줄링 설정 적용
  */
  applySchedulingSettings() {
    // 현재 설정값 가져오기
    this.schedulingAlgorithm = document.getElementById('schedulingAlgorithm').value;
    this.replanInterval = parseInt(document.getElementById('replanInterval').value) || 30;
    
    // 자동 할당이 활성화된 경우 인터벌 재설정
    if (this.autoAssignEnabled) {
      if (this.autoAssignInterval) {
        clearInterval(this.autoAssignInterval);
      }
      
      this.autoAssignInterval = setInterval(() => {
        if (this.autoAssignEnabled) {
          console.log(`자동 할당 실행 중... (간격: ${this.replanInterval}초)`);
          this.applySchedulingAlgorithm();
        }
      }, this.replanInterval * 1000);
      
      // 즉시 한 번 실행
      this.applySchedulingAlgorithm();
    }
    
    showNotification('스케줄링 설정이 적용되었습니다.', 'success');
    
    // 알고리즘 설명 업데이트
    this.updateAlgorithmDescription(this.schedulingAlgorithm);
    
    // 즉시 한 번 실행
    this.applySchedulingAlgorithm();
  }

  /**
  * 배치 작업 예약
  */
  scheduleBatchJob() {
    const scheduleTime = document.getElementById('batchScheduleTime').value;

    if (!scheduleTime) {
      showNotification('예약 시간을 입력하세요.', 'warning');
      return;
    }

    // 실제 구현에서는 API 호출
    showNotification(`배치 작업이 ${formatDate(scheduleTime, 'YYYY-MM-DD HH:mm')}에 예약되었습니다.`, 'success');
  }

  /**
  * 배치 작업 실행
  */
  runBatchJob() {
    showNotification('배치 작업을 실행 중입니다...', 'info');
    
    // 현재 알고리즘을 적용한 작업 스케줄링
    setTimeout(() => {
      this.applySchedulingAlgorithm();
      showNotification('배치 작업이 성공적으로 실행되었습니다.', 'success');
    }, 1500);
  }

  /**
  * 통계 업데이트
  */
  updateStatistics() {
    // 총 처리 작업 수
    const completedTasks = this.tasks.filter(task => task.status === 'completed').length;
    document.getElementById('totalTasksProcessed').textContent = completedTasks;
    
    // 평균 처리 시간 계산
    let totalProcessingTime = 0;
    let taskWithTimeCount = 0;
    
    this.tasks.filter(task => task.status === 'completed' && task.createdAt && task.updatedAt).forEach(task => {
      const startTime = new Date(task.createdAt);
      const endTime = new Date(task.updatedAt);
      const processingTime = (endTime - startTime) / (1000 * 60); // 분 단위
      
      if (processingTime > 0) {
        totalProcessingTime += processingTime;
        taskWithTimeCount++;
      }
    });
    
    const avgProcessingTime = taskWithTimeCount > 0 ? Math.round(totalProcessingTime / taskWithTimeCount) : 0;
    document.getElementById('avgProcessingTime').textContent = `${avgProcessingTime}분`;
    
    // AGV 가동률
    const activeAgvs = this.agvs.filter(agv => agv.status === 'active').length;
    const totalAgvs = this.agvs.length;
    const agvUtilization = totalAgvs > 0 ? Math.round((activeAgvs / totalAgvs) * 100) : 0;
    document.getElementById('agvUtilization').textContent = `${agvUtilization}%`;
    
    // 에너지 효율 (모의 데이터)
    const energyEfficiency = Math.round(80 + Math.random() * 15);
    document.getElementById('energyEfficiency').textContent = `${energyEfficiency}%`;
    
    // 차트 업데이트
    this.renderStatisticsChart();
  }

  /**
  * 통계 차트 렌더링
  */
  renderStatisticsChart() {
    const chartContainer = document.getElementById('statisticsChart');
    
    // 예시 - 실제 구현에서는 Plotly, Chart.js 등의 라이브러리 사용 필요
    chartContainer.innerHTML = `
      <div class="text-center p-3">
        <p class="mb-3">작업 처리 현황</p>
        <div class="mock-chart">
          <div class="mock-bar" style="height: 40px; width: ${this.tasks.filter(t => t.status === 'pending').length / this.tasks.length * 100}%">
            <span>대기 중</span>
          </div>
          <div class="mock-bar" style="height: 40px; width: ${this.tasks.filter(t => t.status === 'in-progress').length / this.tasks.length * 100}%">
            <span>진행 중</span>
          </div>
          <div class="mock-bar" style="height: 40px; width: ${this.tasks.filter(t => t.status === 'completed').length / this.tasks.length * 100}%">
            <span>완료됨</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
  * 통계 내보내기
  */
  exportStatistics() {
    // 실제 구현에서는 API 호출이나 파일 다운로드 로직 필요
    showNotification('통계 데이터를 CSV 파일로 내보내는 중...', 'info');
    
    setTimeout(() => {
      showNotification('통계 데이터가 성공적으로 내보내졌습니다.', 'success');
    }, 1500);
  }

  /**
  * 스케줄링 알고리즘 적용
  * @description 현재 설정된 알고리즘에 따라 작업을 스케줄링합니다.
  */
  applySchedulingAlgorithm() {
    // 대기 중인 작업 필터링
    const pendingTasks = this.tasks.filter(task => task.status === 'pending');
    
    // 작업이 없는 경우 종료
    if (pendingTasks.length === 0) {
      console.log('스케줄링할 대기 작업이 없습니다.');
      return;
    }

    // 가용 AGV 필터링 (사용 가능하고 배터리가 20% 이상인 AGV)
    const availableAgvs = this.agvs.filter(agv => 
      agv.status === 'idle' && agv.battery > 20
    );
    
    // 가용 AGV가 없는 경우 종료
    if (availableAgvs.length === 0) {
      console.log('사용 가능한 AGV가 없습니다.');
      showNotification('현재 사용 가능한 AGV가 없습니다.', 'warning');
      return;
    }

    // 선택된 알고리즘에 따라 스케줄링 함수 호출
    switch (this.schedulingAlgorithm) {
      case 'fifo':
        this.fifoScheduling(pendingTasks, availableAgvs);
        break;
      case 'priority':
        this.priorityScheduling(pendingTasks, availableAgvs);
        break;
      case 'deadline':
        this.deadlineScheduling(pendingTasks, availableAgvs);
        break;
      case 'nearest':
        this.nearestLocationScheduling(pendingTasks, availableAgvs);
        break;
      case 'custom':
        this.customScheduling(pendingTasks, availableAgvs);
        break;
      default:
        this.fifoScheduling(pendingTasks, availableAgvs);
    }

    // 테이블 및 UI 업데이트
    this.renderTasksTable();
    this.renderAgvTable();
    this.updateStatistics();
  }

  /**
  * FIFO 스케줄링 (First In, First Out)
  * @param {Array} pendingTasks - 대기 중인 작업 목록
  * @param {Array} availableAgvs - 가용 AGV 목록
  */
  fifoScheduling(pendingTasks, availableAgvs) {
    console.log('FIFO 스케줄링 적용 중...');
    
    // 작업을 생성 시간 순으로 정렬 (오래된 작업부터)
    const sortedTasks = [...pendingTasks].sort((a, b) => {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    // 각 AGV별로 작업 할당
    for (let i = 0; i < Math.min(sortedTasks.length, availableAgvs.length); i++) {
      const task = sortedTasks[i];
      const agv = availableAgvs[i];
      
      // 작업 할당
      this.assignTask(task, agv);
    }
    
    showNotification(`FIFO 기반으로 ${Math.min(sortedTasks.length, availableAgvs.length)}개 작업이 할당되었습니다.`, 'success');
  }

  /**
  * 우선순위 기반 스케줄링
  * @param {Array} pendingTasks - 대기 중인 작업 목록
  * @param {Array} availableAgvs - 가용 AGV 목록
  */
  priorityScheduling(pendingTasks, availableAgvs) {
    console.log('우선순위 기반 스케줄링 적용 중...');
    
    // 우선순위로 정렬 (high > medium > low)
    const sortedTasks = [...pendingTasks].sort((a, b) => {
      const priorityValues = { high: 3, medium: 2, low: 1 };
      return priorityValues[b.priority] - priorityValues[a.priority];
    });
    
    // 각 AGV별로 작업 할당
    for (let i = 0; i < Math.min(sortedTasks.length, availableAgvs.length); i++) {
      const task = sortedTasks[i];
      const agv = availableAgvs[i];
      
      // 작업 할당
      this.assignTask(task, agv);
    }
    
    showNotification(`우선순위 기반으로 ${Math.min(sortedTasks.length, availableAgvs.length)}개 작업이 할당되었습니다.`, 'success');
  }

  /**
  * 납기일 기반 스케줄링
  * @param {Array} pendingTasks - 대기 중인 작업 목록
  * @param {Array} availableAgvs - 가용 AGV 목록
  */
  deadlineScheduling(pendingTasks, availableAgvs) {
    console.log('납기일 기반 스케줄링 적용 중...');
    
    // 마감 시간이 있는 작업 분리
    const tasksWithDeadline = pendingTasks.filter(task => task.deadline);
    const tasksWithoutDeadline = pendingTasks.filter(task => !task.deadline);
    
    // 마감 시간으로 정렬 (빠른 것부터)
    const sortedTasksWithDeadline = [...tasksWithDeadline].sort((a, b) => {
      return new Date(a.deadline) - new Date(b.deadline);
    });
    
    // 마감 시간이 있는 작업 + 나머지 작업
    const sortedTasks = [...sortedTasksWithDeadline, ...tasksWithoutDeadline];
    
    // 각 AGV별로 작업 할당
    for (let i = 0; i < Math.min(sortedTasks.length, availableAgvs.length); i++) {
      const task = sortedTasks[i];
      const agv = availableAgvs[i];
      
      // 작업 할당
      this.assignTask(task, agv);
    }
    
    showNotification(`납기일 기반으로 ${Math.min(sortedTasks.length, availableAgvs.length)}개 작업이 할당되었습니다.`, 'success');
  }

  /**
  * 최근접 위치 기반 스케줄링
  * @param {Array} pendingTasks - 대기 중인 작업 목록
  * @param {Array} availableAgvs - 가용 AGV 목록
  */
  nearestLocationScheduling(pendingTasks, availableAgvs) {
    console.log('최근접 위치 기반 스케줄링 적용 중...');
    
    // 각 AGV에 대해 가장 가까운 출발지를 가진 작업 찾기
    const assignments = [];
    
    // 가용 AGV마다 처리
    for (const agv of availableAgvs) {
      if (pendingTasks.length === 0) break;
      
      // 현재 AGV와 각 작업 간의 거리 계산
      const taskDistances = pendingTasks.map(task => {
        // 실제 구현에서는 좌표 기반 거리 계산 필요
        // 여기서는 간단한 문자열 비교로 대체
        const distance = this.calculateDistance(agv.location, task.startPoint);
        return { task, distance };
      });
      
      // 거리 순으로 정렬
      taskDistances.sort((a, b) => a.distance - b.distance);
      
      // 가장 가까운 작업 선택
      const closest = taskDistances[0];
      assignments.push({ agv, task: closest.task });
      
      // 할당된 작업은 목록에서 제거
      const index = pendingTasks.findIndex(t => t.id === closest.task.id);
      pendingTasks.splice(index, 1);
    }
    
    // 작업 할당
    for (const { agv, task } of assignments) {
      this.assignTask(task, agv);
    }
    
    showNotification(`최근접 위치 기반으로 ${assignments.length}개 작업이 할당되었습니다.`, 'success');
  }

  /**
  * 사용자 정의 스케줄링 (가중치 기반)
  * @param {Array} pendingTasks - 대기 중인 작업 목록
  * @param {Array} availableAgvs - 가용 AGV 목록
  */
  customScheduling(pendingTasks, availableAgvs) {
    console.log('사용자 정의 스케줄링 적용 중...');
    console.log(`가중치 - 시급성: ${this.urgencyWeight}, 거리: ${this.distanceWeight}, 배터리: ${this.batteryWeight}`);
    
    // 각 작업과 AGV의 조합에 대한 점수 계산
    const combinationScores = [];
    
    for (const task of pendingTasks) {
      for (const agv of availableAgvs) {
        // 시급성 점수 (높은 우선순위, 마감 시간이 가까울수록 높음)
        const priorityValues = { high: 10, medium: 5, low: 1 };
        const priorityScore = priorityValues[task.priority] || 5;
        
        // 마감시간 점수
        let deadlineScore = 0;
        if (task.deadline) {
          const now = new Date();
          const deadline = new Date(task.deadline);
          const hoursRemaining = Math.max(0, (deadline - now) / (1000 * 60 * 60));
          deadlineScore = hoursRemaining <= 24 ? 10 : 5;
        }
        
        // 시급성 종합 점수
        const urgencyScore = (priorityScore + deadlineScore) / 2;
        
        // 거리 점수 (가까울수록 높음)
        const distance = this.calculateDistance(agv.location, task.startPoint);
        const maxDistance = 100; // 최대 거리 (예시)
        const distanceScore = 10 * (1 - (distance / maxDistance));
        
        // 배터리 점수 (높을수록 높음)
        const batteryScore = agv.battery / 10;
        
        // 종합 점수 계산 (가중치 적용)
        const totalScore = (
          urgencyScore * this.urgencyWeight + 
          distanceScore * this.distanceWeight + 
          batteryScore * this.batteryWeight
        ) / (this.urgencyWeight + this.distanceWeight + this.batteryWeight);
        
        combinationScores.push({ task, agv, score: totalScore });
      }
    }
    
    // 점수 순으로 정렬
    combinationScores.sort((a, b) => b.score - a.score);
    
    // 할당된 작업 및 AGV 추적
    const assignedTasks = new Set();
    const assignedAgvs = new Set();
    const assignments = [];
    
    // 점수가 높은 순으로 할당 (작업과 AGV가 아직 할당되지 않은 경우)
    for (const { task, agv, score } of combinationScores) {
      if (
        !assignedTasks.has(task.id) && 
        !assignedAgvs.has(agv.id) && 
        assignments.length < Math.min(pendingTasks.length, availableAgvs.length)
      ) {
        assignments.push({ task, agv, score });
        assignedTasks.add(task.id);
        assignedAgvs.add(agv.id);
      }
    }
    
    // 작업 할당
    for (const { task, agv } of assignments) {
      this.assignTask(task, agv);
    }
    
    showNotification(`사용자 정의 알고리즘으로 ${assignments.length}개 작업이 할당되었습니다.`, 'success');
  }

  /**
  * 작업을 AGV에 할당하는 함수
  * @param {Object} task - 할당할 작업
  * @param {Object} agv - 할당할 AGV
  */
  assignTask(task, agv) {
    console.log(`작업 ${task.id}를 AGV ${agv.id}에 할당합니다.`);
    
    // 작업 상태 업데이트
    task.status = 'in-progress';
    task.assignedTo = agv.id;
    task.progress = 0;
    task.updatedAt = new Date().toISOString();
    
    // AGV 상태 업데이트
    agv.status = 'active';
    agv.currentTask = task.id;
  }

  /**
  * 두 위치 간의 거리 계산 (간단한 구현)
  * @param {string} location1 - 첫 번째 위치
  * @param {string} location2 - 두 번째 위치
  * @returns {number} - 계산된 거리
  */
  calculateDistance(location1, location2) {
    // 실제 구현에서는 좌표 기반 거리 계산 필요
    // 여기서는 문자열 유사도를 통해 간단하게 구현
    
    // 동일한 위치
    if (location1 === location2) return 0;
    
    // 문자열 기호 제거 후 숫자값 획득 시도
    const getLocationValue = (loc) => {
      const match = loc.match(/([A-Z]+)(\d+)/);
      if (match) {
        const [, letter, number] = match;
        const letterValue = letter.charCodeAt(0) - 65; // A=0, B=1, ...
        return { letterValue, number: parseInt(number, 10) };
      }
      return null;
    };
    
    const loc1Value = getLocationValue(location1);
    const loc2Value = getLocationValue(location2);
    
    // 좌표값으로 변환 가능한 경우 유클리드 거리 계산
    if (loc1Value && loc2Value) {
      const letterDiff = loc1Value.letterValue - loc2Value.letterValue;
      const numberDiff = loc1Value.number - loc2Value.number;
      return Math.sqrt(letterDiff * letterDiff + numberDiff * numberDiff);
    }
    
    // 그 외의 경우 간단한 문자열 차이
    return Math.abs(location1.length - location2.length);
  }

  /**
  * 이벤트 리스너 설정
  */
  setupEventListeners() {
    // 작업 생성 버튼
    document.getElementById('createTaskButton').addEventListener('click', () => {
      this.showCreateTaskModal();
    });

    // 작업 생성 모달 저장 버튼
    document.getElementById('saveTaskButton').addEventListener('click', () => {
      this.saveTask();
    });

    // AGV 추가 버튼
    document.getElementById('addAgvButton').addEventListener('click', () => {
      this.showAddAgvModal();
    });

    // AGV 추가 모달 저장 버튼
    document.getElementById('saveAgvButton').addEventListener('click', () => {
      this.saveAgv();
    });

    // 작업 할당 버튼
    document.getElementById('assignTaskButton').addEventListener('click', () => {
      this.assignTaskToAgv();
    });

    // 스케줄링 알고리즘 변경
    document.getElementById('schedulingAlgorithm').addEventListener('change', (e) => {
      this.schedulingAlgorithm = e.target.value;
      this.updateAlgorithmDescription(this.schedulingAlgorithm);
    });

    // 자동 할당 토글
    document.getElementById('autoAssignEnabled').addEventListener('change', (e) => {
      this.toggleAutoAssign(e.target.checked);
    });

    // 우선순위 가중치 변경
    document.getElementById('urgencyWeight').addEventListener('input', (e) => {
      this.urgencyWeight = parseInt(e.target.value);
      document.getElementById('urgencyWeightValue').textContent = this.urgencyWeight;
    });

    // 거리 가중치 변경
    document.getElementById('distanceWeight').addEventListener('input', (e) => {
      this.distanceWeight = parseInt(e.target.value);
      document.getElementById('distanceWeightValue').textContent = this.distanceWeight;
    });

    // 배터리 가중치 변경
    document.getElementById('batteryWeight').addEventListener('input', (e) => {
      this.batteryWeight = parseInt(e.target.value);
      document.getElementById('batteryWeightValue').textContent = this.batteryWeight;
    });

    // 스케줄링 설정 적용 버튼
    document.getElementById('applySchedulingButton').addEventListener('click', () => {
      this.applySchedulingSettings();
    });

    // 배치 작업 예약 버튼
    document.getElementById('scheduleBatchButton').addEventListener('click', () => {
      this.scheduleBatchJob();
    });

    // 배치 작업 즉시 실행 버튼
    document.getElementById('runBatchNowButton').addEventListener('click', () => {
      this.runBatchJob();
    });

    // 새로고침 버튼
    document.getElementById('refreshButton').addEventListener('click', () => {
      this.loadData();
    });

    // 모달 닫기 버튼
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    modalCloseButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.style.display = 'none';
        }
      });
    });

    // 작업 검색
    document.getElementById('taskSearchInput').addEventListener('input', (e) => {
      this.filterTasks();
    });

    // 작업 상태 필터
    document.getElementById('taskStatusFilter').addEventListener('change', (e) => {
      this.filterTasks();
    });

    // 통계 내보내기 버튼
    document.getElementById('exportStatsButton').addEventListener('click', () => {
      this.exportStatistics();
    });
  }

  /**
  * 자동 할당 토글
  * @param {boolean} enabled - 자동 할당 활성화 여부
  */
  toggleAutoAssign(enabled) {
    this.autoAssignEnabled = enabled;
    
    // 상태 텍스트 업데이트
    const statusElement = document.getElementById('autoAssignStatus');
    statusElement.textContent = enabled ? '활성화' : '비활성화';
    
    if (enabled) {
      showNotification('자동 할당이 활성화되었습니다. 설정된 간격마다 작업이 자동으로 할당됩니다.', 'success');
      
      // 기존 인터벌 제거
      if (this.autoAssignInterval) {
        clearInterval(this.autoAssignInterval);
      }
      
      // 자동 할당 인터벌 설정
      this.replanInterval = parseInt(document.getElementById('replanInterval').value) || 30;
      this.autoAssignInterval = setInterval(() => {
        if (this.autoAssignEnabled) {
          console.log(`자동 할당 실행 중... (간격: ${this.replanInterval}초)`);
          this.applySchedulingAlgorithm();
        }
      }, this.replanInterval * 1000);
      
      // 즉시 한 번 실행
      this.applySchedulingAlgorithm();
    } else {
      showNotification('자동 할당이 비활성화되었습니다.', 'info');
      
      // 인터벌 제거
      if (this.autoAssignInterval) {
        clearInterval(this.autoAssignInterval);
        this.autoAssignInterval = null;
      }
    }
  }
}

/**
* AGV 상태 텍스트 변환
* @param {string} status - 상태 코드
* @returns {string} 상태 텍스트
*/
function getAgvStatusText(status) {
  const statusMap = {
    'active': '가동 중',
    'idle': '대기 중',
    'charging': '충전 중',
    'maintenance': '점검 중',
    'error': '오류'
  };

  return statusMap[status] || status;
}

/**
* 작업 상태 텍스트 변환
* @param {string} status - 상태 코드
* @returns {string} 상태 텍스트
*/
function getTaskStatusText(status) {
  const statusMap = {
    'pending': '대기 중',
    'in-progress': '진행 중',
    'completed': '완료됨',
    'cancelled': '취소됨',
    'failed': '실패'
  };

  return statusMap[status] || status;
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
* 날짜 포맷팅 함수
* @param {string} dateString - ISO 형식의 날짜 문자열
* @param {string} format - 포맷 형식 (선택사항)
* @returns {string} 포맷된 날짜 문자열
*/
function formatDate(dateString, format = 'YYYY-MM-DD HH:mm') {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  // 날짜가 유효하지 않은 경우
  if (isNaN(date.getTime())) return '-';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  } else if (format === 'HH:mm') {
    return `${hours}:${minutes}`;
  } else {
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}

/**
* API 요청 모의 함수 (실제 구현에서는 실제 API 호출로 대체)
* @param {string} endpoint - API 엔드포인트
* @returns {Promise} 응답 데이터
*/
function apiRequest(endpoint) {
  return new Promise((resolve, reject) => {
    // 모의 응답 데이터
    const mockResponses = {
      '/api/agv/status': {
        status: 'success',
        data: (new TaskScheduler()).generateMockAgvs()
      },
      '/api/tasks': {
        status: 'success',
        data: (new TaskScheduler()).generateMockTasks()
      }
    };

    // 1초 후 응답
    setTimeout(() => {
      const response = mockResponses[endpoint];
      if (response) {
        resolve(response);
      } else {
        reject(new Error('API 엔드포인트를 찾을 수 없습니다.'));
      }
    }, 1000);
  });
}

/**
* 알림 표시 함수
* @param {string} message - 표시할 메시지
* @param {string} type - 알림 유형 (success, info, warning, danger 등)
*/
function showNotification(message, type = 'info') {
  // 실제 구현에서는 토스트 또는 알림 라이브러리 사용
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // 간단한 알림 표시 (실제 구현에서는 교체)
  const alertElement = document.createElement('div');
  alertElement.className = `alert alert-${type} notification-toast`;
  alertElement.textContent = message;
  
  document.body.appendChild(alertElement);
  
  // 3초 후 제거
  setTimeout(() => {
    alertElement.remove();
  }, 3000);
}

/**
* 상태 뱃지 클래스 반환
* @param {string} status - 상태 코드
* @returns {string} 뱃지 클래스
*/
function getStatusBadgeClass(status) {
  switch (status) {
    case 'idle': return 'badge-info';
    case 'active': return 'badge-primary';
    case 'charging': return 'badge-warning';
    case 'maintenance': return 'badge-secondary';
    case 'error': return 'badge-danger';
    case 'pending': return 'badge-secondary';
    case 'in-progress': return 'badge-primary';
    case 'completed': return 'badge-success';
    case 'cancelled': return 'badge-danger';
    case 'failed': return 'badge-danger';
    default: return 'badge-light';
  }
}

// 페이지 로드 시 스케줄러 초기화
document.addEventListener('DOMContentLoaded', () => {
  // CSS 스타일 추가 (모의 차트용)
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .mock-chart {
      display: flex;
      height: 100px;
      background-color: var(--secondary-color);
      border-radius: 5px;
      overflow: hidden;
    }
    .mock-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.8rem;
      font-weight: bold;
      padding: 0 0.5rem;
    }
    .mock-bar:nth-child(1) {
      background-color: var(--info-color);
    }
    .mock-bar:nth-child(2) {
      background-color: var(--primary-color);
    }
    .mock-bar:nth-child(3) {
      background-color: var(--success-color);
    }
    .notification-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 250px;
      padding: 1rem;
      border-radius: 5px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      animation: slideInRight 0.3s, fadeOut 0.5s 2.5s;
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(styleElement);
  
  // 스케줄러 인스턴스 생성
  window.taskScheduler = new TaskScheduler();
}); 