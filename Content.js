(function() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
})();


window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'API_RESPONSE_CAPTURED') {
   
    chrome.runtime.sendMessage({
      action: 'saveApiResponse',
      data: event.data.payload
    });
  }
});
