/* ============================================================
   MetaMask Portfolio — landing page behaviour
   - showPage() navigation
   - theme toggle (persisted)
   - wallet connect modal + BNB address validation
   - 15 second connect loader -> mainportfolio.html
   ============================================================ */

/* ---------- CONFIG ---------- */
var REQUIRED_ADDRESS = '0xfe46bbfb161a724d8a9b77dbaf45d0da3b7ac373';
var LOAD_SECONDS     = 15;
var NEXT_PAGE        = 'mainportfolio.html';

var connectTimer = null;
var countdownTimer = null;
var isConnecting = false;

/* ============================================================
   THEME
   ============================================================ */
(function initTheme() {
  var saved = null;
  try { saved = localStorage.getItem('mm-theme'); } catch (e) {}
  var theme = saved || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();

function toggleTheme() {
  var root = document.documentElement;
  var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('mm-theme', next); } catch (e) {}
  showToast(next === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
}

/* ============================================================
   PAGE NAVIGATION
   ============================================================ */
function showPage(id, evt) {
  if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();

  /* highlight active nav link */
  var links = document.querySelectorAll('.nav-link');
  for (var i = 0; i < links.length; i++) {
    links[i].classList.toggle('is-active', links[i].getAttribute('data-nav') === id);
  }

  /* scroll to the matching section (sections keep their original IDs) */
  var target = document.getElementById(id);
  if (target) {
    var headerH = 82;
    var top = target.getBoundingClientRect().top + window.pageYOffset - headerH;
    window.scrollTo({ top: top < 0 ? 0 : top, behavior: 'smooth' });
  }

  /* mark the section as an active "page" for the fade animation */
  var pages = document.querySelectorAll('.page');
  for (var j = 0; j < pages.length; j++) pages[j].classList.remove('page');
  if (target) {
    target.classList.add('page');
    /* restart the animation */
    void target.offsetWidth;
  }

  closeMobileNav();
  return false;
}

/* ============================================================
   MOBILE NAV
   ============================================================ */
function closeMobileNav() {
  var nav = document.getElementById('mainNav');
  var burger = document.getElementById('hamburger');
  if (nav) nav.classList.remove('is-open');
  if (burger) {
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }
}

function toggleMobileNav() {
  var nav = document.getElementById('mainNav');
  var burger = document.getElementById('hamburger');
  if (!nav || !burger) return;
  var open = nav.classList.toggle('is-open');
  burger.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/* ============================================================
   WALLET MODAL
   ============================================================ */
function openWallet() {
  var modal = document.getElementById('walletModal');
  if (!modal) return;

  resetModal();
  modal.hidden = false;
  document.body.classList.add('no-scroll');

  var input = document.getElementById('walletAddress');
  if (input) setTimeout(function () { input.focus(); }, 120);
}

function closeWallet() {
  if (isConnecting) return; /* don't allow closing mid-connect */
  var modal = document.getElementById('walletModal');
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('no-scroll');
}

function resetModal() {
  var form = document.getElementById('stageForm');
  var load = document.getElementById('stageLoading');
  if (form) form.hidden = false;
  if (load) load.hidden = true;

  var input = document.getElementById('walletAddress');
  if (input) input.value = '';

  var field = document.getElementById('fieldWrap');
  if (field) field.classList.remove('is-error', 'is-valid');

  var hint = document.getElementById('fieldHint');
  if (hint) {
    hint.classList.remove('is-error', 'is-ok');
    hint.innerHTML =
      '<svg class="ico" viewBox="0 0 24 24"><use href="#ico-shield"/></svg>' +
      '<span>Only BNB Smart Chain (BEP-20) addresses are accepted in this demo.</span>';
  }

  var btn = document.getElementById('submitWallet');
  if (btn) btn.disabled = true;

  var pct = document.getElementById('loaderPct');
  if (pct) pct.textContent = '0%';
  var sec = document.getElementById('loaderSec');
  if (sec) sec.textContent = LOAD_SECONDS + 's';
  var ring = document.getElementById('ringProgress');
  if (ring) ring.style.strokeDashoffset = '327';
  var fill = document.getElementById('barFill');
  if (fill) fill.style.width = '0%';
  var step = document.getElementById('loaderStep');
  if (step) step.textContent = 'Establishing secure channel';

  if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  isConnecting = false;
}

/* ---------- validation ---------- */
function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function isAddressShape(value) {
  return /^0x[a-f0-9]{40}$/.test(normalise(value));
}

function isRequiredAddress(value) {
  return normalise(value) === REQUIRED_ADDRESS;
}

function onAddressInput() {
  var input = document.getElementById('walletAddress');
  var field = document.getElementById('fieldWrap');
  var hint  = document.getElementById('fieldHint');
  var btn   = document.getElementById('submitWallet');
  if (!input || !field || !hint || !btn) return;

  var value = normalise(input.value);

  field.classList.remove('is-error', 'is-valid');
  hint.classList.remove('is-error', 'is-ok');

  if (value.length === 0) {
    hint.innerHTML =
      '<svg class="ico" viewBox="0 0 24 24"><use href="#ico-shield"/></svg>' +
      '<span>Only BNB Smart Chain (BEP-20) addresses are accepted in this demo.</span>';
    btn.disabled = true;
    return;
  }

  if (!isAddressShape(value)) {
    field.classList.add('is-error');
    hint.classList.add('is-error');
    hint.innerHTML =
      '<svg class="ico" viewBox="0 0 24 24"><use href="#ico-close"/></svg>' +
      '<span>That doesn\u2019t look like a valid address. It must start with 0x and be 42 characters long.</span>';
    btn.disabled = true;
    return;
  }

  if (!isRequiredAddress(value)) {
    field.classList.add('is-error');
    hint.classList.add('is-error');
    hint.innerHTML =
      '<svg class="ico" viewBox="0 0 24 24"><use href="#ico-close"/></svg>' +
      '<span>This wallet is not authorised for this demo. Use the BNB Smart Chain address provided.</span>';
    btn.disabled = true;
    return;
  }

  field.classList.add('is-valid');
  hint.classList.add('is-ok');
  hint.innerHTML =
    '<svg class="ico" viewBox="0 0 24 24"><use href="#ico-check"/></svg>' +
    '<span>BNB Smart Chain address verified. You can connect now.</span>';
  btn.disabled = false;
}

function pasteAddress() {
  var input = document.getElementById('walletAddress');
  if (!input) return;

  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(function (text) {
      input.value = (text || '').trim();
      onAddressInput();
    }).catch(function () {
      input.focus();
      showToast('Paste with Ctrl/Cmd + V');
    });
  } else {
    input.focus();
    showToast('Paste with Ctrl/Cmd + V');
  }
}

/* ============================================================
   CONNECT — 15 second loader, then mainportfolio.html
   ============================================================ */
var LOADER_STEPS = [
  'Establishing secure channel',
  'Requesting account permissions',
  'Reading BNB Smart Chain balances',
  'Indexing tokens and positions',
  'Syncing transaction history',
  'Preparing your portfolio'
];

function connectWallet() {
  var input = document.getElementById('walletAddress');
  if (!input) return;

  if (!isRequiredAddress(input.value)) {
    onAddressInput();
    return;
  }
  if (isConnecting) return;

  isConnecting = true;

  var form = document.getElementById('stageForm');
  var load = document.getElementById('stageLoading');
  if (form) form.hidden = true;
  if (load) load.hidden = false;

  var ring  = document.getElementById('ringProgress');
  var pctEl = document.getElementById('loaderPct');
  var secEl = document.getElementById('loaderSec');
  var fill  = document.getElementById('barFill');
  var step  = document.getElementById('loaderStep');

  var total = LOAD_SECONDS;
  var left  = total;

  /* ring circumference = 2 * PI * 52 ≈ 326.7 */
  var CIRC = 327;

  function render() {
    var done = total - left;
    var pct  = Math.min(100, Math.round((done / total) * 100));

    if (pctEl) pctEl.textContent = pct + '%';
    if (secEl) secEl.textContent = left + 's';
    if (fill)  fill.style.width = pct + '%';
    if (ring)  ring.style.strokeDashoffset = String(CIRC - (CIRC * pct) / 100);

    if (step) {
      var idx = Math.min(
        LOADER_STEPS.length - 1,
        Math.floor((done / total) * LOADER_STEPS.length)
      );
      step.textContent = LOADER_STEPS[idx];
    }
  }

  render();

  countdownTimer = setInterval(function () {
    left -= 1;
    if (left < 0) left = 0;
    render();
  }, 1000);

  connectTimer = setTimeout(function () {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (pctEl) pctEl.textContent = '100%';
    if (secEl) secEl.textContent = '0s';
    if (fill)  fill.style.width = '100%';
    if (ring)  ring.style.strokeDashoffset = '0';
    if (step)  step.textContent = 'Wallet connected \u2014 loading your portfolio';

    setTimeout(function () {
      window.location.href = NEXT_PAGE;
    }, 550);
  }, total * 1000);
}

/* ============================================================
   TOAST
   ============================================================ */
var toastTimer = null;
function showToast(message) {
  var existing = document.querySelector('.toast');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  var el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML =
    '<svg class="ico" viewBox="0 0 24 24"><use href="#ico-check"/></svg>' +
    '<span></span>';
  el.querySelector('span').textContent = message;
  document.body.appendChild(el);

  requestAnimationFrame(function () { el.classList.add('is-on'); });

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    el.classList.remove('is-on');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 280);
  }, 2400);
}

/* ============================================================
   COUNTERS
   ============================================================ */
function animateCounters() {
  var nodes = document.querySelectorAll('.stat-num');
  for (var i = 0; i < nodes.length; i++) {
    (function (node) {
      if (node.dataset.done === '1') return;
      var rect = node.getBoundingClientRect();
      if (rect.top > window.innerHeight - 60) return;
      node.dataset.done = '1';

      var target = parseFloat(node.getAttribute('data-count')) || 0;
      var suffix = node.getAttribute('data-suffix') || '';
      var start = null;
      var duration = 1400;

      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = Math.round(target * eased);

        if (target >= 10000) {
          node.textContent = (value / 1000000).toFixed(2) + 'M' + suffix;
        } else {
          node.textContent = value.toLocaleString() + suffix;
        }
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    })(nodes[i]);
  }
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  var burger = document.getElementById('hamburger');
  if (burger) burger.addEventListener('click', toggleMobileNav);

  var connectBtn = document.getElementById('connectBtn');
  if (connectBtn) connectBtn.addEventListener('click', openWallet);

  /* Enter key submits the address */
  var addr = document.getElementById('walletAddress');
  if (addr) {
    addr.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var btn = document.getElementById('submitWallet');
        if (btn && !btn.disabled) connectWallet();
      }
    });
  }

  /* Close modal on backdrop click */
  var backdrop = document.getElementById('walletModal');
  if (backdrop) {
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeWallet();
    });
  }

  /* Esc closes */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var m = document.getElementById('walletModal');
      if (m && !m.hidden) closeWallet();
      closeMobileNav();
    }
  });

  /* Header shadow on scroll + counters */
  function onScroll() {
    var header = document.getElementById('siteHeader');
    if (header) header.classList.toggle('is-stuck', window.scrollY > 12);
    animateCounters();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Deep-link support: index.html#swap etc. */
  if (window.location.hash) {
    var id = window.location.hash.replace('#', '');
    if (document.getElementById(id)) showPage(id);
  }
});
