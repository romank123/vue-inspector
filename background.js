// background.js - фоновый скрипт расширения
let inspectorEnabled = false;

// При инициализации расширения
chrome.runtime.onInstalled.addListener(() => {
  // Устанавливаем исходное состояние
  chrome.storage.local.get(["inspectorEnabled"], (result) => {
    inspectorEnabled = result.inspectorEnabled || false;
    chrome.storage.local.set({ inspectorEnabled });
  });
});

// Обработка сообщений от content и popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Vue обнаружен на странице
  if (request.action === "vueDetected") {
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
  }
  // Инспектор готов
  else if (request.action === "inspectorReady") {
    sendResponse({ success: true });
  }
  // Запрос текущего состояния
  else if (request.action === "getState") {
    sendResponse({ enabled: inspectorEnabled });
  }
  // Обновление состояния из страницы
  else if (request.action === "updateInspectorState") {
    inspectorEnabled = request.enabled;
    chrome.storage.local.set({ inspectorEnabled });
    sendResponse({ success: true });
  }
  // Переключение инспектора
  else if (request.action === "toggleInspector") {
    inspectorEnabled = !inspectorEnabled;

    // Сохраняем состояние
    chrome.storage.local.set({ inspectorEnabled });

    // Отправляем состояние на активную вкладку
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "toggleInspector",
          enabled: inspectorEnabled,
        });
      }
    });

    sendResponse({ enabled: inspectorEnabled });
  }

  return true; // Важно для асинхронных ответов
});

// При активации вкладки проверяем, обнаружен ли Vue
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.action.getBadgeText({ tabId: activeInfo.tabId }, (text) => {
    if (text === "Vue") {
      chrome.action.enable(activeInfo.tabId);
    } else {
      // Если Vue не обнаружен, делаем кнопку серой
      chrome.action.setBadgeText({ text: "", tabId: activeInfo.tabId });
      chrome.action.setIcon({
        path: {
          16: "icons/icon-disabled-16.png",
          48: "icons/icon-disabled-48.png",
          128: "icons/icon-disabled-128.png",
        },
        tabId: activeInfo.tabId,
      });
    }
  });
});

// Обработчик выполнения расширения при клике на иконку
chrome.action.onClicked.addListener((tab) => {
  chrome.action.getBadgeText({ tabId: tab.id }, (text) => {
    if (text === "Vue") {
      // Если Vue обнаружен, переключаем инспектор
      inspectorEnabled = !inspectorEnabled;
      chrome.storage.local.set({ inspectorEnabled });

      chrome.tabs.sendMessage(tab.id, {
        action: "toggleInspector",
        enabled: inspectorEnabled,
      });
    }
  });
});
