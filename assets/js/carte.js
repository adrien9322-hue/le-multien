(function () {
  'use strict';

  var STORAGE_KEY = 'multien_membre';
  var container = document.getElementById('membreContent');

  function getMembre() {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatDate(iso) {
    var d = new Date(iso);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function generateNumero() {
    return 'LM-' + Date.now().toString(36).toUpperCase();
  }

  function renderCard(membre) {
    container.innerHTML =
      '<div class="membre-card">'
      + '<div class="membre-card-top">'
      +   '<span class="mark">Le Multien</span>'
      +   '<span class="pill' + (membre.type === 'Solidaire' ? ' pill-vert' : '') + '">' + membre.type + '</span>'
      + '</div>'
      + '<div class="membre-card-body">'
      +   '<div class="membre-card-info">'
      +     '<div class="nom">' + membre.prenom + ' ' + membre.nom + '</div>'
      +     '<dl>'
      +       '<dt>N° adhérent</dt><dd>' + membre.numero + '</dd>'
      +       '<dt>Adhésion</dt><dd>' + formatDate(membre.dateAdhesion) + '</dd>'
      +       '<dt>Valable jusqu\'au</dt><dd>' + formatDate(membre.validUntil) + '</dd>'
      +     '</dl>'
      +   '</div>'
      +   '<div class="membre-card-qr" id="qrContainer"></div>'
      + '</div>'
      + '</div>';

    window.QrCreator.render({
      text: JSON.stringify({ n: membre.numero, nom: membre.prenom + ' ' + membre.nom, type: membre.type, valid: membre.validUntil }),
      radius: 0.4,
      ecLevel: 'M',
      fill: '#1C1B18',
      background: '#FFFFFF',
      size: 220
    }, document.getElementById('qrContainer'));
  }

  function renderForm() {
    container.innerHTML =
      '<div class="section-head">'
      + '<h1>Adhérer</h1>'
      + '<p class="intro-text">Parce que le prix ne doit jamais être un frein, l\'adhésion existe en deux versions : standard, et solidaire — sans justificatif.</p>'
      + '</div>'
      + '<div class="grid grid-2">'
      +   '<label class="card text-center" for="adh-type-standard" style="cursor:pointer;">'
      +     '<span class="pill">Standard</span>'
      +     '<div class="prix-grand">20 €<sup>/an</sup></div>'
      +     '<p>Le tarif de référence pour soutenir le lieu.</p>'
      +     '<input type="radio" name="adh-type" id="adh-type-standard" value="Standard" checked>'
      +   '</label>'
      +   '<label class="card text-center" for="adh-type-solidaire" style="cursor:pointer;">'
      +     '<span class="pill pill-vert">Solidaire</span>'
      +     '<div class="prix-grand">5 €<sup>/an</sup></div>'
      +     '<p>Mêmes avantages, sans condition ni justificatif.</p>'
      +     '<input type="radio" name="adh-type" id="adh-type-solidaire" value="Solidaire">'
      +   '</label>'
      + '</div>'
      + '<div class="card mt-2">'
      +   '<h3 style="margin-bottom:1rem;">Les avantages</h3>'
      +   '<div class="chips">'
      +     '<span class="chip">−30 % sur les ateliers</span>'
      +     '<span class="chip">−30 % sur le coworking au mois</span>'
      +     '<span class="chip">Repas solidaire à 5,50 €</span>'
      +     '<span class="chip">Carte de membre dans l\'appli</span>'
      +   '</div>'
      + '</div>'
      + '<form class="form-card mt-2" id="adhererForm">'
      +   '<h3 style="margin-bottom:1.2rem;">Mes informations</h3>'
      +   '<div class="form-group">'
      +     '<label for="adh-prenom">Prénom</label>'
      +     '<input type="text" id="adh-prenom" name="prenom" required>'
      +   '</div>'
      +   '<div class="form-group">'
      +     '<label for="adh-nom">Nom</label>'
      +     '<input type="text" id="adh-nom" name="nom" required>'
      +   '</div>'
      +   '<div class="form-group">'
      +     '<label for="adh-email">E-mail</label>'
      +     '<input type="email" id="adh-email" name="email" required>'
      +   '</div>'
      +   '<button type="submit" class="btn btn-noir btn-bloc">Adhérer et générer ma carte</button>'
      + '</form>';

    document.getElementById('adhererForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var type = document.querySelector('input[name="adh-type"]:checked').value;
      var now = new Date();
      var validUntil = new Date(now);
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      var membre = {
        prenom: document.getElementById('adh-prenom').value.trim(),
        nom: document.getElementById('adh-nom').value.trim(),
        email: document.getElementById('adh-email').value.trim(),
        type: type,
        numero: generateNumero(),
        dateAdhesion: now.toISOString(),
        validUntil: validUntil.toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(membre));
      renderCard(membre);
      window.App.showToast('Bienvenue ! Ta carte de membre est prête.');
    });
  }

  function render() {
    var membre = getMembre();
    if (membre) {
      renderCard(membre);
    } else {
      renderForm();
    }
  }

  render();
})();
