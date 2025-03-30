// content.js - скрипт, выполняющийся на целевой странице

// Определяем, есть ли Vue на странице
function detectVue() {
  return new Promise((resolve) => {
    // Проверяем наличие Vue каждые 500мс
    const checkInterval = setInterval(() => {
      const hasVue =
        window.__VUE__ ||
        window.__vue__ ||
        window.__VUE_DEVTOOLS_GLOBAL_HOOK__ ||
        document.querySelector("[data-v-app]"); // Проверяем атрибут Vue 3

      if (hasVue) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 500);

    // Максимальное время ожидания - 5 секунд
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 5000);
  });
}

// Проверяем, был ли инспектор уже внедрен
let inspectorInjected = false;

// Внедряем инспектор на страницу
function injectInspector() {
  if (inspectorInjected) return;

  // Создаем скрипт для внедрения инспектора
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected/vue-inspector.js");
  (document.head || document.documentElement).appendChild(script);

  // Добавляем стили
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("injected/vue-inspector.css");
  (document.head || document.documentElement).appendChild(styleLink);

  // Удаляем скрипт после загрузки
  script.onload = function () {
    script.remove();
    inspectorInjected = true;

    // Создаем элемент-контейнер для инспектора, если его еще нет
    if (!document.getElementById("vue-inspector-container")) {
      const container = document.createElement("div");
      container.id = "vue-inspector-container";
      document.body.appendChild(container);
    }

    // Отправляем команду для инициализации инспектора
    window.postMessage(
      { source: "vue-inspector-extension", action: "init" },
      "*"
    );
  };
}

// Переключение состояния инспектора
function toggleInspector(enabled) {
  // Если инспектор еще не внедрен, делаем это
  if (!inspectorInjected && enabled) {
    injectInspector();
  }

  // Отправляем сообщение странице
  window.postMessage(
    {
      source: "vue-inspector-extension",
      action: "toggleInspector",
      enabled: enabled,
    },
    "*"
  );
}

// Получаем сообщения от background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleInspector") {
    toggleInspector(request.enabled);
  }
  return true;
});

// Слушаем сообщения от страницы
window.addEventListener("message", (event) => {
  if (event.data && event.data.source === "vue-inspector-page") {
    if (event.data.action === "vueDetected") {
      chrome.runtime.sendMessage({ action: "vueDetected" });
    }
  }
});

// Основная функция инициализации
async function init() {
  const hasVue = await detectVue();
  if (hasVue) {
    // Сообщаем background.js о наличии Vue
    chrome.runtime.sendMessage({ action: "vueDetected" });

    // Проверяем, должен ли инспектор быть включен
    chrome.storage.local.get(["inspectorEnabled"], (result) => {
      if (result.inspectorEnabled) {
        injectInspector();
      }
    });
  }
}

// Запускаем инициализацию
init();
