// injected/vue-inspector.js
(function () {
  // Основное состояние инспектора
  const STORAGE_KEY = "vue-inspector-enabled";

  const inspectorState = {
    enabled: true, // По умолчанию включен при внедрении
    activeComponentData: null,
    activeComponentProps: null,
    activeComponentName: "",
    position: {
      left: 10,
      top: 10,
    },
    size: {
      width: 300,
      height: 400,
    },
    previousHeight: 400,
    expandedPaths: {
      props: new Set(),
      data: new Set(),
    },
    collapsed: false,
    activeTab: "props", // Активная вкладка
  };

  // Восстанавливаем сохраненные настройки
  try {
    const savedPosition = JSON.parse(
      localStorage.getItem("vue-inspector-position")
    );
    if (savedPosition) {
      inspectorState.position = savedPosition;
    }

    const savedSize = JSON.parse(localStorage.getItem("vue-inspector-size"));
    if (savedSize) {
      inspectorState.size = savedSize;
    }

    const previousHeight = localStorage.getItem(
      "vue-inspector-previous-height"
    );
    if (previousHeight) {
      inspectorState.previousHeight = parseInt(previousHeight, 10);
    }

    const savedExpandedState = JSON.parse(
      localStorage.getItem("vue-inspector-expanded")
    );
    if (savedExpandedState) {
      if (savedExpandedState.props) {
        inspectorState.expandedPaths.props = new Set(savedExpandedState.props);
      }
      if (savedExpandedState.data) {
        inspectorState.expandedPaths.data = new Set(savedExpandedState.data);
      }
    }

    const savedCollapsed = localStorage.getItem("vue-inspector-collapsed");
    if (savedCollapsed !== null) {
      inspectorState.collapsed = savedCollapsed === "true";
    }

    const savedTab = localStorage.getItem("vue-inspector-active-tab");
    if (savedTab) {
      inspectorState.activeTab = savedTab;
    }
  } catch (e) {
    console.warn("[Vue Inspector] Failed to parse saved settings", e);
  }

  // Сохраняем настройки
  function saveSettings() {
    localStorage.setItem(
      "vue-inspector-position",
      JSON.stringify(inspectorState.position)
    );
    localStorage.setItem(
      "vue-inspector-size",
      JSON.stringify(inspectorState.size)
    );
    localStorage.setItem(
      "vue-inspector-previous-height",
      String(inspectorState.previousHeight)
    );
    localStorage.setItem(
      "vue-inspector-collapsed",
      inspectorState.collapsed.toString()
    );
    localStorage.setItem("vue-inspector-active-tab", inspectorState.activeTab);

    const expandedState = {
      props: Array.from(inspectorState.expandedPaths.props),
      data: Array.from(inspectorState.expandedPaths.data),
    };
    localStorage.setItem(
      "vue-inspector-expanded",
      JSON.stringify(expandedState)
    );
  }

  // Сохраняем настройки при закрытии страницы
  window.addEventListener("beforeunload", saveSettings);

  // Создаем HTML шаблон для инспектора
  function createInspectorTemplate() {
    return `
        <div class="vue-inspector-header">
          <div class="vue-inspector-title">
            ${inspectorState.activeComponentName || "Vue Inspector"}
          </div>
          <div class="vue-inspector-actions">
            <button class="vue-inspector-button toggle-collapse" title="${
              inspectorState.collapsed ? "Развернуть" : "Свернуть"
            }">
              ${inspectorState.collapsed ? "▼" : "▲"}
            </button>
            <button class="vue-inspector-button toggle-inspector" title="Отключить инспектор">
              Disable
            </button>
          </div>
        </div>

        <div class="vue-inspector-content ${
          inspectorState.collapsed ? "hidden" : ""
        }">
          <div class="vue-inspector-tabs">
            <button class="vue-inspector-tab ${
              inspectorState.activeTab === "props" ? "active" : ""
            }" data-tab="props">
              Props
            </button>
            <button class="vue-inspector-tab ${
              inspectorState.activeTab === "data" ? "active" : ""
            }" data-tab="data">
              Data
            </button>
          </div>

          <div class="vue-inspector-tab-content">
            <div class="vue-inspector-tab-panel ${
              inspectorState.activeTab === "props" ? "active" : ""
            }" data-panel="props">
              ${
                inspectorState.activeComponentProps
                  ? ""
                  : '<div class="vue-inspector-empty">No props available</div>'
              }
            </div>

            <div class="vue-inspector-tab-panel ${
              inspectorState.activeTab === "data" ? "active" : ""
            }" data-panel="data">
              ${
                inspectorState.activeComponentData
                  ? ""
                  : '<div class="vue-inspector-empty">No data available</div>'
              }
            </div>
          </div>

          <div class="vue-inspector-footer">
            <div class="vue-inspector-help">
              Alt+Shift+I: toggle • Alt+Shift+C: collapse
            </div>
          </div>
        </div>
      `;
  }

  // Создаем HTML для древовидного узла
  function createTreeNodeHTML(name, value, path, tab, isRoot = false) {
    const type = typeof value;
    const isExpandable =
      (type === "object" && value !== null) ||
      (Array.isArray(value) && value.length > 0);

    const nodePath = isRoot ? name : path;
    const isExpanded = inspectorState.expandedPaths[tab].has(nodePath);

    let valueHTML = "";
    let previewHTML = "";

    if (!isExpandable) {
      // Форматируем значение для отображения
      let formattedValue = "undefined";
      let valueClass = "value-undefined";

      if (value === null) {
        formattedValue = "null";
        valueClass = "value-null";
      } else if (type === "string") {
        formattedValue = `"${String(value).replace(/"/g, '\\"')}"`;
        valueClass = "value-string";
      } else if (type === "number") {
        formattedValue = String(value);
        valueClass = "value-number";
      } else if (type === "boolean") {
        formattedValue = String(value);
        valueClass = "value-boolean";
      } else if (type === "function") {
        formattedValue = "ƒ()";
        valueClass = "value-function";
      } else if (value instanceof Date) {
        formattedValue = value.toISOString();
        valueClass = "value-string";
      }

      valueHTML = `<span class="tree-node-value"><span class="${valueClass}">${formattedValue}</span></span>`;
    } else {
      // Создаем превью объекта
      let preview = "{...}";

      if (Array.isArray(value)) {
        preview = value.length === 0 ? "[]" : `Array(${value.length})`;
      } else if (value instanceof Date) {
        preview = value.toISOString();
      } else if (value instanceof Set) {
        preview = `Set(${value.size})`;
      } else if (value instanceof Map) {
        preview = `Map(${value.size})`;
      } else if (type === "object" && value !== null) {
        const keys = Object.keys(value);
        if (keys.length === 0) {
          preview = "{}";
        } else if (keys.length <= 3) {
          preview = `{ ${keys.join(", ")} }`;
        } else {
          preview = `{ ${keys.slice(0, 3).join(", ")}, ... }`;
        }
      }

      previewHTML = `<span class="tree-node-preview">${preview}</span>`;
    }

    let toggleHTML = "";
    if (isExpandable) {
      toggleHTML = `<span class="tree-node-toggle">${
        isExpanded ? "▼" : "►"
      }</span>`;
    } else {
      toggleHTML = '<span class="tree-node-toggle-placeholder"></span>';
    }

    let childrenHTML = "";
    if (isExpandable && isExpanded) {
      childrenHTML = '<div class="tree-node-children">';

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const childPath = `${nodePath}.${index}`;
          childrenHTML += createTreeNodeHTML(
            String(index),
            item,
            childPath,
            tab
          );
        });
      } else if (type === "object" && value !== null) {
        Object.keys(value).forEach((key) => {
          const childPath = `${nodePath}.${key}`;
          childrenHTML += createTreeNodeHTML(key, value[key], childPath, tab);
        });
      }

      childrenHTML += "</div>";
    }

    return `
        <div class="tree-node" data-path="${nodePath}" data-tab="${tab}">
          <div class="tree-node-header">
            ${toggleHTML}
            <span class="tree-node-key">${name}:</span>
            ${valueHTML}
            ${previewHTML}
          </div>
          ${childrenHTML}
        </div>
      `;
  }

  // Обновляем содержимое панелей
  function updatePanels() {
    const propsPanel = document.querySelector(
      '.vue-inspector-tab-panel[data-panel="props"]'
    );
    const dataPanel = document.querySelector(
      '.vue-inspector-tab-panel[data-panel="data"]'
    );

    if (propsPanel && inspectorState.activeComponentProps) {
      propsPanel.innerHTML = createTreeNodeHTML(
        "props",
        inspectorState.activeComponentProps,
        "props",
        "props",
        true
      );
    } else if (propsPanel) {
      propsPanel.innerHTML =
        '<div class="vue-inspector-empty">No props available</div>';
    }

    if (dataPanel && inspectorState.activeComponentData) {
      dataPanel.innerHTML = createTreeNodeHTML(
        "data",
        inspectorState.activeComponentData,
        "data",
        "data",
        true
      );
    } else if (dataPanel) {
      dataPanel.innerHTML =
        '<div class="vue-inspector-empty">No data available</div>';
    }

    // Добавляем обработчики кликов по заголовкам узлов
    const treeNodeHeaders = document.querySelectorAll(".tree-node-header");
    treeNodeHeaders.forEach((header) => {
      header.addEventListener("click", handleTreeNodeClick);
    });
  }

  // Обработчик клика по заголовку узла дерева
  function handleTreeNodeClick(event) {
    const node = event.currentTarget.closest(".tree-node");
    if (!node) return;

    const path = node.dataset.path;
    const tab = node.dataset.tab;
    const hasToggle = node.querySelector(".tree-node-toggle");

    if (hasToggle) {
      // Переключаем состояние узла
      if (inspectorState.expandedPaths[tab].has(path)) {
        inspectorState.expandedPaths[tab].delete(path);
      } else {
        inspectorState.expandedPaths[tab].add(path);
      }

      // Обновляем панели
      updatePanels();
      saveSettings();
    }
  }

  // Создаем инспектор и добавляем на страницу
  function createInspector() {
    const container = document.getElementById("vue-inspector-container");
    if (!container) return;

    // Создаем элемент инспектора
    const inspector = document.createElement("div");
    inspector.className = `vue-inspector ${
      inspectorState.collapsed ? "collapsed" : ""
    }`;
    inspector.innerHTML = createInspectorTemplate();

    // Устанавливаем стили для позиционирования
    Object.assign(inspector.style, {
      top: `${inspectorState.position.top}px`,
      left: `${inspectorState.position.left}px`,
      width: `${inspectorState.size.width}px`,
    });

    // Устанавливаем высоту только если не свернут
    if (!inspectorState.collapsed) {
      inspector.style.height = `${inspectorState.size.height}px`;
    }

    container.innerHTML = "";
    container.appendChild(inspector);

    updatePanels();
    attachEventListeners(inspector);
  }

  // Прикрепляем обработчики событий к инспектору
  function attachEventListeners(inspector) {
    // Переключение вкладок
    const tabs = inspector.querySelectorAll(".vue-inspector-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const panels = inspector.querySelectorAll(".vue-inspector-tab-panel");
        panels.forEach((p) => p.classList.remove("active"));

        const panelName = tab.dataset.tab;
        const panel = inspector.querySelector(
          `.vue-inspector-tab-panel[data-panel="${panelName}"]`
        );
        if (panel) panel.classList.add("active");

        inspectorState.activeTab = panelName;
        saveSettings();
      });
    });

    // Сворачивание/разворачивание инспектора
    const collapseBtn = inspector.querySelector(".toggle-collapse");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        toggleCollapsed();
      });
    }

    // Отключение инспектора
    const toggleBtn = inspector.querySelector(".toggle-inspector");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        toggleInspector();
      });
    }

    // Перемещение инспектора
    const header = inspector.querySelector(".vue-inspector-header");
    if (header) {
      let isDragging = false;
      let dragStartX, dragStartY;
      let initialLeft, initialTop;

      header.addEventListener("mousedown", (e) => {
        // Игнорируем клики по кнопкам
        if (e.target.tagName === "BUTTON") return;

        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialLeft = inspectorState.position.left;
        initialTop = inspectorState.position.top;

        document.addEventListener("mousemove", handleDrag);
        document.addEventListener("mouseup", stopDrag);
      });

      function handleDrag(e) {
        if (!isDragging) return;

        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;

        // Обновляем позицию
        inspectorState.position.left = Math.max(
          0,
          Math.min(
            window.innerWidth - inspectorState.size.width,
            initialLeft + deltaX
          )
        );
        inspectorState.position.top = Math.max(
          0,
          Math.min(window.innerHeight - 50, initialTop + deltaY)
        );

        // Обновляем стили
        inspector.style.left = `${inspectorState.position.left}px`;
        inspector.style.top = `${inspectorState.position.top}px`;
      }

      function stopDrag() {
        if (isDragging) {
          isDragging = false;
          saveSettings();
          document.removeEventListener("mousemove", handleDrag);
          document.removeEventListener("mouseup", stopDrag);
        }
      }
    }

    // Изменение размера инспектора
    inspector.addEventListener("mousedown", (e) => {
      const rect = inspector.getBoundingClientRect();
      const isNearEdge =
        e.clientX > rect.right - 20 && e.clientY > rect.bottom - 20;

      if (isNearEdge && !inspectorState.collapsed) {
        startResize(e);
      }
    });

    // Обработка изменения размера
    function startResize(e) {
      e.preventDefault();

      let isResizing = true;
      let startX = e.clientX;
      let startY = e.clientY;
      let startWidth = inspectorState.size.width;
      let startHeight = inspectorState.size.height;

      function handleResize(e) {
        if (!isResizing) return;

        // Вычисляем новые размеры
        const newWidth = Math.max(200, startWidth + (e.clientX - startX));
        const newHeight = Math.max(150, startHeight + (e.clientY - startY));

        // Обновляем размеры
        inspectorState.size.width = newWidth;
        inspectorState.size.height = newHeight;

        // Обновляем стили
        inspector.style.width = `${newWidth}px`;
        inspector.style.height = `${newHeight}px`;
      }

      function stopResize() {
        if (isResizing) {
          isResizing = false;
          saveSettings();
          document.removeEventListener("mousemove", handleResize);
          document.removeEventListener("mouseup", stopResize);
        }
      }

      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);
    }

    // Добавляем горячие клавиши
    document.addEventListener("keydown", handleKeyDown);
  }

  // Обработчик горячих клавиш
  function handleKeyDown(e) {
    // Alt+Shift+I - Показать/скрыть инспектор
    if (e.altKey && e.shiftKey && e.key === "I") {
      toggleInspector();
    }

    // Alt+Shift+C - Свернуть/развернуть инспектор
    if (e.altKey && e.shiftKey && e.key === "C") {
      toggleCollapsed();
    }
  }

  // Переключение видимости инспектора
  function toggleInspector() {
    inspectorState.enabled = !inspectorState.enabled;

    const container = document.getElementById("vue-inspector-container");
    if (container) {
      if (inspectorState.enabled) {
        createInspector();
      } else {
        container.innerHTML = "";
        localStorage.setItem(STORAGE_KEY, "false");
      }
    }

    // Отправляем сообщение расширению
    window.postMessage(
      {
        source: "vue-inspector-page",
        action: "toggleInspector",
        enabled: inspectorState.enabled,
      },
      "*"
    );
  }

  // Переключение свернутого состояния
  function toggleCollapsed() {
    const inspector = document.querySelector(".vue-inspector");
    if (!inspector) return;

    if (!inspectorState.collapsed) {
      // Если сворачиваем, сохраняем текущую высоту
      inspectorState.previousHeight = inspectorState.size.height;
      inspector.classList.add("collapsed");
      inspector.style.height = "auto";

      // Скрываем содержимое
      const content = inspector.querySelector(".vue-inspector-content");
      if (content) content.classList.add("hidden");

      // Обновляем кнопку
      const btn = inspector.querySelector(".toggle-collapse");
      if (btn) {
        btn.textContent = "▼";
        btn.title = "Развернуть";
      }
    } else {
      // Если разворачиваем, восстанавливаем предыдущую высоту
      inspector.classList.remove("collapsed");
      inspector.style.height = `${inspectorState.previousHeight}px`;

      // Показываем содержимое
      const content = inspector.querySelector(".vue-inspector-content");
      if (content) content.classList.remove("hidden");

      // Обновляем кнопку
      const btn = inspector.querySelector(".toggle-collapse");
      if (btn) {
        btn.textContent = "▲";
        btn.title = "Свернуть";
      }
    }

    inspectorState.collapsed = !inspectorState.collapsed;
    saveSettings();
  }

  // Улучшенная функция inspectComponent
  function inspectComponent(component) {
    if (!component) return;

    console.log("[Vue Inspector] Inspecting component:", component);

    try {
      // Более надежное определение имени компонента
      let componentName = "Anonymous Component";

      // Vue 3 Composition API и Options API
      if (component.$options) {
        // Options API
        if (component.$options.name) {
          componentName = component.$options.name;
        } else if (component.$options.__file) {
          // Получаем имя из пути к файлу
          componentName = component.$options.__file
            .split("/")
            .pop()
            .split(".")[0];
        }
      } else if (component.$.type) {
        // Vue 3 Composition API
        if (typeof component.$.type === "object" && component.$.type.name) {
          componentName = component.$.type.name;
        } else if (
          typeof component.$.type === "function" &&
          component.$.type.name
        ) {
          componentName = component.$.type.name;
        }
      }

      // Получаем props компонента
      const props = {};

      // Vue 3 Options API
      if (component.$props) {
        Object.keys(component.$props).forEach((key) => {
          props[key] = component.$props[key];
        });
      }
      // Vue 3 Composition API
      else if (component.$ && component.$.props) {
        Object.keys(component.$.props).forEach((key) => {
          props[key] = component.$.props[key];
        });
      }

      // Получаем data компонента
      const data = {};

      // Vue 3 Options API
      if (component.$data) {
        Object.keys(component.$data).forEach((key) => {
          if (key !== "__ob__") {
            data[key] = component.$data[key];
          }
        });
      }
      // Vue 3 Composition API
      else if (component.$ && component.$.data) {
        Object.keys(component.$.data).forEach((key) => {
          data[key] = component.$.data[key];
        });
      }
      // Попытка получить setupState для Composition API
      else if (component.$ && component.$.setupState) {
        Object.keys(component.$.setupState).forEach((key) => {
          data[key] = component.$.setupState[key];
        });
      }

      console.log("[Vue Inspector] Component info:", {
        name: componentName,
        props: Object.keys(props).length > 0 ? props : null,
        data: Object.keys(data).length > 0 ? data : null,
      });

      // Обновляем состояние инспектора
      inspectorState.activeComponentName = componentName;
      inspectorState.activeComponentProps =
        Object.keys(props).length > 0 ? props : null;
      inspectorState.activeComponentData =
        Object.keys(data).length > 0 ? data : null;

      // Обновляем инспектор
      createInspector();
    } catch (error) {
      console.error("[Vue Inspector] Error inspecting component:", error);
    }
  }

  // Улучшенная функция поиска компонента Vue для элемента DOM
  function findVueComponentForElement(element) {
    let maxIterations = 10;
    console.log(
      "[Vue Inspector] Searching Vue component for element:",
      element
    );

    while (element && maxIterations > 0) {
      // Vue 2
      const comp = element.__vue__;
      if (comp) {
        console.log("[Vue Inspector] Found Vue 2 component:", comp);
        return comp;
      }

      // Vue 3
      const vnode = element.__vnode;
      if (vnode && vnode.component) {
        console.log(
          "[Vue Inspector] Found Vue 3 component via __vnode:",
          vnode.component
        );
        return vnode.component;
      }

      // Vue 3 (альтернативный способ)
      if (element.__vue_app__ && element.__vue_app__._instance) {
        const instance = element.__vue_app__._instance;
        console.log("[Vue Inspector] Found Vue 3 root instance:", instance);
        return instance;
      }

      // Альтернативная проверка для Vue 3
      const internalInstance = element.__vueParentComponent;
      if (internalInstance) {
        console.log(
          "[Vue Inspector] Found Vue 3 parent component:",
          internalInstance
        );
        return internalInstance.proxy || internalInstance;
      }

      // Поднимаемся вверх по DOM
      element = element.parentElement;
      maxIterations--;
    }

    console.log("[Vue Inspector] No Vue component found");
    return null;
  }

  // Добавляем функцию для инспектирования по клику (с нажатым Alt)
  function addClickInspector() {
    document.addEventListener(
      "click",
      function (event) {
        if (event.altKey) {
          console.log("[Vue Inspector] Alt+Click detected on:", event.target);

          // Проверяем наличие атрибутов data-v-*
          const dataVAttrs = Array.from(event.target.attributes).filter(
            (attr) => attr.name.startsWith("data-v-")
          );

          if (dataVAttrs.length > 0) {
            console.log(
              "[Vue Inspector] Element has Vue attributes:",
              dataVAttrs
            );
          }

          const component = findVueComponentForElement(event.target);
          if (component) {
            console.log("[Vue Inspector] Found component:", component);
            event.preventDefault();
            event.stopPropagation();
            inspectComponent(component);
          } else {
            console.warn(
              "[Vue Inspector] No Vue component found for this element"
            );
          }
        }
      },
      true
    );
  }

  // Добавьте эту функцию в vue-inspector.js
  function scanForVueComponents() {
    console.log("[Vue Inspector] Scanning for Vue elements...");

    // Ищем элементы с атрибутами data-v-*
    const vueElements = document.querySelectorAll("[data-v-]");
    if (vueElements.length > 0) {
      console.log(
        "[Vue Inspector] Found elements with Vue scoped CSS:",
        vueElements.length
      );

      // Проверяем каждый элемент
      vueElements.forEach((el, index) => {
        if (index < 5) {
          // Ограничиваем количество элементов для проверки
          const component = findVueComponentForElement(el);
          if (component) {
            console.log(
              `[Vue Inspector] Found component for element with data-v-:`,
              component
            );
            return;
          }
        }
      });
    }

    // Ищем элементы с атрибутом data-v-app
    const appElements = document.querySelectorAll("[data-v-app]");
    if (appElements.length > 0) {
      console.log(
        "[Vue Inspector] Found Vue 3 app elements:",
        appElements.length
      );
    }
  }

  // Инициализируем инструментирование Vue
  function instrumentVue() {
    console.log("[Vue Inspector] Starting Vue instrumentation");

    // Перехватываем Vue 3 createApp
    if (window.Vue && window.Vue.createApp) {
      const originalCreateApp = window.Vue.createApp;
      window.Vue.createApp = function (...args) {
        const app = originalCreateApp.apply(this, args);
        console.log("[Vue Inspector] Intercepted Vue 3 createApp:", app);

        // Добавляем глобальный миксин для Vue 3
        app.mixin({
          mounted() {
            console.log("[Vue Inspector] Component mounted:", this);
            // Добавляем метод $inspectComponent для компонентов
            this.$inspectComponent = function () {
              inspectComponent(this);
            };
          },
        });

        return app;
      };

      console.log("[Vue Inspector] Instrumented Vue 3 createApp");
    }
    // Ищем глобальный экземпляр Vue
    const Vue = window.Vue;

    if (Vue) {
      console.log("[Vue Inspector] Vue detected, instrumenting...");

      // Добавляем метод $inspectComponent
      if (Vue.prototype && !Vue.prototype.$inspectComponent) {
        Vue.prototype.$inspectComponent = function () {
          inspectComponent(this);
        };
      }
    }

    // Находим все корневые экземпляры Vue
    const vueElements = document.querySelectorAll("[data-v-app]");
    if (vueElements.length > 0) {
      console.log(
        "[Vue Inspector] Found Vue 3 applications:",
        vueElements.length
      );
    }

    // Добавляем возможность инспектирования по клику
    addClickInspector();
  }

  // Инициализация инспектора
  function initInspector() {
    // Создаем контейнер, если его еще нет
    if (!document.getElementById("vue-inspector-container")) {
      const container = document.createElement("div");
      container.id = "vue-inspector-container";
      document.body.appendChild(container);
    }

    // Инструментируем Vue
    instrumentVue();

    // Создаем инспектор
    createInspector();

    // Сканируем DOM на наличие компонентов Vue
    scanForVueComponents();

    // Отправляем сообщение о готовности
    window.postMessage(
      { source: "vue-inspector-page", action: "inspectorReady" },
      "*"
    );

    console.log("[Vue Inspector] Initialized");
  }

  // Обработчик сообщений от расширения
  window.addEventListener("message", (event) => {
    if (event.data && event.data.source === "vue-inspector-extension") {
      if (event.data.action === "init") {
        initInspector();
      } else if (event.data.action === "toggleInspector") {
        inspectorState.enabled = event.data.enabled;
        if (inspectorState.enabled) {
          createInspector();
        } else {
          const container = document.getElementById("vue-inspector-container");
          if (container) container.innerHTML = "";
        }
      }
    }
  });

  // Публикуем глобальный API для инспектора
  window.$vueInspector = {
    enable() {
      inspectorState.enabled = true;
      createInspector();
      localStorage.setItem(STORAGE_KEY, "true");
    },
    disable() {
      inspectorState.enabled = false;
      const container = document.getElementById("vue-inspector-container");
      if (container) container.innerHTML = "";
      localStorage.setItem(STORAGE_KEY, "false");
    },
    toggle() {
      toggleInspector();
    },
    collapse() {
      if (!inspectorState.collapsed) {
        toggleCollapsed();
      }
    },
    expand() {
      if (inspectorState.collapsed) {
        toggleCollapsed();
      }
    },
    inspect(component) {
      inspectComponent(component);
    },
  };

  // Самоинициализация
  initInspector();
})();
