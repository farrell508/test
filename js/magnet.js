  /* ===================== 고정 격자 좌표/자리표 ===================== */
  const gridPos = {};                  // 번호 -> {left, top}
  const placeholders = new Map();      // 번호 -> 자리표 엘리먼트
  var isfired = 0;

  function createPlaceholder(num) {
    if (placeholders.has(num)) return;
    const pos = gridPos[num];
    if (!pos) return;
    const p = document.createElement('div');
    p.className = 'magnet placeholder';
    p.textContent = num;
    p.style.left = pos.left + 'px';
    p.style.top  = pos.top  + 'px';
    p.style.background = 'linear-gradient(135deg,#666,#444)';
    p.style.opacity = '0.5';
    p.style.cursor = 'default';
    p.style.pointerEvents = 'none';
    p.style.boxShadow = 'none';
    document.getElementById('magnetContainer').appendChild(p);
    placeholders.set(num, p);
  }

// ==== 5개 단위 색상 순환 (빨→주→노→초→파→보 → 다시 빨) ====
function getColorClassDynamic(num /*, end */) {
  const bands = ['color-red','color-orange','color-yellow','color-green','color-blue','color-purple'];
  const blockSize = 5;                     // 5개마다 색 변경
  const idx = num % bands.length;
  return bands[idx];
}

// 예) 1~5: red, 6~10: orange, 11~15: yellow, 16~20: green, 21~25: blue, 26~30: purple, 31~35: red...


// ==== 색상 클래스 교체 유틸 ====
function setColorClass(el, cls) {
  el.classList.forEach(k => { if (k.startsWith('color-')) el.classList.remove(k); });
  if (cls) el.classList.add(cls);
}

// ==== 번호 중복 자석 정리(같은 번호가 2개 이상이면 하나만 남기기) ====
function dedupeMagnets() {
  const byNum = new Map();
  document.querySelectorAll('.magnet[data-number]:not(.placeholder)').forEach(el => {
    const num = +el.dataset.number;
    if (!byNum.has(num)) {
      byNum.set(num, el);
    } else {
      const keep = byNum.get(num);
      // 붙어있는 자석(.attached)을 우선 보존
      const keepPref = keep.classList.contains('attached') ? 2 : 1;
      const elPref   = el.classList.contains('attached')   ? 2 : 1;
      if (elPref > keepPref) { keep.remove(); byNum.set(num, el); }
      else { el.remove(); }
    }
  });
}

/**
 * 1..end 생성, skipNumbers 제외
 * - 기존 자석이 있으면 재사용(겹침 방지)
 * - 존재하지 않는 번호는 새로 생성
 * - 더이상 필요 없는 번호(범위 밖/skip)는 삭제
 */
function createMagnets(end = 35, skipNumbers = [7, 12]) {
  const container = document.getElementById('magnetContainer');
  const cols = 5, size = 50, gap = 15;
  const offsetX = 50, offsetY = 500;

  // 0) 중복 제거(한 번호에 하나만 남김)
  dedupeMagnets();

  // 1) 생성 대상 번호 집합
  const allowed = new Set();
  for (let i = 1; i <= end; i++) if (!(skipNumbers||[]).includes(i)) allowed.add(i);

  // 2) 더이상 필요 없는 자석/자리표/좌표 제거
  document.querySelectorAll('.magnet[data-number]:not(.placeholder)').forEach(m => {
    const num = +m.dataset.number;
    if (!allowed.has(num)) {
      m.remove();
    }
  });
  // placeholders, gridPos는 전역이라고 가정
  if (typeof placeholders?.forEach === 'function') {
    placeholders.forEach((p, numStr) => {
      const num = +numStr;
      if (!allowed.has(num)) {
        try { p.remove(); } catch(_) {}
        placeholders.delete(numStr);
      }
    });
  }
  Object.keys(gridPos).forEach(k => {
    if (!allowed.has(+k)) delete gridPos[k];
  });

  // 3) 좌표 계산 + 존재 자석 재배치/생성
  let r = 0, c = 0, cnt = 0;
  for (let n = 1; n <= end; n++) {
    if (!allowed.has(n)) continue;

    const x = c * (size + gap) + offsetX;
    const y = r * (size + gap) + offsetY;
    gridPos[n] = { left: x, top: y };

    // 자리표(placeholder) 생성/이동
    if (!placeholders.has(n)) {
      createPlaceholder(n);
    } else {
      const p = placeholders.get(n);
      p.style.left = x + 'px';
      p.style.top  = y + 'px';
    }

    // 자석이 이미 있으면 재사용, 없으면 생성
    let el = document.querySelector(`.magnet[data-number="${n}"]:not(.placeholder)`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'magnet';
      el.textContent = n;
      el.dataset.number = n;
      container.appendChild(el);
      addDragFunctionality(el);
    }

    // 색상 클래스 최신화
    setColorClass(el, getColorClassDynamic(r));

    // 붙어있지 않은 자석만(그리드에 있는 경우만) 좌표와 부모 보정
    if (!el.classList.contains('attached')) {
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      el.style.transform = 'translate(0,0)';
      if (el.parentElement !== container) container.appendChild(el);
    }

    // 다음 칸
    c++; if (c === cols) { c = 0; r++;}
  }

  // 4) 총원/외곽선 갱신
  const total = document.querySelectorAll('.magnet[data-number]:not(.placeholder)').length;
  const tc = document.getElementById('total-count');
  if (tc) tc.textContent = `${total}명`;
  updateMagnetOutline();
}


  /* ===================== 출결 계산 ===================== */
  function updateAttendance() {
    const total = document.querySelectorAll('.magnet:not(.placeholder)').length;
    const excluded = new Set(['toilet', 'hallway']);

    let absentCount = 0;
    document.querySelectorAll('.board-section').forEach(section => {
      const cat = section.dataset.category;
      const content = section.querySelector('.section-content');
      if (!content) return;

      const n = content.querySelectorAll('.magnet:not(.placeholder)').length;
      if (!excluded.has(cat)) absentCount += n;
    });

    document.getElementById('total-count').textContent   = `${total}명`;
    document.getElementById('absent-count').textContent  = `${absentCount}명`;
    document.getElementById('present-count').textContent = `${total - absentCount}명`;
  }

  /* ===================== 섹션 정렬 & 기타 사유 패널 ===================== */
  function sortSection(contentEl) {
    const mags = Array.from(contentEl.querySelectorAll('.magnet'))
      .sort((a, b) => (+a.dataset.number) - (+b.dataset.number));
    mags.forEach(m => contentEl.appendChild(m));
  }
  function sortAllSections() {
    document.querySelectorAll('.section-content').forEach(sortSection);
  }

  // ✅ 같은 사유끼리 한 줄에: [사유] -> [번호들]로 그룹핑
  // ✅ 기타 사유 패널 렌더링 (배지 색을 자석과 동일하게 동기화)
  function updateEtcReasonPanel() {
    const list = document.getElementById('reasonList');
    if (!list) return;

    const etcContent = document.querySelector('[data-category="etc"] .section-content');
    const items = etcContent ? Array.from(etcContent.querySelectorAll('.magnet')) : [];

    // 그룹핑: reason -> [numbers]
    const groups = new Map();
    items.forEach(m => {
      const num = Number(m.dataset.number);
      const reason = (m.dataset.reason || '(이유 미입력)').trim();
      if (!groups.has(reason)) groups.set(reason, []);
      groups.get(reason).push(num);
    });

    // 정렬: 사유(한글 알파) -> 번호 오름차순
    const collator = new Intl.Collator('ko');
    const entries = Array.from(groups.entries()).sort((a, b) => collator.compare(a[0], b[0]));
    entries.forEach(([_, nums]) => nums.sort((a,b)=>a-b));

    // 렌더링
    list.innerHTML = '';
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.textContent = '현재 등록된 기타 사유가 없습니다.';
      empty.style.opacity = '0.7';
      list.appendChild(empty);
      return;
    }

    entries.forEach(([reason, nums]) => {
      const row = document.createElement('div');
      row.className = 'reason-item';

      const badges = document.createElement('div');
      badges.className = 'badges';

      nums.forEach(n => {
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = n;

        // 🔗 자석 DOM 찾아서 스타일/클래스 동기화
        const mag = document.querySelector(`.magnet[data-number="${n}"]`);
        if (mag) {
          // 1) color-* 클래스 복사
          mag.classList.forEach(cls => {
            if (cls.startsWith('color-')) b.classList.add(cls);
          });

          // 2) 실제 렌더된 스타일 복사
          const cs = getComputedStyle(mag);
          const bgImg = cs.backgroundImage;
          const bgCol = cs.backgroundColor;
          const fgCol = cs.color;

          if (bgImg && bgImg !== 'none') {
            b.style.backgroundImage = bgImg;
            b.style.backgroundColor = 'transparent';
          } else {
            b.style.backgroundImage = 'none';
            b.style.backgroundColor = bgCol;
          }
          b.style.color = fgCol;
        }

        badges.appendChild(b);
      });

      const text = document.createElement('div');
      text.className = 'reason-text';
      text.textContent = reason;

      row.appendChild(badges);
      row.appendChild(text);
      list.appendChild(row);
    });
  }

  /* ===================== 유틸: 원래 자리로 스냅 ===================== */
  function snapToHome(el) {
    const pos = gridPos[+el.dataset.number];
    if (!pos) return;
    el.style.left = pos.left + 'px';
    el.style.top  = pos.top  + 'px';
    el.style.transform = 'translate(0,0)';
  }

  /* ===================== 드래그 ===================== */
  function addDragFunctionality(el) {
    let isDragging = false;
    let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

    let dragFromCategory = 'grid';

    function dragStart(e) {
      if (el.classList.contains('attached')) {
        const sec = el.closest('.board-section');
        dragFromCategory = sec ? sec.dataset.category : 'grid';
      } else {
        dragFromCategory = 'grid';
      }

      if (el.classList.contains('attached')) {
        const rect = el.getBoundingClientRect();
        const container = document.getElementById('magnetContainer');
        const containerRect = container.getBoundingClientRect();

        el.classList.remove('attached');
        container.appendChild(el);

        el.style.left = (rect.left - containerRect.left) + 'px';
        el.style.top  = (rect.top  - containerRect.top)  + 'px';
        el.style.transform = 'translate(0,0)';

        updateAttendance();
        updateMagnetOutline();
        updateEtcReasonPanel();
        saveState();
      }

      if (e.type === "touchstart") {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
      } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
      }

      if (e.target === el) {
        isDragging = true;
        el.classList.add('dragging');
      }
    }

    function drag(e) {
      if (!isDragging) return;
      e.preventDefault();

      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }

      xOffset = currentX;
      yOffset = currentY;

      if (!el.classList.contains('attached')) {
        const container = document.getElementById('magnetContainer');
        const containerRect = container.getBoundingClientRect();

        const curL = parseFloat(el.style.left) || 0;
        const curT = parseFloat(el.style.top)  || 0;

        let newX = curL + currentX;
        let newY = curT + currentY;

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX > containerRect.width  - el.offsetWidth)  newX = containerRect.width  - el.offsetWidth;
        if (newY > containerRect.height - el.offsetHeight) newY = containerRect.height - el.offsetHeight;

        el.style.left = newX + 'px';
        el.style.top  = newY + 'px';
        el.style.transform = 'translate(0,0)';

        if (e.type === "touchmove") {
          initialX = e.touches[0].clientX;
          initialY = e.touches[0].clientY;
        } else {
          initialX = e.clientX;
          initialY = e.clientY;
        }
        xOffset = 0; yOffset = 0;

        updateMagnetOutline();
      } else {
        el.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }

      // 드롭존 하이라이트
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top  + r.height / 2;
      document.querySelectorAll('.board-section').forEach(sec => {
        const sr = sec.getBoundingClientRect();
        if (cx >= sr.left && cx <= sr.right && cy >= sr.top && cy <= sr.bottom) {
          sec.classList.add('drag-over');
        } else {
          sec.classList.remove('drag-over');
        }
      });
    }

    function dragEnd() {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove('dragging');

      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top  + r.height / 2;

      let targetSection = null;
      document.querySelectorAll('.board-section').forEach(sec => {
        const sr = sec.getBoundingClientRect();
        if (cx >= sr.left && cx <= sr.right && cy >= sr.top && cy <= sr.bottom) {
          targetSection = sec;
        }
      });

      let toCategory = 'grid';


      if (targetSection) {
        const content = targetSection.querySelector('.section-content');
        el.classList.add('attached');
        el.style.transform = '';
        el.style.left = '';
        el.style.top  = '';
        content.appendChild(el);

        // 번호순 정렬
        sortSection(content);

        // 기타면 이유 입력(없으면 물어봄), 아니면 이유 제거
        if (targetSection.dataset.category === 'etc') {
          if (!el.dataset.reason) openReasonDialog(el);
        } else {
          if (el.dataset.reason) {
            delete el.dataset.reason;
            el.classList.remove('has-reason');
          }
        }
      } else {
        // 섹션이 아니면 항상 원래 자리로 복귀 + 이유 제거
        snapToHome(el);
        if (el.dataset.reason) {
          delete el.dataset.reason;
          el.classList.remove('has-reason');
        }

        toCategory = 'grid';
      }

      updateAttendance();
      updateMagnetOutline();
      updateEtcReasonPanel();
      saveState();

      document.querySelectorAll('.board-section').forEach(sec => sec.classList.remove('drag-over'));
     
      window.logEvent({
        type: 'move',
        grade: window.CLASS_INFO?.grade || 1,
        klass: window.CLASS_INFO?.klass || 3,
        user:  window.CLASS_INFO?.user  || 'teacher',
        studentNo: Number(el.dataset.number),
        from: dragFromCategory,
        to: toCategory,
        reason: toCategory === 'etc' ? (el.dataset.reason || '') : '',
        clientTime: new Date().toISOString()
      });
    }

    el.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    el.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);
  }

  /* ===================== 이유 모달 ===================== */
  let currentReasonTarget = null;

  function openReasonDialog(target) {
    currentReasonTarget = target;
    const overlay = document.getElementById('reasonOverlay');
    const input = document.getElementById('reasonInput');
    input.value = target.dataset.reason || "";
    overlay.hidden = false;
    setTimeout(() => input.focus(), 0);
  }

  function closeReasonDialog() {
    document.getElementById('reasonOverlay').hidden = true;
    currentReasonTarget = null;
  }

  document.getElementById('reasonSave').addEventListener('click', () => {
    const input = document.getElementById('reasonInput');
    const text = input.value.trim();
    if (currentReasonTarget) {
      if (text) {
        currentReasonTarget.dataset.reason = text;
        currentReasonTarget.classList.add('has-reason');
      } else {
        delete currentReasonTarget.dataset.reason;
        currentReasonTarget.classList.remove('has-reason');
      }
    }
    closeReasonDialog();
    sortAllSections();
    updateEtcReasonPanel();
    saveState();
  });

  document.getElementById('reasonCancel').addEventListener('click', () => {
    closeReasonDialog();
    updateEtcReasonPanel();
  });

  document.getElementById('reasonOverlay').addEventListener('mousedown', (e) => {
    if (e.target.id === 'reasonOverlay') {
      closeReasonDialog();
      updateEtcReasonPanel();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('reasonOverlay').hidden) {
      closeReasonDialog();
      updateEtcReasonPanel();
    }
  });