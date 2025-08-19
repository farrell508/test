    // 게임 FAB 토글 및 메뉴 동작
    (function () {
        const fab = document.getElementById('gameFab');
        const menu = document.getElementById('gameMenu');
        const gomoku = document.getElementById('gomokuItem');
        const speedt = document.getElementById('speedTest');
        const circlet = document.getElementById('circleItem');
        const fireworksBtn = document.getElementById('fireworksItem');
        let menuFireworks = null;
        let fwStopTimer = null;
  
        if (!fab || !menu) return;
  
        function closeMenu() {
          menu.classList.remove('open');
          fab.setAttribute('aria-expanded', 'false');
        }
  
        function toggleMenu(e) {
          e.stopPropagation();
          const isOpen = menu.classList.toggle('open');
          fab.setAttribute('aria-expanded', String(isOpen));
        }
  
        fab.addEventListener('click', toggleMenu);
        document.addEventListener('click', (e) => {
          if (!menu.classList.contains('open')) return;
          const t = e.target;
          if (t === fab || fab.contains(t) || menu.contains(t)) return;
          closeMenu();
        });
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') closeMenu();
        });
  
        if (gomoku) {
          gomoku.addEventListener('click', () => {
            window.location.href = 'gomoku.html';
          });
        }
        if (speedt) {
          speedt.addEventListener('click', () => {
            window.location.href = 'speed.html';
          });
        }
        if (circlet) {
          circlet.addEventListener('click', () => {
            window.location.href = 'circle.html';
          });
        }
        if (fireworksBtn) {
          fireworksBtn.addEventListener('click', () => {
            const container = document.querySelector('.fireworks');
            if (!container || !window.Fireworks) return;
            if (!menuFireworks) menuFireworks = new Fireworks.default(container);
            menuFireworks.start();
            if (fwStopTimer) clearTimeout(fwStopTimer);
            fwStopTimer = setTimeout(() => {
              try {
                if (menuFireworks && typeof menuFireworks.stop === 'function') menuFireworks.stop(true);
              } catch (_) {}
            }, 3500);
            closeMenu();
          });
        }
      })();
  
      $(".analog-clock")
      .on("mousedown touchstart", function () {
        $(".ultraman").show();
      })
      .on("mouseup mouseleave touchend touchcancel", function () {
        $(".ultraman").hide();
      });
  
// 급식 정보 표시 기능
(function () {
    const foodItem = document.getElementById('foodItem');
    if (!foodItem) return;

    foodItem.addEventListener('click', fetchAndShowMeal);

    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async function fetchAndShowMeal() {
        const date = getTodayDateString();
        const url = `https://api.xn--299a1v27nvthhjj.com/meal/${date}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            createMealModal(data);
        } catch (error) {
            console.error('Fetch error:', error);
            alert('급식 정보를 불러오는 데 실패했습니다.');
        }
    }

    function createMealModal(data) {
        // 이전 모달 제거
        const existingModal = document.querySelector('.meal-modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'meal-modal-overlay';

        const content = document.createElement('div');
        content.className = 'meal-modal-content';

        const header = document.createElement('div');
        header.className = 'meal-modal-header';

        const title = document.createElement('h2');
        title.className = 'meal-modal-title';
        title.textContent = `${data.date} 급식 정보`;

        const closeButton = document.createElement('button');
        closeButton.className = 'meal-modal-close';
        closeButton.innerHTML = '&times;';

        const mealGrid = document.createElement('div');
        mealGrid.className = 'meal-grid';

        const breakfastCard = createMealCard('아침', data.breakfast.replaceAll("/", "\n") || '정보 없음');
        const lunchCard = createMealCard('점심', data.lunch.replaceAll("/", "\n") || '정보 없음');
        const dinnerCard = createMealCard('저녁', data.dinner.replaceAll("/", "\n") || '정보 없음');

        mealGrid.append(breakfastCard, lunchCard, dinnerCard);
        header.append(title, closeButton);
        content.append(header, mealGrid);
        overlay.append(content);
        document.body.append(overlay);

        // 애니메이션을 위해 클래스 추가
        setTimeout(() => overlay.classList.add('visible'), 10);

        // 닫기 이벤트
        closeButton.addEventListener('click', () => closeModal(overlay));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
    }

    function createMealCard(title, menu) {
        const card = document.createElement('div');
        card.className = 'meal-card';

        const cardTitle = document.createElement('h3');
        cardTitle.className = 'meal-card-title';
        cardTitle.textContent = title;

        const cardMenu = document.createElement('p');
        cardMenu.className = 'meal-card-menu';
        cardMenu.textContent = menu.replace(/\n/g, '\n');

        card.append(cardTitle, cardMenu);
        return card;
    }

    function closeModal(overlay) {
        overlay.classList.remove('visible');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    }
})();
  