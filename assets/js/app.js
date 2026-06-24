(function () {
  'use strict';

  /* ============ Navigation ============ */
  var PAGE_ORDER = ['accueil', 'agenda', 'membre', 'acces'];
  var currentPageId = null;

  function showPage(id, anchorId) {
    var nextPage = document.getElementById(id);
    if (!nextPage || id === currentPageId) return;

    var prevPage = currentPageId ? document.getElementById(currentPageId) : null;
    var prevIndex = PAGE_ORDER.indexOf(currentPageId);
    var nextIndex = PAGE_ORDER.indexOf(id);
    var forward = nextIndex > prevIndex;

    document.querySelectorAll('.tab-link').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.page === id);
    });

    if (prevPage) prevPage.classList.remove('active');

    nextPage.classList.remove('slide-from-right', 'slide-from-left');
    void nextPage.offsetWidth;
    nextPage.classList.add('active');

    if (currentPageId !== null) {
      nextPage.classList.add(forward ? 'slide-from-right' : 'slide-from-left');
      nextPage.addEventListener('animationend', function handler() {
        nextPage.removeEventListener('animationend', handler);
        nextPage.classList.remove('slide-from-right', 'slide-from-left');
      });
    }

    currentPageId = id;

    if (anchorId) {
      var target = document.getElementById(anchorId);
      if (target) {
        requestAnimationFrame(function () {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // Event delegation: works for buttons added dynamically after load
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-page]');
    if (btn) showPage(btn.dataset.page, btn.dataset.anchor);
  });

  // Manifest shortcuts: ?page=carte or ?page=agenda&action=reserver
  var params = new URLSearchParams(window.location.search);
  var startPage = params.get('page');
  if (startPage && document.getElementById(startPage)) {
    showPage(startPage);
  } else {
    showPage('accueil');
  }

  window.App = window.App || {};
  window.App.showPage = showPage;

  /* ============ Toast ============ */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function showToast(message, isError) {
    toastEl.textContent = message;
    toastEl.classList.toggle('toast-error', !!isError);
    toastEl.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('visible');
    }, 3200);
  }

  window.App.showToast = showToast;

  /* ============ Offline banner ============ */
  var offlineBanner = document.getElementById('offlineBanner');

  function updateOnlineStatus() {
    offlineBanner.classList.toggle('visible', !navigator.onLine);
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  /* ============ Service worker ============ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function () {});
    });
  }

  /* ============ Install prompt ============ */
  var installBox = document.getElementById('installBox');
  var installBtn = document.getElementById('installBtn');
  var deferredInstallPrompt = null;

  var isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  if (!isStandalone) {
    if (isIOS) {
      installBox.classList.remove('hidden');
      installBtn.textContent = 'Comment installer ?';
      installBtn.addEventListener('click', function () {
        document.getElementById('modalIOS').classList.add('open');
      });
    } else {
      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredInstallPrompt = e;
        installBox.classList.remove('hidden');
      });

      installBtn.addEventListener('click', function () {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.finally(function () {
          deferredInstallPrompt = null;
          installBox.classList.add('hidden');
        });
      });
    }
  }

  window.addEventListener('appinstalled', function () {
    installBox.classList.add('hidden');
    showToast('Le Multien est installé !');
  });

  // iOS instructions modal close
  var modalIOS = document.getElementById('modalIOS');
  document.getElementById('modalIOSClose').addEventListener('click', function () {
    modalIOS.classList.remove('open');
  });
  document.getElementById('modalIOSOk').addEventListener('click', function () {
    modalIOS.classList.remove('open');
  });
  modalIOS.addEventListener('click', function (e) {
    if (e.target === modalIOS) modalIOS.classList.remove('open');
  });

  /* ============ Agenda (stale-while-revalidate via service worker) ============ */
  function renderAgenda(data) {
    var cycleTitre = document.getElementById('cycleTitre');
    var cycleEl = document.getElementById('agendaCycle');
    var recEl = document.getElementById('agendaRecurrents');

    cycleTitre.textContent = 'Cycle ' + data.cycle;

    cycleEl.innerHTML = data.evenements.map(function (ev) {
      var prix = ev.prixLabel ? ev.prixLabel : (ev.prixMin + ' – ' + ev.prixMax + ' €');
      var action = '';
      if (ev.reservable) {
        action = '<button class="btn btn-noir btn-reserver" '
          + 'data-id="' + ev.id + '" '
          + 'data-titre="' + ev.titre + '" '
          + 'data-meta="' + ev.meta + '" '
          + 'data-prixmin="' + (ev.prixMin != null ? ev.prixMin : 0) + '" '
          + 'data-prixmax="' + (ev.prixMax != null ? ev.prixMax : 0) + '" '
          + 'data-prixlabel="' + (ev.prixLabel || '') + '">Réserver</button>';
      }
      return '<div class="event-row">'
        + '<div class="event-date"><span class="day">' + ev.jour + '</span><span class="month">' + ev.mois + '</span></div>'
        + '<div class="event-body">'
        +   '<div class="event-info"><h3>' + ev.titre + '</h3><p class="event-meta">' + ev.meta + '</p></div>'
        +   '<div class="event-actions"><span class="event-price">' + prix + '</span>' + action + '</div>'
        + '</div>'
        + '</div>';
    }).join('');

    recEl.innerHTML = data.recurrents.map(function (r) {
      return '<div class="card">'
        + '<h3>' + r.titre + '</h3>'
        + '<p class="event-meta">' + r.meta + '</p>'
        + '<p>' + r.description + '</p>'
        + '</div>';
    }).join('');
  }

  function renderHomeWidget(data) {
    var el = document.getElementById('homeProchain');
    if (!el) return;
    var next = null;
    for (var i = 0; i < data.evenements.length; i++) {
      if (data.evenements[i].reservable) { next = data.evenements[i]; break; }
    }
    if (!next) next = data.evenements[0];
    if (!next) { el.innerHTML = ''; return; }

    var prix = next.prixLabel ? next.prixLabel : (next.prixMin + ' – ' + next.prixMax + ' €');
    var action = next.reservable
      ? '<button class="btn btn-noir btn-reserver btn-sm"'
          + ' data-id="' + next.id + '"'
          + ' data-titre="' + next.titre + '"'
          + ' data-meta="' + next.meta + '"'
          + ' data-prixmin="' + (next.prixMin != null ? next.prixMin : 0) + '"'
          + ' data-prixmax="' + (next.prixMax != null ? next.prixMax : 0) + '"'
          + ' data-prixlabel="' + (next.prixLabel || '') + '">Réserver</button>'
      : '';

    el.innerHTML =
      '<div class="event-row">'
      + '<div class="event-date"><span class="day">' + next.jour + '</span><span class="month">' + next.mois + '</span></div>'
      + '<div class="event-body">'
      +   '<div class="event-info"><h3>' + next.titre + '</h3><p class="event-meta">' + next.meta + '</p></div>'
      +   '<div class="event-actions"><span class="event-price">' + prix + '</span>' + action + '</div>'
      + '</div>'
      + '</div>';
  }

  function loadAgenda() {
    fetch('data/agenda.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderAgenda(data);
        renderHomeWidget(data);
      })
      .catch(function () {
        document.getElementById('agendaCycle').innerHTML =
          '<p class="intro-text">Impossible de charger l\'agenda pour le moment.</p>';
      });
  }

  loadAgenda();

  // Manifest shortcut "Réserver" -> open agenda + scroll to cycle
  if (startPage === 'agenda' && params.get('action') === 'reserver') {
    requestAnimationFrame(function () {
      var cycle = document.getElementById('agendaCycle');
      if (cycle) cycle.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

})();
