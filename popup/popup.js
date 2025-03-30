// popup.js - Исправленная версия
document.addEventListener("DOMContentLoaded", function () {
  console.log("[Vue Inspector] Popup opened");

  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  const inspectorToggle = document.getElementById("inspector-toggle");

  // Получаем текущее состояние инспектора
  function getInspectorState() {
    chrome.runtime.sendMessage({ action: "getState" }, function (response) {
      console.log("[Vue Inspector] Received state:", response);
      if (response) {
        inspectorToggle.checked = response.enabled;
      }
    });
  }

  // Проверка статуса Vue
  function checkVueStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];

      chrome.action.getBadgeText({ tabId: activeTab.id }, function (result) {
        console.log("[Vue Inspector] Badge text:", result);

        if (result === "Vue") {
          statusIndicator.classList.add("detected");
          statusIndicator.classList.remove("not-detected");
          statusText.textContent = "Vue обнаружен";
          inspectorToggle.disabled = false;
        } else {
          statusIndicator.classList.add("not-detected");
          statusIndicator.classList.remove("detected");
          statusText.textContent = "Vue не обнаружен";
          inspectorToggle.disabled = true;
        }
      });
    });
  }

  // Обработчик переключения состояния инспектора
  inspectorToggle.addEventListener("change", function () {
    console.log(
      "[Vue Inspector] Toggle clicked, new state will be:",
      !inspectorToggle.checked
    );

    chrome.runtime.sendMessage(
      {
        action: "toggleInspector",
      },
      function (response) {
        console.log("[Vue Inspector] Toggle response:", response);
        if (response) {
          inspectorToggle.checked = response.enabled;
        }
      }
    );
  });

  // Инициализация
  checkVueStatus();
  getInspectorState();
});
