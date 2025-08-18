(function() {
    // --- 공통 설정 및 DOM 요소 ---
    const NEIS_KEY = "da82433f0f3a4351bda4ca9a0f11fc7d";
    const ATPT_OFCDC_SC_CODE = "J10";
    const SD_SCHUL_CODE = "7530560";

    const modal = document.getElementById('infoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalStatus = document.getElementById('modalStatus');
    const closeBtn = document.getElementById('closeInfoModal');
    
    const infoFab = document.getElementById('infoFab');
    const infoMenu = document.getElementById('infoMenu');

    const timetableItem = document.getElementById('timetableItem');
    const timetableContainer = document.getElementById('timetableContainer');
    const timetableGrid = document.getElementById('timetableGrid');

    const lunchItem = document.getElementById('lunchItem');
    const lunchContainer = document.getElementById('lunchContainer');

    // --- 캐시 변수 ---
    let cachedTimetableData = null;
    let cachedLunchData = null;

    // --- 유틸리티 ---
    const fmtYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}${m}${day}`;
    };

    // --- 시간표 관련 함수 ---
    function getMonday(d) {
      const x = new Date(d);
      const day = (x.getDay() + 6) % 7; // Mon=0
      x.setDate(x.getDate() - day);
      x.setHours(0, 0, 0, 0);
      return x;
    }

    function renderTimetable(rows) {
      const days = ["월", "화", "수", "목", "금"];
      const periods = Array.from({ length: 7 }, (_, i) => i + 1);
      const grid = Array.from({ length: 7 }, () => Array(5).fill(""));

      for (const r of rows) {
        const ymd = r.ALL_TI_YMD;
        const perio = Number(r.PERIO);
        const dt = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
        const dow = (dt.getDay() + 6) % 7;
        if (dow >= 5 || perio < 1 || perio > 7) continue;
        const subject = r.ITRT_CNTNT || r.SUBJECT || "";
        const room = r.CLRM_NM ? `<br><small>(${r.CLRM_NM})</small>` : "";
        grid[perio - 1][dow] = subject + room;
      }

      timetableGrid.innerHTML = `
        <thead><tr><th>교시</th>${days.map(d => `<th>${d}</th>`).join("")}</tr></thead>
        <tbody>${periods.map(p => `<tr><th>${p}</th>${grid[p-1].map(txt => `<td>${txt}</td>`).join("")}</tr>`).join("")}</tbody>
      `;
    }

    async function fetchTimetable(weekStartDate) {
      const from = fmtYMD(weekStartDate);
      const to = fmtYMD(new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 4));
      const qs = new URLSearchParams({
        KEY: NEIS_KEY,
        Type: "json",
        pIndex: "1",
        pSize: "1000",
        ATPT_OFCDC_SC_CODE,
        SD_SCHUL_CODE,
        AY: "2025", SEM: "2", GRADE: "1", CLASS_NM: "3",
        TI_FROM_YMD: from,
        TI_TO_YMD: to
      });
      const url = `https://open.neis.go.kr/hub/hisTimetable?${qs.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.RESULT) throw new Error(`${data.RESULT.CODE}: ${data.RESULT.MESSAGE}`);
      return data.hisTimetable?.[1]?.row ?? [];
    }

    async function loadAndShowTimetable() {
      modalTitle.textContent = "주간 시간표 (1-3)";
      lunchContainer.hidden = true;
      timetableContainer.hidden = false;

      if (cachedTimetableData) {
        modalStatus.textContent = "이번 주 시간표 (캐시됨)";
        renderTimetable(cachedTimetableData);
        return;
      }

      try {
        modalStatus.textContent = "시간표를 불러오는 중…";
        timetableGrid.innerHTML = "";
        const monday = getMonday(new Date());
        const rows = await fetchTimetable(monday);
        cachedTimetableData = rows;
        modalStatus.textContent = `이번 주 시간표 (${monday.toLocaleDateString()} ~)`;
        renderTimetable(rows);
      } catch (e) {
        modalStatus.textContent = "시간표 오류: " + e.message;
      }
    }

    // --- 급식 관련 함수 ---
    function renderLunch(data) {
      if (!data || !data.dishesHtml) {
        lunchContainer.innerHTML = "오늘 점심 메뉴 정보가 없습니다.";
        return;
      }
      const menuItems = data.dishesHtml.split('<br/>').map(item => `<li>${item.trim()}</li>`).join('');
      lunchContainer.innerHTML = `
        <ul class="lunch-menu-list">${menuItems}</ul>
        <div class="lunch-calorie">${data.calorie || ''}</div>
      `;
    }

    async function fetchLunch() {
      const ymd = fmtYMD(new Date());
      const qs = new URLSearchParams({
        KEY: NEIS_KEY,
        Type: "json",
        pIndex: "1",
        pSize: "1",
        ATPT_OFCDC_SC_CODE,
        SD_SCHUL_CODE,
        MMEAL_SC_CODE: "2", // 중식
        MLSV_YMD: ymd
      });
      const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?${qs.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.RESULT) {
          if (data.RESULT.CODE === 'INFO-200') return null; // 데이터 없는 경우
          throw new Error(`${data.RESULT.CODE}: ${data.RESULT.MESSAGE}`);
      }
      const row = data.mealServiceDietInfo?.[1]?.row?.[0];
      if (!row) return null;
      return {
          dishesHtml: row.DDISH_NM,
          calorie: row.CAL_INFO
      };
    }

    async function loadAndShowLunch() {
      modalTitle.textContent = "오늘의 점심 메뉴";
      timetableContainer.hidden = true;
      lunchContainer.hidden = false;

      if (cachedLunchData) {
        modalStatus.textContent = "오늘의 점심 (캐시됨)";
        renderLunch(cachedLunchData);
        return;
      }
      
      try {
        modalStatus.textContent = "점심 메뉴를 불러오는 중…";
        lunchContainer.innerHTML = "";
        const lunchData = await fetchLunch();
        cachedLunchData = lunchData;
        modalStatus.textContent = `오늘(${fmtYMD(new Date())})의 점심`;
        renderLunch(lunchData);
      } catch (e) {
        modalStatus.textContent = "급식 정보 오류: " + e.message;
      }
    }

    // --- 공통 이벤트 리스너 ---
    function closeInfoMenu() {
      infoMenu.classList.remove('open');
      infoFab.setAttribute('aria-expanded', 'false');
    }

    infoFab.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = infoMenu.classList.toggle('open');
      infoFab.setAttribute('aria-expanded', String(isOpen));
    });

    timetableItem.addEventListener('click', () => {
      modal.hidden = false;
      loadAndShowTimetable();
      closeInfoMenu();
    });

    lunchItem.addEventListener('click', () => {
      modal.hidden = false;
      loadAndShowLunch();
      closeInfoMenu();
    });

    closeBtn.addEventListener('click', () => { modal.hidden = true; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
    document.addEventListener('click', (e) => {
      if (!infoMenu.classList.contains('open')) return;
      const t = e.target;
      if (t === infoFab || infoFab.contains(t) || infoMenu.contains(t)) return;
      closeInfoMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!modal.hidden) modal.hidden = true;
        else closeInfoMenu();
      }
    });
  })();