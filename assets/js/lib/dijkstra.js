/**
 * dijkstra.js - Dijkstra 알고리즘 구현
 * AGV 맵 에디터에서 최단 경로 계산에 사용
 */

/**
 * Dijkstra 알고리즘 클래스
 */
class DijkstraAlgorithm {
    /**
     * 생성자
     * @param {Array} grid - 2차원 그리드 (맵)
     */
    constructor(grid) {
      this.grid = grid;
      this.rows = grid.length;
      this.cols = grid[0].length;
      this.visitedNodes = [];
      this.distances = {};
      this.previous = {};
    }
  
    /**
     * 특정 셀의 이웃 노드 좌표 반환
     * @param {number} row - 행 인덱스
     * @param {number} col - 열 인덱스
     * @returns {Array} 이웃 노드 좌표 배열 (유효한 이웃만)
     */
    getNeighbors(row, col) {
      const neighbors = [];
      const directions = [
        [-1, 0],  // 상
        [1, 0],   // 하
        [0, -1],  // 좌
        [0, 1]    // 우
      ];
  
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
  
        // 그리드 범위 내에 있는지 확인
        if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
          // 장애물이 아닌 경우만 이웃으로 추가
          if (this.grid[newRow][newCol] !== 1) { // 1은 장애물을 나타내는 값
            neighbors.push([newRow, newCol]);
          }
        }
      }
  
      return neighbors;
    }
  
    /**
     * 두 셀 간의 비용 계산
     * @param {Array} current - 현재 셀 좌표 [row, col]
     * @param {Array} neighbor - 이웃 셀 좌표 [row, col]
     * @returns {number} 이동 비용
     */
    getCost(current, neighbor) {
      const [currentRow, currentCol] = current;
      const [neighborRow, neighborCol] = neighbor;
      
      // 기본 이동 비용
      let cost = 1;
      
      // 셀 유형에 따라 비용 조정 (선택적)
      const cellType = this.grid[neighborRow][neighborCol];
      
      // 셀 유형에 따른 비용 조정
      // 0: 빈 공간, 1: 장애물, 2: 충전소, 3: 작업장, 9: 경로
      switch (cellType) {
        case 0: // 빈 공간
          cost = 1;
          break;
        case 2: // 충전소
          cost = 0.8; // 충전소는 통과 비용 감소 (인센티브)
          break;
        case 3: // 작업장
          cost = 1.2; // 작업장은 약간 비용 증가 (붐비는 구역)
          break;
        case 9: // 이미 경로의 일부
          cost = 0.9; // 기존 경로 재사용 인센티브
          break;
        default:
          cost = 1;
          break;
      }
      
      return cost;
    }
  
    /**
     * 두 셀 간의 거리 계산 (휴리스틱 함수)
     * @param {Array} a - 셀 A의 좌표 [row, col]
     * @param {Array} b - 셀 B의 좌표 [row, col]
     * @returns {number} 맨해튼 거리
     */
    getDistance(a, b) {
      return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    }
  
    /**
     * 최단 경로 계산
     * @param {Array} start - 시작 지점 좌표 [row, col]
     * @param {Array} end - 목표 지점 좌표 [row, col]
     * @returns {Object} 최단 경로 및 알고리즘 과정 정보
     */
    findShortestPath(start, end) {
      const startKey = `${start[0]},${start[1]}`;
      const endKey = `${end[0]},${end[1]}`;
      
      // 시작 또는 종료 지점이 장애물인 경우
      if (this.grid[start[0]][start[1]] === 1 || this.grid[end[0]][end[1]] === 1) {
        return {
          path: null,
          distance: Infinity,
          visitedNodes: [],
          message: "시작 또는 도착 지점이 장애물입니다."
        };
      }
      
      // 시작점과 끝점이 같은 경우
      if (startKey === endKey) {
        return {
          path: [start],
          distance: 0,
          visitedNodes: [start],
          message: "시작점과 도착점이 동일합니다."
        };
      }
      
      // 방문한 노드 추적
      this.visitedNodes = [];
      
      // 각 노드까지의 최단 거리
      this.distances = {};
      
      // 각 노드의 이전 노드 추적
      this.previous = {};
      
      // 모든 노드의 거리를 무한대로 초기화
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const key = `${row},${col}`;
          this.distances[key] = Infinity;
          this.previous[key] = null;
        }
      }
      
      // 시작 노드의 거리는 0
      this.distances[startKey] = 0;
      
      // 미방문 노드 집합
      const unvisited = new Set();
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          if (this.grid[row][col] !== 1) { // 장애물이 아닌 노드만 추가
            unvisited.add(`${row},${col}`);
          }
        }
      }
      
      while (unvisited.size > 0) {
        // 가장 가까운 미방문 노드 찾기
        let currentKey = null;
        let minDistance = Infinity;
        
        for (const key of unvisited) {
          if (this.distances[key] < minDistance) {
            minDistance = this.distances[key];
            currentKey = key;
          }
        }
        
        // 더 이상 접근 가능한 노드가 없는 경우
        if (minDistance === Infinity) {
          break;
        }
        
        // 목적지에 도달한 경우
        if (currentKey === endKey) {
          break;
        }
        
        // 현재 노드 방문 처리
        unvisited.delete(currentKey);
        const [currentRow, currentCol] = currentKey.split(',').map(Number);
        this.visitedNodes.push([currentRow, currentCol]);
        
        // 이웃 노드 탐색
        const neighbors = this.getNeighbors(currentRow, currentCol);
        
        for (const [neighborRow, neighborCol] of neighbors) {
          const neighborKey = `${neighborRow},${neighborCol}`;
          
          // 이미 방문했으면 건너뛰기
          if (!unvisited.has(neighborKey)) continue;
          
          // 현재 노드를 통한 새로운 거리 계산
          const cost = this.getCost([currentRow, currentCol], [neighborRow, neighborCol]);
          const distance = this.distances[currentKey] + cost;
          
          // 더 짧은 경로를 찾았으면 업데이트
          if (distance < this.distances[neighborKey]) {
            this.distances[neighborKey] = distance;
            this.previous[neighborKey] = currentKey;
          }
        }
      }
      
      // 경로 구성
      const path = [];
      let current = endKey;
      
      // 경로가 존재하지 않는 경우
      if (this.distances[endKey] === Infinity) {
        return {
          path: null,
          distance: Infinity,
          visitedNodes: this.visitedNodes,
          message: "경로를 찾을 수 없습니다."
        };
      }
      
      // 경로 역추적
      while (current) {
        const [row, col] = current.split(',').map(Number);
        path.unshift([row, col]);
        current = this.previous[current];
      }
      
      return {
        path,
        distance: this.distances[endKey],
        visitedNodes: this.visitedNodes,
        message: "경로를 찾았습니다."
      };
    }
    
    /**
     * BFS(너비 우선 탐색)로 경로 탐색
     * @param {Array} start - 시작 지점 좌표 [row, col]
     * @param {Array} end - 목표 지점 좌표 [row, col]
     * @returns {Object} 최단 경로 및 알고리즘 과정 정보
     */
    findShortestPathBFS(start, end) {
      const startKey = `${start[0]},${start[1]}`;
      const endKey = `${end[0]},${end[1]}`;
      
      // 시작 또는 종료 지점이 장애물인 경우
      if (this.grid[start[0]][start[1]] === 1 || this.grid[end[0]][end[1]] === 1) {
        return {
          path: null,
          distance: Infinity,
          visitedNodes: [],
          message: "시작 또는 도착 지점이 장애물입니다."
        };
      }
      
      // 시작점과 끝점이 같은 경우
      if (startKey === endKey) {
        return {
          path: [start],
          distance: 0,
          visitedNodes: [start],
          message: "시작점과 도착점이 동일합니다."
        };
      }
      
      // 방문한 노드 추적
      this.visitedNodes = [];
      
      // 각 노드의 이전 노드 추적
      this.previous = {};
      
      // 방문 여부 확인
      const visited = new Set([startKey]);
      
      // BFS 큐
      const queue = [start];
      
      // 시작 노드의 이전 노드는 null
      this.previous[startKey] = null;
      
      while (queue.length > 0) {
        // 큐에서 노드 꺼내기
        const current = queue.shift();
        const [currentRow, currentCol] = current;
        const currentKey = `${currentRow},${currentCol}`;
        
        // 방문한 노드 기록
        this.visitedNodes.push(current);
        
        // 목적지에 도달한 경우
        if (currentKey === endKey) {
          break;
        }
        
        // 이웃 노드 탐색
        const neighbors = this.getNeighbors(currentRow, currentCol);
        
        for (const [neighborRow, neighborCol] of neighbors) {
          const neighborKey = `${neighborRow},${neighborCol}`;
          
          // 이미 방문했으면 건너뛰기
          if (visited.has(neighborKey)) continue;
          
          // 방문 표시
          visited.add(neighborKey);
          
          // 이전 노드 기록
          this.previous[neighborKey] = currentKey;
          
          // 큐에 추가
          queue.push([neighborRow, neighborCol]);
        }
      }
      
      // 경로 구성
      const path = [];
      let current = endKey;
      
      // 경로가 존재하지 않는 경우
      if (!this.previous[endKey]) {
        return {
          path: null,
          distance: Infinity,
          visitedNodes: this.visitedNodes,
          message: "경로를 찾을 수 없습니다."
        };
      }
      
      // 경로 역추적
      while (current) {
        const [row, col] = current.split(',').map(Number);
        path.unshift([row, col]);
        current = this.previous[current];
      }
      
      // 거리 계산 (BFS에서는 단순히 단계 수)
      const distance = path.length - 1;
      
      return {
        path,
        distance,
        visitedNodes: this.visitedNodes,
        message: "경로를 찾았습니다."
      };
    }
    
    /**
     * A* 알고리즘으로 최단 경로 계산
     * @param {Array} start - 시작 지점 좌표 [row, col]
     * @param {Array} end - 목표 지점 좌표 [row, col]
     * @returns {Object} 최단 경로 및 알고리즘 과정 정보
     */
    findShortestPathAStar(start, end) {
      const startKey = `${start[0]},${start[1]}`;
      const endKey = `${end[0]},${end[1]}`;
      
      // 시작 또는 종료 지점이 장애물인 경우
      if (this.grid[start[0]][start[1]] === 1 || this.grid[end[0]][end[1]] === 1) {
        return {
          path: null,
          distance: Infinity,
          visitedNodes: [],
          message: "시작 또는 도착 지점이 장애물입니다."
        };
      }
      
      // 시작점과 끝점이 같은 경우
      if (startKey === endKey) {
        return {
          path: [start],
          distance: 0,
          visitedNodes: [start],
          message: "시작점과 도착점이 동일합니다."
        };
      }
      
      // 방문한 노드 추적
      this.visitedNodes = [];
      
      // 각 노드까지의 최단 거리 (g 점수)
      const gScore = {};
      
      // 각 노드의 예상 총 거리 (f 점수 = g + h)
      const fScore = {};
      
      // 각 노드의 이전 노드 추적
      this.previous = {};
      
      // 모든 노드의 거리를 무한대로 초기화
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const key = `${row},${col}`;
          gScore[key] = Infinity;
          fScore[key] = Infinity;
          this.previous[key] = null;
        }
      }
      
      // 시작 노드의 거리는 0
      gScore[startKey] = 0;
      
      // 시작 노드의 예상 총 거리는 휴리스틱 값
      fScore[startKey] = this.getDistance(start, end);
      
      // 방문할 노드 우선순위 큐 (f 점수 기준)
      const openSet = new Set([startKey]);
      const closedSet = new Set();
      
      while (openSet.size > 0) {
        // f 점수가 가장 낮은 노드 찾기
        let currentKey = null;
        let minFScore = Infinity;
        
        for (const key of openSet) {
          if (fScore[key] < minFScore) {
            minFScore = fScore[key];
            currentKey = key;
          }
        }
        
        // 목적지에 도달한 경우
        if (currentKey === endKey) {
          break;
        }
        
        // 현재 노드 처리
        openSet.delete(currentKey);
        closedSet.add(currentKey);
        
        const [currentRow, currentCol] = currentKey.split(',').map(Number);
        this.visitedNodes.push([currentRow, currentCol]);
        
        // 이웃 노드 탐색
        const neighbors = this.getNeighbors(currentRow, currentCol);
        
        for (const [neighborRow, neighborCol] of neighbors) {
          const neighborKey = `${neighborRow},${neighborCol}`;
          
          // 이미 방문했으면 건너뛰기
          if (closedSet.has(neighborKey)) continue;
          
          // 현재 노드를 통한 새로운 g 점수 계산
          const cost = this.getCost([currentRow, currentCol], [neighborRow, neighborCol]);
          const tentativeGScore = gScore[currentKey] + cost;
          
          // 미방문 노드이거나 더 나은 경로를 찾은 경우
          if (!openSet.has(neighborKey) || tentativeGScore < gScore[neighborKey]) {
            // 경로 업데이트
            this.previous[neighborKey] = currentKey;
            gScore[neighborKey] = tentativeGScore;
            fScore[neighborKey] = tentativeGScore + this.getDistance([neighborRow, neighborCol], end);
            
            // 미방문 노드면 openSet에 추가
            if (!openSet.has(neighborKey)) {
              openSet.add(neighborKey);
            }
          }
        }
      }
      
      // 경로 구성
      const path = [];
      let current = endKey;
      
      // 경로가 존재하지 않는 경우
      if (!this.previous[endKey]) {
        return {
          path: null,
          distance: Infinity,
          visitedNodes: this.visitedNodes,
          message: "경로를 찾을 수 없습니다."
        };
      }
      
      // 경로 역추적
      while (current) {
        const [row, col] = current.split(',').map(Number);
        path.unshift([row, col]);
        current = this.previous[current];
      }
      
      return {
        path,
        distance: gScore[endKey],
        visitedNodes: this.visitedNodes,
        message: "경로를 찾았습니다."
      };
    }
  }
  
  // 모듈로 내보내기
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = DijkstraAlgorithm;
  }