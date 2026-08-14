document.addEventListener('DOMContentLoaded', () => {
    const levelSelect = document.getElementById('level-select');
    const testBtn = document.getElementById('test-btn');
    const statusMsg = document.getElementById('status-msg');

    // Load saved level or default to B1
    chrome.storage.sync.get(['targetLevel'], function(result) {
        if (result.targetLevel) {
            levelSelect.value = result.targetLevel;
        }
    });

    // Save level when changed
    levelSelect.addEventListener('change', () => {
        const value = levelSelect.value;
        chrome.storage.sync.set({ targetLevel: value }, function() {
            showStatus('Level saved!', 'success');
        });
    });

    // Test API Connection
    testBtn.addEventListener('click', async () => {
        statusMsg.textContent = 'Testing connection...';
        statusMsg.className = 'status-msg';
        
        try {
            // Test health endpoint
            const res = await fetch('http://localhost:8080/api/v1/simplify/health');
            if (res.ok) {
                showStatus('Backend connected successfully!', 'success');
            } else {
                showStatus(`Backend error: ${res.status}`, 'error');
            }
        } catch (error) {
            showStatus('Connection failed. Is Spring Boot running?', 'error');
        }
    });

    function showStatus(text, type) {
        statusMsg.textContent = text;
        statusMsg.className = `status-msg ${type}`;
        setTimeout(() => {
            statusMsg.textContent = '';
        }, 3000);
    }
});
