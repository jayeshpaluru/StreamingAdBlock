// content.js
(function() {
    if (window.streamingAdBlockLoaded) return;
    window.streamingAdBlockLoaded = true;

    const hostname = window.location.hostname;
    const isPrimeVideo = /amazon|primevideo/i.test(hostname);
    const isNetflix = /netflix/i.test(hostname);
    const isHulu = /hulu/i.test(hostname);
    const isDisneyPlus = /disneyplus/i.test(hostname);

    let settings = {
        skipAds: true,
        skipIntro: true,
        skipCredits: true
    };

    const adStats = {
        adsBlocked: 0,
        timeSaved: 0
    };

    // Load settings
    chrome.storage.local.get('settings', (result) => {
        if (result.settings) {
            settings = result.settings;
        }
    });

    class VideoController {
        constructor() {
            this.video = null;
            this.adPlaying = false;
            this.adStartTime = 0;
            this.checkForVideoInterval = setInterval(() => this.findAndAttachToVideo(), 1000);
        }

        findAndAttachToVideo() {
            const video = document.querySelector('video');
            if (video && video !== this.video) {
                this.video = video;
                this.attachVideoListeners();
            }
        }

        attachVideoListeners() {
            if (!this.video) return;

            this.video.addEventListener('timeupdate', () => {
                if (settings.skipAds) {
                    this.handleVideoAds();
                }
            });
        }

        handleVideoAds() {
            if (isNetflix) {
                this.skipNetflixAds();
            }
            if (isPrimeVideo) {
                this.skipPrimeVideoAds();
            }
            if (isHulu) {
                this.installHuluAdBlocker();
            }
            if (isDisneyPlus) {
                this.skipDisneyPlusAds();
            }
        }

        skipNetflixAds() {
            const adIndicator = document.querySelector('.ad-break-indicator');
            if (adIndicator) {
                this.video.playbackRate = 16.0;
                setTimeout(() => {
                    this.video.playbackRate = 1.0;
                    adStats.adsBlocked++;
                    this.updateStats();
                }, 3000);
            }
        }

        skipPrimeVideoAds() {
            const adTimeText = document.querySelector(".atvwebplayersdk-ad-timer-text");
            if (adTimeText) {
                const adTime = this.parseAdTime(adTimeText.textContent);
                if (adTime > 0) {
                    this.video.currentTime += adTime;
                    adStats.adsBlocked++;
                    this.updateStats();
                }
            }
        }

        installHuluAdBlocker() {
            const playhead = document.querySelector('.Timeline__playhead');
            if (!playhead || this.adObserver) return;

            this.adObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.target.classList.contains('Timeline__playhead--ad')) {
                        this.handleAd();
                    } else {
                        this.resetPlayback();
                    }
                });
            });

            this.adObserver.observe(playhead, {
                attributes: true,
                attributeFilter: ['class']
            });
            console.log('AdBlocker installed on Hulu');
        }

        skipDisneyPlusAds() {
            const adBadge = document.querySelector('.overlay_interstitials__badge');
            const adTimeDisplay = document.querySelector('.overlay_interstitials__content_time_display');

            if (adBadge && adTimeDisplay) {
                const adTime = this.parseAdTime(adTimeDisplay.textContent);
                if (adTime > 0) {
                    this.video.currentTime += adTime;
                    adStats.adsBlocked++;
                    this.updateStats();
                    console.log(`Skipped Disney+ ad of ${adTime} seconds.`);
                }
            }
        }

        handleAd() {
            if (this.video) {
                this.video.playbackRate = 16.0;
                this.video.volume = 0;
            }
        }

        resetPlayback() {
            if (this.video) {
                this.video.playbackRate = 1.0;
                this.video.volume = 1;
            }
        }

        parseAdTime(adTimeText) {
            const parts = adTimeText.split(':').map(Number);
            const adTime = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
            return isNaN(adTime) ? 0 : adTime;
        }

        updateStats() {
            chrome.runtime.sendMessage({
                type: 'UPDATE_STATS',
                adsBlocked: adStats.adsBlocked,
                timeSaved: adStats.timeSaved
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const controller = new VideoController();
        console.log('Universal Streaming AdBlock initialized');
    });
})();
