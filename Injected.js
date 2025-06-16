(function() {
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalFetch = window.fetch;

 
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._method = method;
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._url && this._url.includes('/api')) {
      const startTime = Date.now();
      
      this.addEventListener('load', function() {
        try {
          const responseData = {
            method: this._method,
            url: this._url,
            status: this.status,
            statusText: this.statusText,
            responseHeaders: this.getAllResponseHeaders(),
            requestBody: body,
            responseBody: this.responseText,
            responseTime: Date.now() - startTime,
            type: 'XMLHttpRequest'
          };

          window.postMessage({
            type: 'API_RESPONSE_CAPTURED',
            payload: responseData
          }, '*');
        } catch (error) {
          console.error('Error capturing XHR response:', error);
        }
      });
    }
    
    return originalXHRSend.apply(this, arguments);
  };

  
  window.fetch = function(url, options = {}) {
    const method = options.method || 'GET';
    
    if (url.includes('/api')) {
      const startTime = Date.now();
      
      return originalFetch.apply(this, arguments)
        .then(response => {
          
          const clonedResponse = response.clone();
          
          clonedResponse.text().then(responseBody => {
            try {
              const responseData = {
                method: method,
                url: url,
                status: response.status,
                statusText: response.statusText,
                responseHeaders: Array.from(response.headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\n'),
                requestBody: options.body,
                responseBody: responseBody,
                responseTime: Date.now() - startTime,
                type: 'fetch'
              };

              window.postMessage({
                type: 'API_RESPONSE_CAPTURED',
                payload: responseData
              }, '*');
            } catch (error) {
              console.error('Error capturing fetch response:', error);
            }
          });
          
          return response;
        });
    }
    
    return originalFetch.apply(this, arguments);
  };
})();
