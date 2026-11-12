document.addEventListener('tm-draft-stats-request', event => {
  const request = event.detail;
  chrome.runtime.sendMessage({type: 'stats', generation: request.generation, map: request.map, prelude: request.prelude}, result => {
    document.dispatchEvent(new CustomEvent('tm-draft-stats-response', {detail: {key: request.key, result: result || {error: chrome.runtime.lastError?.message || 'No response'}}}));
  });
});

function publishEnabled() {
  chrome.storage.local.get({enabled: true}, ({enabled}) => document.dispatchEvent(new CustomEvent('tm-draft-enabled', {detail: enabled})));
}
document.addEventListener('tm-draft-get-enabled', publishEnabled);
document.addEventListener('tm-draft-set-enabled', event => chrome.storage.local.set({enabled: event.detail === true}));
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.enabled) publishEnabled(); });
publishEnabled();
