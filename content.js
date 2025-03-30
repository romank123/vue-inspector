// content.js - Улучшенная версия
let inspectorInjected = false;

// Улучшенное обнаружение Vue
function detectVue() {
  return new Promise((resolve) => {
    // Пытаемся найти Vue немедленно
    if (
      window.__VUE__ ||
      window.__vue__ ||
      document.querySelector("[data-v-app]") ||
      !!window.Vue
    ) {
      resolve(true);
      return;
    }

    // Если не нашли сразу, проверяем каждые 300мс
    const checkInterval = setInterval(() => {
      if (
        window.__VUE__ ||
        window.__vue__ ||
        document.querySelector("[data-v-app]") ||
        !!window.Vue
      ) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 300);

    // Максимальное время ожидания
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 3000);
  });
}

// Инъекция инспектора
function injectInspector() {
  if (inspectorInjected) return;

  console.log("[Vue Inspector] Injecting inspector...");

  // Создаем контейнер для инспектора
  if (!document.getElementById("vue-inspector-container")) {
    const container = document.createElement("div");
    container.id = "vue-inspector-container";
    document.body.appendChild(container);
  }

  // Добавляем стили
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("injected/vue-inspector.css");
  document.head.appendChild(styleLink);

  // Создаем скрипт для внедрения инспектора
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected/vue-inspector.js");
  document.head.appendChild(script);

  // Отмечаем, что инспектор был внедрен
  inspectorInjected = true;

  // Отправляем сообщение о внедрении
  setTimeout(() => {
    window.postMessage(
      {
        source: "vue-inspector-extension",
        action: "init",
      },
      "*"
    );
  }, 100);
}

// Улучшенная коммуникация
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Vue Inspector] Message received:", request);

  if (request.action === "toggleInspector") {
    console.log("[Vue Inspector] Toggling inspector:", request.enabled);

    if (request.enabled && !inspectorInjected) {
      injectInspector();
    }

    window.postMessage(
      {
        source: "vue-inspector-extension",
        action: "toggleInspector",
        enabled: request.enabled,
      },
      "*"
    );

    sendResponse({ success: true });
  }

  return true;
});

// Обработка сообщений от внедренного скрипта
window.addEventListener("message", (event) => {
  if (event.data && event.data.source === "vue-inspector-page") {
    console.log("[Vue Inspector] Page message:", event.data);

    if (
      event.data.action === "vueDetected" ||
      event.data.action === "inspectorReady"
    ) {
      chrome.runtime.sendMessage(event.data);
    }
  }
});

// Инициализация
(async function init() {
  console.log("[Vue Inspector] Initializing...");

  const hasVue = await detectVue();

  if (hasVue) {
    console.log("[Vue Inspector] Vue detected");
    chrome.runtime.sendMessage({ action: "vueDetected" });

    // Проверяем, должен ли инспектор быть включен
    chrome.storage.local.get(["inspectorEnabled"], (result) => {
      if (result.inspectorEnabled) {
        console.log("[Vue Inspector] Inspector is enabled, injecting...");
        injectInspector();
      }
    });
  } else {
    console.log("[Vue Inspector] Vue not detected");
  }
})();
