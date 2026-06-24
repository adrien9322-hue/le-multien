(function () {
  'use strict';

  var STORAGE_KEY = 'multien_reservations';

  var modal = document.getElementById('modalReservation');
  var qtyValue = document.getElementById('qtyValue');
  var qtyMoins = document.getElementById('qtyMoins');
  var qtyPlus = document.getElementById('qtyPlus');
  var recapTitre = document.getElementById('recapTitre');
  var recapMeta = document.getElementById('recapMeta');
  var recapPrixUnit = document.getElementById('recapPrixUnit');
  var recapTotal = document.getElementById('recapTotal');
  var modalResaTitre = document.getElementById('modalResaTitre');
  var modalResaMeta = document.getElementById('modalResaMeta');
  var confirmBtn = document.getElementById('confirmReservation');

  var current = null;
  var qty = 1;

  function getReservations() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  function saveReservations(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function unitPrice(ev) {
    if (ev.prixlabel === 'Gratuit') return 0;
    // Use the upper bound of "prix libre"/range as the indicative unit price.
    return Number(ev.prixmax) || 0;
  }

  function updateRecap() {
    qtyValue.textContent = qty;
    var unit = unitPrice(current);
    var total = unit * qty;
    recapTitre.textContent = current.titre;
    recapMeta.textContent = current.meta;
    if (current.prixlabel === 'Gratuit') {
      recapPrixUnit.textContent = 'Gratuit';
      recapTotal.textContent = 'Total : gratuit';
    } else if (current.prixlabel === 'Prix libre') {
      recapPrixUnit.textContent = 'Prix libre (indicatif : ' + unit + ' € / place)';
      recapTotal.textContent = 'Total indicatif : ' + total + ' €';
    } else {
      recapPrixUnit.textContent = unit + ' € / place';
      recapTotal.textContent = 'Total : ' + total + ' €';
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-reserver');
    if (!btn) return;

    current = {
      id: btn.dataset.id,
      titre: btn.dataset.titre,
      meta: btn.dataset.meta,
      prixmin: btn.dataset.prixmin,
      prixmax: btn.dataset.prixmax,
      prixlabel: btn.dataset.prixlabel
    };
    qty = 1;

    modalResaTitre.textContent = 'Réserver : ' + current.titre;
    modalResaMeta.textContent = current.meta;
    updateRecap();
    modal.classList.add('open');
  });

  qtyMoins.addEventListener('click', function () {
    if (qty > 1) { qty--; updateRecap(); }
  });

  qtyPlus.addEventListener('click', function () {
    if (qty < 10) { qty++; updateRecap(); }
  });

  function closeModal() {
    modal.classList.remove('open');
  }

  document.getElementById('modalResaClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  function attemptReservation(reservation) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservation)
      }).then(function (r) { return r.json(); });
    }
    return Promise.resolve(
      navigator.onLine
        ? { ok: true }
        : { ok: false, message: 'Connexion requise pour réserver.' }
    );
  }

  confirmBtn.addEventListener('click', function () {
    var unit = unitPrice(current);
    var reservation = {
      id: current.id,
      titre: current.titre,
      meta: current.meta,
      places: qty,
      total: current.prixlabel === 'Gratuit' ? 0 : unit * qty,
      prixlabel: current.prixlabel,
      date: new Date().toISOString()
    };

    confirmBtn.disabled = true;
    attemptReservation(reservation)
      .then(function (res) {
        if (res.ok) {
          var list = getReservations();
          list.push(reservation);
          saveReservations(list);
          renderMesReservations();
          closeModal();
          window.App.showToast('Réservation confirmée pour « ' + current.titre + ' » (' + qty + ' place' + (qty > 1 ? 's' : '') + ').');
        } else {
          window.App.showToast(res.message || 'Connexion requise pour réserver.', true);
        }
      })
      .catch(function () {
        window.App.showToast('Connexion requise pour réserver.', true);
      })
      .finally(function () {
        confirmBtn.disabled = false;
      });
  });

  function renderMesReservations() {
    var section = document.getElementById('mesReservationsSection');
    var container = document.getElementById('mesReservations');
    var list = getReservations();

    if (!list.length) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    container.innerHTML = list.map(function (r, index) {
      var prix = r.prixlabel === 'Gratuit' ? 'Gratuit' : (r.prixlabel === 'Prix libre' ? 'Prix libre' : r.total + ' €');
      return '<div class="resa-item">'
        + '<div>'
        +   '<h4>' + r.titre + '</h4>'
        +   '<p>' + r.meta + ' · ' + r.places + ' place' + (r.places > 1 ? 's' : '') + ' · ' + prix + '</p>'
        + '</div>'
        + '<button class="btn btn-ghost btn-sm" data-cancel="' + index + '">Annuler</button>'
        + '</div>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    var list = getReservations();
    list.splice(Number(btn.dataset.cancel), 1);
    saveReservations(list);
    renderMesReservations();
    window.App.showToast('Réservation annulée.');
  });

  renderMesReservations();
})();
