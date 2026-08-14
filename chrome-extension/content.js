let overlayElement = null;

// Inject CSS manually just in case Manifest doesn't hook into shadows
// But since we use simple global classes with namespace prefix, we just use DOM

function createOverlay(x, y) {
    // Remove existing
    if (overlayElement) {
        overlayElement.remove();
    }

    overlayElement = document.createElement('div');
    overlayElement.className = 'simplify-ext-overlay';
    
    // Attempt to position perfectly under the text selection
    // Add small offset relative to view window bounds
    const screenWidth = window.innerWidth;
    if (x + 350 > screenWidth) {
        x = screenWidth - 370; // Push left if it clips screen
    }
    
    overlayElement.style.left = `${Math.max(10, x)}px`;
    overlayElement.style.top = `${y + 15}px`; // 15px below the selection

    document.body.appendChild(overlayElement);
    
    // Trigger transition
    requestAnimationFrame(() => {
        overlayElement.classList.add('visible');
    });

    // Close when clicking outside
    document.addEventListener('mousedown', clickOutsideHandler);
}

function clickOutsideHandler(e) {
    if (overlayElement && !overlayElement.contains(e.target)) {
        closeOverlay();
    }
}

function closeOverlay() {
    if (overlayElement) {
        overlayElement.classList.remove('visible');
        setTimeout(() => {
            if (overlayElement) overlayElement.remove();
            overlayElement = null;
        }, 200);
        document.removeEventListener('mousedown', clickOutsideHandler);
    }
}

function renderLoading(level) {
    return `
        <div class="simplify-ext-header">
            <span class="simplify-ext-title">✨ AI Simplifying to ${level}...</span>
            <button class="simplify-ext-close" onclick="document.body.dispatchEvent(new Event('simplify-ext-close'))">&times;</button>
        </div>
        <div class="simplify-ext-content">
            <div class="simplify-ext-skeleton"></div>
            <div class="simplify-ext-skeleton"></div>
            <div class="simplify-ext-skeleton"></div>
        </div>
    `;
}

function renderResult(englishText, vnText, isCached) {
    const cacheBadge = isCached ? ' (⚡ Cached)' : '';
    // Format simple new lines securely
    const safeEnglish = englishText.replace(/\n/g, '<br>');
    const safeVn = vnText.replace(/\n/g, '<br>');

    return `
        <div class="simplify-ext-header">
            <span class="simplify-ext-title">✅ Result${cacheBadge}</span>
            <button class="simplify-ext-close" onclick="document.body.dispatchEvent(new Event('simplify-ext-close'))">&times;</button>
        </div>
        <div class="simplify-ext-content">
            <strong>🇬🇧 English Simplified:</strong>
            <p>${safeEnglish}</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 12px 0;">
            <strong>🇻🇳 Vietnamese Translation:</strong>
            <p style="color: #4b5563;">${safeVn}</p>
        </div>
    `;
}

function renderError(headerText, errorMsg) {
    return `
        <div class="simplify-ext-header">
            <span class="simplify-ext-title">❌ ${headerText}</span>
            <button class="simplify-ext-close" onclick="document.body.dispatchEvent(new Event('simplify-ext-close'))">&times;</button>
        </div>
        <div class="simplify-ext-content">
            <div class="simplify-ext-error">${errorMsg}</div>
        </div>
    `;
}

// Global listener for the injected close button
document.body.addEventListener('simplify-ext-close', closeOverlay);

// ─────────────────────────────────────────────────────────────────────────
// QUICK ACTION BUTTON LOGIC
// ─────────────────────────────────────────────────────────────────────────

let quickBtnElement = null;

function showQuickButton(x, y, text) {
    if (quickBtnElement) quickBtnElement.remove();

    quickBtnElement = document.createElement('button');
    quickBtnElement.className = 'simplify-ext-quickbtn visible';
    quickBtnElement.innerHTML = '✨ AI Simplify';
    
    // Position it slightly above the cursor/selection
    quickBtnElement.style.left = `${x}px`;
    quickBtnElement.style.top = `${y - 40}px`;

    quickBtnElement.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent text deselection
        e.stopPropagation();
        
        // Hide button, trigger the API
        quickBtnElement.remove();
        quickBtnElement = null;
        
        // Tell background to start fetching
        chrome.runtime.sendMessage({
            action: 'trigger_simplify',
            text: text
        });
    });

    document.body.appendChild(quickBtnElement);
}

// Listen to mouseup to detect text selection
document.addEventListener('mouseup', (e) => {
    // Don't spawn if clicking inside our own overlay or button
    if (overlayElement && overlayElement.contains(e.target)) return;
    if (quickBtnElement && quickBtnElement.contains(e.target)) return;

    // Small delay to allow browser to calculate selection
    setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 5) { // Only show for meaningful sentences
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Calculate center top of selection
            const x = window.scrollX + rect.left + (rect.width / 2) - 45; // 45 is approx half button width
            const y = window.scrollY + rect.top;
            
            showQuickButton(x, y, text);
        } else {
            if (quickBtnElement) {
                quickBtnElement.remove();
                quickBtnElement = null;
            }
        }
    }, 10);
});

document.addEventListener('mousedown', (e) => {
    // Hide quick button if clicking elsewhere
    if (quickBtnElement && !quickBtnElement.contains(e.target)) {
        quickBtnElement.remove();
        quickBtnElement = null;
    }
});

// ─────────────────────────────────────────────────────────────────────────
// MESSAGE LISTENER (from background.js)
// ─────────────────────────────────────────────────────────────────────────

// Listen to messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // 1. Where was the user's cursor / selection to pop the box near it?
    let selection = window.getSelection();
    let x = window.scrollX + (window.innerWidth / 2) - 175;
    let y = window.scrollY + 100;

    if (selection.rangeCount > 0 && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        x = window.scrollX + rect.left;
        y = window.scrollY + rect.bottom;
    }

    if (request.action === 'show_loading') {
        createOverlay(x, y);
        overlayElement.innerHTML = renderLoading(request.level);
    } 
    else if (request.action === 'show_result') {
        if (overlayElement) {
            overlayElement.innerHTML = renderResult(request.simplifiedText, request.translatedText, request.cached);
        }
    } 
    else if (request.action === 'show_error') {
        if (overlayElement) {
            overlayElement.innerHTML = renderError('Error Occurred', request.error);
        }
    }
    
    return true;
});
