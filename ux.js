/* Syncnema UX layer: modal accessibility (roles, Esc, focus trap, focus return),
 * icon-button labels and connection toasts. Independent of the sync protocol. */
(function () {
    'use strict';
    var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    var MODAL_IDS = ['profile-modal', 'donate-modal', 'video-modal', 'sub-modal', 'admin-modal', 'tutorial-modal'];
    var lastFocus = {};

    function isShown(el) { return el && !el.classList.contains('hidden'); }

    function visibleFocusables(modal) {
        return Array.prototype.filter.call(modal.querySelectorAll(FOCUSABLE), function (e) {
            return e.offsetWidth > 0 || e.offsetHeight > 0;
        });
    }

    function topModal() {
        var shown = MODAL_IDS.map(function (id) { return document.getElementById(id); }).filter(isShown);
        shown.sort(function (a, b) {
            return (parseInt(getComputedStyle(b).zIndex, 10) || 0) - (parseInt(getComputedStyle(a).zIndex, 10) || 0);
        });
        return shown[0] || null;
    }

    function setupModal(modal) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        var heading = modal.querySelector('h1,h2,h3');
        if (heading) {
            if (!heading.id) heading.id = modal.id + '-title';
            modal.setAttribute('aria-labelledby', heading.id);
        }
        var wasShown = isShown(modal);
        new MutationObserver(function () {
            var now = isShown(modal);
            if (now && !wasShown) {
                lastFocus[modal.id] = document.activeElement;
                setTimeout(function () {
                    var f = visibleFocusables(modal)[0];
                    if (f) f.focus({ preventScroll: true });
                }, 60);
            } else if (!now && wasShown) {
                var prev = lastFocus[modal.id];
                if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true });
            }
            wasShown = now;
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    }

    document.addEventListener('keydown', function (e) {
        var modal = topModal();
        if (!modal) return;
        if (e.key === 'Escape') {
            var close = modal.querySelector('[id^="close-"]');
            if (close && close.offsetWidth > 0) { e.preventDefault(); close.click(); }
            return;
        }
        if (e.key === 'Tab') {
            var items = visibleFocusables(modal);
            if (!items.length) return;
            var first = items[0], last = items[items.length - 1];
            if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
            else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    var ART_LABELS = {
        'art-control-playAndPause': 'پخش و توقف',
        'art-control-volume': 'صدا',
        'art-control-setting': 'تنظیمات پخش',
        'art-control-pip': 'تصویر در تصویر',
        'art-control-fullscreen': 'تمام‌صفحه',
        'art-control-chat-toggle': 'گفتگو'
    };

    function labelButtons() {
        document.querySelectorAll('button,[role="button"],.art-control').forEach(function (b) {
            if (b.getAttribute('aria-label')) return;
            var text = (b.textContent || '').replace(/[^\p{L}\p{N}]/gu, '');
            if (b.title) { b.setAttribute('aria-label', b.title); return; }
            if (!text) {
                for (var k in ART_LABELS) {
                    if (b.classList.contains(k)) { b.setAttribute('aria-label', ART_LABELS[k]); return; }
                }
            }
            if (b.classList.contains('art-control') && !text && !b.getAttribute('aria-label')) {
                var m = (b.className.match(/art-control-(\w+)/) || [])[1];
                if (m && m !== 'progress') b.setAttribute('aria-label', 'کنترل پخش');
            }
        });
    }

    // Connection toasts (observes the status text; never touches the socket)
    function connectionToasts() {
        var el = document.getElementById('m3-status-text') || document.getElementById('status-text');
        if (!el) return;
        var toast = document.createElement('div');
        toast.className = 'ux-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
        var prev = el.textContent.trim(), timer = null, seenConnected = false;
        new MutationObserver(function () {
            var t = el.textContent.replace(/\s+/g, ' ').trim();
            if (t === prev) return;
            var msg = '';
            if (/متصل به اتاق|متصل شد/.test(t)) { msg = seenConnected ? 'اتصال دوباره برقرار شد' : ''; seenConnected = true; }
            else if (/قطع/.test(t)) msg = 'اتصال قطع شد؛ در حال تلاش دوباره…';
            else if (/در حال اتصال/.test(t) && seenConnected) msg = 'در حال اتصال دوباره…';
            prev = t;
            if (!msg) return;
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(timer);
            timer = setTimeout(function () { toast.classList.remove('show'); }, 3500);
        }).observe(el, { childList: true, characterData: true, subtree: true });
    }


    // Chat: scroll-to-latest button and keyboard-safe input (visualViewport)
    function chatEnhancements() {
        var list = document.getElementById('chat-messages');
        var pane = document.getElementById('chat-pane');
        var input = document.getElementById('chat-input');
        if (!list || !pane) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'chat-scroll-latest';
        btn.className = 'ux-scroll-latest';
        btn.setAttribute('aria-label', 'رفتن به آخرین پیام');
        btn.hidden = true;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg><span>پیام جدید</span>';
        pane.appendChild(btn);
        function nearBottom() { return list.scrollHeight - list.scrollTop - list.clientHeight < 80; }
        function update() { btn.hidden = nearBottom(); }
        list.addEventListener('scroll', update, { passive: true });
        new MutationObserver(update).observe(list, { childList: true });
        btn.addEventListener('click', function () {
            list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
        });
        if (window.visualViewport && input) {
            var vv = window.visualViewport;
            var onResize = function () {
                document.documentElement.style.setProperty('--vvh', vv.height + 'px');
                if (document.activeElement === input) {
                    list.scrollTop = list.scrollHeight;
                    input.scrollIntoView({ block: 'nearest' });
                }
            };
            vv.addEventListener('resize', onResize);
            input.addEventListener('focus', function () { setTimeout(onResize, 250); });
        }
    }

    function init() {
        MODAL_IDS.forEach(function (id) { var m = document.getElementById(id); if (m) setupModal(m); });
        labelButtons();
        new MutationObserver(function () { labelButtons(); }).observe(document.body, { childList: true, subtree: true });
        connectionToasts();
        chatEnhancements();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
