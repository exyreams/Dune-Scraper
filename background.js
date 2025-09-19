/**
 * Background Service Worker
 * Handles extension lifecycle and cross-tab communication
 */

// Keep track of active tabs
let activeTabs = {};
let logs = [];

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details);
    
    // Set default settings
    chrome.storage.sync.get(['settings'], (result) => {
        if (!result.settings) {
            chrome.storage.sync.set({
                settings: {
                    autoStart: false,
                    showUI: true,
                    debugMode: false,
                    autoDownload: false,
                    maxPaginationAttempts: 100,
                    paginationDelay: 2000,
                    defaultFormat: 'json'
                }
            });
        }
    });
    
    // Create context menu items
    chrome.contextMenus.create({
        id: "scrapeDuneTable",
        title: "🕷️ Scrape Dune Table",
        contexts: ["page"],
        documentUrlPatterns: ["*://dune.com/*", "*://dune.xyz/*"]
    });
    
    chrome.contextMenus.create({
        id: "startMonitoring",
        title: "📡 Start Monitoring",
        contexts: ["page"],
        documentUrlPatterns: ["*://dune.com/*", "*://dune.xyz/*"]
    });
    
    chrome.contextMenus.create({
        id: "exportData",
        title: "💾 Export All Data",
        contexts: ["page"],
        documentUrlPatterns: ["*://dune.com/*", "*://dune.xyz/*"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case "scrapeDuneTable":
            chrome.tabs.sendMessage(tab.id, { action: 'scrapeTable' });
            break;
        case "startMonitoring":
            chrome.tabs.sendMessage(tab.id, { action: 'startMonitoring' });
            break;
        case "exportData":
            chrome.tabs.sendMessage(tab.id, { action: 'exportData', format: 'json' });
            break;
    }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'statsUpdate') {
        // Store stats for the tab
        activeTabs[sender.tab.id] = {
            url: sender.tab.url,
            title: sender.tab.title,
            stats: request.stats,
            isMonitoring: request.isMonitoring,
            isPaginating: request.isPaginating,
            lastUpdate: Date.now()
        };
        
        // Forward to popup if it's open
        chrome.runtime.sendMessage(request).catch(() => {
            // Popup is not open, ignore
        });
    }
    
    if (request.type === 'log') {
        // Store log
        logs.push({
            timestamp: Date.now(),
            tabId: sender.tab.id,
            message: request.message,
            level: request.level
        });
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs = logs.slice(-100);
        }
    }
    
    if (request.type === 'download') {
        // Handle downloads
        chrome.downloads.download({
            url: request.url,
            filename: request.filename,
            saveAs: request.saveAs || false
        });
    }
    
    if (request.type === 'getActiveTabs') {
        sendResponse({ tabs: activeTabs });
    }
    
    if (request.type === 'getLogs') {
        sendResponse({ logs: logs.filter(log => log.tabId === request.tabId) });
    }
});

// Clean up inactive tabs
chrome.tabs.onRemoved.addListener((tabId) => {
    delete activeTabs[tabId];
    // Clean up logs for this tab
    logs = logs.filter(log => log.tabId !== tabId);
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (tab.url.includes('dune.com') || tab.url.includes('dune.xyz')) {
            // Tab reloaded, clear its data
            delete activeTabs[tabId];
            
            // Inject content script if needed
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }).catch(err => console.error('Failed to inject script:', err));
        }
    }
});

// Handle extension icon click (when no popup)
chrome.action.onClicked.addListener((tab) => {
    if (tab.url && (tab.url.includes('dune.com') || tab.url.includes('dune.xyz'))) {
        // Toggle UI on the page
        chrome.tabs.sendMessage(tab.id, { action: 'toggleUI' });
    }
});

// Export function for other scripts
function getActiveTabStats(tabId) {
    return activeTabs[tabId] || null;
}

function getAllActiveTabs() {
    return activeTabs;
}

function getLogsForTab(tabId) {
    return logs.filter(log => log.tabId === tabId);
}