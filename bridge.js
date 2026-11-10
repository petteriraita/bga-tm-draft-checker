document.addEventListener('tm-draft-stats-request', event => {
  const request = event.detail;
  chrome.runtime.sendMessage({type: 'stats', generation: request.generation, map: request.map, prelude: request.prelude}, result => {
    document.dispatchEvent(new CustomEvent('tm-draft-stats-response', {detail: {key: request.key, result: result || {error: chrome.runtime.lastError?.message || 'No response'}}}));
  });
});
