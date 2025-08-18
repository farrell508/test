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
  