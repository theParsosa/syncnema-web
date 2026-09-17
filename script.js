var ytPlayer;
var isYouTubeMode = false;
var isYTReady = false;
var pendingYTId = null;

function onYouTubeIframeAPIReady() {
    isYTReady = true;
    if (pendingYTId && window.initYTSafe) {
        window.initYTSafe(pendingYTId);
        pendingYTId = null;
    }
}

window.addEventListener('load', () => {
    const $ = (id) => document.getElementById(id);
    const randomId = () => Math.random().toString(36).substring(2, 9);
    const formatTime = (s) => {
        if (isNaN(s)) return '--:--';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const videoPlayer = $('my-video');
    const ytContainer = $('youtube-player-container');
    const statusText = $('status-text');
    const connectionDot = $('connection-dot');
    const playbackBadge = $('playback-status-badge');
    const bufferBadge = $('buffer-waiting-badge');
    const bufferText = $('buffer-waiting-text');
    const chatMsgs = $('chat-messages');
    const chatInput = $('chat-input');
    const myIdSpan = $('my-id');
    const editIdBtn = $('edit-id-btn');
    const partnerInput = $('partner-id-input');
    const emojiPicker = document.querySelector('emoji-picker');
    const warningDiv = $('length-warning');
    const subUrlInput = $('sub-url-input');
    const sidebar = $('chat-sidebar');
    const toggleBtn = $('toggle-chat-btn');
    const closeSidebarBtn = $('close-sidebar-btn');
    const toastContainer = $('toast-container');
    const unreadBadge = $('unread-badge');
    const replyPreview = $('reply-preview');
    const cinemaContainer = $('cinema-container');
    const customFsBtn = $('custom-fs-btn');
    const syncToggleBtn = $('sync-toggle-btn');
    const shareRoomBtn = $('share-room-btn');
    const partnerTimeDisplay = $('partner-time-display');
    const reactionArea = $('reaction-area');
    const reactionToggle = $('reaction-toggle-btn');
    const reactionDrawer = $('reaction-drawer');
    const welcomeModal = $('welcome-modal');
    const acceptBtn = $('accept-btn');
    const topBar = $('top-bar');
    const tutorialBtn = $('tutorial-btn');
    const tutorialTooltip = $('tutorial-tooltip');
    const tutorialModal = $('tutorial-modal');
    const donateLinkBtn = $('donate-link-btn');
    const dismissLandscape = $('dismiss-landscape');
    const landscapeWarning = $('landscape-warning');
    const videoUrlInput = $('video-url-input');
    const subOffsetDisplay = $('sub-offset-display');

    let activeVideoBlobUrl = null;
    let activeSubBlobUrls = [];

    function cleanupVideoBlob() {
        if (activeVideoBlobUrl) {
            URL.revokeObjectURL(activeVideoBlobUrl);
            activeVideoBlobUrl = null;
        }
    }

    function cleanupSubBlobs() {
        activeSubBlobUrls.forEach(url => URL.revokeObjectURL(url));
        activeSubBlobUrls = [];
    }

    let hlsInstance = null;

    function destroyHls() {
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }
    }

    function loadHlsStream(url) {
        destroyHls();
        cleanupVideoBlob();

        if (window.Hls && Hls.isSupported()) {
            hlsInstance = new Hls({ enableWorker: true });
            hlsInstance.loadSource(url);
            hlsInstance.attachMedia(videoPlayer);
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                setPlaybackStatus('استریم HLS آماده');
                showToast('✅ استریم HLS بارگذاری شد', true);
                videoPlayer.play().catch(() => { });
            });
            hlsInstance.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hlsInstance.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hlsInstance.recoverMediaError();
                            break;
                        default:
                            destroyHls();
                            break;
                    }
                }
            });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.play().catch(() => { });
            setPlaybackStatus('استریم HLS آماده');
        } else {
            showToast('⚠️ مرورگر شما از پخش استریم HLS پشتیبانی نمی‌کند.', false);
        }
    }

    let subOffset = 0;
    let isLocalBuffering = false;


    let unreadCount = 0;
    let isSidebarOpen = false;
    let isAutoSync = true;
    let lastPartnerState = { playing: false };
    let pendingReactions = [];
    let reactionTimeout;
    let lastInteractionTime = 0;
    let connectionTimeout;
    let ignoreSyncUntil = 0; // NEW: Loop prevention

    // 🔴🔴🔴 آدرس سرور 🔴🔴🔴
    const PARTYKIT_HOST = 'socket.syncnema.ir';

    const urlParams = new URLSearchParams(window.location.search);
    let currentRoomId = urlParams.get('room') || urlParams.get('join') || '';
    if (!currentRoomId) {
        currentRoomId = randomId();
        const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${currentRoomId}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    const getWsUrl = () => `wss://${PARTYKIT_HOST}/party/${encodeURIComponent(currentRoomId)}?_t=${Date.now()}`;

    const DONATE_LINK = 'https://donito.me/parsosa';
    if (donateLinkBtn) donateLinkBtn.href = DONATE_LINK;

    let storedId = localStorage.getItem('syncnema_fixed_id');
    if (!storedId) {
        storedId = randomId();
        localStorage.setItem('syncnema_fixed_id', storedId);
    }

    let ws, myId = storedId, partnerId = '', isSyncing = false;
    let pendingPartnerId = null, connTimeout = null;
    let roomPeers = new Set();
    let partnerDuration = null, hbInterval = null, lastPong = 0;
    let audioCtx, reconnectAttempts = 0, replyingTo = null;

    myIdSpan.textContent = myId;

    // Check if Welcome Modal was previously dismissed
    if (localStorage.getItem('syncnema_welcome_dismissed') === 'true') {
        welcomeModal.classList.add('hidden');
        topBar.classList.remove('blur-sm');
        cinemaContainer.classList.remove('blur-sm');
    }

    // Connect immediately
    connect();

    // Event Listeners for Elements formerly with onclick

    // Modals & Navigation
    $('donate-trigger-btn')?.addEventListener('click', () => $('donate-modal').classList.remove('hidden'));
    $('donate-trigger-btn-mobile')?.addEventListener('click', () => $('donate-modal').classList.remove('hidden'));

    $('video-modal-trigger')?.addEventListener('click', () => $('video-modal').classList.remove('hidden'));
    $('sub-modal-trigger')?.addEventListener('click', () => $('sub-modal').classList.remove('hidden'));

    $('close-donate-modal')?.addEventListener('click', () => $('donate-modal').classList.add('hidden'));
    $('close-video-modal')?.addEventListener('click', () => $('video-modal').classList.add('hidden'));
    $('close-sub-modal')?.addEventListener('click', () => $('sub-modal').classList.add('hidden'));
    $('close-tutorial-modal')?.addEventListener('click', () => $('tutorial-modal').classList.add('hidden'));
    $('tutorial-ok-btn')?.addEventListener('click', () => $('tutorial-modal').classList.add('hidden'));

    acceptBtn.onclick = () => {
        // AUDIO FIX: Init here on user gesture
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        localStorage.setItem('syncnema_welcome_dismissed', 'true');
        welcomeModal.style.opacity = '0';
        topBar.classList.remove('blur-sm');
        cinemaContainer.classList.remove('blur-sm');
        setTimeout(() => {
            welcomeModal.classList.add('hidden');
            if (!localStorage.getItem('syncnema_tutorial_seen')) {
                tutorialTooltip.classList.remove('hidden');
            }
        }, 500);
    };

    dismissLandscape.onclick = () => {
        landscapeWarning.classList.add('hidden-force');
    };

    tutorialBtn.onclick = () => {
        tutorialModal.classList.remove('hidden');
        tutorialTooltip.classList.add('hidden');
        localStorage.setItem('syncnema_tutorial_seen', 'true');
    };

    // Subtitle Offset Adjustment
    function adjustSubOffset(delta) {
        if (delta === 0) {
            applyCueShift(-subOffset);
            subOffset = 0;
        } else {
            subOffset += delta;
            applyCueShift(delta);
        }
        if (subOffsetDisplay) {
            const sign = subOffset > 0 ? '+' : '';
            subOffsetDisplay.textContent = `${sign}${subOffset.toFixed(1)}s`;
        }
        showToast(`⏱️ تاخیر زیرنویس: ${subOffset > 0 ? '+' : ''}${subOffset.toFixed(1)} ثانیه`, true);
    }

    function applyCueShift(delta) {
        const track = videoPlayer.textTracks && videoPlayer.textTracks[0];
        if (!track || !track.cues) return;
        for (let i = 0; i < track.cues.length; i++) {
            const cue = track.cues[i];
            cue.startTime = Math.max(0, cue.startTime + delta);
            cue.endTime = Math.max(0, cue.endTime + delta);
        }
    }

    $('sub-offset-minus')?.addEventListener('click', () => adjustSubOffset(-0.5));
    $('sub-offset-plus')?.addEventListener('click', () => adjustSubOffset(0.5));
    $('sub-offset-reset')?.addEventListener('click', () => adjustSubOffset(0));

    // Share Room Invite Link
    shareRoomBtn?.addEventListener('click', () => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(currentRoomId)}&join=${encodeURIComponent(myId)}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('📋 لینک دعوت به اتاق کپی شد!', true);
            }).catch(() => {
                prompt('لینک اتاق را کپی کنید:', shareUrl);
            });
        } else {
            prompt('لینک اتاق را کپی کنید:', shareUrl);
        }
    });

    editIdBtn.onclick = () => {
        const newId = prompt('شناسه یکتای خود را وارد کنید:', myId);
        if (newId && newId.trim() !== "" && newId !== myId) {
            localStorage.setItem('syncnema_fixed_id', newId.trim());
            window.location.reload();
        }
    };

    window.addEventListener('beforeunload', () => {
        if (roomPeers.size > 0 || partnerId) {
            broadcast({ type: 'disconnect' });
        }
    });

    function toggleSidebar(open) {
        isSidebarOpen = open;
        if (open) {
            sidebar.classList.remove('sidebar-closed');
            unreadCount = 0; unreadBadge.classList.add('hidden');
            setTimeout(() => chatMsgs.scrollTop = chatMsgs.scrollHeight, 300);
        } else sidebar.classList.add('sidebar-closed');
    }
    toggleBtn.onclick = () => toggleSidebar(!isSidebarOpen);
    closeSidebarBtn.onclick = () => toggleSidebar(false);

    function updateSyncUI(auto) {
        isAutoSync = auto;
        if (isAutoSync) {
            syncToggleBtn.innerHTML = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> <span class="hidden md:inline">سینک روشن</span>`;
            syncToggleBtn.classList.remove('opacity-60');
            syncToggleBtn.classList.add('glass-btn-green');
        } else {
            syncToggleBtn.innerHTML = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg> <span class="hidden md:inline">سینک آزاد</span>`;
            syncToggleBtn.classList.remove('glass-btn-green');
            syncToggleBtn.classList.add('opacity-60');
        }
    }
    updateSyncUI(true);

    syncToggleBtn.onclick = () => {
        const newState = !isAutoSync;
        updateSyncUI(newState);
        showToast(newState ? 'همگام‌سازی خودکار فعال شد' : 'حالت آزاد فعال شد', false);
        if (partnerId) {
            sendSync();
            broadcast({ type: 'toggle_sync_mode', auto: newState });
        }
    };

    customFsBtn.onclick = () => {
        if (!document.fullscreenElement) {
            cinemaContainer.requestFullscreen().catch(err => showToast('⚠️ ' + err.message, false));
        } else document.exitFullscreen();
    };
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            customFsBtn.innerHTML = `<svg class="w-5 h-5 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
            customFsBtn.title = 'خروج از تمام صفحه';
        } else {
            customFsBtn.innerHTML = `<svg class="w-5 h-5 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
            customFsBtn.title = 'تمام صفحه';
        }
    });

    // SECURITY & CINEJOY GLASS: Render toasts with SVG badges
    function showToast(text, isMe) {
        if (isMe && !text.startsWith('📋') && !text.startsWith('✅') && !text.startsWith('⏱️') && !text.startsWith('🔇') && !text.startsWith('🔊')) return;
        
        let iconHtml = `<svg class="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        let cleanText = text;
        let borderClass = 'border-cyan-500/40';

        if (text.includes('✅')) {
            iconHtml = `<svg class="w-4 h-4 text-green-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;
            cleanText = text.replace(/✅/g, '').trim();
            borderClass = 'border-green-500/40';
        } else if (text.includes('⚠️')) {
            iconHtml = `<svg class="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
            cleanText = text.replace(/⚠️/g, '').trim();
            borderClass = 'border-amber-500/40';
        } else if (text.includes('❌')) {
            iconHtml = `<svg class="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
            cleanText = text.replace(/❌/g, '').trim();
            borderClass = 'border-red-500/40';
        } else if (text.includes('📋')) {
            iconHtml = `<svg class="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
            cleanText = text.replace(/📋/g, '').trim();
            borderClass = 'border-cyan-500/40';
        } else if (text.includes('⏱️')) {
            iconHtml = `<svg class="w-4 h-4 text-yellow-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
            cleanText = text.replace(/⏱️/g, '').trim();
            borderClass = 'border-yellow-500/40';
        } else if (text.includes('🎬')) {
            iconHtml = `<svg class="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
            cleanText = text.replace(/🎬/g, '').trim();
            borderClass = 'border-cyan-500/40';
        } else if (text.includes('📝')) {
            iconHtml = `<svg class="w-4 h-4 text-yellow-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M7 15h4M15 15h2M7 11h2M13 11h4"></path></svg>`;
            cleanText = text.replace(/📝/g, '').trim();
            borderClass = 'border-yellow-500/40';
        } else if (text.includes('🔊') || text.includes('🔇')) {
            const isMuted = text.includes('🔇');
            iconHtml = isMuted
                ? `<svg class="w-4 h-4 text-slate-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
                : `<svg class="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
            cleanText = text.replace(/[🔊🔇]/g, '').trim();
            borderClass = 'border-cyan-500/40';
        }

        const toast = document.createElement('div');
        toast.className = `toast-msg glass-island ${borderClass} text-slate-200 px-3.5 py-2 rounded-xl text-xs max-w-[280px] break-words shadow-2xl pointer-events-auto flex items-center gap-2 backdrop-blur-xl`;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = cleanText;

        toast.innerHTML = iconHtml;
        toast.appendChild(textSpan);
        toastContainer.appendChild(toast);
        toast.onclick = () => toggleSidebar(true);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 4000);
    }

    function setPlaybackStatus(text) {
        playbackBadge.textContent = text;
        playbackBadge.classList.remove('hidden');
        clearTimeout(playbackBadge.timeout);
        playbackBadge.timeout = setTimeout(() => {
            playbackBadge.classList.add('hidden');
        }, 3000);
    }

    reactionToggle.onclick = (e) => {
        e.stopPropagation();
        if (reactionDrawer.classList.contains('hidden')) {
            reactionDrawer.classList.remove('hidden');
            resetReactionTimer();
        } else {
            reactionDrawer.classList.add('hidden');
            clearTimeout(reactionTimeout);
        }
    };

    function resetReactionTimer() {
        clearTimeout(reactionTimeout);
        reactionTimeout = setTimeout(() => {
            reactionDrawer.classList.add('hidden');
        }, 3000);
    }

    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const emoji = btn.dataset.emoji;
            spawnReaction(emoji);
            if (roomPeers.size > 0 || partnerId) {
                const currentTime = isYouTubeMode && ytPlayer?.getCurrentTime ? ytPlayer.getCurrentTime() : videoPlayer.currentTime;
                broadcast({ type: 'timed_reaction', emoji: emoji, time: currentTime });
            }
            resetReactionTimer();
        };
    });

    document.addEventListener('click', (e) => {
        if (!reactionDrawer.contains(e.target) && e.target !== reactionToggle) {
            reactionDrawer.classList.add('hidden');
        }
    });

    function spawnReaction(emoji) {
        const el = document.createElement('div');
        el.textContent = emoji;
        el.className = 'reaction-anim';
        el.style.left = (Math.random() * 20 + 5) + '%';
        el.style.bottom = '20%';
        reactionArea.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }

    const emojiBtn = $('emoji-btn');
    if (emojiBtn && emojiPicker) {
        emojiBtn.onclick = () => emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
        emojiPicker.addEventListener('emoji-click', e => chatInput.value += e.detail.unicode);
    } else if (emojiBtn) {
        emojiBtn.onclick = () => showToast('⚠️ کتابخانه ایموجی در دسترس نیست', false);
    }

    document.onclick = (e) => {
        if (emojiPicker && !emojiPicker.contains(e.target) && e.target !== emojiBtn && !sidebar.contains(e.target) && e.target !== toggleBtn) {
            emojiPicker.style.display = 'none';
        }
        if (window.innerWidth < 640 && isSidebarOpen && !sidebar.contains(e.target) && e.target !== toggleBtn && !customFsBtn?.contains(e.target)) {
            toggleSidebar(false);
        }
    };

    myIdSpan.onclick = () => {
        navigator.clipboard.writeText(myId);
        const original = myIdSpan.textContent;
        myIdSpan.textContent = "کپی شد!";
        setTimeout(() => myIdSpan.textContent = original, 1500);
    };

    function setStatus(msg, type) {
        statusText.textContent = msg;
        connectionDot.className = 'pulse-dot';
        if (type === 'ok') {
            connectionDot.className = 'pulse-dot st-green';
            statusText.classList.remove('text-cyan-400');
        } else if (type === 'con') {
            connectionDot.className = 'pulse-dot st-blue';
            statusText.classList.add('text-cyan-400');
        } else if (type === 'yellow') {
            connectionDot.className = 'pulse-dot st-yellow';
        } else {
            connectionDot.className = 'pulse-dot st-red';
            statusText.classList.remove('text-cyan-400');
        }
    }

    function switchPlayer(youtube) {
        isYouTubeMode = youtube;
        videoPlayer.style.display = youtube ? 'none' : 'block';
        ytContainer.style.display = youtube ? 'block' : 'none';
        if (youtube) {
            destroyHls();
            videoPlayer.pause();
        } else if (ytPlayer?.pauseVideo) {
            ytPlayer.pauseVideo();
        }
    }

    window.initYTSafe = function (id) {
        if (!isYTReady || typeof YT === 'undefined' || !YT.Player) {
            pendingYTId = id;
            return;
        }

        if (ytPlayer?.destroy) ytPlayer.destroy();
        const host = 'https://www.youtube.com';
        ytPlayer = new YT.Player('youtube-player', {
            height: '100%', width: '100%', videoId: id, host: host,
            playerVars: { 'playsinline': 1, 'controls': 1, 'rel': 0, 'modestbranding': 1, 'origin': window.location.origin, 'widget_referrer': window.location.href, 'iv_load_policy': 3 },
            events: {
                'onReady': () => { setPlaybackStatus('یوتیوب آماده'); sendSync(); },
                'onStateChange': (e) => {
                    if (!isSyncing && Date.now() > ignoreSyncUntil) {
                        if (e.data === 1 || e.data === 2) {
                            sendSync();
                            if (e.data === 1) {
                                broadcast({ type: 'buffering', status: false, fromUser: myId });
                                if (bufferBadge) bufferBadge.classList.add('hidden');
                            }
                        } else if (e.data === 3) {
                            broadcast({ type: 'buffering', status: true, fromUser: myId });
                        }
                    }
                },
                'onPlaybackRateChange': () => {
                    if (!isSyncing && Date.now() > ignoreSyncUntil) sendSync();
                },
                'onError': (e) => {
                    if ([101, 150].includes(e.data)) showToast('⚠️ مالک ویدیو اجازه پخش در سایت دیگر را نداده است.', false);
                }
            }
        });
    };

    function initYT(id) {
        window.initYTSafe(id);
    }

    function connect() {
        setStatus('در حال اتصال...', 'yellow');

        ws = new WebSocket(getWsUrl());
        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'register', id: myId }));
            reconnectAttempts = 0;
            setStatus('متصل به سرور', 'ok');

            const joinParam = urlParams.get('join');
            if (joinParam && joinParam !== myId) {
                partnerInput.value = joinParam;
                partnerId = joinParam;
                roomPeers.add(joinParam);
                setStatus('در حال اتصال...', 'yellow');
                send(joinParam, { type: 'conn_req' });
            } else if (partnerId) {
                setStatus('اتصال مجدد...', 'yellow');
                send(partnerId, { type: 'reconnect_req' });
            }
        };
        ws.onerror = () => {
            console.log('WS Error');
        };
        ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'signal' && msg.from) handleData(msg.data, msg.from);
            } catch (err) { }
        };
        ws.onclose = () => {
            const delay = Math.min(5000, 1000 + (1000 * reconnectAttempts++));
            setStatus(`قطع (${reconnectAttempts})`, 'err');
            if (!partnerId && roomPeers.size === 0) resetState(false);
            setTimeout(connect, delay);
        };
    }

    function send(to, data) {
        if (ws && ws.readyState === WebSocket.OPEN && to) {
            ws.send(JSON.stringify({ type: 'signal', to, data }));
        }
    }

    function broadcast(data) {
        if (roomPeers.size > 0) {
            roomPeers.forEach(peer => send(peer, data));
        } else if (partnerId) {
            send(partnerId, data);
        }
    }

    function sendCurrentMediaState(to) {
        if (isYouTubeMode && ytPlayer?.getVideoData) {
            const vid = ytPlayer.getVideoData().video_id;
            if (vid) send(to, { type: 'load_yt', id: vid });
        } else if (videoPlayer.src && !videoPlayer.src.startsWith('blob:')) {
            send(to, { type: 'load_url', url: videoPlayer.src, isHls: !!hlsInstance });
        }
    }

    function handleData(data, from) {
        const handshakeTypes = ['conn_req', 'conn_ack', 'reconnect_req', 'reconnect_ack'];
        if (from !== partnerId && !roomPeers.has(from) && !handshakeTypes.includes(data.type)) return;

        switch (data.type) {
            case 'conn_req':
                roomPeers.add(from);
                partnerId = from;
                partnerInput.value = from;
                setConnected();
                send(from, { type: 'conn_ack', peers: Array.from(roomPeers) });
                sendCurrentMediaState(from);
                break;
            case 'conn_ack':
                if (connTimeout) {
                    clearTimeout(connTimeout);
                    connTimeout = null;
                }
                pendingPartnerId = null;
                roomPeers.add(from);
                partnerId = from;
                partnerInput.value = from;
                setConnected();
                if (Array.isArray(data.peers)) {
                    data.peers.forEach(peerId => {
                        if (peerId !== myId && !roomPeers.has(peerId)) {
                            roomPeers.add(peerId);
                            send(peerId, { type: 'conn_req' });
                        }
                    });
                }
                broadcast({ type: 'req_src' });
                break;
            case 'reconnect_req':
                roomPeers.add(from);
                partnerId = from;
                send(from, { type: 'reconnect_ack' });
                setConnected();
                break;
            case 'reconnect_ack':
                roomPeers.add(from);
                partnerId = from;
                setConnected();
                break;
            case 'ping':
                send(from, { type: 'pong' });
                break;
            case 'pong':
                lastPong = Date.now();
                break;
            case 'disconnect':
                roomPeers.delete(from);
                showToast(`کاربر (${from.slice(0, 4)}) از اتاق خارج شد`, false);
                if (roomPeers.size === 0) resetState(true);
                else updateConnectedStatus();
                break;
            case 'buffering':
                if (data.status) {
                    if (bufferBadge) {
                        if (bufferText) bufferText.textContent = `منتظر بارگذاری ویدیو (${from.slice(0, 4)})...`;
                        bufferBadge.classList.remove('hidden');
                    }
                    if (!videoPlayer.paused) videoPlayer.pause();
                } else {
                    if (bufferBadge) bufferBadge.classList.add('hidden');
                    if (videoPlayer.paused && isAutoSync) videoPlayer.play().catch(() => { });
                }
                break;
            case 'req_src':
                sendCurrentMediaState(from);
                break;
            case 'load_url':
                switchPlayer(false);
                if (data.isHls || (data.url && data.url.includes('.m3u8'))) {
                    loadHlsStream(data.url);
                } else if (videoPlayer.src !== data.url) {
                    destroyHls();
                    cleanupVideoBlob();
                    videoPlayer.src = data.url;
                }
                setPlaybackStatus('ویدیو سینک شد');
                break;
            case 'load_yt':
                switchPlayer(true);
                initYT(data.id);
                setPlaybackStatus('یوتیوب سینک شد');
                break;
            case 'load_sub':
                subUrlInput.value = data.url;
                processSubtitleUrl(data.url, false);
                break;
            case 'sync_sub_file':
                // Security DoS protection: Ensure content length is bounded
                if (!data.content || typeof data.content !== 'string' || data.content.length > 1024 * 1024) {
                    showToast('⚠️ فایل زیرنویس دریافتی به علت حجم غیرمجاز رد شد', false);
                    return;
                }
                cleanupSubBlobs();
                const blob = new Blob([data.content], { type: 'text/vtt' });
                const blobUrl = URL.createObjectURL(blob);
                activeSubBlobUrls.push(blobUrl);
                addSubTrack(blobUrl, 'Synced Sub');
                setPlaybackStatus('زیرنویس همگام شد');
                showToast(`📝 زیرنویس "${data.name || 'همگام'}" دریافت شد`, false);
                break;
            case 'chat':
                addMsg(data.data, false);
                notify();
                if (!isSidebarOpen) {
                    showToast(data.data.text, false);
                    unreadCount++;
                    unreadBadge.textContent = unreadCount;
                    unreadBadge.classList.remove('hidden');
                }
                break;
            case 'toggle_sync_mode':
                updateSyncUI(data.auto);
                showToast(data.auto ? 'دوست: سینک روشن' : 'دوست: سینک آزاد', false);
                break;
            case 'sync':
                partnerTimeDisplay.textContent = formatTime(data.time);
                if (Date.now() - lastInteractionTime < 500) return;

                if (isAutoSync) syncPlayer(data);
                else if (data.play !== lastPartnerState.playing) showToast(data.play ? 'دوست پخش کرد' : 'دوست متوقف کرد', false);
                lastPartnerState.playing = data.play;
                break;
            case 'timed_reaction':
                pendingReactions.push({ emoji: data.emoji, time: data.time, played: false });
                break;
        }
    }

    function syncPlayer(data) {
        isSyncing = true;
        ignoreSyncUntil = Date.now() + 1000;

        if (data.mode === 'html5' && !isYouTubeMode) {
            partnerDuration = data.dur;
            if (Math.abs(videoPlayer.currentTime - data.time) > 1.5) videoPlayer.currentTime = data.time;
            if (videoPlayer.playbackRate !== data.rate) videoPlayer.playbackRate = data.rate;
            if (data.play && videoPlayer.paused) {
                videoPlayer.play().catch(() => { });
                setPlaybackStatus('پخش');
            } else if (!data.play && !videoPlayer.paused) {
                videoPlayer.pause();
                setPlaybackStatus('توقف');
            }
        } else if (data.mode === 'yt' && isYouTubeMode && ytPlayer?.seekTo) {
            if (Math.abs(ytPlayer.getCurrentTime() - data.time) > 2) ytPlayer.seekTo(data.time, true);
            if (ytPlayer.getPlaybackRate() !== data.rate) ytPlayer.setPlaybackRate(data.rate);
            const st = ytPlayer.getPlayerState();
            if (data.play && st !== 1) {
                ytPlayer.playVideo();
                setPlaybackStatus('پخش');
            } else if (!data.play && st === 1) {
                ytPlayer.pauseVideo();
                setPlaybackStatus('توقف');
            }
        }

        setTimeout(() => isSyncing = false, 1000);
    }

    function sendSync() {
        if (isSyncing || Date.now() < ignoreSyncUntil || (!partnerId && roomPeers.size === 0)) return;

        if (isYouTubeMode && ytPlayer?.getPlayerState) {
            broadcast({ type: 'sync', mode: 'yt', play: ytPlayer.getPlayerState() === 1, time: ytPlayer.getCurrentTime(), rate: ytPlayer.getPlaybackRate() });
        } else if (!isYouTubeMode) {
            broadcast({ type: 'sync', mode: 'html5', play: !videoPlayer.paused, time: videoPlayer.currentTime, dur: videoPlayer.duration, rate: videoPlayer.playbackRate });
        }
    }

    function updateConnectedStatus() {
        const count = roomPeers.size;
        setStatus(count > 1 ? `اتاق (${count} نفر)` : 'متصل به دوست', 'con');
    }

    function setConnected() {
        updateConnectedStatus();
        $('connect-btn').classList.add('hidden');
        $('disconnect-btn').classList.remove('hidden');
        partnerTimeDisplay.classList.remove('hidden');
        localStorage.setItem('syncnema_partner', partnerId);
        startHb();
    }

    function resetState(clearStorage = true) {
        if (connTimeout) {
            clearTimeout(connTimeout);
            connTimeout = null;
        }
        pendingPartnerId = null;
        partnerId = '';
        roomPeers.clear();
        partnerInput.value = '';
        setStatus('قطع شد', 'err');
        $('connect-btn').classList.remove('hidden');
        $('disconnect-btn').classList.add('hidden');
        partnerTimeDisplay.classList.add('hidden');
        if (bufferBadge) bufferBadge.classList.add('hidden');
        if (hbInterval) clearInterval(hbInterval);
        if (clearStorage) localStorage.removeItem('syncnema_partner');

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'unregister', id: myId }));
            ws.send(JSON.stringify({ type: 'register', id: myId }));
        }
    }

    function startHb() {
        if (hbInterval) clearInterval(hbInterval);
        lastPong = Date.now();
        hbInterval = setInterval(() => {
            if (Date.now() - lastPong > 12000) setStatus('ضعیف', 'yellow');
            broadcast({ type: 'ping' });
        }, 5000);
    }

    // Interactive Timestamps in Chat
    function renderMsgWithTimestamps(container, rawText) {
        const timeRegex = /\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/g;
        let lastIdx = 0;
        let match;

        while ((match = timeRegex.exec(rawText)) !== null) {
            if (match.index > lastIdx) {
                container.appendChild(document.createTextNode(rawText.slice(lastIdx, match.index)));
            }

            const h = match[1] ? parseInt(match[1], 10) : 0;
            const m = parseInt(match[2], 10);
            const s = parseInt(match[3], 10);
            const totalSeconds = h * 3600 + m * 60 + s;

            const chip = document.createElement('span');
            chip.className = 'timestamp-chip';
            chip.textContent = match[0];
            chip.title = `پرش به ${match[0]}`;
            chip.onclick = (e) => {
                e.stopPropagation();
                jumpToTime(totalSeconds);
            };
            container.appendChild(chip);
            lastIdx = timeRegex.lastIndex;
        }

        if (lastIdx < rawText.length) {
            container.appendChild(document.createTextNode(rawText.slice(lastIdx)));
        }
    }

    function jumpToTime(seconds) {
        if (isYouTubeMode && ytPlayer?.seekTo) {
            ytPlayer.seekTo(seconds, true);
            setPlaybackStatus(`پرش به ${formatTime(seconds)}`);
            sendSync();
        } else {
            videoPlayer.currentTime = seconds;
            setPlaybackStatus(`پرش به ${formatTime(seconds)}`);
            sendSync();
        }
    }

    function addMsg(data, isMe) {
        const div = document.createElement('div');
        div.className = `p-2.5 rounded-2xl text-sm break-words relative group mb-2.5 border backdrop-blur-md shadow-sm transition-all ${isMe ? 'bg-cyan-500/20 border-cyan-400/30 text-cyan-50 ml-4 rounded-br-sm' : 'bg-white/10 border-white/10 text-slate-100 mr-4 rounded-bl-sm'}`;

        if (data.reply) {
            const r = document.createElement('div');
            r.className = 'bg-black/30 p-1.5 mb-1.5 text-xs rounded-xl border-r-2 border-cyan-400 truncate cursor-pointer opacity-85 backdrop-blur-sm';
            r.textContent = data.reply.txt;
            r.onclick = () => document.getElementById(data.reply.id)?.scrollIntoView({ behavior: 'smooth' });
            div.appendChild(r);
        }

        renderMsgWithTimestamps(div, data.text);
        div.id = data.id;

        const repBtn = document.createElement('button');
        repBtn.innerHTML = '↩️';
        repBtn.className = `absolute -top-2.5 ${isMe ? 'left-1' : 'right-1'} opacity-0 group-hover:opacity-100 text-xs transition-all glass-btn rounded-full w-6 h-6 flex items-center justify-center shadow-lg`;
        repBtn.onclick = () => {
            replyingTo = { id: data.id, txt: data.text };

            // SECURITY FIX: Safe innerHTML usage or DOM methods
            replyPreview.innerHTML = '';
            const spanText = document.createElement('span');
            spanText.textContent = `پاسخ: ${data.text.substr(0, 15)}...`;
            replyPreview.appendChild(spanText);

            const cancelBtn = document.createElement('span');
            cancelBtn.id = 'cancel-reply-btn';
            cancelBtn.className = 'cursor-pointer text-red-400 font-bold px-2';
            cancelBtn.textContent = '×';
            replyPreview.appendChild(cancelBtn);

            replyPreview.classList.remove('hidden');
            $('cancel-reply-btn').onclick = () => { replyingTo = null; replyPreview.classList.add('hidden'); };
            chatInput.focus();
        };
        div.appendChild(repBtn);
        chatMsgs.appendChild(div);
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }

    $('chat-send').onclick = () => {
        const txt = chatInput.value.trim();
        if (!txt) return;
        const msg = { text: txt, id: 'm' + Date.now(), reply: replyingTo };
        addMsg(msg, true);
        broadcast({ type: 'chat', data: msg });
        chatInput.value = ''; replyingTo = null; replyPreview.classList.add('hidden'); chatInput.focus();
    };

    function notify() {
        if (audioCtx && audioCtx.state === 'running') {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.connect(g); g.connect(audioCtx.destination);
            o.frequency.setValueAtTime(1200, audioCtx.currentTime);
            g.gain.setValueAtTime(0.05, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            o.start(); o.stop(audioCtx.currentTime + 0.1);
        }
    }

    function addSubTrack(blobUrl, label) {
        const old = videoPlayer.querySelectorAll('track');
        old.forEach(t => {
            if (t.src && t.src.startsWith('blob:')) {
                URL.revokeObjectURL(t.src);
            }
            t.remove();
        });
        const track = document.createElement('track');
        track.kind = 'subtitles'; track.label = label; track.src = blobUrl; track.default = true;
        videoPlayer.appendChild(track);
        if (videoPlayer.textTracks[0]) videoPlayer.textTracks[0].mode = 'showing';
    }

    async function processSubtitleUrl(url, shouldBroadcast = true) {
        try {
            setPlaybackStatus('دانلود زیرنویس...');
            let response;
            try { response = await fetch(url); } catch (e) { }
            if (!response || !response.ok) response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error('Fail');
            let text = await response.text();
            if (!text.trim().startsWith('WEBVTT')) text = 'WEBVTT\n\n' + text.replace(/\r/g, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').replace(/^\d+\s*$/gm, '');
            cleanupSubBlobs();
            const blobUrl = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
            activeSubBlobUrls.push(blobUrl);
            addSubTrack(blobUrl, 'Link Sub');
            setPlaybackStatus('زیرنویس فعال');

            document.getElementById('sub-modal').classList.add('hidden');
            showToast('✅ زیرنویس با موفقیت اضافه شد', true);

            if (shouldBroadcast) broadcast({ type: 'load_sub', url });
        } catch (err) { setPlaybackStatus('خطا در زیرنویس'); showToast('⚠️ خطا در دریافت زیرنویس', false); }
    }

    $('load-sub-url-btn').onclick = () => { const url = subUrlInput.value.trim(); if (!url) return; processSubtitleUrl(url, true); };
    $('video-file-input').onchange = (e) => {
        const f = e.target.files[0];
        if (f) {
            destroyHls();
            cleanupVideoBlob();
            switchPlayer(false);
            activeVideoBlobUrl = URL.createObjectURL(f);
            videoPlayer.src = activeVideoBlobUrl;
            setPlaybackStatus('فایل لود شد');
            document.getElementById('video-modal').classList.add('hidden');
            showToast(`🎬 فایل ${f.name} بارگذاری شد`, true);
        }
    };
    $('subtitle-file-input').onchange = (e) => {
        const f = e.target.files[0];
        if (f) {
            if (f.size > 1024 * 1024) { showToast('⚠️ فایل زیرنویس نباید بیشتر از ۱ مگابایت باشد.', false); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const buffer = ev.target.result;
                let content = '';
                try {
                    content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
                } catch {
                    try {
                        content = new TextDecoder('windows-1256').decode(buffer);
                    } catch {
                        content = new TextDecoder().decode(buffer);
                    }
                }
                if (f.name.endsWith('.srt') || !content.trim().startsWith('WEBVTT')) {
                    content = 'WEBVTT\n\n' + content.replace(/\r/g, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').replace(/^\d+\s*$/gm, '');
                }
                cleanupSubBlobs();
                const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/vtt;charset=utf-8' }));
                activeSubBlobUrls.push(blobUrl);
                addSubTrack(blobUrl, 'Local Sub');
                setPlaybackStatus('زیرنویس لود شد');

                document.getElementById('sub-modal').classList.add('hidden');
                showToast('✅ فایل زیرنویس بارگذاری شد', true);

                if (roomPeers.size > 0 || partnerId) {
                    broadcast({ type: 'sync_sub_file', content: content, name: f.name });
                    showToast('زیرنویس برای دوستان ارسال شد', false);
                }
            };
            reader.readAsArrayBuffer(f);
        }
    };

    // Load Video URL: Supports YouTube, HLS (.m3u8), and direct files (mp4/mkv/webm)
    $('load-url-btn').onclick = () => {
        const val = videoUrlInput.value.trim();
        if (!val) return;

        document.getElementById('video-modal').classList.add('hidden');

        const ytMatch = val.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);

        if (ytMatch) {
            const videoId = ytMatch[1];
            setPlaybackStatus('پخش یوتیوب');
            showToast('✅ در حال بارگذاری یوتیوب...', true);
            switchPlayer(true);
            initYT(videoId);
            broadcast({ type: 'load_yt', id: videoId });
        } else if (val.includes('.m3u8')) {
            switchPlayer(false);
            loadHlsStream(val);
            broadcast({ type: 'load_url', url: val, isHls: true });
        } else {
            setPlaybackStatus('پخش فایل');
            showToast('✅ لینک مستقیم بارگذاری شد', true);
            switchPlayer(false);
            destroyHls();
            cleanupVideoBlob();
            videoPlayer.src = val;
            videoPlayer.play().catch(e => {
                console.error(e);
                showToast('⚠️ خطا در پخش. مطمئن شوید لینک مستقیم فایل (mp4/mkv/hls) است.', false);
            });
            broadcast({ type: 'load_url', url: val, isHls: false });
        }
    };

    $('connect-btn').onclick = () => {
        const id = partnerInput.value.trim();
        if (id && id !== myId) {
            pendingPartnerId = id;
            setStatus('در حال اتصال...', 'yellow');
            send(id, { type: 'conn_req' });
            if (connTimeout) clearTimeout(connTimeout);
            connTimeout = setTimeout(() => {
                if (pendingPartnerId === id && !roomPeers.has(id)) {
                    pendingPartnerId = null;
                    connTimeout = null;
                    setStatus('قطع شد', 'err');
                    showToast('⚠️ پارتنر پاسخ نداد یا هنوز آنلاین نشده است', false);
                }
            }, 10000);
        }
    };

    $('disconnect-btn').onclick = () => {
        broadcast({ type: 'disconnect' });
        resetState();
    };

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            $('chat-send').click();
        }
    });

    // Keyboard Shortcuts: Space (Play/Pause), Arrows (Seek 5s), F (Fullscreen), M (Mute)
    window.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toUpperCase() : '';
        if (['INPUT', 'TEXTAREA', 'EMOJI-PICKER'].includes(activeTag) || document.activeElement?.isContentEditable) {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            if (isYouTubeMode && ytPlayer?.getPlayerState) {
                const st = ytPlayer.getPlayerState();
                if (st === 1) ytPlayer.pauseVideo();
                else ytPlayer.playVideo();
            } else {
                if (videoPlayer.paused) videoPlayer.play().catch(() => { });
                else videoPlayer.pause();
            }
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            seekRelative(5);
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            seekRelative(-5);
        } else if (e.code === 'KeyF') {
            e.preventDefault();
            customFsBtn.click();
        } else if (e.code === 'KeyM') {
            e.preventDefault();
            videoPlayer.muted = !videoPlayer.muted;
            showToast(videoPlayer.muted ? '🔇 صدا قطع شد' : '🔊 صدا وصل شد', true);
        }
    });

    function seekRelative(delta) {
        if (isYouTubeMode && ytPlayer?.getCurrentTime) {
            const cur = ytPlayer.getCurrentTime();
            ytPlayer.seekTo(Math.max(0, cur + delta), true);
            sendSync();
        } else {
            videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime + delta);
            sendSync();
        }
    }

    // Buffer Lock / Waiting Event Listeners
    videoPlayer.addEventListener('waiting', () => {
        if (!isLocalBuffering && (roomPeers.size > 0 || partnerId)) {
            isLocalBuffering = true;
            broadcast({ type: 'buffering', status: true, fromUser: myId });
        }
    });

    const handleBufferEnd = () => {
        if (isLocalBuffering && (roomPeers.size > 0 || partnerId)) {
            isLocalBuffering = false;
            broadcast({ type: 'buffering', status: false, fromUser: myId });
        }
    };
    videoPlayer.addEventListener('playing', handleBufferEnd);
    videoPlayer.addEventListener('canplay', handleBufferEnd);

    // Watchdog & Periodic Sync loop
    setInterval(() => {
        if (!isYouTubeMode && partnerDuration && Math.abs(videoPlayer.duration - partnerDuration) > 5) {
            warningDiv.classList.remove('hidden');
        } else {
            warningDiv.classList.add('hidden');
        }

        if ((roomPeers.size > 0 || partnerId) && !isSyncing && Date.now() > ignoreSyncUntil) {
            if ((!isYouTubeMode && !videoPlayer.paused) || (isYouTubeMode && ytPlayer?.getPlayerState && ytPlayer.getPlayerState() === 1)) {
                sendSync();
            }
        }
    }, 1000);

    // High precision reaction loop
    setInterval(() => {
        const currentTime = isYouTubeMode && ytPlayer?.getCurrentTime ? ytPlayer.getCurrentTime() : videoPlayer.currentTime;

        pendingReactions.forEach(r => {
            const diff = currentTime - r.time;
            if (!r.played && diff > -1 && diff < 5) {
                spawnReaction(r.emoji);
                r.played = true;
            }
        });

        pendingReactions = pendingReactions.filter(r => !r.played || Math.abs(currentTime - r.time) < 10);
    }, 200);

    const trackInteraction = () => {
        if (Date.now() < ignoreSyncUntil) return;
        lastInteractionTime = Date.now();
        sendSync();
    };

    ['play', 'pause', 'seeked', 'ratechange'].forEach(evt => videoPlayer.addEventListener(evt, trackInteraction));
});
