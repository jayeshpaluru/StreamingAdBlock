// background.js
const state = {
    injectedTabs: new Set(),
    statistics: {
        adsBlocked: 0,
        timeSaved: 0
    }
};

chrome.runtime.onInstalled.addListener(() => {
    console.log('Universal Streaming AdBlock extension installed');
    chrome.storage.local.set({
        settings: {
            skipAds: true,
            skipIntro: true,
            skipCredits: true
        },
        statistics: state.statistics
    });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const streamingDomains = [
        'hulu.com',
        'disneyplus.com',
        'netflix.com',
        'amazon.com',
        'primevideo.com',
        'crunchyroll.com',
        'max.com'
    ];
    
    if (changeInfo.status === 'complete' && 
        tab.url && 
        streamingDomains.some(domain => tab.url.includes(domain)) && 
        !state.injectedTabs.has(tabId)) {

        try {
            const tabInfo = await chrome.tabs.get(tabId);
            if (tabInfo.status === 'complete' && !tabInfo.url.startsWith('chrome://')) {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                state.injectedTabs.add(tabId);
                console.log('Content script injected into tab:', tabId);
            }
        } catch (error) {
            console.error('Error accessing tab or injecting script:', error);
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_STATS') {
        state.statistics.adsBlocked += message.adsBlocked || 0;
        state.statistics.timeSaved += message.timeSaved || 0;
        chrome.storage.local.set({ statistics: state.statistics });
    }
    sendResponse({ success: true });
});

chrome.tabs.onRemoved.addListener((tabId) => {
    state.injectedTabs.delete(tabId);
});
