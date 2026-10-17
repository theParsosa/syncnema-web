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

function initSyncnemaApp() {
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
    let artInstance = null;
    let isProgrammaticSync = false;
    let pendingSeekTime = null;

    function getPlayerCurrentTime() {
        if (isYouTubeMode && ytPlayer?.getCurrentTime) return ytPlayer.getCurrentTime();
        if (artInstance && artInstance.video) return artInstance.video.currentTime || 0;
        return videoPlayer.currentTime || 0;
    }

    function getPlayerIsPlaying() {
        if (isYouTubeMode && ytPlayer?.getPlayerState) return ytPlayer.getPlayerState() === 1;
        if (artInstance && artInstance.video) return !artInstance.video.paused;
        return !videoPlayer.paused;
    }

    function getPlayerPlaybackRate() {
        if (isYouTubeMode && ytPlayer?.getPlaybackRate) return ytPlayer.getPlaybackRate();
        if (artInstance && artInstance.video) return artInstance.video.playbackRate || 1;
        return videoPlayer.playbackRate || 1;
    }

    function getPlayerDuration() {
        if (isYouTubeMode && ytPlayer?.getDuration) return ytPlayer.getDuration();
        if (artInstance && artInstance.video) return artInstance.video.duration || 0;
        return videoPlayer.duration || 0;
    }

    function setPlayerTime(t) {
        if (isYouTubeMode && ytPlayer?.seekTo) {
            ytPlayer.seekTo(t, true);
        } else if (artInstance && artInstance.video) {
            if (artInstance.video.readyState >= 1) {
                artInstance.video.currentTime = t;
            } else {
                pendingSeekTime = t;
            }
        } else {
            if (videoPlayer.readyState >= 1) {
                videoPlayer.currentTime = t;
            } else {
                pendingSeekTime = t;
            }
        }
    }

    function playPlayer() {
        if (isYouTubeMode && ytPlayer?.playVideo) {
            ytPlayer.playVideo();
        } else if (artInstance && artInstance.video) {
            const prom = artInstance.play();
            if (prom && typeof prom.catch === 'function') {
                prom.catch(() => {
                    const vid = artInstance.video;
                    if (vid) {
                        vid.play().catch(() => {
                            if (!vid.muted) {
                                vid.muted = true;
                                vid.play().then(() => {
                                    showToast('🔇 صدا قطع است (مرورگر موبایل). برای وصل صدا لمس کنید.', false);
                                    const unmuteOnClick = () => {
                                        vid.muted = false;
                                        showToast('🔊 صدا وصل شد', true);
                                        window.removeEventListener('click', unmuteOnClick, true);
                                        window.removeEventListener('touchstart', unmuteOnClick, true);
                                    };
                                    window.addEventListener('click', unmuteOnClick, true);
                                    window.addEventListener('touchstart', unmuteOnClick, true);
                                }).catch(() => {});
                            }
                        });
                    }
                });
            }
        } else if (videoPlayer) {
            videoPlayer.play().catch(() => {
                if (!videoPlayer.muted) {
                    videoPlayer.muted = true;
                    videoPlayer.play().catch(() => {});
                }
            });
        }
    }

    function pausePlayer() {
        if (isYouTubeMode && ytPlayer?.pauseVideo) {
            ytPlayer.pauseVideo();
        } else if (artInstance && artInstance.video) {
            artInstance.pause();
            artInstance.video.pause();
        } else {
            videoPlayer.pause();
        }
    }

    function setPlayerPlaybackRate(rate) {
        if (isYouTubeMode && ytPlayer?.setPlaybackRate) {
            ytPlayer.setPlaybackRate(rate);
        } else if (artInstance && artInstance.video) {
            artInstance.video.playbackRate = rate;
        } else {
            videoPlayer.playbackRate = rate;
        }
    }

    function initArtPlayer(url = '') {
        if (typeof Artplayer === 'undefined') return null;
        if (artInstance) {
            if (url) artInstance.switchUrl(url);
            return artInstance;
        }
        const container = $('artplayer-container');
        if (!container) return null;

        try {
            artInstance = new Artplayer({
                container: '#artplayer-container',
                url: url || '',
                theme: '#38bdf8',
                volume: 0.8,
                isLive: false,
                muted: false,
                autoplay: false,
                pip: true,
                autoSize: false,
                autoMini: false,
                screenshot: true,
                setting: true,
                loop: false,
                flip: true,
                playbackRate: true,
                aspectRatio: true,
                fullscreen: true,
                fullscreenWeb: false,
                subtitleOffset: true,
                miniProgressBar: true,
                mutex: true,
                backdrop: true,
                playsInline: true,
                autoPlayback: true,
                airplay: true,
                lang: 'fa',
                moreVideoAttr: {
                    playsinline: true,
                    'webkit-playsinline': true
                },
                fastForward: true,
                lock: true,
                hotkey: true,
                customType: {
                    m3u8: function (video, m3u8Url, art) {
                        if (window.Hls && Hls.isSupported()) {
                            if (art.hls) art.hls.destroy();
                            const hls = new Hls({ enableWorker: true });
                            hls.loadSource(m3u8Url);
                            hls.attachMedia(video);
                            art.hls = hls;
                        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                            video.src = m3u8Url;
                        }
                    }
                }
            });

            artInstance.on('fullscreen', (state) => {
                if (state) {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(() => {});
                    }
                    document.body.classList.add('is-fullscreen-cinema');
                } else {
                    if (screen.orientation && screen.orientation.unlock) {
                        screen.orientation.unlock();
                    }
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('portrait').catch(() => {});
                    }
                    document.body.classList.remove('is-fullscreen-cinema');
                }
            });

            const applyPending = () => {
                if (pendingSeekTime !== null && artInstance && artInstance.video) {
                    const target = pendingSeekTime;
                    pendingSeekTime = null;
                    isProgrammaticSync = true;
                    artInstance.video.currentTime = target;
                    setTimeout(() => { isProgrammaticSync = false; }, 400);
                }
            };
            artInstance.on('video:loadedmetadata', applyPending);
            artInstance.on('video:canplay', applyPending);

            artInstance.on('video:play', () => {
                if (canControlPlayback() && !isProgrammaticSync && Date.now() >= ignoreSyncUntil) {
                    broadcastLiveClock();
                }
            });
            artInstance.on('video:pause', () => {
                if (canControlPlayback() && !isProgrammaticSync && Date.now() >= ignoreSyncUntil) {
                    broadcastLiveClock();
                }
            });
            artInstance.on('video:ratechange', () => {
                if (canControlPlayback() && !isProgrammaticSync && Date.now() >= ignoreSyncUntil) {
                    broadcastLiveClock();
                }
            });
            artInstance.on('seek', (currentTime) => {
                if (isProgrammaticSync || Date.now() < ignoreSyncUntil) return;
                if (canControlPlayback()) {
                    broadcastLiveClock();
                } else if (latestHostClock) {
                    const res = calculateDesync(currentTime, latestHostClock);
                    if (res.isDetached) {
                        isLiveMode = false;
                        updateCatchUpUI(true, res.diff);
                    }
                }
            });

            artInstance.on('video:waiting', () => {
                if (!isLocalBuffering && ws?.readyState === WebSocket.OPEN) {
                    isLocalBuffering = true;
                    broadcast({ type: 'user_presence', time: getPlayerCurrentTime(), isBuffering: true, isLive: isLiveMode });
                }
            });

            const handleArtBufferEnd = () => {
                if (isLocalBuffering && ws?.readyState === WebSocket.OPEN) {
                    isLocalBuffering = false;
                    broadcast({ type: 'user_presence', time: getPlayerCurrentTime(), isBuffering: false, isLive: isLiveMode });
                }
            };
            artInstance.on('video:playing', handleArtBufferEnd);
            artInstance.on('video:canplay', handleArtBufferEnd);

            return artInstance;
        } catch (e) {
            console.warn('Artplayer init error:', e);
            return null;
        }
    }

    function loadVideoSource(url, isHls = false) {
        destroyHls();
        cleanupVideoBlob();

        if (typeof Artplayer !== 'undefined') {
            const art = initArtPlayer(url);
            if (art) {
                const isStream = isHls || (url && url.includes('.m3u8'));
                const type = isStream ? 'm3u8' : undefined;
                if (art.url !== url) {
                    art.switchUrl(url, type).then(() => {
                        art.play().catch(() => {});
                    }).catch(() => {});
                } else {
                    art.play().catch(() => {});
                }
                return;
            }
        }

        if (isHls || (url && url.includes('.m3u8'))) {
            loadHlsStream(url);
        } else {
            videoPlayer.src = url;
            videoPlayer.play().catch(() => {});
        }
    }
    const statusText = $('status-text');
    const connectionDot = $('connection-dot');
    const statusContainer = $('status-container');
    const m3StatusText = $('m3-status-text');
    const m3ConnectionDot = $('m3-connection-dot');
    const m3StatusContainer = $('m3-status-container');
    let statusHideTimer = null;
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
    const chatTopFade = $('chat-top-fade');
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
    const profileModal = $('profile-modal');
    const saveProfileBtn = $('save-profile-btn');
    const closeProfileModalBtn = $('close-profile-modal');
    const profileNameInput = $('profile-name-input');
    const profileAvatarPreview = $('profile-avatar-preview');
    const topBar = $('m3-desktop-header') || $('top-bar');
    const tutorialBtn = $('tutorial-btn');
    const tutorialTooltip = $('tutorial-tooltip');
    const tutorialModal = $('tutorial-modal');
    const donateLinkBtn = $('donate-link-btn');
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
    let currentRoomId = urlParams.get('room') || '';
    let isOriginalCreator = false;
    if (!currentRoomId) {
        currentRoomId = randomId();
        isOriginalCreator = true;
        const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${currentRoomId}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    const hostStorageKey = `syncnema_host_key_${currentRoomId}`;
    let myHostKey = localStorage.getItem(hostStorageKey);
    let isHost = false;

    if (isOriginalCreator && !myHostKey) {
        myHostKey = 'hkey_' + randomId() + randomId();
        localStorage.setItem(hostStorageKey, myHostKey);
        isHost = true;
    } else if (myHostKey) {
        isHost = true;
    }

    const getWsUrl = () => `wss://${PARTYKIT_HOST}/party/${encodeURIComponent(currentRoomId)}?_t=${Date.now()}`;

    const DONATE_LINK = 'https://donito.me/parsosa';
    if (donateLinkBtn) donateLinkBtn.href = DONATE_LINK;

    function getStoredProfile() {
        const raw = localStorage.getItem('syncnema_user_profile');
        if (raw) {
            try { return JSON.parse(raw); } catch (e) {}
        }
        return null;
    }

    let myProfile = getStoredProfile();
    let selectedAvatar = myProfile?.avatar || '🍿';
    let selectedColor = myProfile?.color || '#38bdf8';

    function saveProfile(name, avatar, color) {
        myProfile = {
            id: myProfile?.id || myId,
            name: (name || 'تماشاگر').trim() || 'تماشاگر',
            avatar: avatar || '🍿',
            color: color || '#38bdf8'
        };
        myId = myProfile.id;
        localStorage.setItem('syncnema_user_profile', JSON.stringify(myProfile));
        updateProfileUI();
        return myProfile;
    }

    function updateProfileUI() {
        if (!myProfile) return;
        const avatarEl = $('user-avatar-display');
        const nameEl = $('user-name-display');
        if (avatarEl) avatarEl.textContent = myProfile.avatar;
        if (nameEl) nameEl.textContent = myProfile.name;
        const m3AvatarEl = $('m3-user-avatar');
        if (m3AvatarEl) m3AvatarEl.textContent = myProfile.avatar;
    }

    function openProfileModal() {
        if (myProfile) {
            profileNameInput.value = myProfile.name;
            selectedAvatar = myProfile.avatar;
            selectedColor = myProfile.color;
            closeProfileModalBtn?.classList.remove('hidden');
        } else {
            profileNameInput.value = '';
            closeProfileModalBtn?.classList.add('hidden');
        }
        profileAvatarPreview.textContent = selectedAvatar;
        updateSelectorStyles();
        profileModal.classList.remove('hidden');
        profileModal.style.opacity = '1';
    }

    function updateSelectorStyles() {
        document.querySelectorAll('.avatar-option').forEach(btn => {
            if (btn.dataset.avatar === selectedAvatar) {
                btn.className = 'avatar-option p-2 rounded-xl text-2xl hover:scale-110 active:scale-95 transition-transform border border-cyan-400 bg-cyan-500/20';
            } else {
                btn.className = 'avatar-option p-2 rounded-xl text-2xl hover:scale-110 active:scale-95 transition-transform border border-transparent';
            }
        });
        document.querySelectorAll('.color-option').forEach(btn => {
            if (btn.dataset.color === selectedColor) {
                btn.classList.add('border-white', 'scale-110');
                btn.classList.remove('border-transparent');
            } else {
                btn.classList.remove('border-white', 'scale-110');
                btn.classList.add('border-transparent');
            }
        });
    }

    document.querySelectorAll('.avatar-option').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedAvatar = btn.dataset.avatar;
            profileAvatarPreview.textContent = selectedAvatar;
            updateSelectorStyles();
        });
    });

    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedColor = btn.dataset.color;
            updateSelectorStyles();
        });
    });

    closeProfileModalBtn?.addEventListener('click', () => {
        profileModal.classList.add('hidden');
    });

    let ws, myId = myProfile?.id || randomId(), isSyncing = false;
    let partnerId = '', partnerDuration = null;
    let roomPeers = new Set();
    let audioCtx, reconnectAttempts = 0, replyingTo = null;

    if (myProfile) {
        myId = myProfile.id;
        updateProfileUI();
        profileModal.classList.add('hidden');
        topBar.classList.remove('blur-sm');
        cinemaContainer.classList.remove('blur-sm');
    } else {
        openProfileModal();
        topBar.classList.add('blur-sm');
        cinemaContainer.classList.add('blur-sm');
    }

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

    saveProfileBtn.onclick = () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const name = profileNameInput.value.trim() || 'تماشاگر';
        saveProfile(name, selectedAvatar, selectedColor);

        profileModal.style.opacity = '0';
        topBar.classList.remove('blur-sm');
        cinemaContainer.classList.remove('blur-sm');
        setTimeout(() => {
            profileModal.classList.add('hidden');
            if (!localStorage.getItem('syncnema_tutorial_seen')) {
                tutorialTooltip.classList.remove('hidden');
            }
        }, 500);

        if (ws && ws.readyState === WebSocket.OPEN) {
            broadcast({ type: 'profile_update', user: myProfile });
        }
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
            if (artInstance) artInstance.subtitleOffset = 0;
        } else {
            subOffset += delta;
            applyCueShift(delta);
            if (artInstance) artInstance.subtitleOffset = subOffset;
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
        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(currentRoomId)}`;
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

    if (editIdBtn) {
        editIdBtn.onclick = () => {
            const newId = prompt('شناسه یکتای خود را وارد کنید:', myId);
            if (newId && newId.trim() !== "" && newId !== myId) {
                localStorage.setItem('syncnema_fixed_id', newId.trim());
                window.location.reload();
            }
        };
    }

    // Top Bar Island 3 Triggers & Admin Modal
    const adminModal = $('admin-modal');
    const adminPanelTrigger = $('admin-panel-trigger');
    const closeAdminModal = $('close-admin-modal');
    const userProfileBtn = $('user-profile-btn');
    const spectatorsTriggerBtn = $('spectators-trigger-btn');

    userProfileBtn?.addEventListener('click', () => {
        openProfileModal();
    });

    spectatorsTriggerBtn?.addEventListener('click', () => {
        toggleSidebar(true);
        if (typeof switchChatDrawerTab === 'function') {
            switchChatDrawerTab('spectators');
        }
    });

    adminPanelTrigger?.addEventListener('click', () => {
        if (!isHost) {
            showToast('⚠️ فقط میزبان اتاق به این پنل دسترسی دارد', false);
            return;
        }
        updateAdminModalUI();
        adminModal?.classList.remove('hidden');
    });

    closeAdminModal?.addEventListener('click', () => {
        adminModal?.classList.add('hidden');
    });

    // Admin Control Actions
    const modeCinemaBtn = $('admin-mode-cinema');
    const modeOpenBtn = $('admin-mode-open');

    function updateAdminModalUI() {
        if (currentRoomState.mode === 'open') {
            modeOpenBtn?.classList.add('border-amber-400', 'bg-amber-500/20', 'text-amber-200');
            modeOpenBtn?.classList.remove('border-transparent', 'text-slate-300');
            modeCinemaBtn?.classList.remove('border-amber-400', 'bg-amber-500/20', 'text-amber-200');
            modeCinemaBtn?.classList.add('border-transparent', 'text-slate-300');
        } else {
            modeCinemaBtn?.classList.add('border-amber-400', 'bg-amber-500/20', 'text-amber-200');
            modeCinemaBtn?.classList.remove('border-transparent', 'text-slate-300');
            modeOpenBtn?.classList.remove('border-amber-400', 'bg-amber-500/20', 'text-amber-200');
            modeOpenBtn?.classList.add('border-transparent', 'text-slate-300');
        }

        const lockBtn = $('admin-lock-toggle-btn');
        if (lockBtn) {
            if (currentRoomState.isLocked) {
                lockBtn.innerHTML = '<span>🔒 قفل است</span>';
                lockBtn.className = 'glass-btn px-4 py-2 rounded-xl text-xs font-bold border border-red-500/50 bg-red-500/20 text-red-200';
            } else {
                lockBtn.innerHTML = '<span>🔓 باز است</span>';
                lockBtn.className = 'glass-btn px-4 py-2 rounded-xl text-xs font-bold border border-white/20 text-slate-300';
            }
        }
    }

    modeCinemaBtn?.addEventListener('click', () => {
        if (!isHost) return;
        currentRoomState.mode = 'cinema';
        broadcast({ type: 'admin_action', action: 'mode_change', mode: 'cinema' });
        updateAdminModalUI();
        showToast('🎬 حالت سینما فعال شد (فقط شما کنترل می‌کنید)', true);
    });

    modeOpenBtn?.addEventListener('click', () => {
        if (!isHost) return;
        currentRoomState.mode = 'open';
        broadcast({ type: 'admin_action', action: 'mode_change', mode: 'open' });
        updateAdminModalUI();
        showToast('🔓 حالت آزاد فعال شد (همه دسترسی دارند)', true);
    });

    $('admin-force-sync-btn')?.addEventListener('click', () => {
        if (!isHost) return;
        const clock = {
            time: getPlayerCurrentTime(),
            playing: getPlayerIsPlaying(),
            rate: getPlayerPlaybackRate(),
            timestamp: Date.now()
        };
        currentRoomState.liveClock = clock;
        broadcast({ type: 'force_sync', clock });
        showToast('🔴 هماهنگ‌سازی اجباری برای همه ارسال شد', true);
    });

    $('admin-lock-toggle-btn')?.addEventListener('click', () => {
        if (!isHost) return;
        const newLocked = !currentRoomState.isLocked;
        currentRoomState.isLocked = newLocked;
        broadcast({ type: 'admin_action', action: 'lock_change', locked: newLocked });
        updateAdminModalUI();
        showToast(newLocked ? '🔒 اتاق قفل شد' : '🔓 قفل اتاق برداشته شد', true);
    });

    // Mobile M3 Bottom Bar & Top Chip Event Handlers
    $('m3-media-btn')?.addEventListener('click', () => {
        $('video-modal')?.classList.remove('hidden');
    });
    $('m3-spectators-btn')?.addEventListener('click', () => {
        toggleSidebar(true);
        if (typeof switchChatDrawerTab === 'function') {
            switchChatDrawerTab('spectators');
        }
    });
    $('m3-chat-fab')?.addEventListener('click', () => {
        toggleSidebar(!isSidebarOpen);
    });
    $('m3-admin-btn')?.addEventListener('click', () => {
        if (!isHost) {
            showToast('⚠️ فقط میزبان اتاق به این پنل دسترسی دارد', false);
            return;
        }
        updateAdminModalUI();
        adminModal?.classList.remove('hidden');
    });
    $('m3-fs-btn')?.addEventListener('click', () => {
        customFsBtn?.click();
    });
    $('m3-share-btn')?.addEventListener('click', () => {
        shareRoomBtn?.click();
    });
    $('m3-profile-trigger')?.addEventListener('click', () => {
        openProfileModal();
    });

    // Mobile M3 Dock Event Handlers
    $('m3-dock-video')?.addEventListener('click', () => {
        $('video-modal')?.classList.remove('hidden');
    });
    $('m3-dock-sub')?.addEventListener('click', () => {
        $('sub-modal')?.classList.remove('hidden');
    });
    $('m3-dock-spectators')?.addEventListener('click', () => {
        toggleSidebar(true);
        if (typeof switchChatDrawerTab === 'function') {
            switchChatDrawerTab('spectators');
        }
    });
    $('m3-dock-admin')?.addEventListener('click', () => {
        if (!isHost) {
            showToast('⚠️ فقط میزبان اتاق به این پنل دسترسی دارد', false);
            return;
        }
        updateAdminModalUI();
        $('admin-modal')?.classList.remove('hidden');
    });
    $('m3-dock-fs')?.addEventListener('click', () => {
        customFsBtn?.click();
    });

    // Auto-reveal controls on interaction in landscape mode
    let controlsTimer = null;
    function revealControlsTemporarily() {
        document.body.classList.add('show-controls');
        if (controlsTimer) clearTimeout(controlsTimer);
        controlsTimer = setTimeout(() => {
            document.body.classList.remove('show-controls');
        }, 3500);
    }
    window.addEventListener('touchstart', revealControlsTemporarily, { passive: true });
    window.addEventListener('mousemove', revealControlsTemporarily, { passive: true });

    window.addEventListener('beforeunload', () => {
        if (roomPeers.size > 0 || partnerId) {
            broadcast({ type: 'disconnect' });
        }
    });

    let fadeRestoreTimer = null;

    function applyTopFade() {
        clearTimeout(fadeRestoreTimer);
        sidebar.classList.remove('scrolled-history');
    }

    function removeTopFade() {
        clearTimeout(fadeRestoreTimer);
        sidebar.classList.add('scrolled-history');
    }

    function toggleSidebar(open) {
        isSidebarOpen = open;
        if (open) {
            applyTopFade();
            sidebar.classList.remove('sidebar-closed');
            unreadCount = 0; unreadBadge.classList.add('hidden');
            const m3Unread = $('m3-unread-badge');
            if (m3Unread) m3Unread.classList.add('hidden');
            setTimeout(() => {
                chatMsgs.scrollTop = chatMsgs.scrollHeight;
            }, 100);
        } else {
            sidebar.classList.add('sidebar-closed');
        }
    }
    toggleBtn.onclick = () => toggleSidebar(!isSidebarOpen);
    closeSidebarBtn.onclick = () => toggleSidebar(false);

    // Smart scroll listener: reveals full history when scrolled up, restores top fade after scrolling back to bottom
    chatMsgs.addEventListener('scroll', () => {
        if (chatMsgs.scrollHeight <= chatMsgs.clientHeight + 20) {
            return;
        }

        const distanceFromBottom = chatMsgs.scrollHeight - chatMsgs.scrollTop - chatMsgs.clientHeight;
        const isNearBottom = distanceFromBottom < 35;

        if (!isNearBottom) {
            // User scrolled up into history: immediately reveal top
            removeTopFade();
        } else {
            // User scrolled back to bottom: restore fade after 2.5s
            clearTimeout(fadeRestoreTimer);
            fadeRestoreTimer = setTimeout(() => {
                const stillNearBottom = (chatMsgs.scrollHeight - chatMsgs.scrollTop - chatMsgs.clientHeight) < 35;
                if (stillNearBottom) {
                    applyTopFade();
                }
            }, 2500);
        }
    });

    function updateSyncUI(auto) {
        isAutoSync = auto;
        if (!syncToggleBtn) return;
        if (isAutoSync) {
            syncToggleBtn.innerHTML = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
            syncToggleBtn.title = 'سینک خودکار روشن (کلیک برای تغییر)';
            syncToggleBtn.classList.remove('opacity-60');
            syncToggleBtn.classList.add('glass-btn-green');
        } else {
            syncToggleBtn.innerHTML = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;
            syncToggleBtn.title = 'سینک آزاد / دستی (کلیک برای تغییر)';
            syncToggleBtn.classList.remove('glass-btn-green');
            syncToggleBtn.classList.add('opacity-60');
        }
    }
    updateSyncUI(true);

    if (syncToggleBtn) {
        syncToggleBtn.onclick = () => {
            const newState = !isAutoSync;
            updateSyncUI(newState);
            showToast(newState ? 'همگام‌سازی خودکار فعال شد' : 'حالت آزاد فعال شد', false);
            if (partnerId) {
                sendSync();
                broadcast({ type: 'toggle_sync_mode', auto: newState });
            }
        };
    }

    async function enterCinemaFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            try {
                if (cinemaContainer.requestFullscreen) {
                    await cinemaContainer.requestFullscreen();
                } else if (cinemaContainer.webkitRequestFullscreen) {
                    await cinemaContainer.webkitRequestFullscreen();
                } else if (videoPlayer.webkitEnterFullscreen) {
                    videoPlayer.webkitEnterFullscreen();
                }
            } catch (err) {}
        }
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
        document.body.classList.add('is-fullscreen-cinema');
    }

    async function exitCinemaFullscreen() {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            } catch (err) {}
        }
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait').catch(() => {});
        }
        document.body.classList.remove('is-fullscreen-cinema');
    }

    customFsBtn.onclick = () => {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (!isFs) {
            enterCinemaFullscreen();
        } else {
            exitCinemaFullscreen();
        }
    };

    const updateFullscreenState = () => {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        cinemaContainer.classList.toggle('is-fullscreen', isFs);
        document.body.classList.toggle('is-fullscreen-cinema', isFs);
        if (isFs) {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
            customFsBtn.innerHTML = `<svg class="w-5 h-5 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
            customFsBtn.title = 'خروج از تمام صفحه';
        } else {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('portrait').catch(() => {});
            }
            customFsBtn.innerHTML = `<svg class="w-5 h-5 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
            customFsBtn.title = 'تمام صفحه';
        }
    };
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => document.addEventListener(evt, updateFullscreenState));

    window.addEventListener('orientationchange', () => {
        if (window.orientation === 90 || window.orientation === -90) {
            document.body.classList.add('is-fullscreen-cinema');
        } else {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                document.body.classList.remove('is-fullscreen-cinema');
            }
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

    function createReactionThrottler(minIntervalMs = 400) {
        let lastTime = 0;
        return function canSend() {
            const now = Date.now();
            if (now - lastTime >= minIntervalMs) {
                lastTime = now;
                return true;
            }
            return false;
        };
    }
    const canSendReaction = createReactionThrottler(400);

    document.querySelectorAll('.reaction-btn, .m3-quick-emoji').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if (!canSendReaction()) return;
            const emoji = btn.dataset.emoji;
            const user = myProfile || { id: myId, name: 'شما', avatar: '🍿', color: '#38bdf8' };
            spawnReaction(emoji, user);
            if (ws && ws.readyState === WebSocket.OPEN) {
                broadcast({ type: 'reaction', emoji: emoji, user: user });
            }
            resetReactionTimer();
        };
    });

    document.addEventListener('click', (e) => {
        if (!reactionDrawer.contains(e.target) && e.target !== reactionToggle) {
            reactionDrawer.classList.add('hidden');
        }
    });

    function spawnReaction(emoji, user = null) {
        if (!reactionArea) return;
        const el = document.createElement('div');
        el.className = 'reaction-pill-anim pointer-events-none select-none';

        const u = user || { name: '', avatar: '', color: '#38bdf8' };

        if (u.name || u.avatar) {
            el.innerHTML = `
                <div class="reaction-pill-content">
                    <span class="reaction-pill-avatar" style="border-color: ${u.color || '#38bdf8'}">${u.avatar || '🍿'}</span>
                    <span class="reaction-pill-name" style="color: ${u.color || '#38bdf8'}">${escapeHtml(u.name || '')}</span>
                    <span class="reaction-pill-emoji">${emoji}</span>
                </div>
            `;
        } else {
            el.innerHTML = `<span class="reaction-emoji-only">${emoji}</span>`;
        }

        const leftPercent = Math.floor(Math.random() * 65) + 10;
        el.style.left = `${leftPercent}%`;
        el.style.bottom = `${Math.floor(Math.random() * 15) + 15}%`;

        reactionArea.appendChild(el);
        setTimeout(() => el.remove(), 2600);
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
        const isCinemaMode = document.body.classList.contains('is-fullscreen-cinema') || !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (isCinemaMode && isSidebarOpen && !sidebar.contains(e.target) && e.target !== toggleBtn && !customFsBtn?.contains(e.target)) {
            toggleSidebar(false);
        }
    };

    if (myIdSpan) {
        myIdSpan.onclick = () => {
            navigator.clipboard.writeText(myId);
            const original = myIdSpan.textContent;
            myIdSpan.textContent = "کپی شد!";
            setTimeout(() => myIdSpan.textContent = original, 1500);
        };
    }

    function setStatus(msg, type) {
        if (statusText) statusText.textContent = msg;
        if (m3StatusText) m3StatusText.textContent = msg;

        let dotClass = 'pulse-dot';
        if (type === 'ok') {
            dotClass = 'pulse-dot st-green';
            if (statusText) statusText.classList.remove('text-cyan-400');
            if (m3StatusText) {
                m3StatusText.classList.remove('text-cyan-400', 'text-amber-400', 'text-rose-400');
                m3StatusText.classList.add('text-emerald-400');
            }
        } else if (type === 'con') {
            dotClass = 'pulse-dot st-blue';
            if (statusText) statusText.classList.add('text-cyan-400');
            if (m3StatusText) {
                m3StatusText.classList.remove('text-emerald-400', 'text-amber-400', 'text-rose-400');
                m3StatusText.classList.add('text-cyan-400');
            }
        } else if (type === 'yellow') {
            dotClass = 'pulse-dot st-yellow';
            if (statusText) statusText.classList.remove('text-cyan-400');
            if (m3StatusText) {
                m3StatusText.classList.remove('text-emerald-400', 'text-cyan-400', 'text-rose-400');
                m3StatusText.classList.add('text-amber-400');
            }
        } else {
            dotClass = 'pulse-dot st-red';
            if (statusText) statusText.classList.remove('text-cyan-400');
            if (m3StatusText) {
                m3StatusText.classList.remove('text-emerald-400', 'text-cyan-400', 'text-amber-400');
                m3StatusText.classList.add('text-rose-400');
            }
        }

        if (connectionDot) connectionDot.className = dotClass;
        if (m3ConnectionDot) m3ConnectionDot.className = dotClass;

        if (statusContainer) {
            statusContainer.title = `وضعیت: ${msg} (برای نمایش/پنهان‌سازی کلیک کنید)`;
        }
        if (m3StatusContainer) {
            m3StatusContainer.title = `وضعیت اتصال: ${msg}`;
        }
    }

    if (m3StatusContainer) {
        m3StatusContainer.onclick = () => {
            if (typeof showToast === 'function') {
                showToast(`وضعیت اتصال: ${m3StatusText?.textContent || 'متصل'}`, false);
            }
        };
    }

    if (statusContainer) {
        statusContainer.onclick = () => {
            statusContainer.classList.toggle('show-status');
            clearTimeout(statusHideTimer);
            if (statusContainer.classList.contains('show-status')) {
                statusHideTimer = setTimeout(() => {
                    statusContainer.classList.remove('show-status');
                }, 3000);
            }
        };
    }

    function switchPlayer(youtube) {
        isYouTubeMode = youtube;
        const artContainer = $('artplayer-container');
        if (artContainer) artContainer.style.display = youtube ? 'none' : 'block';
        videoPlayer.style.display = 'none';
        ytContainer.style.display = youtube ? 'block' : 'none';
        if (youtube) {
            destroyHls();
            pausePlayer();
        } else if (ytPlayer?.pauseVideo) {
            ytPlayer.pauseVideo();
        }
    }

    window.initYTSafe = function (id) {
        if (!isYTReady || typeof YT === 'undefined' || !YT.Player) {
            pendingYTId = id;
            if (!document.getElementById('yt-iframe-api')) {
                const s = document.createElement('script');
                s.id = 'yt-iframe-api';
                s.src = 'https://www.youtube.com/iframe_api';
                s.onerror = () => {
                    showToast('⚠️ امکان دسترسی به یوتیوب وجود ندارد (ممکن است مسدود باشد)', false);
                };
                document.head.appendChild(s);
            }
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

    let roomMembers = new Map();
    let isLiveMode = true;
    let isUserMuted = false;
    let canUserControl = isHost;

    let currentRoomState = {
        roomId: currentRoomId,
        hostId: isHost ? myId : null,
        mode: 'cinema', // 'cinema' | 'open'
        isLocked: false,
        media: { type: 'empty' },
        liveClock: { time: 0, playing: false, rate: 1, timestamp: Date.now() }
    };

    let latestHostClock = null;

    function calculateDesync(localTime, hostTimeOrClock, hostTimestamp, isHostPlaying = true, rate = 1) {
        let hostTime, timestamp, playing, r;
        if (typeof hostTimeOrClock === 'object' && hostTimeOrClock !== null) {
            hostTime = hostTimeOrClock.time || 0;
            timestamp = hostTimeOrClock.timestamp || Date.now();
            playing = hostTimeOrClock.playing !== undefined ? !!hostTimeOrClock.playing : true;
            r = hostTimeOrClock.rate || 1;
        } else {
            hostTime = hostTimeOrClock || 0;
            timestamp = hostTimestamp || Date.now();
            playing = (typeof isHostPlaying === 'boolean') ? isHostPlaying : true;
            r = rate || 1;
        }
        const elapsed = playing ? Math.max(0, (Date.now() - timestamp) / 1000) * r : 0;
        const currentHostLive = hostTime + elapsed;
        const diff = localTime - currentHostLive;
        const isDetached = Math.abs(diff) > 2.5;
        return { isDetached, diff: Math.round(diff), currentHostLive };
    }

    function canControlPlayback() {
        return isHost || canUserControl || currentRoomState.mode === 'open';
    }

    function updateCatchUpUI(isDetached, diffSec) {
        const catchUpBtn = $('catch-up-btn');
        const catchUpText = $('catch-up-text');
        if (!catchUpBtn || !catchUpText) return;

        if (isDetached && !isHost) {
            catchUpBtn.classList.remove('hidden');
            const sign = diffSec < 0 ? '-' : '+';
            const absDiff = Math.abs(diffSec);
            const formatted = formatTime(absDiff);
            catchUpText.textContent = `🔴 بازگشت به لایو ادمین (${sign}${formatted})`;
        } else {
            catchUpBtn.classList.add('hidden');
        }
    }

    function applyLiveClock(clock, force = false) {
        if (!clock || isHost) return;
        latestHostClock = clock;

        const now = Date.now();
        const elapsed = clock.playing ? Math.max(0, (now - (clock.timestamp || now)) / 1000) * (clock.rate || 1) : 0;
        const hostLiveTime = clock.time + elapsed;

        const currentLocalTime = getPlayerCurrentTime();
        const isLocalPlaying = getPlayerIsPlaying();
        const drift = currentLocalTime - hostLiveTime;

        if (force || isLiveMode) {
            isProgrammaticSync = true;
            ignoreSyncUntil = Date.now() + 3000;

            // 1. Host is paused -> align position to host paused frame
            if (!clock.playing) {
                if (force || Math.abs(currentLocalTime - clock.time) > 0.5) {
                    setPlayerTime(Math.max(0, clock.time));
                }
                setPlayerPlaybackRate(clock.rate || 1.0);
                if (isLocalPlaying) {
                    pausePlayer();
                    setPlaybackStatus('توقف لایو');
                }
            }
            // 2. Host unpaused/playing, while guest was paused -> smoothly start without jumping forward!
            else if (clock.playing && !isLocalPlaying) {
                const pauseDrift = Math.abs(currentLocalTime - clock.time);
                // If guest was paused close to the scene (within 8 seconds), don't teleport forward
                if (!force && pauseDrift < 8.0) {
                    if (pauseDrift > 0.5) {
                        setPlayerTime(Math.max(0, clock.time));
                    }
                    // Start playing at 1.08x to seamlessly catch up to live edge with zero missed scenes
                    setPlayerPlaybackRate(Math.min(2.0, (clock.rate || 1.0) * 1.08));
                } else {
                    setPlayerTime(Math.max(0, hostLiveTime));
                    setPlayerPlaybackRate(clock.rate || 1.0);
                }
                playPlayer();
                setPlaybackStatus('پخش لایو');
            }
            // 3. Both are playing
            else if (clock.playing && isLocalPlaying) {
                // If local is still buffering, do NOT interrupt downloading with hard seeks
                if (!isLocalBuffering) {
                    if (force || Math.abs(drift) > 5.0) {
                        setPlayerTime(Math.max(0, hostLiveTime));
                        setPlayerPlaybackRate(clock.rate || 1.0);
                    } else if (Math.abs(drift) > 0.7) {
                        const baseRate = clock.rate || 1.0;
                        if (drift < 0) {
                            setPlayerPlaybackRate(Math.min(2.0, baseRate * 1.07));
                        } else {
                            setPlayerPlaybackRate(Math.max(0.5, baseRate * 0.93));
                        }
                    } else {
                        if (getPlayerPlaybackRate() !== (clock.rate || 1.0)) {
                            setPlayerPlaybackRate(clock.rate || 1.0);
                        }
                    }
                }
            }

            setTimeout(() => {
                isProgrammaticSync = false;
            }, 800);

            updateCatchUpUI(false, 0);
        } else {
            updateCatchUpUI(true, Math.round(drift));
        }
    }

    function broadcastLiveClock() {
        if (!canControlPlayback()) return;
        const clock = {
            time: getPlayerCurrentTime(),
            playing: getPlayerIsPlaying(),
            rate: getPlayerPlaybackRate(),
            timestamp: Date.now()
        };
        currentRoomState.liveClock = clock;
        broadcast({ type: 'sync_tick', clock });
    }

    function applyRoomMedia(media) {
        if (!media || !media.type) return;
        currentRoomState.media = media;
        if (media.type === 'yt' && media.ytId) {
            switchPlayer(true);
            initYT(media.ytId);
        } else if (media.type === 'url' && media.url) {
            switchPlayer(false);
            loadVideoSource(media.url, media.isHls);
        } else if (media.type === 'file') {
            showToast(`🎬 میزبان در حال پخش فایل «${media.fileName || 'ویدیویی'}» است.`, true);
        }
    }

    const catchUpBtn = $('catch-up-btn');
    if (catchUpBtn) {
        catchUpBtn.onclick = () => {
            isLiveMode = true;
            if (latestHostClock) {
                applyLiveClock(latestHostClock, true);
            }
            updateCatchUpUI(false, 0);
            showToast('🔴 به پخش زنده میزبان متصل شدید', true);
        };
    }

    function getAuthoritativeState() {
        return {
            ...currentRoomState,
            hostId: myId,
            liveClock: {
                time: getPlayerCurrentTime(),
                playing: getPlayerIsPlaying(),
                rate: getPlayerPlaybackRate(),
                timestamp: Date.now()
            },
            users: Array.from(roomMembers.values())
        };
    }

    function updateRoomUI() {
        const count = roomMembers.size || 1;
        const countBadges = document.querySelectorAll('.spectators-count-badge');
        countBadges.forEach(b => b.textContent = count);

        const adminBtn = $('admin-panel-trigger');
        if (adminBtn) {
            if (isHost) adminBtn.classList.remove('hidden');
            else adminBtn.classList.add('hidden');
        }

        const m3AdminBtn = $('m3-admin-btn');
        if (m3AdminBtn) {
            if (isHost) m3AdminBtn.classList.remove('hidden');
            else m3AdminBtn.classList.add('hidden');
        }

        const m3DockAdmin = $('m3-dock-admin');
        if (m3DockAdmin) {
            if (isHost) {
                m3DockAdmin.classList.remove('hidden');
                m3DockAdmin.classList.add('flex');
            } else {
                m3DockAdmin.classList.add('hidden');
                m3DockAdmin.classList.remove('flex');
            }
        }

        if (typeof updateSpectatorsList === 'function') {
            updateSpectatorsList();
        }

        const bufferingMembers = Array.from(roomMembers.values()).filter(u => u.id !== myId && u.isBuffering);
        if (bufferingMembers.length > 0 && bufferBadge && bufferText) {
            const names = bufferingMembers.map(u => u.name || 'تماشاگر').slice(0, 2).join('، ');
            const extra = bufferingMembers.length > 2 ? ` و ${bufferingMembers.length - 2} نفر دیگر` : '';
            bufferText.textContent = `⏳ در حال بافر: ${names}${extra}...`;
            bufferBadge.classList.remove('hidden');
        } else if (bufferBadge) {
            bufferBadge.classList.add('hidden');
        }

        if (ws && ws.readyState === WebSocket.OPEN) {
            if (count > 1) {
                setStatus(`اتاق (${count} نفر)`, 'con');
            } else {
                setStatus('متصل به اتاق', 'ok');
            }
        }
    }

    const outboxQueue = [];

    function flushOutbox() {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        while (outboxQueue.length > 0) {
            const item = outboxQueue.shift();
            try {
                ws.send(JSON.stringify(item));
            } catch (e) {
                console.error('Failed to flush outbox item', e);
            }
        }
    }

    function isEssentialSignal(data) {
        if (!data || !data.type) return false;
        const essentialTypes = [
            'chat',
            'reaction',
            'admin_action',
            'room_media',
            'sync_sub_file',
            'load_sub',
            'load_url',
            'load_yt',
            'profile_update',
            'join_room',
            'request_sync'
        ];
        return essentialTypes.includes(data.type);
    }

    function send(to, data) {
        if (!to) return;
        const msg = { type: 'signal', to, data };
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(msg));
            } catch (e) {
                if (isEssentialSignal(data)) outboxQueue.push(msg);
            }
        } else {
            if (isEssentialSignal(data)) {
                outboxQueue.push(msg);
            }
        }
    }

    function broadcast(data) {
        const msg = { type: 'signal', data };
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(msg));
            } catch (e) {
                if (isEssentialSignal(data)) outboxQueue.push(msg);
            }
        } else {
            if (isEssentialSignal(data)) {
                outboxQueue.push(msg);
            }
        }
    }

    let wsHeartbeatInterval = null;

    function startWsHeartbeat() {
        if (wsHeartbeatInterval) clearInterval(wsHeartbeatInterval);
        wsHeartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'signal', data: { type: 'ping' } }));
            }
        }, 15000);
    }

    function safeCloseWs(socket) {
        if (!socket) return;
        try {
            socket.onopen = null;
            socket.onclose = null;
            socket.onerror = null;
            socket.onmessage = null;
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
        } catch (e) {}
    }

    let reconnectTimer = null;
    let connTimeoutTimer = null;

    function scheduleReconnect(delay) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, delay);
    }

    function connect() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        if (ws) {
            safeCloseWs(ws);
            ws = null;
        }

        setStatus('در حال اتصال...', 'yellow');

        let isOpened = false;
        if (connTimeoutTimer) clearTimeout(connTimeoutTimer);
        connTimeoutTimer = setTimeout(() => {
            if (!isOpened && ws && ws.readyState === WebSocket.CONNECTING) {
                console.warn('WebSocket connection timed out (7s). Retrying...');
                safeCloseWs(ws);
                ws = null;
                const delay = Math.min(3000, 1000 + (500 * reconnectAttempts++));
                setStatus('تلاش مجدد اتصال...', 'yellow');
                scheduleReconnect(delay);
            }
        }, 7000);

        try {
            const socket = new WebSocket(getWsUrl());
            ws = socket;

            socket.onopen = () => {
                if (ws !== socket) return;
                isOpened = true;
                if (connTimeoutTimer) {
                    clearTimeout(connTimeoutTimer);
                    connTimeoutTimer = null;
                }
                reconnectAttempts = 0;
                socket.send(JSON.stringify({ type: 'register', id: myId }));
                setStatus('متصل به اتاق', 'ok');
                startWsHeartbeat();
                flushOutbox();

                roomMembers.set(myId, {
                    id: myId,
                    name: myProfile?.name || 'تماشاگر',
                    avatar: myProfile?.avatar || '🍿',
                    color: myProfile?.color || '#38bdf8',
                    isHost: isHost,
                    canControl: isHost,
                    isMuted: false,
                    isBuffering: false,
                    time: 0,
                    isLive: true
                });

                broadcast({
                    type: 'join_room',
                    user: myProfile || { id: myId, name: 'تماشاگر', avatar: '🍿', color: '#38bdf8' },
                    hostKey: myHostKey,
                    isHost: isHost
                });

                if (!isHost) {
                    broadcast({ type: 'request_sync' });
                }

                updateRoomUI();
            };

            socket.onerror = () => {
                if (connTimeoutTimer) {
                    clearTimeout(connTimeoutTimer);
                    connTimeoutTimer = null;
                }
                console.log('WS Error');
            };

            socket.onmessage = (e) => {
                if (ws !== socket) return;
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type === 'signal') {
                        const payload = msg.data || msg;
                        const from = msg.from || payload.fromUser || payload.userId;
                        if (payload && payload.type) {
                            handleData(payload, from);
                        }
                    }
                } catch (err) { }
            };

            socket.onclose = () => {
                if (ws !== socket) return;
                if (connTimeoutTimer) {
                    clearTimeout(connTimeoutTimer);
                    connTimeoutTimer = null;
                }
                if (wsHeartbeatInterval) clearInterval(wsHeartbeatInterval);
                const delay = Math.min(5000, 1000 + (1000 * reconnectAttempts++));
                setStatus(`قطع (${reconnectAttempts})`, 'err');
                scheduleReconnect(delay);
            };
        } catch (err) {
            console.error('WS initialization failed', err);
            scheduleReconnect(2000);
        }
    }

    function handleData(data, from) {
        if (!data || !data.type) return;

        switch (data.type) {
            case 'ping': {
                if (from && from !== myId) send(from, { type: 'pong' });
                break;
            }

            case 'pong': {
                break;
            }

            case 'request_sync': {
                if (isHost && from && from !== myId) {
                    send(from, { type: 'room_state', state: getAuthoritativeState() });
                }
                break;
            }

            case 'join_room': {
                if (!from || from === myId) return;

                if (isHost) {
                    if (currentRoomState.isLocked && (!data.hostKey || data.hostKey !== myHostKey)) {
                        send(from, { type: 'join_rejected', reason: 'اتاق توسط میزبان قفل شده است.' });
                        return;
                    }
                }

                const user = data.user || {};
                roomMembers.set(from, {
                    id: from,
                    name: user.name || 'تماشاگر',
                    avatar: user.avatar || '🍿',
                    color: user.color || '#38bdf8',
                    isHost: !!data.isHost,
                    canControl: !!data.isHost || currentRoomState.mode === 'open',
                    isMuted: false,
                    isBuffering: false,
                    time: 0,
                    isLive: true
                });

                showToast(`👋 ${user.name || 'کاربر جدید'} وارد اتاق شد`, true);
                updateRoomUI();

                if (isHost) {
                    const authState = getAuthoritativeState();
                    send(from, { type: 'room_state', state: authState });
                }
                break;
            }

            case 'room_state': {
                if (!data.state) return;
                const state = data.state;
                currentRoomState.mode = state.mode || 'cinema';
                currentRoomState.isLocked = !!state.isLocked;

                if (state.hostId) {
                    currentRoomState.hostId = state.hostId;
                    isHost = (state.hostId === myId);
                }

                if (Array.isArray(state.users)) {
                    roomMembers.clear();
                    state.users.forEach(u => roomMembers.set(u.id, u));
                    if (myProfile) {
                        const existing = roomMembers.get(myId);
                        roomMembers.set(myId, {
                            id: myId,
                            name: myProfile.name,
                            avatar: myProfile.avatar,
                            color: myProfile.color,
                            isHost: isHost,
                            canControl: isHost || currentRoomState.mode === 'open' || existing?.canControl,
                            isMuted: existing?.isMuted || false,
                            isBuffering: false,
                            time: existing?.time || 0,
                            isLive: existing?.isLive !== false
                        });
                    }
                }

                if (state.media && state.media.type && state.media.type !== 'empty') {
                    if (typeof applyRoomMedia === 'function') applyRoomMedia(state.media);
                }

                if (state.liveClock && !isHost && isLiveMode) {
                    if (typeof applyLiveClock === 'function') applyLiveClock(state.liveClock);
                }

                updateRoomUI();
                break;
            }

            case 'user_presence': {
                if (!from || from === myId) return;
                const existing = roomMembers.get(from);
                if (existing) {
                    existing.time = data.time || 0;
                    existing.isBuffering = !!data.isBuffering;
                    existing.isLive = !!data.isLive;
                    updateRoomUI();
                }
                break;
            }

            case 'profile_update': {
                if (!from || from === myId || !data.user) return;
                const existing = roomMembers.get(from);
                if (existing) {
                    existing.name = data.user.name;
                    existing.avatar = data.user.avatar;
                    existing.color = data.user.color;
                    updateRoomUI();
                }
                break;
            }

            case 'admin_action': {
                if (data.action === 'kick' && data.targetId === myId) {
                    if (ws) safeCloseWs(ws);
                    alert('⚠️ شما توسط میزبان از اتاق اخراج شدید.');
                    window.location.reload();
                    return;
                }
                if (data.action === 'mute' && data.targetId === myId) {
                    isUserMuted = !!data.muted;
                    showToast(isUserMuted ? '🔇 شما در چت میوت شدید' : '🔊 دسترسی چت شما باز شد', false);
                    return;
                }
                if (data.action === 'grant_control' && data.targetId === myId) {
                    canUserControl = !!data.granted;
                    showToast(canUserControl ? '🎮 به شما دسترسی کنترل پخش داده شد' : 'دسترسی کنترل پخش برداشته شد', false);
                    return;
                }
                if (data.action === 'transfer_host') {
                    if (data.newHostId === myId) {
                        isHost = true;
                        myHostKey = 'hkey_' + randomId() + randomId();
                        localStorage.setItem(hostStorageKey, myHostKey);
                        showToast('👑 شما اکنون میزبان این اتاق شدید!', true);
                    } else if (isHost) {
                        isHost = false;
                        localStorage.removeItem(hostStorageKey);
                        myHostKey = null;
                        showToast('میزبانی به کاربر دیگر واگذار شد', false);
                    }
                    currentRoomState.hostId = data.newHostId;
                    updateRoomUI();
                    return;
                }
                if (data.action === 'mode_change') {
                    currentRoomState.mode = data.mode;
                    showToast(data.mode === 'open' ? 'حالت اتاق: آزاد (همه می‌توانند پخش کنند)' : 'حالت اتاق: سینما (فقط میزبان)', false);
                    updateRoomUI();
                    return;
                }
                if (data.action === 'lock_change') {
                    currentRoomState.isLocked = !!data.locked;
                    showToast(data.locked ? '🔒 ورود به اتاق قفل شد' : '🔓 قفل ورود به اتاق برداشته شد', false);
                    updateRoomUI();
                    return;
                }
                break;
            }

            case 'join_rejected': {
                alert(data.reason || 'ورود به اتاق تایید نشد.');
                if (ws) safeCloseWs(ws);
                break;
            }

            case 'disconnect': {
                if (from && roomMembers.has(from)) {
                    const u = roomMembers.get(from);
                    roomMembers.delete(from);
                    showToast(`کاربر (${u.name || from.slice(0, 4)}) از اتاق خارج شد`, false);
                    updateRoomUI();
                }
                break;
            }

            case 'sync_tick': {
                if (!isHost && isLiveMode && data.clock) {
                    if (typeof applyLiveClock === 'function') applyLiveClock(data.clock);
                }
                break;
            }

            case 'force_sync': {
                if (data.clock) {
                    isLiveMode = true;
                    if (typeof applyLiveClock === 'function') applyLiveClock(data.clock, true);
                    showToast('🔴 هماهنگ‌سازی اجباری با زمان میزبان انجام شد', true);
                }
                break;
            }

            case 'room_media': {
                if (data.media) {
                    if (typeof applyRoomMedia === 'function') applyRoomMedia(data.media);
                }
                break;
            }

            case 'chat': {
                if (typeof handleIncomingChatMessage === 'function') {
                    handleIncomingChatMessage(data, from);
                }
                break;
            }

            case 'reaction': {
                if (data.emoji && typeof spawnReaction === 'function') {
                    spawnReaction(data.emoji, data.user);
                }
                break;
            }

            case 'load_url': {
                switchPlayer(false);
                loadVideoSource(data.url, data.isHls);
                setPlaybackStatus('ویدیو سینک شد');
                break;
            }

            case 'load_yt': {
                switchPlayer(true);
                initYT(data.id);
                setPlaybackStatus('یوتیوب سینک شد');
                break;
            }

            case 'sync_sub_file': {
                if (!data.content || typeof data.content !== 'string' || data.content.length > 1024 * 1024) return;
                cleanupSubBlobs();
                const blob = new Blob([data.content], { type: 'text/vtt' });
                const blobUrl = URL.createObjectURL(blob);
                activeSubBlobUrls.push(blobUrl);
                addSubTrack(blobUrl, 'Synced Sub');
                setPlaybackStatus('زیرنویس همگام شد');
                showToast(`📝 زیرنویس "${data.name || 'همگام'}" دریافت شد`, false);
                break;
            }

            case 'load_sub': {
                if (data.url && typeof processSubtitleUrl === 'function') {
                    processSubtitleUrl(data.url, false);
                }
                break;
            }
        }
    }

    function syncPlayer(data) {
        isSyncing = true;
        ignoreSyncUntil = Date.now() + 1000;

        if (data.mode === 'html5' && !isYouTubeMode) {
            partnerDuration = data.dur;
            if (Math.abs(getPlayerCurrentTime() - data.time) > 1.5) setPlayerTime(data.time);
            if (getPlayerPlaybackRate() !== data.rate) setPlayerPlaybackRate(data.rate);
            if (data.play && !getPlayerIsPlaying()) {
                playPlayer();
                setPlaybackStatus('پخش');
            } else if (!data.play && getPlayerIsPlaying()) {
                pausePlayer();
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
            broadcast({ type: 'sync', mode: 'html5', play: getPlayerIsPlaying(), time: getPlayerCurrentTime(), dur: getPlayerDuration(), rate: getPlayerPlaybackRate() });
        }
    }

    function updateConnectedStatus() {
        const count = roomPeers.size;
        setStatus(count > 1 ? `اتاق (${count} نفر)` : 'متصل به دوست', 'con');
    }

    function setConnected() {
        updateConnectedStatus();
        $('connect-btn')?.classList.add('hidden');
        $('disconnect-btn')?.classList.remove('hidden');
        partnerTimeDisplay?.classList.remove('hidden');
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
        if (partnerInput) partnerInput.value = '';
        setStatus('قطع شد', 'err');
        $('connect-btn')?.classList.remove('hidden');
        $('disconnect-btn')?.classList.add('hidden');
        partnerTimeDisplay?.classList.add('hidden');
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

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function addMsg(data, isMe) {
        const div = document.createElement('div');
        div.className = `p-3 rounded-2xl text-sm break-words relative group mb-2.5 transition-all max-w-[85%] ${
            isMe 
                ? 'm3-chat-bubble-me mr-2' 
                : 'm3-chat-bubble-other ml-2'
        }`;

        // Header for sender identity
        if (!isMe) {
            const senderHeader = document.createElement('div');
            senderHeader.className = 'flex items-center gap-1.5 mb-1';
            
            const avatarSpan = document.createElement('span');
            avatarSpan.className = 'text-xs';
            avatarSpan.textContent = data.userAvatar || '🍿';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'font-bold text-xs truncate';
            nameSpan.style.color = data.userColor || '#38bdf8';
            nameSpan.textContent = data.userName || 'تماشاگر';

            const timeSpan = document.createElement('span');
            timeSpan.className = 'text-[10px] text-slate-400 mr-auto font-mono';
            timeSpan.textContent = data.time || '';

            senderHeader.appendChild(avatarSpan);
            senderHeader.appendChild(nameSpan);
            senderHeader.appendChild(timeSpan);
            div.appendChild(senderHeader);
        } else if (data.time) {
            const timeSpan = document.createElement('div');
            timeSpan.className = 'text-[10px] text-cyan-300/70 text-left font-mono mb-0.5';
            timeSpan.textContent = data.time;
            div.appendChild(timeSpan);
        }

        if (data.reply) {
            const r = document.createElement('div');
            r.className = 'bg-black/30 p-1.5 mb-1.5 text-xs rounded-xl border-r-2 border-cyan-400 truncate cursor-pointer opacity-85 backdrop-blur-sm';
            r.textContent = data.reply.txt;
            r.onclick = () => document.getElementById(data.reply.id)?.scrollIntoView({ behavior: 'smooth' });
            div.appendChild(r);
        }

        const textBody = document.createElement('div');
        textBody.className = 'leading-relaxed select-text';
        renderMsgWithTimestamps(textBody, data.text || '');
        div.appendChild(textBody);
        div.id = data.id;

        const repBtn = document.createElement('button');
        repBtn.innerHTML = `<svg class="w-3.5 h-3.5 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>`;
        repBtn.className = `absolute -top-2.5 ${isMe ? 'left-1' : 'right-1'} opacity-0 group-hover:opacity-100 text-xs transition-all glass-btn rounded-full w-6 h-6 flex items-center justify-center shadow-lg`;
        repBtn.onclick = () => {
            replyingTo = { id: data.id, txt: data.text };

            replyPreview.innerHTML = '';
            const spanText = document.createElement('span');
            spanText.textContent = `پاسخ به ${data.userName || 'پیام'}: ${data.text.substr(0, 15)}...`;
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
        if (chatMsgs.scrollHeight > chatMsgs.clientHeight + 30) {
            clearTimeout(fadeRestoreTimer);
            fadeRestoreTimer = setTimeout(() => {
                const stillNearBottom = (chatMsgs.scrollHeight - chatMsgs.scrollTop - chatMsgs.clientHeight) < 35;
                if (stillNearBottom) applyTopFade();
            }, 2500);
        }
    }

    const seenMessageIds = new Set();

    $('chat-send').onclick = () => {
        if (isUserMuted) {
            showToast('🔇 شما توسط میزبان در چت میوت شده‌اید', false);
            return;
        }
        const txt = chatInput.value.trim();
        if (!txt) return;

        const msg = {
            id: 'm_' + Date.now() + Math.random().toString(36).substring(2, 6),
            userId: myId,
            userName: myProfile?.name || 'تماشاگر',
            userAvatar: myProfile?.avatar || '🍿',
            userColor: myProfile?.color || '#38bdf8',
            text: txt,
            reply: replyingTo,
            time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };
        seenMessageIds.add(msg.id);
        addMsg(msg, true);
        broadcast({ type: 'chat', data: msg });
        chatInput.value = '';
        replyingTo = null;
        replyPreview.classList.add('hidden');
        chatInput.focus();
    };

    function handleIncomingChatMessage(data, from) {
        const payload = data.data || data;
        if (!payload || !payload.text) return;
        // Suppress own echoes
        if (payload.userId === myId || from === myId) return;
        // Suppress duplicates
        if (payload.id && seenMessageIds.has(payload.id)) return;
        if (payload.id) seenMessageIds.add(payload.id);

        addMsg(payload, false);
        if (!isSidebarOpen) {
            unreadCount++;
            unreadBadge.textContent = unreadCount;
            unreadBadge.classList.remove('hidden');
            const m3Unread = $('m3-unread-badge');
            if (m3Unread) {
                m3Unread.textContent = unreadCount;
                m3Unread.classList.remove('hidden');
            }
            notify();
            renderStreamMessage(payload);
        }
    }

    function renderStreamMessage(msg) {
        const streamContainer = $('chat-stream-overlay');
        if (!streamContainer) return;

        // Keep at most 3 messages visible at once
        while (streamContainer.children.length >= 3) {
            streamContainer.removeChild(streamContainer.firstElementChild);
        }

        const el = document.createElement('div');
        el.className = 'chat-stream-msg flex items-center gap-2.5 text-sm text-white cursor-pointer';
        el.title = 'کلیک برای باز کردن چت';
        const avatar = msg.userAvatar || '🍿';
        const color = msg.userColor || '#38bdf8';
        el.innerHTML = `
            <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 shadow-md" style="background-color: ${color}28; border: 1.5px solid ${color};">
                ${escapeHtml(avatar)}
            </span>
            <span class="font-bold text-cyan-300 text-xs sm:text-sm shrink-0 drop-shadow">${escapeHtml(msg.userName || 'کاربر')}:</span>
            <span class="text-white text-xs sm:text-sm font-semibold truncate max-w-[200px] sm:max-w-[280px] drop-shadow">${escapeHtml(msg.text)}</span>
        `;

        el.onclick = () => {
            toggleSidebar(true);
            if (typeof switchChatDrawerTab === 'function') {
                switchChatDrawerTab('chat');
            }
        };

        streamContainer.appendChild(el);

        // Auto-remove after 4 seconds with smooth fade-out
        setTimeout(() => {
            if (el.parentNode === streamContainer) {
                el.classList.add('fading-out');
                setTimeout(() => {
                    if (el.parentNode === streamContainer) {
                        streamContainer.removeChild(el);
                    }
                }, 400);
            }
        }, 4000);
    }

    function switchChatDrawerTab(tabName) {
        const chatPane = $('chat-pane');
        const spectatorsPane = $('spectators-pane');
        const tabChat = $('tab-btn-chat');
        const tabSpec = $('tab-btn-spectators');
        if (!chatPane || !spectatorsPane) return;

        if (tabName === 'spectators') {
            chatPane.classList.add('hidden');
            spectatorsPane.classList.remove('hidden');
            tabSpec?.classList.add('bg-cyan-500/30', 'text-cyan-200', 'border-cyan-400/30');
            tabSpec?.classList.remove('text-slate-400', 'border-transparent');
            tabChat?.classList.remove('bg-cyan-500/30', 'text-cyan-200', 'border-cyan-400/30');
            tabChat?.classList.add('text-slate-400', 'border-transparent');
            updateSpectatorsList();
        } else {
            spectatorsPane.classList.add('hidden');
            chatPane.classList.remove('hidden');
            tabChat?.classList.add('bg-cyan-500/30', 'text-cyan-200', 'border-cyan-400/30');
            tabChat?.classList.remove('text-slate-400', 'border-transparent');
            tabSpec?.classList.remove('bg-cyan-500/30', 'text-cyan-200', 'border-cyan-400/30');
            tabSpec?.classList.add('text-slate-400', 'border-transparent');
        }
    }

    $('tab-btn-chat')?.addEventListener('click', () => switchChatDrawerTab('chat'));
    $('tab-btn-spectators')?.addEventListener('click', () => switchChatDrawerTab('spectators'));

    function updateSpectatorsList() {
        const listEl = $('spectators-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        roomMembers.forEach((user, id) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/5 backdrop-blur-sm gap-2';

            const leftInfo = document.createElement('div');
            leftInfo.className = 'flex items-center gap-2.5 min-w-0';

            const avatarWrap = document.createElement('div');
            avatarWrap.className = 'w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 border relative';
            avatarWrap.style.borderColor = user.color || '#38bdf8';
            avatarWrap.style.backgroundColor = `${user.color || '#38bdf8'}15`;
            avatarWrap.textContent = user.avatar || '🍿';

            const textWrap = document.createElement('div');
            textWrap.className = 'min-w-0 flex flex-col';

            const nameRow = document.createElement('div');
            nameRow.className = 'flex items-center gap-1.5';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-xs font-bold text-slate-100 truncate';
            nameSpan.textContent = user.name || (id === myId ? 'شما' : 'تماشاگر');
            if (id === myId) {
                const youBadge = document.createElement('span');
                youBadge.className = 'text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 py-0.2 rounded-md font-normal';
                youBadge.textContent = 'شما';
                nameRow.appendChild(nameSpan);
                nameRow.appendChild(youBadge);
            } else {
                nameRow.appendChild(nameSpan);
            }

            if (user.isHost) {
                const hostBadge = document.createElement('span');
                hostBadge.className = 'text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-md flex items-center gap-0.5';
                hostBadge.innerHTML = '👑 <span>میزبان</span>';
                nameRow.appendChild(hostBadge);
            }

            const statusRow = document.createElement('div');
            statusRow.className = 'flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5';
            if (user.isBuffering) {
                statusRow.innerHTML = '<span class="text-amber-400 flex items-center gap-1"><span class="animate-spin">⏳</span> در حال بافر...</span>';
            } else if (user.isLive) {
                statusRow.innerHTML = '<span class="text-green-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> لایو</span>';
            } else {
                statusRow.innerHTML = '<span class="text-slate-400 font-mono">تماشای مستقل</span>';
            }

            textWrap.appendChild(nameRow);
            textWrap.appendChild(statusRow);

            leftInfo.appendChild(avatarWrap);
            leftInfo.appendChild(textWrap);
            item.appendChild(leftInfo);

            // Admin Action Buttons (Only visible to Host for other users)
            if (isHost && id !== myId) {
                const actionsWrap = document.createElement('div');
                actionsWrap.className = 'flex items-center gap-1 shrink-0';

                // Toggle Control Button
                const ctrlBtn = document.createElement('button');
                ctrlBtn.type = 'button';
                ctrlBtn.className = `glass-btn p-1.5 rounded-lg text-xs hover:scale-105 transition-transform ${user.canControl ? 'text-green-400 border-green-500/40 bg-green-500/10' : 'text-slate-400'}`;
                ctrlBtn.title = user.canControl ? 'پس گرفتن دسترسی کنترل پخش' : 'اعطای دسترسی کنترل پخش';
                ctrlBtn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>';
                ctrlBtn.onclick = () => {
                    const newCtrl = !user.canControl;
                    user.canControl = newCtrl;
                    send(id, { type: 'admin_action', action: 'grant_control', targetId: id, granted: newCtrl });
                    showToast(newCtrl ? `🎮 دسترسی کنترل به ${user.name} داده شد` : `دسترسی کنترل ${user.name} برداشته شد`, true);
                    updateSpectatorsList();
                };
                actionsWrap.appendChild(ctrlBtn);

                // Toggle Mute Button
                const muteBtn = document.createElement('button');
                muteBtn.type = 'button';
                muteBtn.className = `glass-btn p-1.5 rounded-lg text-xs hover:scale-105 transition-transform ${user.isMuted ? 'text-red-400 border-red-500/40 bg-red-500/10' : 'text-slate-400'}`;
                muteBtn.title = user.isMuted ? 'رفع میوت چت' : 'میوت کردن در چت';
                muteBtn.innerHTML = user.isMuted
                    ? '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
                    : '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
                muteBtn.onclick = () => {
                    const newMuted = !user.isMuted;
                    user.isMuted = newMuted;
                    send(id, { type: 'admin_action', action: 'mute', targetId: id, muted: newMuted });
                    showToast(newMuted ? `🔇 کاربر ${user.name} در چت میوت شد` : `🔊 کاربر ${user.name} رفع میوت شد`, true);
                    updateSpectatorsList();
                };
                actionsWrap.appendChild(muteBtn);

                // Transfer Host Button
                const crownBtn = document.createElement('button');
                crownBtn.type = 'button';
                crownBtn.className = 'glass-btn p-1.5 rounded-lg text-xs text-amber-400 hover:scale-105 transition-transform';
                crownBtn.title = 'واگذاری میزبانی به این کاربر';
                crownBtn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path></svg>';
                crownBtn.onclick = () => {
                    if (confirm(`آیا مطمئن هستید می‌خواهید میزبانی اتاق را به ${user.name} واگذار کنید؟`)) {
                        broadcast({ type: 'admin_action', action: 'transfer_host', newHostId: id });
                        isHost = false;
                        localStorage.removeItem(hostStorageKey);
                        myHostKey = null;
                        currentRoomState.hostId = id;
                        user.isHost = true;
                        updateRoomUI();
                        showToast(`👑 میزبانی اتاق به ${user.name} واگذار شد`, true);
                    }
                };
                actionsWrap.appendChild(crownBtn);

                // Kick Button
                const kickBtn = document.createElement('button');
                kickBtn.type = 'button';
                kickBtn.className = 'glass-btn p-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/20 hover:scale-105 transition-transform';
                kickBtn.title = 'اخراج کاربر از اتاق';
                kickBtn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>';
                kickBtn.onclick = () => {
                    if (confirm(`آیا مطمئنید می‌خواهید ${user.name} را از اتاق اخراج کنید؟`)) {
                        send(id, { type: 'admin_action', action: 'kick', targetId: id });
                        roomMembers.delete(id);
                        showToast(`🚫 کاربر ${user.name} اخراج شد`, true);
                        updateRoomUI();
                    }
                };
                actionsWrap.appendChild(kickBtn);

                item.appendChild(actionsWrap);
            }

            listEl.appendChild(item);
        });
    }

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
        if (artInstance && artInstance.subtitle) {
            try {
                artInstance.subtitle.url = blobUrl;
                artInstance.subtitle.show = true;
            } catch (e) {
                console.warn('Artplayer subtitle error:', e);
            }
        }
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
            switchPlayer(false);
            activeVideoBlobUrl = URL.createObjectURL(f);
            loadVideoSource(activeVideoBlobUrl, false);
            setPlaybackStatus('فایل لود شد');
            document.getElementById('video-modal').classList.add('hidden');
            showToast(`🎬 فایل ${f.name} بارگذاری شد`, true);

            currentRoomState.media = { type: 'file', fileName: f.name, fileSize: f.size };
            broadcast({ type: 'room_media', media: currentRoomState.media });
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

                if (ws && ws.readyState === WebSocket.OPEN) {
                    broadcast({ type: 'sync_sub_file', content: content, name: f.name });
                    showToast('زیرنویس برای همراهان اتاق ارسال شد', false);
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
            currentRoomState.media = { type: 'yt', ytId: videoId };
            broadcast({ type: 'room_media', media: currentRoomState.media });
            broadcast({ type: 'load_yt', id: videoId });
        } else if (val.includes('.m3u8')) {
            switchPlayer(false);
            loadVideoSource(val, true);
            currentRoomState.media = { type: 'url', url: val, isHls: true };
            broadcast({ type: 'room_media', media: currentRoomState.media });
            broadcast({ type: 'load_url', url: val, isHls: true });
        } else {
            setPlaybackStatus('پخش فایل');
            showToast('✅ لینک مستقیم بارگذاری شد', true);
            switchPlayer(false);
            loadVideoSource(val, false);
            currentRoomState.media = { type: 'url', url: val, isHls: false };
            broadcast({ type: 'room_media', media: currentRoomState.media });
            broadcast({ type: 'load_url', url: val, isHls: false });
        }
    };

    const legacyConnectBtn = $('connect-btn');
    if (legacyConnectBtn) {
        legacyConnectBtn.onclick = () => {
            const id = partnerInput?.value?.trim();
            if (id && id !== myId) {
                pendingPartnerId = id;
                setStatus('در حال اتصال...', 'yellow');
                send(id, { type: 'conn_req' });
            }
        };
    }

    const legacyDisconnectBtn = $('disconnect-btn');
    if (legacyDisconnectBtn) {
        legacyDisconnectBtn.onclick = () => {
            broadcast({ type: 'disconnect' });
            resetState();
        };
    }

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
                if (!getPlayerIsPlaying()) playPlayer();
                else pausePlayer();
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
            if (artInstance) {
                artInstance.muted = !artInstance.muted;
                showToast(artInstance.muted ? '🔇 صدا قطع شد' : '🔊 صدا وصل شد', true);
            } else {
                videoPlayer.muted = !videoPlayer.muted;
                showToast(videoPlayer.muted ? '🔇 صدا قطع شد' : '🔊 صدا وصل شد', true);
            }
        }
    });

    function seekRelative(delta) {
        const cur = getPlayerCurrentTime();
        setPlayerTime(Math.max(0, cur + delta));
        if (canControlPlayback()) {
            broadcastLiveClock();
        } else {
            isLiveMode = false;
            if (latestHostClock) {
                const curTime = getPlayerCurrentTime();
                const res = calculateDesync(curTime, latestHostClock.time, latestHostClock.timestamp);
                updateCatchUpUI(true, res.diff);
            }
        }
    }

    // Buffer State Event Listeners
    videoPlayer.addEventListener('waiting', () => {
        if (!isLocalBuffering && ws?.readyState === WebSocket.OPEN) {
            isLocalBuffering = true;
            broadcast({ type: 'user_presence', time: getPlayerCurrentTime(), isBuffering: true, isLive: isLiveMode });
        }
    });

    const handleBufferEnd = () => {
        if (isLocalBuffering && ws?.readyState === WebSocket.OPEN) {
            isLocalBuffering = false;
            broadcast({ type: 'user_presence', time: getPlayerCurrentTime(), isBuffering: false, isLive: isLiveMode });
        }
    };
    videoPlayer.addEventListener('playing', handleBufferEnd);
    videoPlayer.addEventListener('canplay', handleBufferEnd);

    // Watchdog & Periodic Sync loop
    setInterval(() => {
        const curTime = getPlayerCurrentTime();
        const isPlaying = getPlayerIsPlaying();
        const rate = getPlayerPlaybackRate();

        if (isHost) {
            const clock = {
                time: curTime,
                playing: isPlaying,
                rate: rate,
                timestamp: Date.now()
            };
            currentRoomState.liveClock = clock;
            broadcast({ type: 'sync_tick', clock });
        } else if (latestHostClock) {
            const res = calculateDesync(curTime, latestHostClock);
            if (!isLiveMode) {
                updateCatchUpUI(true, res.diff);
            } else if (res.isDetached) {
                applyLiveClock(latestHostClock, false);
            } else {
                updateCatchUpUI(false, 0);
            }
        }
    }, 1000);

    // Regular Presence Broadcast (every 2.5s)
    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const curTime = getPlayerCurrentTime();
            broadcast({
                type: 'user_presence',
                time: curTime,
                isBuffering: isLocalBuffering,
                isLive: isLiveMode
            });
        }
    }, 2500);

    // High precision reaction loop
    setInterval(() => {
        const currentTime = getPlayerCurrentTime();

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
        if (isProgrammaticSync || Date.now() < ignoreSyncUntil) return;
        lastInteractionTime = Date.now();
        if (canControlPlayback()) {
            broadcastLiveClock();
        }
    };

    const applyPendingNative = () => {
        if (pendingSeekTime !== null && videoPlayer) {
            const target = pendingSeekTime;
            pendingSeekTime = null;
            isProgrammaticSync = true;
            videoPlayer.currentTime = target;
            setTimeout(() => { isProgrammaticSync = false; }, 400);
        }
    };
    videoPlayer.addEventListener('loadedmetadata', applyPendingNative);
    videoPlayer.addEventListener('canplay', applyPendingNative);

    // Display Room Code in header
    const m3RoomTitle = $('m3-room-title');
    if (m3RoomTitle && currentRoomId) {
        m3RoomTitle.textContent = `اتاق: ${currentRoomId}`;
        m3RoomTitle.title = 'شناسه اتاق (کلیک برای کپی)';
        m3RoomTitle.style.cursor = 'pointer';
        m3RoomTitle.onclick = () => {
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(currentRoomId);
                showToast(`📋 شناسه اتاق کپی شد: ${currentRoomId}`, true);
            }
        };
    }

    // Mobile background recovery & network reconnect
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                connect();
            } else {
                broadcast({ type: 'request_sync' });
            }
        }
    });

    window.addEventListener('online', () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            connect();
        }
    });

    // Auto-initialize Artplayer container on load so player UI is ready
    if (typeof Artplayer !== 'undefined') {
        initArtPlayer('');
    }

    // Connect to signaling server once all listeners & handlers are ready
    connect();

    ['play', 'pause', 'seeked', 'ratechange'].forEach(evt => videoPlayer.addEventListener(evt, () => {
        if (!isProgrammaticSync && typeof trackInteraction === 'function') trackInteraction();
    }));
}

// Instant startup on DOMContentLoaded (decoupled from slow/hanging external CDN scripts)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSyncnemaApp);
} else {
    initSyncnemaApp();
}
