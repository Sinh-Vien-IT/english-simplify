// Create context menu when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'simplify-text',
        title: '✨ Simplify Text',
        contexts: ['selection']
    });
});

// Common function to send text to the backend and show result
function processText(text, tabId) {
    // 1. Get the target level from storage (default to B1)
    chrome.storage.sync.get(['targetLevel'], async function(result) {
        const level = result.targetLevel || 'B1';
        
        // 2. Notify the content script to show a "Loading..." overlay
        chrome.tabs.sendMessage(tabId, {
            action: 'show_loading',
            originalText: text,
            level: level
        });
        
        // 3. Make the API request to our local Spring Boot backend
        try {
            const response = await fetch('http://localhost:8080/api/v1/simplify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    level: level
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            const data = await response.json();
            const simplifiedEnglish = data.simplifiedText;
            
            // 4. Fetch Vietnamese Translation via Google Translate Free API
            let vnTranslation = "";
            try {
                const gtUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(simplifiedEnglish)}`;
                const gtRes = await fetch(gtUrl);
                if (gtRes.ok) {
                    const gtData = await gtRes.json();
                    // Google returns an array of blocks, we concatenate the first elements
                    vnTranslation = gtData[0].map(item => item[0]).join('');
                } else {
                    vnTranslation = "Lỗi khi gọi Google Dịch.";
                }
            } catch (err) {
                vnTranslation = "Không thể kết nối Google Dịch.";
            }
            
            // 5. Send both results back to the content script
            chrome.tabs.sendMessage(tabId, {
                action: 'show_result',
                simplifiedText: simplifiedEnglish,
                translatedText: vnTranslation,
                cached: data.cached
            });
            
        } catch (error) {
            // If there's an error (e.g. backend not running)
            chrome.tabs.sendMessage(tabId, {
                action: 'show_error',
                error: error.message || 'Failed to connect to Local Backend'
            });
        }
    });
}

// 1. Handle Context Menu Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'simplify-text' && info.selectionText) {
        processText(info.selectionText, tab.id);
    }
});

// 2. Handle Messages from Content Script (Quick Action Button)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'trigger_simplify' && request.text) {
        processText(request.text, sender.tab.id);
        sendResponse({ status: "processing" });
    }
    return true;
});
