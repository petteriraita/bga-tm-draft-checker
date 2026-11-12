const enabled = document.getElementById('enabled');
chrome.storage.local.get({enabled: true}, saved => { enabled.checked = saved.enabled; });
enabled.addEventListener('change', () => chrome.storage.local.set({enabled: enabled.checked}));
