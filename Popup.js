document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  const methodFilter = document.getElementById('methodFilter');
  const responsesList = document.getElementById('responsesList');
  const emptyState = document.getElementById('emptyState');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('closeModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  let allResponses = [];
  let filteredResponses = [];

  
  loadApiResponses();

  
  searchInput.addEventListener('input', filterResponses);
  methodFilter.addEventListener('change', filterResponses);
  clearBtn.addEventListener('click', clearAllData);
  exportBtn.addEventListener('click', exportData);
  closeModal.addEventListener('click', hideModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) hideModal();
  });

 
  function loadApiResponses() {
    chrome.runtime.sendMessage({ action: 'getApiResponses' }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        return;
      }
      
      allResponses = response.responses || [];
      filterResponses();
    });
  }

  function filterResponses() {
    const searchTerm = searchInput.value.toLowerCase();
    const methodFilter = document.getElementById('methodFilter').value;

    filteredResponses = allResponses.filter(response => {
      const matchesSearch = !searchTerm || 
        response.url.toLowerCase().includes(searchTerm) ||
        response.method.toLowerCase().includes(searchTerm) ||
        response.status.toString().includes(searchTerm);

      const matchesMethod = !methodFilter || response.method === methodFilter;

      return matchesSearch && matchesMethod;
    });

    renderResponses();
  }

  
  function renderResponses() {
    if (filteredResponses.length === 0) {
      responsesList.innerHTML = '';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    
    responsesList.innerHTML = filteredResponses.map(response => {
      const statusClass = getStatusClass(response.status);
      const methodClass = `method-${response.method.toLowerCase()}`;
      const timestamp = new Date(response.timestamp).toLocaleString();
      
      return `
        <div class="response-item" data-id="${response.id}">
          <div class="response-header">
            <span class="method-badge ${methodClass}">${response.method}</span>
            <span class="status-badge ${statusClass}">${response.status}</span>
          </div>
          <div class="response-url">${response.url}</div>
          <div class="response-meta">
            <div class="response-time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              ${response.responseTime}ms
            </div>
            <div class="response-timestamp">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${timestamp}
            </div>
          </div>
        </div>
      `;
    }).join('');

    
    document.querySelectorAll('.response-item').forEach(item => {
      item.addEventListener('click', function() {
        const responseId = this.dataset.id;
        const response = allResponses.find(r => r.id == responseId);
        if (response) {
          showResponseDetails(response);
        }
      });
    });
  }

  
  function getStatusClass(status) {
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 400) return 'status-error';
    return 'status-warning';
  }

  
  function showResponseDetails(response) {
    modalTitle.textContent = `${response.method} ${response.url}`;
    
    const formatJson = (str) => {
      try {
        return JSON.stringify(JSON.parse(str), null, 2);
      } catch {
        return str;
      }
    };

    const createCopyButton = (content, label) => {
      return `<button class="copy-btn" onclick="copyToClipboard('${btoa(content)}', this)">${label}</button>`;
    };

    modalBody.innerHTML = `
      <div class="detail-section">
        <h3>Request Info</h3>
        <div class="detail-content">Method: ${response.method}
URL: ${response.url}
Status: ${response.status} ${response.statusText}
Response Time: ${response.responseTime}ms
Type: ${response.type}
Timestamp: ${new Date(response.timestamp).toLocaleString()}</div>
      </div>

      ${response.requestBody ? `
        <div class="detail-section">
          <h3>Request Body</h3>
          <div class="detail-content">${formatJson(response.requestBody)}</div>
          ${createCopyButton(response.requestBody, 'Copy Request')}
        </div>
      ` : ''}

      ${response.responseHeaders ? `
        <div class="detail-section">
          <h3>Response Headers</h3>
          <div class="detail-content">${response.responseHeaders}</div>
          ${createCopyButton(response.responseHeaders, 'Copy Headers')}
        </div>
      ` : ''}

      <div class="detail-section">
        <h3>Response Body</h3>
        <div class="detail-content">${formatJson(response.responseBody)}</div>
        ${createCopyButton(response.responseBody, 'Copy Response')}
      </div>
    `;

    modal.classList.add('show');
  }

  
  function hideModal() {
    modal.classList.remove('show');
  }

  
  function clearAllData() {
    if (confirm('Are you sure you want to clear all captured API responses?')) {
      chrome.runtime.sendMessage({ action: 'clearApiResponses' }, function(response) {
        if (response.success) {
          allResponses = [];
          filterResponses();
        }
      });
    }
  }

  
  function exportData() {
    if (allResponses.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      count: allResponses.length,
      responses: allResponses
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-responses-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  
  window.copyToClipboard = function(encodedContent, button) {
    const content = atob(encodedContent);
    navigator.clipboard.writeText(content).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.style.background = 'rgba(16, 185, 129, 0.2)';
      button.style.color = '#10B981';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = 'rgba(59, 130, 246, 0.2)';
        button.style.color = '#3B82F6';
      }, 1000);
    });
  };

  
  let lastHash = "";
setInterval(() => {
  chrome.runtime.sendMessage({ action: 'getApiResponses' }, function(response) {
    const jsonStr = JSON.stringify(response.responses || []);
    const hash = btoa(jsonStr);

    if (hash !== lastHash) {
      lastHash = hash;
      allResponses = response.responses || [];
      filterResponses();
    }
  });
}, 2000);

});
