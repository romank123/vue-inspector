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

  // function createTreeNodeHTML(name, value, path, tab, isRoot = false) {
  //   const type = typeof value;
  //   const isExpandable =
  //     (type === "object" && value !== null) ||
  //     (Array.isArray(value) && value.length > 0);

  //   const nodePath = isRoot ? name : path;
  //   const isExpanded = inspectorState.expandedPaths[tab].has(nodePath);

  //   let valueHTML = "";
  //   let previewHTML = "";

  //   if (!isExpandable) {
  //     // Форматируем значение для отображения
  //     let formattedValue = "undefined";
  //     let valueClass = "value-undefined";

  //     if (value === null) {
  //       formattedValue = "null";
  //       valueClass = "value-null";
  //     } else if (type === "string") {
  //       formattedValue = `"${String(value).replace(/"/g, '\\"')}"`;
  //       valueClass = "value-string";
  //     } else if (type === "number") {
  //       formattedValue = String(value);
  //       valueClass = "value-number";
  //     } else if (type === "boolean") {
  //       formattedValue = String(value);
  //       valueClass = "value-boolean";
  //     } else if (type === "function") {
  //       formattedValue = "ƒ()";
  //       valueClass = "value-function";
  //     } else if (value instanceof Date) {
  //       formattedValue = value.toISOString();
  //       valueClass = "value-string";
  //     }

  //     valueHTML = `<span class="tree-node-value"><span class="${valueClass}">${formattedValue}</span></span>`;
  //   } else {
  //     // Создаем превью объекта
  //     let preview = "{...}";

  //     if (Array.isArray(value)) {
  //       preview = value.length === 0 ? "[]" : `Array(${value.length})`;
  //     } else if (value instanceof Date) {
  //       preview = value.toISOString();
  //     } else if (value instanceof Set) {
  //       preview = `Set(${value.size})`;
  //     } else if (value instanceof Map) {
  //       preview = `Map(${value.size})`;
  //     } else if (type === "object" && value !== null) {
  //       const keys = Object.keys(value);
  //       if (keys.length === 0) {
  //         preview = "{}";
  //       } else if (keys.length <= 3) {
  //         preview = `{ ${keys.join(", ")} }`;
  //       } else {
  //         preview = `{ ${keys.slice(0, 3).join(", ")}, ... }`;
  //       }
  //     }

  //     previewHTML = `<span class="tree-node-preview">${preview}</span>`;
  //   }

  //   let toggleHTML = "";
  //   if (isExpandable) {
  //     toggleHTML = `<span class="tree-node-toggle">${
  //       isExpanded ? "▼" : "►"
  //     }</span>`;
  //   } else {
  //     toggleHTML = '<span class="tree-node-toggle-placeholder"></span>';
  //   }

  //   let childrenHTML = "";
  //   if (isExpandable && isExpanded) {
  //     childrenHTML = '<div class="tree-node-children">';

  //     if (Array.isArray(value)) {
  //       value.forEach((item, index) => {
  //         const childPath = `${nodePath}.${index}`;
  //         childrenHTML += createTreeNodeHTML(
  //           String(index),
  //           item,
  //           childPath,
  //           tab
  //         );
  //       });
  //     } else if (type === "object" && value !== null) {
  //       Object.keys(value).forEach((key) => {
  //         const childPath = `${nodePath}.${key}`;
  //         childrenHTML += createTreeNodeHTML(key, value[key], childPath, tab);
  //       });
  //     }

  //     childrenHTML += "</div>";
  //   }

  //   return `
  //       <div class="tree-node" data-path="${nodePath}" data-tab="${tab}">
  //         <div class="tree-node-header">
  //           ${toggleHTML}
  //           <span class="tree-node-key">${name}:</span>
  //           ${valueHTML}
  //           ${previewHTML}
  //         </div>
  //         ${childrenHTML}
  //       </div>
  //     `;
  // }

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
      const explorationResult = exploreComponentStructure(component, 3); // Увеличиваем глубину поиска

      // Извлекаем имя компонента
      let componentName = extractComponentName(component);

      // Определяем тип компонента (Vue 2 или Vue 3, Options API или Composition API)
      const componentType = determineComponentType(component);
      console.log(`[Vue Inspector] Component type: ${componentType}`);

      // Подробно логируем все найденные пути для диагностики
      if (explorationResult.paths && explorationResult.paths.length > 0) {
        console.log(
          "[Vue Inspector] Found component paths:",
          explorationResult.paths
        );
      }

      // Извлекаем props используя найденные пути и улучшенный алгоритм
      let props = {};
      if (explorationResult.props) {
        props = extractProps(component, explorationResult.props);
      } else {
        props = extractProps(component);
      }

      // Если props не найдены, пробуем альтернативные подходы
      if (Object.keys(props).length === 0) {
        // Проверяем все пути, которые могут содержать props
        const propsPaths = explorationResult.paths
          .filter((p) => p.type.includes("prop") || p.path.includes("prop"))
          .map((p) => p.path);

        console.log(
          "[Vue Inspector] Trying alternative props paths:",
          propsPaths
        );

        // Пробуем каждый путь
        for (const path of propsPaths) {
          const altProps = extractProps(component, path);
          if (Object.keys(altProps).length > 0) {
            props = altProps;
            console.log(
              `[Vue Inspector] Found props via alternative path ${path}:`,
              props
            );
            break;
          }
        }

        // Если все еще нет props, используем эвристический подход
        if (Object.keys(props).length === 0) {
          props = extractPropsHeuristically(component);
        }
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

  // Функция для определения типа компонента Vue
  function determineComponentType(component) {
    if (!component) return "Unknown";

    // Проверки для Vue 3
    if (
      component.$ ||
      component.setupState ||
      component.setup ||
      (component.proxy && component.ctx)
    ) {
      if (component.setupState || component.setup) {
        return "Vue 3 (Composition API)";
      }
      return "Vue 3 (Options API)";
    }

    // Проверки для Vue 2
    if (component.$options || component.$data || component.$props) {
      return "Vue 2 (Options API)";
    }

    // Проверки для Nuxt
    if (
      component.$nuxt ||
      (component.$options &&
        component.$options.__file &&
        component.$options.__file.includes("nuxt"))
    ) {
      return "Nuxt (Vue 2)";
    }

    if (component.nuxtContext || (component.$ && component.$.nuxtContext)) {
      return "Nuxt (Vue 3)";
    }

    return "Unknown Vue Component";
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

  // Улучшенная функция обработки значений props

  // Улучшенная функция extractProps с фильтрацией HTML-атрибутов
  function extractProps(component, customPropsPath = null) {
    const props = {};

    try {
      console.log(
        "[Vue Inspector] Extracting props from component:",
        component
      );

      // Список HTML атрибутов, которые НЕ являются Vue props
      const commonHTMLAttributes = new Set([
        // Распространенные HTML атрибуты, которые не следует считать props
        "id",
        "class",
        "style",
        "href",
        "src",
        "alt",
        "title",
        "role",
        "tabindex",
        "aria-label",
        "aria-hidden",
        "aria-expanded",
        "aria-controls",
        "aria-selected",
        "aria-checked",
        "aria-disabled",
        "target",
        "rel",
        "type",
        "name",
        "value",
        "placeholder",
        "disabled",
        "readonly",
        "checked",
        "selected",
        "multiple",
        "colspan",
        "rowspan",
        "width",
        "height",
        "align",
        "valign",
        "cellpadding",
        "cellspacing",
        "border",
        "bgcolor",
        "color",
        "action",
        "method",
        "enctype",
        "autocomplete",
        "maxlength",
        "minlength",
        "max",
        "min",
        "step",
        "pattern",
        "required",
        "autofocus",
        "spellcheck",
        "lang",

        // Обработчики событий
        "onclick",
        "onchange",
        "onsubmit",
        "onreset",
        "oninput",
        "onfocus",
        "onblur",
        "onkeyup",
        "onkeydown",
        "onkeypress",
        "onmouseenter",
        "onmouseleave",
        "onmouseover",
        "onmouseout",
        "onmousemove",
        "onmousedown",
        "onmouseup",
        "ondrag",
        "ondragstart",
        "ondragend",
        "ondragenter",
        "ondragleave",
        "ondragover",
        "ondrop",
      ]);

      // Функция для фильтрации обычных HTML атрибутов
      function filterHTMLAttributes(propsObj) {
        if (!propsObj || typeof propsObj !== "object") return {};

        const filteredProps = {};
        for (const key in propsObj) {
          // Пропускаем обычные HTML атрибуты и дата-атрибуты
          if (
            !commonHTMLAttributes.has(key) &&
            !key.startsWith("data-") &&
            !key.startsWith("v-") &&
            !key.startsWith(":") &&
            !key.startsWith("@")
          ) {
            filteredProps[key] = propsObj[key];
          }
        }

        return filteredProps;
      }

      // Функция для правильной обработки значений props
      function processProps(propsObj) {
        if (!propsObj || typeof propsObj !== "object") return {};

        // Сначала фильтруем обычные HTML атрибуты
        const filteredProps = filterHTMLAttributes(propsObj);

        const result = {};
        for (const key in filteredProps) {
          try {
            // Получаем значение свойства
            const value = filteredProps[key];

            // Особая обработка для реактивных объектов Vue
            if (
              value &&
              typeof value === "object" &&
              (value.__v_isRef || value.__v_isReactive)
            ) {
              // Для Vue 3 реактивных объектов пытаемся получить raw значение
              if (value.value !== undefined) {
                result[key] = value.value;
              } else if (value.rawValue !== undefined) {
                result[key] = value.rawValue;
              } else if (value.__v_raw !== undefined) {
                result[key] = value.__v_raw;
              } else {
                // Если не удается получить raw значение, используем clone или прямое значение
                const plainValue = deepClone(value);
                result[key] = plainValue;
              }
            } else {
              // Для обычных значений
              result[key] = value;
            }
          } catch (propError) {
            console.warn(
              `[Vue Inspector] Error processing prop ${key}:`,
              propError
            );
            result[key] = "[Error: Cannot access property value]";
          }
        }

        return result;
      }

      // Глубокое клонирование объекта для обхода циклических ссылок и Proxy
      function deepClone(obj, visited = new WeakMap()) {
        // Базовые случаи: примитивы и null/undefined
        if (obj === null || obj === undefined || typeof obj !== "object") {
          return obj;
        }

        // Обработка циклических ссылок
        if (visited.has(obj)) {
          return visited.get(obj);
        }

        // Специальные классы
        if (obj instanceof Date) {
          return new Date(obj);
        }
        if (obj instanceof RegExp) {
          return new RegExp(obj);
        }
        if (obj instanceof Map) {
          const result = new Map();
          visited.set(obj, result);
          for (const [key, value] of obj.entries()) {
            result.set(deepClone(key, visited), deepClone(value, visited));
          }
          return result;
        }
        if (obj instanceof Set) {
          const result = new Set();
          visited.set(obj, result);
          for (const value of obj.values()) {
            result.add(deepClone(value, visited));
          }
          return result;
        }

        // Обработка массивов
        if (Array.isArray(obj)) {
          const result = [];
          visited.set(obj, result);
          for (let i = 0; i < obj.length; i++) {
            try {
              result[i] = deepClone(obj[i], visited);
            } catch (e) {
              result[i] = `[Error cloning item: ${e.message}]`;
            }
          }
          return result;
        }

        // Обработка Vue реактивных объектов
        const isVueReactive = obj.__v_isReactive || obj.__v_isRef;
        if (isVueReactive) {
          try {
            // Пытаемся получить raw значение для Vue 3 реактивных объектов
            if (obj.value !== undefined) {
              return deepClone(obj.value, visited);
            }
            if (obj.__v_raw !== undefined) {
              return deepClone(obj.__v_raw, visited);
            }
          } catch (e) {
            console.warn(
              "[Vue Inspector] Error accessing reactive property:",
              e
            );
          }
        }

        // Обработка обычных объектов
        try {
          const result = Array.isArray(obj) ? [] : {};
          visited.set(obj, result);

          // Получаем все собственные свойства, включая символы
          const props = [
            ...Object.getOwnPropertyNames(obj),
            ...Object.getOwnPropertySymbols(obj),
          ];

          for (const prop of props) {
            // Пропускаем служебные свойства Vue и прототипы
            if (
              prop === "__proto__" ||
              prop === "constructor" ||
              (typeof prop === "string" &&
                (prop.startsWith("__v_") || prop.startsWith("_")))
            ) {
              continue;
            }

            try {
              const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
              if (descriptor.get && !descriptor.set) {
                // Только геттер без сеттера - может быть computed property
                try {
                  result[prop] = deepClone(obj[prop], visited);
                } catch (e) {
                  result[prop] = "[Computed Property]";
                }
              } else if (descriptor.get || descriptor.set) {
                // Пропускаем другие аксессоры
                result[prop] = "[Getter/Setter]";
              } else if (typeof obj[prop] === "function") {
                // Пропускаем методы
                result[prop] = "[Function]";
              } else {
                // Обычные свойства
                result[prop] = deepClone(obj[prop], visited);
              }
            } catch (propError) {
              result[prop] = `[Error: ${propError.message}]`;
            }
          }

          return result;
        } catch (objError) {
          console.warn("[Vue Inspector] Error cloning object:", objError);
          return "[Complex Object]";
        }
      }

      // Если указан кастомный путь для props, используем его
      if (customPropsPath && typeof customPropsPath === "string") {
        const customProps = deepGet(component, customPropsPath);
        if (customProps && typeof customProps === "object") {
          const processedProps = processProps(customProps);
          if (Object.keys(processedProps).length > 0) {
            console.log(
              "[Vue Inspector] Props found via custom path:",
              processedProps
            );
            return processedProps;
          }
        }
      }

      // Проверяем ожидаемые props, определенные в компоненте
      let expectedProps = new Set();

      // Vue 3: через component.type.props
      if (component.type && component.type.props) {
        if (Array.isArray(component.type.props)) {
          component.type.props.forEach((prop) => expectedProps.add(prop));
        } else if (typeof component.type.props === "object") {
          Object.keys(component.type.props).forEach((prop) =>
            expectedProps.add(prop)
          );
        }
      }
      // Vue 2: через $options.props
      else if (component.$options && component.$options.props) {
        if (Array.isArray(component.$options.props)) {
          component.$options.props.forEach((prop) => expectedProps.add(prop));
        } else if (typeof component.$options.props === "object") {
          Object.keys(component.$options.props).forEach((prop) =>
            expectedProps.add(prop)
          );
        }
      }

      // Функция для фильтрации по ожидаемым props
      function filterByExpectedProps(propsObj) {
        if (
          !propsObj ||
          typeof propsObj !== "object" ||
          expectedProps.size === 0
        ) {
          return propsObj; // Если нет ожидаемых props, возвращаем как есть
        }

        const filteredProps = {};
        for (const key in propsObj) {
          if (expectedProps.has(key)) {
            filteredProps[key] = propsObj[key];
          }
        }

        return filteredProps;
      }

      // Vue 2/3 Options API через $props
      if (component.$props) {
        const processedProps = processProps(component.$props);
        if (Object.keys(processedProps).length > 0) {
          console.log(
            "[Vue Inspector] Props found via $props:",
            processedProps
          );
          return processedProps;
        }
      }

      // Vue 3 $.props (Composition API)
      if (component.$ && component.$.props) {
        const processedProps = processProps(component.$.props);
        if (Object.keys(processedProps).length > 0) {
          console.log(
            "[Vue Inspector] Props found via $.props:",
            processedProps
          );
          return processedProps;
        }
      }

      // Vue 3 internal instance props
      if (component.props) {
        // Если у нас есть список ожидаемых props, сначала применяем его
        let propsToProcess =
          expectedProps.size > 0
            ? filterByExpectedProps(component.props)
            : component.props;

        const processedProps = processProps(propsToProcess);
        if (Object.keys(processedProps).length > 0) {
          console.log(
            "[Vue Inspector] Props found via component.props:",
            processedProps
          );
          return processedProps;
        }
      }

      // Vue 3 через proxy
      if (component.proxy && component.proxy.$props) {
        const processedProps = processProps(component.proxy.$props);
        if (Object.keys(processedProps).length > 0) {
          console.log(
            "[Vue Inspector] Props found via proxy.$props:",
            processedProps
          );
          return processedProps;
        }
      }

      // Vue 3 vnode.props - с особой осторожностью, так как может содержать HTML атрибуты
      if (component.vnode && component.vnode.props) {
        let propsToProcess = {};

        // Если у нас есть список ожидаемых props, используем его для фильтрации
        if (expectedProps.size > 0) {
          for (const key in component.vnode.props) {
            if (expectedProps.has(key)) {
              propsToProcess[key] = component.vnode.props[key];
            }
          }
        } else {
          // Иначе фильтруем хотя бы очевидные не-prop атрибуты
          for (const key in component.vnode.props) {
            if (
              !key.startsWith("on") &&
              key !== "ref" &&
              key !== "key" &&
              !commonHTMLAttributes.has(key) &&
              !key.startsWith("data-")
            ) {
              propsToProcess[key] = component.vnode.props[key];
            }
          }
        }

        const processedProps = processProps(propsToProcess);
        if (Object.keys(processedProps).length > 0) {
          console.log(
            "[Vue Inspector] Props found via vnode.props (filtered):",
            processedProps
          );
          return processedProps;
        }
      }

      // Аналогично обрабатываем и другие источники props...

      // Через $options.propsData (Vue 2)
      if (component.$options && component.$options.propsData) {
        const processedProps = processProps(component.$options.propsData);
        if (Object.keys(processedProps).length > 0) {
          console.log(
            "[Vue Inspector] Props found via $options.propsData:",
            processedProps
          );
          return processedProps;
        }
      }

      // По определениям props в Vue 2
      if (component.$options && component.$options.props) {
        const propDefinitions = component.$options.props;
        const extractedProps = {};

        Object.keys(propDefinitions).forEach((key) => {
          if (component[key] !== undefined) {
            extractedProps[key] = component[key];
          } else if (
            typeof propDefinitions[key] === "object" &&
            propDefinitions[key].default !== undefined
          ) {
            // Показываем хотя бы дефолтное значение
            if (typeof propDefinitions[key].default === "function") {
              try {
                extractedProps[key] = propDefinitions[key].default();
              } catch (e) {
                extractedProps[key] = "[Default Function]";
              }
            } else {
              extractedProps[key] = propDefinitions[key].default;
            }
          } else {
            extractedProps[key] = "[Property name only]";
          }
        });

        if (Object.keys(extractedProps).length > 0) {
          console.log(
            "[Vue Inspector] Props inferred from $options.props definitions:",
            extractedProps
          );
          return extractedProps;
        }
      }
    } catch (e) {
      console.error("[Vue Inspector] Error extracting props:", e);
    }

    return props;
  }

  // Улучшенная функция createTreeNodeHTML для лучшего отображения свойств
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
      // Улучшенное форматирование значений
      let formattedValue = "undefined";
      let valueClass = "value-undefined";

      if (value === null) {
        formattedValue = "null";
        valueClass = "value-null";
      } else if (type === "string") {
        // Улучшаем отображение строк: показываем до 100 символов и добавляем многоточие
        const displayStr =
          value.length > 100 ? value.substring(0, 100) + "..." : value;
        // Экранируем HTML-символы
        const escapedStr = String(displayStr)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
        formattedValue = `"${escapedStr}"`;
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
      } else if (value instanceof Error) {
        formattedValue = `Error: ${value.message}`;
        valueClass = "value-error";
      } else if (value === undefined) {
        formattedValue = "undefined";
        valueClass = "value-undefined";
      } else if (typeof value === "symbol") {
        formattedValue = value.toString();
        valueClass = "value-symbol";
      } else if (type === "bigint") {
        formattedValue = String(value) + "n";
        valueClass = "value-number";
      }

      valueHTML = `<span class="tree-node-value"><span class="${valueClass}">${formattedValue}</span></span>`;
    } else {
      // Создаем более информативное превью для объектов
      let preview = "{...}";

      if (Array.isArray(value)) {
        if (value.length === 0) {
          preview = "[]";
        } else if (value.length <= 5) {
          // Показываем до 5 элементов массива в превью
          const items = value.slice(0, 5).map((item) => {
            if (item === null) return "null";
            if (item === undefined) return "undefined";
            if (typeof item === "object")
              return item instanceof Date ? item.toISOString() : "{...}";
            if (typeof item === "string")
              return `"${
                item.length > 10 ? item.substring(0, 10) + "..." : item
              }"`;
            return String(item);
          });
          preview = `[${items.join(", ")}${value.length > 5 ? ", ..." : ""}]`;
        } else {
          preview = `Array(${value.length})`;
        }
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
          // Показываем до 3 свойств объекта в превью
          const items = keys.slice(0, 3).map((key) => {
            let propValue = value[key];
            if (propValue === null) return `${key}: null`;
            if (propValue === undefined) return `${key}: undefined`;
            if (typeof propValue === "object")
              return `${key}: ${
                propValue instanceof Date ? propValue.toISOString() : "{...}"
              }`;
            if (typeof propValue === "string")
              return `${key}: "${
                propValue.length > 10
                  ? propValue.substring(0, 10) + "..."
                  : propValue
              }"`;
            return `${key}: ${String(propValue)}`;
          });
          preview = `{ ${items.join(", ")}${keys.length > 3 ? ", ..." : ""} }`;
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
        // Сортируем ключи для удобства просмотра
        const keys = Object.keys(value).sort();
        keys.forEach((key) => {
          const childPath = `${nodePath}.${key}`;
          try {
            childrenHTML += createTreeNodeHTML(key, value[key], childPath, tab);
          } catch (e) {
            // В случае ошибки доступа к свойству
            childrenHTML += createTreeNodeHTML(
              key,
              `[Error: ${e.message}]`,
              childPath,
              tab
            );
          }
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

  // Эвристическая функция для извлечения props
  function extractPropsHeuristically(component) {
    const props = {};
    console.log("[Vue Inspector] Extracting props heuristically");

    try {
      // 1. Ищем через $options.propsData (Vue 2)
      if (component.$options && component.$options.propsData) {
        return extractProps(component, "$options.propsData");
      }

      // 2. Ищем через определения props в $options
      if (component.$options && component.$options.props) {
        const propDefinitions = component.$options.props;
        for (const key in propDefinitions) {
          // Для каждого определенного prop, пытаемся найти его значение в компоненте
          if (component[key] !== undefined) {
            props[key] = component[key];
          }
        }

        if (Object.keys(props).length > 0) {
          return props;
        }
      }

      // 3. Для Vue 3, проверяем через vnode
      if (component.vnode && component.vnode.props) {
        for (const key in component.vnode.props) {
          // Исключаем внутренние свойства Vue
          if (!key.startsWith("on") && key !== "ref" && key !== "key") {
            props[key] = component.vnode.props[key];
          }
        }

        if (Object.keys(props).length > 0) {
          return props;
        }
      }

      // 4. Проверяем через типовые имена props
      const typicalPropKeys = [
        // Типичные имена, которые могут быть props
        "value",
        "modelValue",
        "label",
        "title",
        "text",
        "name",
        "id",
        "src",
        "href",
        "disabled",
        "required",
        "checked",
        "selected",
        "color",
        "size",
        "type",
        "items",
        "data",
        "options",
        "placeholder",
      ];

      // Проверяем direct props - то, что объявлено в самом корне компонента
      for (const key of typicalPropKeys) {
        if (
          component[key] !== undefined &&
          typeof component[key] !== "function" &&
          key !== "$data" &&
          key !== "$props" &&
          !key.startsWith("$") &&
          !key.startsWith("_")
        ) {
          props[key] = component[key];
        }
      }

      // 5. Проверяем attrs, если они доступны
      if (component.attrs) {
        for (const key in component.attrs) {
          props[key] = component.attrs[key];
        }
      } else if (component.$attrs) {
        for (const key in component.$attrs) {
          props[key] = component.$attrs[key];
        }
      }

      // 6. Vue 3 - через ctx.attrs (если доступно)
      if (component.ctx && component.ctx.attrs) {
        for (const key in component.ctx.attrs) {
          props[key] = component.ctx.attrs[key];
        }
      }
    } catch (e) {
      console.error("[Vue Inspector] Error in heuristic props extraction:", e);
    }

    return props;
  }

  // Строгая версия функции для извлечения данных компонента с минимумом артефактов
  function extractData(component, customDataPath = null) {
    const data = {};

    // Расширенный список исключаемых свойств
    const excludedPatterns = [
      // Начинающиеся с этих префиксов
      "_",
      "$",
      "__",
      "on",
      "dispatch",
      "commit",
      "handle",

      // Vue 3 внутренние паттерны
      "v-",
      "__v",
      "_ctx",
      "_uid",
      "_vnode",
      "subTree",
      "isMounted",
      "isUnmounted",
      "isDeactivated",
      "suspense",
      "dirs",
      "transition",
      "emitted",
      "watcher",
      "update",
      "render",
      "provides",
      "effects",
      "asyncDep",
      "asyncResolved",
      "suspensible",
      "bm",
      "m",
      "bu",
      "u",
      "bum",
      "um",
      "rtg",
      "rtc",
      "ec",
      "emit",
      "propsDefaults",
      "inheritAttrs",
      "withDefaults",

      // События и хендлеры
      "click",
      "change",
      "input",
      "blur",
      "focus",
      "submit",
      "keydown",
      "keyup",
      "mousedown",
      "mouseup",
      "mouseover",
      "mouseout",
      "mousemove",

      // Типичные имена внутренних свойств
      "hook",
      "vnode",
      "parent",
      "root",
      "slots",
      "refs",
      "attrs",
      "listeners",
      "provide",
      "inject",
      "accessCache",
      "ctx",
      "config",
      "app",
      "ce",
      "cid",
      "appContext",
      "devtools",
      "extends",
      "mixins",
      "components",
      "directives",
      "filters",
      "globalProperties",
      "compilerOptions",
    ];

    // Функция для строгой проверки, следует ли включать свойство
    function isSafeProperty(key, value) {
      // Ключ должен быть строкой
      if (typeof key !== "string") return false;

      // Проверка по исключающим паттернам
      for (const pattern of excludedPatterns) {
        if (key.startsWith(pattern) || key.includes(pattern)) return false;
      }

      // Исключаем функции
      if (typeof value === "function") return false;

      // Исключаем реактивные объекты Vue 3
      if (
        value &&
        typeof value === "object" &&
        (value.__v_isRef || value.__v_isReactive)
      ) {
        // Но позволяем извлечь их значение
        return true;
      }

      // Исключаем внутренние объекты Vue и DOM элементы
      if (
        value instanceof Element ||
        value instanceof Node ||
        (value && value._isVue) ||
        key === "el" ||
        key === "element" ||
        key === "container"
      ) {
        return false;
      }

      // Исключаем объекты с типичными свойствами Vue
      if (value && typeof value === "object") {
        const objKeys = Object.keys(value);

        // Если объект имеет типичные свойства Vue или является компонентом
        const isVueLike = objKeys.some(
          (k) =>
            k.startsWith("_") ||
            k.startsWith("$") ||
            ["$el", "$data", "$props", "$options", "$parent", "$root"].includes(
              k
            )
        );

        if (isVueLike) return false;
      }

      return true;
    }

    // Извлечение значения из реактивного объекта Vue 3
    function extractReactiveValue(obj) {
      if (!obj || typeof obj !== "object") return obj;

      // Извлекаем значение из ref или reactive
      if (obj.__v_isRef && obj.value !== undefined) {
        return obj.value;
      }

      if (obj.__v_isReactive && obj.__v_raw !== undefined) {
        return obj.__v_raw;
      }

      return obj;
    }

    // Безопасное клонирование объекта с ограниченной глубиной
    function safeClone(obj, visited = new WeakMap(), depth = 0) {
      // Ограничиваем глубину
      if (depth > 3) return "[Nested Object]";

      // Базовые случаи
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== "object") return obj;

      // Проверка на циклические ссылки
      if (visited.has(obj)) return "[Circular]";

      // Обработка специальных типов
      if (obj instanceof Date) return obj.toISOString();
      if (obj instanceof RegExp) return obj.toString();
      if (Array.isArray(obj)) {
        const result = [];
        visited.set(obj, result);

        // Клонируем только первые 10 элементов массива
        const limit = Math.min(obj.length, 10);
        for (let i = 0; i < limit; i++) {
          try {
            const value = extractReactiveValue(obj[i]);
            result[i] = safeClone(value, visited, depth + 1);
          } catch (e) {
            result[i] = "[Error]";
          }
        }

        if (obj.length > 10) {
          result.push(`... ${obj.length - 10} more items`);
        }

        return result;
      }

      // Обработка обычных объектов
      const result = {};
      visited.set(obj, result);

      // Получаем только явные свойства объекта
      const keys = Object.getOwnPropertyNames(obj);

      for (const key of keys) {
        try {
          // Применяем строгую фильтрацию
          if (isSafeProperty(key, obj[key])) {
            const value = extractReactiveValue(obj[key]);

            // Для объектов проверяем, стоит ли их клонировать или просто описать
            if (value !== null && typeof value === "object") {
              // Для типичных JavaScript объектов клонируем глубже
              if (
                value instanceof Date ||
                value instanceof RegExp ||
                Array.isArray(value) ||
                Object.getPrototypeOf(value) === Object.prototype
              ) {
                result[key] = safeClone(value, visited, depth + 1);
              } else {
                // Для других типов объектов просто указываем тип
                const typeName = Object.prototype.toString
                  .call(value)
                  .slice(8, -1);
                result[key] = `[${typeName}]`;
              }
            } else {
              result[key] = value;
            }
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }

      return result;
    }

    try {
      console.log("[Vue Inspector] Extracting data from component:", component);

      // Функция для безопасного извлечения данных из объекта
      function extractDataFromObject(obj, sourceName) {
        if (!obj || typeof obj !== "object") return false;

        const extracted = safeClone(obj);
        let extractedCount = 0;

        // Фильтруем только безопасные свойства
        for (const key in extracted) {
          if (isSafeProperty(key, extracted[key])) {
            data[key] = extracted[key];
            extractedCount++;
          }
        }

        if (extractedCount > 0) {
          console.log(`[Vue Inspector] Data found via ${sourceName}:`, data);
          return true;
        }

        return false;
      }

      // 1. Если указан кастомный путь, используем его
      if (customDataPath && typeof customDataPath === "string") {
        const customData = deepGet(component, customDataPath);
        if (
          customData &&
          typeof customData === "object" &&
          extractDataFromObject(customData, `custom path ${customDataPath}`)
        ) {
          return data;
        }
      }

      // 2. Извлечение данных из определенных в компоненте data-свойств для Vue 2
      if (component.$options && typeof component.$options.data === "function") {
        try {
          // Попытка вызвать оригинальную data-функцию
          const rawData = component.$options.data.call(component);
          if (
            rawData &&
            typeof rawData === "object" &&
            extractDataFromObject(rawData, "$options.data()")
          ) {
            return data;
          }
        } catch (e) {
          console.warn(
            "[Vue Inspector] Error calling component data function:",
            e
          );
        }
      }

      // 3. Vue 2 - $data
      if (component.$data && extractDataFromObject(component.$data, "$data")) {
        return data;
      }

      // 4. Vue 3 - setupState
      if (component.setupState) {
        if (extractDataFromObject(component.setupState, "setupState")) {
          return data;
        }
      } else if (component.$ && component.$.setupState) {
        if (extractDataFromObject(component.$.setupState, "$.setupState")) {
          return data;
        }
      }

      // 5. Vue 3 - data
      if (component.data) {
        if (extractDataFromObject(component.data, "data")) {
          return data;
        }
      } else if (component.$ && component.$.data) {
        if (extractDataFromObject(component.$.data, "$.data")) {
          return data;
        }
      }

      // 6. Vue 3 - exposed
      if (component.exposed) {
        if (extractDataFromObject(component.exposed, "exposed")) {
          return data;
        }
      } else if (component.$ && component.$.exposed) {
        if (extractDataFromObject(component.$.exposed, "$.exposed")) {
          return data;
        }
      }

      // 7. Vue 3 - ctx
      if (component.ctx && extractDataFromObject(component.ctx, "ctx")) {
        return data;
      }

      // 8. Vue 3 - proxy
      if (component.proxy && extractDataFromObject(component.proxy, "proxy")) {
        return data;
      }

      // 9. Vue 2 - computed properties
      if (component.$options && component.$options.computed) {
        const computedProps = {};

        for (const key in component.$options.computed) {
          if (isSafeProperty(key, component[key])) {
            try {
              computedProps[key + " (computed)"] = safeClone(component[key]);
            } catch (e) {
              computedProps[key + " (computed)"] = "[Computed]";
            }
          }
        }

        if (Object.keys(computedProps).length > 0) {
          Object.assign(data, computedProps);
          console.log(
            "[Vue Inspector] Data found via computed properties:",
            computedProps
          );
          return data;
        }
      }

      // 10. Vue 3 - component.type.setup return values
      if (component.type && typeof component.type.setup === "function") {
        // Мы не можем вызвать setup напрямую, но можем проверить результаты в setupState
        if (
          component.setupState &&
          extractDataFromObject(component.setupState, "setup results")
        ) {
          return data;
        }
      }

      // 11. Последняя попытка - извлечь непосредственно из компонента
      const componentVars = {};

      // Используем гораздо более строгую фильтрацию для прямого доступа к компоненту
      for (const key in component) {
        if (
          typeof key === "string" &&
          !key.startsWith("_") &&
          !key.startsWith("$") &&
          !excludedPatterns.some((pattern) => key.includes(pattern)) &&
          typeof component[key] !== "function"
        ) {
          try {
            const value = extractReactiveValue(component[key]);

            // Дополнительная проверка на Vue-подобные объекты
            if (
              value === null ||
              typeof value !== "object" ||
              (typeof value === "object" &&
                !value._isVue &&
                !Object.keys(value).some(
                  (k) => k.startsWith("$") || k.startsWith("_")
                ))
            ) {
              componentVars[key] = safeClone(value);
            }
          } catch (e) {
            // Игнорируем недоступные свойства
          }
        }
      }

      if (Object.keys(componentVars).length > 0) {
        Object.assign(data, componentVars);
        console.log(
          "[Vue Inspector] Data found via direct component access:",
          componentVars
        );
        return data;
      }
    } catch (e) {
      console.error("[Vue Inspector] Error extracting data:", e);
    }

    console.log(
      "[Vue Inspector] No data found or only internal properties found"
    );
    return data;
  }

  // Улучшенная функция поиска Vue компонента для элемента DOM
  function findVueComponentForElement(element) {
    let maxIterations = 20; // Увеличиваем количество итераций для более глубокого поиска
    console.log(
      "[Vue Inspector] Searching Vue component for element:",
      element
    );

    if (!element) return null;

    // Функция для проверки элемента на наличие Vue компонента
    function checkElementForComponent(el) {
      if (!el) return null;

      // Собираем все потенциальные свойства, где может быть компонент Vue
      const possibleKeys = [
        // Vue 2.x
        "__vue__",
        "$vnode",
        "_vnode",

        // Vue 3.x
        "__vueParentComponent",
        "__vnode",
        "_vnode",
        "__vue_app__",

        // Другие возможные ключи
        "__instance",
        "_vue",
        "__composition",
        "_vueComponent",
      ];

      // Проверяем все возможные ключи
      for (const key of possibleKeys) {
        if (el[key]) {
          console.log(`[Vue Inspector] Found component via ${key}:`, el[key]);

          // Обрабатываем специальные случаи
          if (key === "__vue_app__" && el[key]._instance) {
            return el[key]._instance;
          }

          if (key === "__vnode" && el[key].component) {
            return el[key].component;
          }

          if (key === "_vnode" && el[key].component) {
            return el[key].component;
          }

          return el[key];
        }
      }

      return null;
    }

    // Проверка компонента в Vue 3 devtools (это часто работает в современных версиях)
    function tryVueDevtoolsComponent(el) {
      try {
        // Получаем фреймы всех окон на странице
        const frames = Array.from(document.querySelectorAll("iframe"));

        // Ищем фрейм Vue devtools
        const devtoolsFrame = frames.find((frame) => {
          try {
            return (
              frame.contentWindow &&
              frame.contentWindow.__VUE_DEVTOOLS_GLOBAL_HOOK__
            );
          } catch (e) {
            return false;
          }
        });

        if (devtoolsFrame) {
          const hook = devtoolsFrame.contentWindow.__VUE_DEVTOOLS_GLOBAL_HOOK__;
          if (hook && hook.Vue) {
            console.log("[Vue Inspector] Detected Vue via devtools");

            // Если удается получить Vue из devtools, ищем компонент
            const instance =
              hook.Vue.prototype.$inspect && hook.Vue.prototype.$inspect(el);
            if (instance) {
              console.log(
                "[Vue Inspector] Found component via devtools inspect:",
                instance
              );
              return instance;
            }
          }
        }
      } catch (e) {
        console.log("[Vue Inspector] Error trying devtools approach:", e);
      }

      return null;
    }

    // Пробуем доступ через window.__VUE__ (иногда доступно в Vue 3)
    function tryGlobalVue(el) {
      if (window.__VUE__) {
        try {
          console.log("[Vue Inspector] Trying window.__VUE__ approach");

          // Получаем все корневые экземпляры
          const roots = window.__VUE__.app
            ? [window.__VUE__.app._instance]
            : window.__VUE__.apps
            ? window.__VUE__.apps.map((app) => app._instance)
            : [];

          for (const root of roots) {
            if (!root) continue;

            // Рекурсивная функция для поиска компонента, содержащего элемент
            function findComponentWithElement(instance) {
              if (!instance) return null;

              // Проверяем, содержит ли этот компонент наш элемент
              if (
                instance.vnode &&
                instance.vnode.el &&
                instance.vnode.el.contains(el)
              ) {
                // Проверяем дочерние компоненты
                if (instance.subTree) {
                  const childComponents = findChildComponents(instance.subTree);
                  for (const childComp of childComponents) {
                    const result = findComponentWithElement(childComp);
                    if (result) return result;
                  }
                }
                return instance;
              }

              return null;
            }

            // Функция для поиска компонентов в дереве
            function findChildComponents(vnode) {
              if (!vnode) return [];
              const components = [];

              if (vnode.component) {
                components.push(vnode.component);
              }

              if (vnode.children) {
                if (Array.isArray(vnode.children)) {
                  for (const child of vnode.children) {
                    components.push(...findChildComponents(child));
                  }
                } else if (typeof vnode.children === "object") {
                  components.push(
                    ...findChildComponents(vnode.children.default)
                  );
                }
              }

              return components;
            }

            const result = findComponentWithElement(root);
            if (result) {
              console.log(
                "[Vue Inspector] Found component via __VUE__ traversal:",
                result
              );
              return result;
            }
          }
        } catch (e) {
          console.log("[Vue Inspector] Error in global Vue approach:", e);
        }
      }

      return null;
    }

    // 1. Пробуем найти компонент напрямую в элементе
    let component = checkElementForComponent(element);
    if (component) return component;

    // 2. Проверяем через Vue Devtools (если доступно)
    component = tryVueDevtoolsComponent(element);
    if (component) return component;

    // 3. Проверяем через глобальные объекты Vue
    component = tryGlobalVue(element);
    if (component) return component;

    // 4. Поднимаемся вверх по DOM, проверяя каждый родительский элемент
    let currentEl = element;
    let iterations = 0;

    while (currentEl && iterations < maxIterations) {
      currentEl = currentEl.parentElement;
      if (!currentEl) break;

      component = checkElementForComponent(currentEl);
      if (component) return component;

      iterations++;
    }

    // 5. Проверяем, есть ли атрибуты Vue у элемента
    const vueAttrs = Array.from(element.attributes || []).filter(
      (attr) => attr.name.startsWith("data-v-") || attr.name === "data-v-app"
    );

    if (vueAttrs.length > 0) {
      console.log(
        "[Vue Inspector] Element has Vue-specific attributes:",
        vueAttrs
      );

      // Ищем все элементы с тем же атрибутом (одной области видимости)
      const scopeId = vueAttrs.find(
        (attr) => attr.name.startsWith("data-v-") && attr.name !== "data-v-app"
      );

      if (scopeId) {
        const selector = `[${scopeId.name}]`;
        const relatedElements = document.querySelectorAll(selector);

        console.log(
          `[Vue Inspector] Found ${relatedElements.length} elements with same scope ID`
        );

        // Проверяем каждый элемент с тем же scope ID, начиная с корневых элементов
        for (const relEl of relatedElements) {
          // Предпочитаем элементы, которые могут быть корнями компонентов
          if (
            relEl.tagName.includes("-") ||
            relEl.classList.length > 0 ||
            relEl.id
          ) {
            component = checkElementForComponent(relEl);
            if (component) {
              console.log(
                "[Vue Inspector] Found component via related element:",
                component
              );
              return component;
            }
          }
        }
      }
    }

    // 6. Ищем ближайший компонент Vue через родительские элементы с определенными признаками
    currentEl = element;
    while (currentEl && currentEl !== document.body) {
      // Проверяем элементы, которые с большей вероятностью могут быть Vue компонентами
      if (
        currentEl.tagName.includes("-") || // Кастомные элементы часто используются в Vue
        currentEl.hasAttribute("data-v-app") || // Корневой элемент Vue 3 app
        (currentEl.id && currentEl.id.toLowerCase().includes("app")) || // Часто используемый ID
        (currentEl.className &&
          typeof currentEl.className === "string" &&
          (currentEl.className.includes("vue") ||
            currentEl.className.includes("app"))) // Часто используемые классы
      ) {
        component = checkElementForComponent(currentEl);
        if (component) {
          console.log(
            "[Vue Inspector] Found component via heuristic approach:",
            component
          );
          return component;
        }
      }

      currentEl = currentEl.parentElement;
    }

    // 7. Крайний вариант: проверяем глобальный объект Vue
    if (window.Vue) {
      console.log("[Vue Inspector] Checking global Vue object");

      if (window.Vue.$root) {
        console.log("[Vue Inspector] Found Vue 2 root component");
        return window.Vue.$root;
      }

      if (window.Vue.config && window.Vue.config.devtools) {
        // Vue 2 с включенными devtools может иметь особые свойства
        console.log("[Vue Inspector] Vue 2 with devtools detected");
      }
    }

    console.log("[Vue Inspector] No Vue component found for element");
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
  // function findVueComponentForElement(element) {
  //   let maxIterations = 15; // Увеличиваем количество итераций
  //   console.log(
  //     "[Vue Inspector] Searching Vue component for element:",
  //     element
  //   );

  //   if (!element) return null;

  //   // Функция для проверки элемента на наличие Vue компонента
  //   function checkElement(el) {
  //     // 1. Проверка на Vue 2.x
  //     if (el.__vue__) {
  //       console.log(
  //         "[Vue Inspector] Found Vue 2 component via __vue__:",
  //         el.__vue__
  //       );
  //       return el.__vue__;
  //     }

  //     // 2. Проверка на Vue 3.x
  //     if (el.__vnode && el.__vnode.component) {
  //       console.log(
  //         "[Vue Inspector] Found Vue 3 component via __vnode:",
  //         el.__vnode.component
  //       );
  //       return el.__vnode.component;
  //     }

  //     // 3. Проверка на Vue 3 root
  //     if (el.__vue_app__ && el.__vue_app__._instance) {
  //       console.log(
  //         "[Vue Inspector] Found Vue 3 root instance:",
  //         el.__vue_app__._instance
  //       );
  //       return el.__vue_app__._instance;
  //     }

  //     // 4. Проверка на Vue 3 через __vueParentComponent
  //     if (el.__vueParentComponent) {
  //       console.log(
  //         "[Vue Inspector] Found Vue 3 component via __vueParentComponent:",
  //         el.__vueParentComponent
  //       );
  //       return el.__vueParentComponent.proxy || el.__vueParentComponent;
  //     }

  //     // 5. Проверка на альтернативные свойства Vue
  //     const vueProps = [
  //       "_vnode",
  //       "_instance",
  //       "_vueProxy",
  //       "_self",
  //       "$el",
  //       "$options",
  //     ];
  //     for (const prop of vueProps) {
  //       if (el[prop]) {
  //         console.log(
  //           `[Vue Inspector] Found potential Vue component via ${prop}:`,
  //           el[prop]
  //         );
  //         return el[prop];
  //       }
  //     }

  //     return null;
  //   }

  //   // Сначала проверяем сам элемент
  //   let component = checkElement(element);
  //   if (component) return component;

  //   // Затем проверяем атрибуты, чтобы найти подсказки о компоненте
  //   const vueAttrs = Array.from(element.attributes || []).filter((attr) =>
  //     attr.name.startsWith("data-v-")
  //   );

  //   if (vueAttrs.length > 0) {
  //     console.log("[Vue Inspector] Element has Vue attributes:", vueAttrs);

  //     // Если есть атрибуты Vue, это может помочь в диагностике
  //     const dataVId = vueAttrs.find((attr) => attr.name === "data-v-id");
  //     if (dataVId) {
  //       console.log("[Vue Inspector] Found data-v-id:", dataVId.value);
  //     }
  //   }

  //   // Проверяем DOM вверх по иерархии
  //   let currentEl = element;
  //   while (currentEl && maxIterations > 0) {
  //     // Проверяем родительский элемент
  //     currentEl = currentEl.parentElement;
  //     if (!currentEl) break;

  //     component = checkElement(currentEl);
  //     if (component) return component;

  //     maxIterations--;
  //   }

  //   // Если ничего не нашли через DOM, попробуем через соседние элементы
  //   // Иногда нужный компонент связан не с родителем, а с соседним элементом
  //   const siblings = element.parentElement?.children;
  //   if (siblings && siblings.length > 0) {
  //     for (let i = 0; i < siblings.length; i++) {
  //       if (siblings[i] !== element) {
  //         component = checkElement(siblings[i]);
  //         if (component) {
  //           console.log(
  //             "[Vue Inspector] Found component in sibling element:",
  //             component
  //           );
  //           return component;
  //         }
  //       }
  //     }
  //   }

  //   // Используем альтернативный подход для поиска через атрибуты data-v-*
  //   if (vueAttrs.length > 0) {
  //     const dataVValue = vueAttrs[0].value || vueAttrs[0].name.split("-")[2];
  //     if (dataVValue) {
  //       // Ищем элементы с тем же атрибутом Vue в DOM
  //       const selector = `[${vueAttrs[0].name}]`;
  //       const relatedElements = document.querySelectorAll(selector);

  //       if (relatedElements.length > 0) {
  //         console.log(
  //           `[Vue Inspector] Found ${relatedElements.length} related elements with same Vue scope`
  //         );

  //         // Проверяем каждый родственный элемент
  //         for (const relEl of relatedElements) {
  //           if (relEl !== element) {
  //             component = checkElement(relEl);
  //             if (component) {
  //               console.log(
  //                 "[Vue Inspector] Found component in related element:",
  //                 component
  //               );
  //               return component;
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }

  //   console.log("[Vue Inspector] No Vue component found for this element");
  //   return null;
  // }

  // Глобальная переменная для отслеживания выделенных элементов
  let highlightedElements = [];

  // Улучшенная функция обработки Alt+Click

  function addClickInspector() {
    console.log("[Vue Inspector] Adding click inspector");

    // Удаляем существующий обработчик
    document.removeEventListener("click", handleInspectorClick, true);

    // Добавляем новый обработчик
    document.addEventListener("click", handleInspectorClick, true);

    function handleInspectorClick(event) {
      if (!event.altKey) return; // Только для Alt+Click

      console.log("[Vue Inspector] Alt+Click detected on:", event.target);

      // Предотвращаем стандартное поведение
      event.preventDefault();
      event.stopPropagation();

      // Удаляем предыдущие выделения
      clearAllHighlights();

      // Добавляем временное подсветку для кликнутого элемента
      const originalOutline = event.target.style.outline;
      event.target.style.outline = "2px solid #41b883";

      // Сохраняем информацию о выделенном элементе
      highlightedElements.push({
        element: event.target,
        originalOutline: originalOutline,
      });

      // Ищем компонент Vue
      const component = findVueComponentForElement(event.target);

      if (component) {
        console.log("[Vue Inspector] Found component to inspect:", component);
        inspectComponent(component);
      } else {
        console.warn(
          "[Vue Inspector] No Vue component found for clicked element"
        );

        // Показываем уведомление пользователю
        showNotification("Компонент Vue не найден для этого элемента");
      }

      // Удаляем подсветку через секунду (сохраняем для совместимости)
      setTimeout(() => {
        clearAllHighlights();
      }, 3000);
    }

    // Функция для удаления всех выделений
    function clearAllHighlights() {
      highlightedElements.forEach((item) => {
        try {
          item.element.style.outline = item.originalOutline;
        } catch (e) {
          // Игнорируем ошибки, элемент мог быть удален из DOM
        }
      });

      // Очищаем массив
      highlightedElements = [];
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

  // Улучшенная функция для безопасного получения глубоко вложенных свойств
  function deepGet(obj, path) {
    if (!obj || !path) return undefined;

    // Преобразуем путь в массив, если это строка
    const parts = typeof path === "string" ? path.split(".") : path;
    let current = obj;

    for (let i = 0; i < parts.length; i++) {
      // Проверка существования свойства
      if (current === undefined || current === null) {
        return undefined;
      }

      // Безопасный доступ к свойству
      try {
        current = current[parts[i]];
      } catch (e) {
        console.warn(
          `[Vue Inspector] Error accessing property ${parts[i]} in path ${path}:`,
          e
        );
        return undefined;
      }
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
  };

  // Самоинициализация
  initInspector();
})();
