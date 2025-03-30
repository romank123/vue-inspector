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
      // Углубленно исследуем структуру компонента
      const explorationResult = exploreComponentStructure(component);

      // Извлекаем имя компонента
      let componentName = extractComponentName(component);

      // Извлекаем props используя найденные пути
      let props = {};
      if (explorationResult.props) {
        props = extractProps(component, explorationResult.props);
      } else {
        props = extractProps(component);
      }

      // Извлекаем data используя найденные пути
      let data = {};
      if (explorationResult.data || explorationResult.state) {
        data = extractData(
          component,
          explorationResult.data || explorationResult.state
        );
      } else {
        data = extractData(component);
      }

      console.log("[Vue Inspector] Extracted component data:", {
        name: componentName,
        props,
        data,
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

  // Извлечение имени компонента
  function extractComponentName(component) {
    let name = "Anonymous Component";

    try {
      // Проверяем различные пути для получения имени

      // Vue 2/3 Options API
      if (component.$options) {
        if (component.$options.name) {
          return component.$options.name;
        }
        if (component.$options._componentTag) {
          return component.$options._componentTag;
        }
        if (component.$options.__file) {
          return component.$options.__file.split("/").pop().split(".")[0];
        }
      }

      // Vue 3 Composition API
      if (component.$) {
        if (component.$.type) {
          if (typeof component.$.type === "object" && component.$.type.name) {
            return component.$.type.name;
          }
          if (typeof component.$.type === "function" && component.$.type.name) {
            return component.$.type.name;
          }
          if (component.$.type.displayName) {
            return component.$.type.displayName;
          }
        }

        if (component.$.vnode && component.$.vnode.type) {
          if (
            typeof component.$.vnode.type === "object" &&
            component.$.vnode.type.name
          ) {
            return component.$.vnode.type.name;
          }
          if (typeof component.$.vnode.type === "string") {
            return component.$.vnode.type;
          }
        }
      }

      // Vue 3 internal instance
      if (component.type) {
        if (typeof component.type === "object" && component.type.name) {
          return component.type.name;
        }
        if (typeof component.type === "function" && component.type.name) {
          return component.type.name;
        }
        if (typeof component.type === "string") {
          return component.type;
        }
      }

      // Proxy объект
      if (component.proxy && component.proxy.$options) {
        if (component.proxy.$options.name) {
          return component.proxy.$options.name;
        }
      }

      // Используем template, если он указан в компоненте
      if (component.$options && component.$options.template) {
        const match = component.$options.template.match(/<([a-z][\w-]*)/i);
        if (match && match[1]) {
          return match[1] + " (from template)";
        }
      }
    } catch (e) {
      console.error("[Vue Inspector] Error extracting component name:", e);
    }

    return name;
  }

  // Извлечение props компонента
  function extractProps(component) {
    const props = {};

    try {
      // Vue 2/3 Options API
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

      // Vue 3 internal instance
      else if (component.props) {
        Object.keys(component.props).forEach((key) => {
          props[key] = component.props[key];
        });
      }

      // Через Proxy
      else if (component.proxy && component.proxy.$props) {
        Object.keys(component.proxy.$props).forEach((key) => {
          props[key] = component.proxy.$props[key];
        });
      }
    } catch (e) {
      console.error("[Vue Inspector] Error extracting props:", e);
    }

    return props;
  }

  // Доработанная функция для извлечения данных компонента
  function extractData(component) {
    const data = {};

    // Журналируем весь компонент для отладки
    console.log(
      "[Vue Inspector] Full component for data extraction:",
      component
    );

    try {
      // Функция, которая проверяет объект и извлекает данные
      function extractFromObject(obj, prefix = "") {
        if (!obj || typeof obj !== "object") return;

        // Пропускаем реактивные метаданные и функции
        const skipProps = [
          "__ob__",
          "__v_skip",
          "__v_isRef",
          "__v_isShallow",
          "__v_raw",
        ];

        Object.entries(obj).forEach(([key, value]) => {
          // Пропускаем служебные ключи
          if (skipProps.includes(key)) return;
          // Пропускаем функции
          if (typeof value === "function") return;
          // Пропускаем специальные символы Vue
          if (typeof key === "symbol") return;

          const fullKey = prefix ? `${prefix}.${key}` : key;

          // Добавляем значение в данные
          data[fullKey] = value;
        });
      }

      // Извлекаем данные из различных мест компонента

      // 1. Vue 2/3 Options API - $data
      if (component.$data) {
        extractFromObject(component.$data);
      }

      // 2. Vue 3 Composition API - setupState
      if (component.$ && component.$.setupState) {
        extractFromObject(component.$.setupState);
      } else if (component.setupState) {
        extractFromObject(component.setupState);
      }

      // 3. Vue 3 Composition API - data
      if (component.$ && component.$.data) {
        extractFromObject(component.$.data);
      } else if (component.data) {
        extractFromObject(component.data);
      }

      // 4. Vue 3 через proxy
      if (component.proxy) {
        if (component.proxy.$data) {
          extractFromObject(component.proxy.$data);
        }

        // Проверяем другие свойства через proxy
        const proxyProps = Object.getOwnPropertyNames(component.proxy).filter(
          (prop) =>
            !prop.startsWith("$") &&
            !prop.startsWith("_") &&
            typeof component.proxy[prop] !== "function"
        );

        proxyProps.forEach((prop) => {
          data[prop] = component.proxy[prop];
        });
      }

      // 5. Vue 3 - через ctx (контекст)
      if (component.ctx) {
        const ctxProps = Object.getOwnPropertyNames(component.ctx).filter(
          (prop) =>
            !prop.startsWith("$") &&
            !prop.startsWith("_") &&
            typeof component.ctx[prop] !== "function"
        );

        ctxProps.forEach((prop) => {
          if (!(prop in data)) {
            // Избегаем дублирования
            data[prop] = component.ctx[prop];
          }
        });
      }

      // 6. Попробуем получить данные напрямую из компонента
      // Это потенциально может дать доступ к реактивным объектам
      try {
        const componentProps = Object.getOwnPropertyNames(component).filter(
          (prop) =>
            !prop.startsWith("$") &&
            !prop.startsWith("_") &&
            !["component", "ctx", "setupState", "props", "data"].includes(
              prop
            ) &&
            typeof component[prop] !== "function"
        );

        componentProps.forEach((prop) => {
          if (!(prop in data)) {
            // Избегаем дублирования
            data[prop] = component[prop];
          }
        });
      } catch (err) {
        console.warn(
          "[Vue Inspector] Error extracting direct component properties:",
          err
        );
      }

      // 7. Попытка получить computeds при их наличии
      if (component.$options && component.$options.computed) {
        Object.keys(component.$options.computed).forEach((key) => {
          if (!(key in data) && component[key] !== undefined) {
            data[key + " (computed)"] = component[key];
          }
        });
      } else if (component.$ && component.$.exposeProxy) {
        // Vue 3.2+ exposeProxy для setup()
        extractFromObject(component.$.exposeProxy);
      }
    } catch (e) {
      console.error("[Vue Inspector] Error extracting data:", e);
    }

    console.log("[Vue Inspector] Extracted data result:", data);
    return data;
  }

  // Улучшенная функция поиска Vue компонента с использованием итераторов
  function findVueComponentForElement(element) {
    let maxIterations = 15;
    console.log(
      "[Vue Inspector] Searching Vue component for element:",
      element
    );

    // Функция для поиска компонента "сверху-вниз" - через дерево DOM
    function findTopDown(el) {
      // Проверяем текущий элемент
      const component = getVueComponentFromElement(el);
      if (component) return component;

      // Проверяем дочерние элементы
      if (el.children && el.children.length > 0) {
        for (let i = 0; i < el.children.length; i++) {
          const childComponent = getVueComponentFromElement(el.children[i]);
          if (childComponent) return childComponent;
        }
      }

      return null;
    }

    // Функция для получения Vue компонента из DOM элемента
    function getVueComponentFromElement(el) {
      if (!el) return null;

      // Vue 2.x - через __vue__
      if (el.__vue__) {
        console.log("[Vue Inspector] Found component via __vue__:", el.__vue__);
        return el.__vue__;
      }

      // Vue 3.x - прямой доступ к инстансу
      if (el._vnode && el._vnode.component) {
        console.log(
          "[Vue Inspector] Found component via _vnode.component:",
          el._vnode.component
        );
        return el._vnode.component;
      }

      // Vue 3.x - доступ через __vueParentComponent
      if (el.__vueParentComponent) {
        console.log(
          "[Vue Inspector] Found component via __vueParentComponent:",
          el.__vueParentComponent
        );
        return el.__vueParentComponent.proxy || el.__vueParentComponent;
      }

      // Vue 3.x - доступ через app instance
      if (el.__vue_app__ && el.__vue_app__._instance) {
        console.log(
          "[Vue Inspector] Found root component via __vue_app__:",
          el.__vue_app__._instance
        );
        return el.__vue_app__._instance;
      }

      // Vue 3.x - через internal component
      if (el.__vnode && el.__vnode.component) {
        return el.__vnode.component;
      }

      // Другие свойства компонентов Vue
      const vueProps = [
        "__vue_",
        "__composition_",
        "__instance_",
        "_vue",
        "_component",
        "_vueInstance",
        "_vnode",
        "_instance",
        "_vueComponent",
      ];

      for (const prop of vueProps) {
        if (el[prop]) {
          console.log(`[Vue Inspector] Found component via ${prop}:`, el[prop]);
          return el[prop];
        }
      }

      return null;
    }

    // Основная логика поиска
    if (!element) return null;

    // 1. Пробуем найти компонент непосредственно в этом элементе
    let component = getVueComponentFromElement(element);
    if (component) return component;

    // 2. Поднимаемся вверх по дереву DOM
    let currentEl = element;
    let iterations = 0;

    while (currentEl && iterations < maxIterations) {
      currentEl = currentEl.parentElement;
      if (!currentEl) break;

      component = getVueComponentFromElement(currentEl);
      if (component) return component;

      iterations++;
    }

    // 3. Если у элемента есть атрибуты Vue, ищем через кастомную логику
    const vueAttrs = Array.from(element.attributes || []).filter((attr) =>
      attr.name.startsWith("data-v-")
    );

    if (vueAttrs.length > 0) {
      console.log(
        "[Vue Inspector] Element has Vue-specific attributes:",
        vueAttrs
      );

      // Ищем главный элемент компонента
      const componentRoot = findVueRootElement(element, vueAttrs[0].name);
      if (componentRoot && componentRoot !== element) {
        component = getVueComponentFromElement(componentRoot);
        if (component) return component;
      }
    }

    // 4. Попробуем поискать глобально в DOM
    // Получаем все потенциальные Vue компоненты на странице
    const potentialElements = document.querySelectorAll(
      "[data-v-app], [data-v-]"
    );
    for (const el of potentialElements) {
      component = getVueComponentFromElement(el);
      if (component) {
        // Проверим, содержит ли этот компонент наш элемент
        if (el.contains(element)) {
          console.log(
            "[Vue Inspector] Found component via global search:",
            component
          );
          return component;
        }
      }
    }

    // Если найти не удалось, возвращаем null
    console.warn("[Vue Inspector] Could not find Vue component for element");
    return null;
  }

  // Функция поиска корневого элемента компонента по атрибуту data-v-*
  function findVueRootElement(element, attrName) {
    // Получаем значение атрибута
    const attrValue = element.getAttribute(attrName);
    if (!attrValue) return null;

    // Ищем все элементы с таким же атрибутом
    const selector = `[${attrName}="${attrValue}"]`;
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) return null;

    // Ищем самый верхний элемент, который все еще содержит наш элемент
    let highestElement = null;
    let shortestPath = Infinity;

    for (const el of elements) {
      // Проверяем, содержит ли этот элемент наш элемент
      if (el.contains(element)) {
        // Вычисляем "путь" от элемента до нашего элемента
        let path = 0;
        let current = element;
        while (current && current !== el) {
          path++;
          current = current.parentElement;
        }

        // Если путь короче, обновляем высший элемент
        if (path < shortestPath) {
          shortestPath = path;
          highestElement = el;
        }
      }
    }

    if (highestElement) {
      console.log(
        "[Vue Inspector] Found potential component root element:",
        highestElement
      );
    }

    return highestElement;
  }

  // Улучшенная функция поиска Vue компонента для элемента DOM
  function findVueComponentForElement(element) {
    let maxIterations = 15; // Увеличиваем количество итераций
    console.log(
      "[Vue Inspector] Searching Vue component for element:",
      element
    );

    if (!element) return null;

    // Функция для проверки элемента на наличие Vue компонента
    function checkElement(el) {
      // 1. Проверка на Vue 2.x
      if (el.__vue__) {
        console.log(
          "[Vue Inspector] Found Vue 2 component via __vue__:",
          el.__vue__
        );
        return el.__vue__;
      }

      // 2. Проверка на Vue 3.x
      if (el.__vnode && el.__vnode.component) {
        console.log(
          "[Vue Inspector] Found Vue 3 component via __vnode:",
          el.__vnode.component
        );
        return el.__vnode.component;
      }

      // 3. Проверка на Vue 3 root
      if (el.__vue_app__ && el.__vue_app__._instance) {
        console.log(
          "[Vue Inspector] Found Vue 3 root instance:",
          el.__vue_app__._instance
        );
        return el.__vue_app__._instance;
      }

      // 4. Проверка на Vue 3 через __vueParentComponent
      if (el.__vueParentComponent) {
        console.log(
          "[Vue Inspector] Found Vue 3 component via __vueParentComponent:",
          el.__vueParentComponent
        );
        return el.__vueParentComponent.proxy || el.__vueParentComponent;
      }

      // 5. Проверка на альтернативные свойства Vue
      const vueProps = [
        "_vnode",
        "_instance",
        "_vueProxy",
        "_self",
        "$el",
        "$options",
      ];
      for (const prop of vueProps) {
        if (el[prop]) {
          console.log(
            `[Vue Inspector] Found potential Vue component via ${prop}:`,
            el[prop]
          );
          return el[prop];
        }
      }

      return null;
    }

    // Сначала проверяем сам элемент
    let component = checkElement(element);
    if (component) return component;

    // Затем проверяем атрибуты, чтобы найти подсказки о компоненте
    const vueAttrs = Array.from(element.attributes || []).filter((attr) =>
      attr.name.startsWith("data-v-")
    );

    if (vueAttrs.length > 0) {
      console.log("[Vue Inspector] Element has Vue attributes:", vueAttrs);

      // Если есть атрибуты Vue, это может помочь в диагностике
      const dataVId = vueAttrs.find((attr) => attr.name === "data-v-id");
      if (dataVId) {
        console.log("[Vue Inspector] Found data-v-id:", dataVId.value);
      }
    }

    // Проверяем DOM вверх по иерархии
    let currentEl = element;
    while (currentEl && maxIterations > 0) {
      // Проверяем родительский элемент
      currentEl = currentEl.parentElement;
      if (!currentEl) break;

      component = checkElement(currentEl);
      if (component) return component;

      maxIterations--;
    }

    // Если ничего не нашли через DOM, попробуем через соседние элементы
    // Иногда нужный компонент связан не с родителем, а с соседним элементом
    const siblings = element.parentElement?.children;
    if (siblings && siblings.length > 0) {
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i] !== element) {
          component = checkElement(siblings[i]);
          if (component) {
            console.log(
              "[Vue Inspector] Found component in sibling element:",
              component
            );
            return component;
          }
        }
      }
    }

    // Используем альтернативный подход для поиска через атрибуты data-v-*
    if (vueAttrs.length > 0) {
      const dataVValue = vueAttrs[0].value || vueAttrs[0].name.split("-")[2];
      if (dataVValue) {
        // Ищем элементы с тем же атрибутом Vue в DOM
        const selector = `[${vueAttrs[0].name}]`;
        const relatedElements = document.querySelectorAll(selector);

        if (relatedElements.length > 0) {
          console.log(
            `[Vue Inspector] Found ${relatedElements.length} related elements with same Vue scope`
          );

          // Проверяем каждый родственный элемент
          for (const relEl of relatedElements) {
            if (relEl !== element) {
              component = checkElement(relEl);
              if (component) {
                console.log(
                  "[Vue Inspector] Found component in related element:",
                  component
                );
                return component;
              }
            }
          }
        }
      }
    }

    console.log("[Vue Inspector] No Vue component found for this element");
    return null;
  }

  // Улучшенная функция обработки Alt+Click
  function addClickInspector() {
    console.log("[Vue Inspector] Adding click inspector");

    // Удаляем существующий обработчик
    document.removeEventListener("click", handleInspectorClick, true);

    // Добавляем новый обработчик
    document.addEventListener("click", handleInspectorClick, true);

    // Добавляем эту переменную для отслеживания ранее подсвеченного элемента
    let previousHighlightedElement = null;

    function handleInspectorClick(event) {
      if (!event.altKey) return; // Только для Alt+Click

      console.log("[Vue Inspector] Alt+Click обнаружен на:", event.target);

      // Предотвращаем стандартное поведение
      event.preventDefault();
      event.stopPropagation();

      // Удаляем подсветку с предыдущего элемента, если он существует
      if (
        previousHighlightedElement &&
        previousHighlightedElement !== event.target
      ) {
        previousHighlightedElement.style.outline =
          previousHighlightedElement._originalOutline || "";
        delete previousHighlightedElement._originalOutline;
      }

      // Сохраняем оригинальный стиль контура перед его изменением
      event.target._originalOutline = event.target.style.outline;

      // Добавляем подсветку к кликнутому элементу
      event.target.style.outline = "2px solid #41b883";

      // Обновляем ссылку на текущий подсвеченный элемент
      previousHighlightedElement = event.target;

      // Ищем компонент Vue
      const component = findVueComponentForElement(event.target);

      if (component) {
        console.log(
          "[Vue Inspector] Найден компонент для инспекции:",
          component
        );
        inspectComponent(component);
      } else {
        console.warn(
          "[Vue Inspector] Компонент Vue не найден для кликнутого элемента"
        );
        // Показываем уведомление пользователю
        showNotification("Компонент Vue не найден для этого элемента");
      }

      // Мы НЕ будем удалять подсветку после таймаута,
      // так как хотим, чтобы она оставалась видимой до клика на другой элемент
    }

    // Функция для отображения временного уведомления
    function showNotification(message) {
      const notification = document.createElement("div");
      notification.textContent = message;
      notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #41b883;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-family: sans-serif;
      font-size: 14px;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

      document.body.appendChild(notification);

      // Удаляем уведомление через 3 секунды
      setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transition = "opacity 0.3s";
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }
  }

  // Функция для безопасного получения глубоко вложенных свойств
  function deepGet(obj, path) {
    if (!obj || !path) return undefined;

    const parts = typeof path === "string" ? path.split(".") : path;
    let current = obj;

    for (let i = 0; i < parts.length; i++) {
      if (current === undefined || current === null) return undefined;
      current = current[parts[i]];
    }

    return current;
  }

  // Функция для рекурсивного исследования компонента
  function exploreComponentStructure(component, maxDepth = 2) {
    if (!component) return null;

    console.log("[Vue Inspector] Exploring component structure");

    const result = {
      options: null,
      data: null,
      props: null,
      state: null,
      instance: null,
      paths: [],
    };

    // Функция для безопасного рекурсивного поиска объектов
    function explore(obj, path = [], depth = 0) {
      if (depth > maxDepth) return;
      if (!obj || typeof obj !== "object") return;

      // Запись путей доступа к интересующим свойствам
      const interestingKeys = [
        "$data",
        "data",
        "setupState",
        "$props",
        "props",
        "$options",
        "options",
        "ctx",
        "proxy",
        "setup",
      ];

      Object.keys(obj).forEach((key) => {
        const fullPath = [...path, key];
        const pathString = fullPath.join(".");

        if (interestingKeys.includes(key)) {
          result.paths.push({
            path: pathString,
            type: key,
          });
        }

        try {
          if (obj[key] && typeof obj[key] === "object") {
            // Если это $data, $props или подобное, запоминаем отдельно
            if (key === "$data" || key === "data") {
              result.data = obj[key];
            } else if (key === "$props" || key === "props") {
              result.props = obj[key];
            } else if (key === "$options" || key === "options") {
              result.options = obj[key];
            } else if (key === "setupState") {
              result.state = obj[key];
            } else if (key === "ctx" || key === "proxy") {
              result.instance = obj[key];
            }

            // Рекурсивно исследуем объект
            explore(obj[key], fullPath, depth + 1);
          }
        } catch (e) {
          // Игнорируем ошибки доступа к свойствам
        }
      });
    }

    try {
      explore(component);
    } catch (e) {
      console.error("[Vue Inspector] Error exploring component:", e);
    }

    console.log("[Vue Inspector] Component exploration result:", result);
    return result;
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
    clearHighlights() {
      if (previousHighlightedElement) {
        previousHighlightedElement.style.outline =
          previousHighlightedElement._originalOutline || "";
        delete previousHighlightedElement._originalOutline;
        previousHighlightedElement = null;
      }
    },
  };

  // Самоинициализация
  initInspector();
})();
