// background.js - Исправленная версия
let inspectorEnabled = false;

// Инициализация
chrome.runtime.onInstalled.addListener(() => {
  console.log("[Vue Inspector] Extension installed");

  // Загружаем сохраненное состояние
  chrome.storage.local.get(["inspectorEnabled"], (result) => {
    inspectorEnabled = result.inspectorEnabled || false;
    console.log("[Vue Inspector] Initial state:", inspectorEnabled);
  });
});

// Улучшенная обработка сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Vue Inspector] Background received message:", request);

  if (request.action === "vueDetected") {
    console.log("[Vue Inspector] Vue detected on tab:", sender.tab.id);

    // Обновляем значок расширения
    chrome.action.setBadgeText({
      text: "Vue",
      tabId: sender.tab.id,
    });
    chrome.action.setBadgeBackgroundColor({
      color: "#41b883",
      tabId: sender.tab.id,
    });

    sendResponse({ success: true });
  } else if (request.action === "getState") {
    console.log("[Vue Inspector] Sending state:", inspectorEnabled);
    sendResponse({ enabled: inspectorEnabled });
  } else if (request.action === "toggleInspector") {
    inspectorEnabled = !inspectorEnabled;
    console.log("[Vue Inspector] Toggled to:", inspectorEnabled);

    // Сохраняем состояние
    chrome.storage.local.set({ inspectorEnabled });

    // Отправляем сообщение на активную вкладку
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        console.log("[Vue Inspector] Sending toggle to tab:", tabs[0].id);
        chrome.tabs
          .sendMessage(tabs[0].id, {
            action: "toggleInspector",
            enabled: inspectorEnabled,
          })
          .catch((err) => {
            console.error("[Vue Inspector] Error sending message:", err);
          });
      }
    });

    sendResponse({ enabled: inspectorEnabled });
  }

  return true; // Держим соединение открытым для асинхронных ответов
});
