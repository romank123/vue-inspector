// popup/popup.js
document.addEventListener("DOMContentLoaded", function () {
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  const inspectorToggle = document.getElementById("inspector-toggle");

  // Проверяем, обнаружен ли Vue на странице
  function checkVueStatus() {
    // Получаем текущую активную вкладку
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];

      // Запрашиваем бейдж текущей вкладки
      chrome.action.getBadgeText({ tabId: activeTab.id }, function (result) {
        if (result === "Vue") {
          // Vue обнаружен
          statusIndicator.classList.add("detected");
          statusIndicator.classList.remove("not-detected");
          statusText.textContent = "Vue обнаружен";
          inspectorToggle.disabled = false;
        } else {
          // Vue не обнаружен
          statusIndicator.classList.add("not-detected");
          statusIndicator.classList.remove("detected");
          statusText.textContent = "Vue не обнаружен";
          inspectorToggle.disabled = true;
        }
      });
    });
  }

  // Получаем текущее состояние инспектора
  function getInspectorState() {
    chrome.runtime.sendMessage({ action: "getState" }, function (response) {
      if (response) {
        inspectorToggle.checked = response.enabled;
      }
    });
  }

  // Обработчик переключения состояния инспектора
  inspectorToggle.addEventListener("change", function () {
    chrome.runtime.sendMessage(
      {
        action: "toggleInspector",
      },
      function (response) {
        if (response) {
          inspectorToggle.checked = response.enabled;
        }
      }
    );
  });

  // Информация о версии
  const versionElement = document.getElementById("version");
  if (versionElement) {
    chrome.runtime
      .getManifest()
      .then((manifest) => {
        versionElement.textContent = `v${manifest.version}`;
      })
      .catch(() => {
        // Fallback для старых версий Chrome
        const manifest = chrome.runtime.getManifest();
        versionElement.textContent = `v${manifest.version}`;
      });
  }

  // Инициализация
  checkVueStatus();
  getInspectorState();
});
