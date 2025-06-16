chrome.runtime.onInstalled.addListener(() => {
  console.log('API Response Capturer installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveApiResponse') {
    saveApiResponse(request.data, sender.tab);
  } else if (request.action === 'getApiResponses') {
    getApiResponses(sendResponse);
    return true; 
  } else if (request.action === 'clearApiResponses') {
    clearApiResponses(sendResponse);
    return true;
  }
});

async function saveApiResponse(data, tab) {
  try {
    const result = await chrome.storage.local.get(['apiResponses']);
    const responses = result.apiResponses || [];
    
    const newResponse = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      tabId: tab.id,
      tabUrl: tab.url,
      tabTitle: tab.title,
      ...data
    };
    
    responses.unshift(newResponse);
   
    if (responses.length > 100) {
      responses.splice(100);
    }
    
    await chrome.storage.local.set({ apiResponses: responses });
    
    
    chrome.action.setBadgeText({
      text: responses.length.toString(),
      tabId: tab.id
    });
    chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
    
  } catch (error) {
    console.error('Error saving API response:', error);
  }
}

async function getApiResponses(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['apiResponses']);
    sendResponse({ responses: result.apiResponses || [] });
  } catch (error) {
    console.error('Error getting API responses:', error);
    sendResponse({ responses: [] });
  }
}

async function clearApiResponses(sendResponse) {
  try {
    await chrome.storage.local.set({ apiResponses: [] });
    
    
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error clearing API responses:', error);
    sendResponse({ success: false });
  }
}
