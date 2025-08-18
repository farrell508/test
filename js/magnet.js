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

  /* ===================== 자석 생성 ===================== */
  function createMagnets() {
    const container = document.getElementById('magnetContainer');
    const rows = 6, cols = 5, size = 50, gap = 15;
    let n = 1;

    function getColorClass(num) {
      if (num >= 1 && num <= 5)   return 'color-red';
      if (num >= 6 && num <= 10)  return 'color-orange';
      if (num >= 11 && num <= 16) return 'color-yellow';
      if (num >= 17 && num <= 21) return 'color-green';
      if (num >= 22 && num <= 26) return 'color-blue';
      if (num >= 27 && num <= 31) return 'color-purple';
      return '';
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (n > 31) break;
        if (n === 12) { n++; if (n > 31) break; } // 12번 건너뛰기

        const x = c * (size + gap) + 50;
        const y = r * (size + gap) + 500;
        gridPos[n] = { left: x, top: y };

        // 항상 회색 자리표 생성 (배경)
        createPlaceholder(n);

        const m = document.createElement('div');
        m.className = 'magnet';
        const colorClass = getColorClass(n);
        if (colorClass) m.classList.add(colorClass);

        m.textContent = n;
        m.dataset.number = n;
        m.style.left = x + 'px';
        m.style.top  = y + 'px';

        container.appendChild(m);
        addDragFunctionality(m);
        n++;
      }
    }

    const total = container.querySelectorAll('.magnet:not(.placeholder)').length;
    const tc = document.getElementById('total-count');
    if (tc) tc.textContent = `${total}명`;

    updateMagnetOutline();
  }

  /* ===================== 외곽선 ===================== */
  function ensureMagnetOutline() {
    const container = document.getElementById('magnetContainer');
    let outline = document.getElementById('magnetOutline');
    if (!outline) {
      outline = document.createElement('div');
      outline.id = 'magnetOutline';
      outline.className = 'magnet-outline';
      container.appendChild(outline);
    }
    return outline;
  }

  function updateMagnetOutline() {
    const container = document.getElementById('magnetContainer');
    const outline = ensureMagnetOutline();
    const nodes = container.querySelectorAll('.magnet:not(.attached)');

    if (!nodes.length) {
      outline.style.display = 'none';
      return;
    }

    let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
    nodes.forEach(m => {
      const left = parseFloat(m.style.left) || 0;
      const top  = parseFloat(m.style.top)  || 0;
      const w = m.offsetWidth  || 50;
      const h = m.offsetHeight || 50;
      minL = Math.min(minL, left);
      minT = Math.min(minT, top);
      maxR = Math.max(maxR, left + w);
      maxB = Math.max(maxB, top  + h);
    });

    const pad = 8;
    outline.style.display = 'block';
    outline.style.left   = (minL - pad) + 'px';
    outline.style.top    = (minT - pad) + 'px';
    outline.style.width  = (maxR - minL + pad * 2) + 'px';
    outline.style.height = (maxB - minT + pad * 2) + 'px';
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

    function dragStart(e) {
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
      }

      updateAttendance();
      updateMagnetOutline();
      updateEtcReasonPanel();
      saveState();

      document.querySelectorAll('.board-section').forEach(sec => sec.classList.remove('drag-over'));
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