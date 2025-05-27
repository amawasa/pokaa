document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const slideMenu = document.getElementById('slideMenu');
  const overlay = document.getElementById('overlay');

  // ハンバーガーメニュー開閉
  hamburger.addEventListener('click', () => {
    slideMenu.classList.remove('hide');
    slideMenu.classList.add('show', 'active');
    overlay.classList.add('active');
  });

  overlay.addEventListener('click', () => {
    slideMenu.classList.remove('show');
    slideMenu.classList.add('hide');
    overlay.classList.remove('active');
  });

  // sectionの表示・非表示切り替え
  function showSection(sectionId) {
    const allSections = document.querySelectorAll('main > section');
    allSections.forEach(sec => {
      if (sec.id === sectionId) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    });
  }

  // メニュー内リンク（メニュー閉じあり）
  document.querySelectorAll('#slideMenu a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.getAttribute('href').replace('#', '');
      showSection(target);

      // メニューを閉じる
      slideMenu.classList.remove('show');
      slideMenu.classList.add('hide');
      overlay.classList.remove('active');
    });
  });

  // タイトルロゴクリック（homeへ戻す）
  const titleLink = document.querySelector('a[href="#home"]');
  if (titleLink) {
    titleLink.addEventListener('click', e => {
      e.preventDefault();
      showSection('home');
    });
  }

  // 「map表示」ボタン処理（accessセクション内）
  const tobidasuBtn = document.querySelector('.tobidasu');
  const bbuttonnaiyou = document.querySelector('.bbuttonnaiyou');
  const closeBtn = bbuttonnaiyou?.querySelector('.close-btn');

  if (tobidasuBtn && bbuttonnaiyou && closeBtn) {
    tobidasuBtn.addEventListener('click', () => {
      bbuttonnaiyou.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
      bbuttonnaiyou.classList.remove('show');
    });
  }

  // 初期表示を home に設定
  showSection("home");
});
