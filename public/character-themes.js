(() => {
  "use strict";

  const bridge = window.flyingMouseFormat || {};
  const REQUIRED_STATES = [
    "idle",
    "upload",
    "analyzing",
    "converting",
    "pdfPages",
    "ocr",
    "batch",
    "success",
    "error"
  ];

  const THEMES = Object.freeze({
    mouse: Object.freeze({
      id: "mouse",
      labels: Object.freeze({
        "zh-CN": "鼠鼠",
        "en-US": "Mouse"
      }),
      stateAssets: Object.freeze({
        idle: "/assets/mouse-format/mouse-idle.png",
        upload: "/assets/mouse-format/mouse-upload.png",
        analyzing: "/assets/mouse-format/mouse-analyzing.png",
        converting: "/assets/mouse-format/mouse-converting.png",
        pdfPages: "/assets/mouse-format/mouse-pdf-pages.png",
        ocr: "/assets/mouse-format/mouse-ocr.png",
        batch: "/assets/mouse-format/mouse-batch.png",
        success: "/assets/mouse-format/mouse-success.png",
        error: "/assets/mouse-format/mouse-error.png"
      }),
      colors: Object.freeze({
        "--bg": "#f5f4f1",
        "--panel": "#fffdf8",
        "--card": "#ffffff",
        "--accent": "#e95f6d",
        "--accent-strong": "#d94d5d",
        "--accent-soft": "#ffe0e4"
      })
    }),
    cat: Object.freeze({
      id: "cat",
      labels: Object.freeze({
        "zh-CN": "猫猫",
        "en-US": "Cat"
      }),
      stateAssets: Object.freeze({
        idle: "/assets/characters/cat/cat-idle.webp",
        upload: "/assets/characters/cat/cat-upload.webp",
        analyzing: "/assets/characters/cat/cat-analyzing.webp",
        converting: "/assets/characters/cat/cat-converting.webp",
        pdfPages: "/assets/characters/cat/cat-pdf-pages.webp",
        ocr: "/assets/characters/cat/cat-ocr.webp",
        batch: "/assets/characters/cat/cat-batch.webp",
        success: "/assets/characters/cat/cat-success.webp",
        error: "/assets/characters/cat/cat-error.webp"
      }),
      colors: Object.freeze({
        "--bg": "#f8f5ef",
        "--panel": "#fffaf2",
        "--card": "#ffffff",
        "--accent": "#f59e42",
        "--accent-strong": "#d97706",
        "--accent-soft": "#ffedd5"
      })
    })
  });

  const legacyStateNames = Object.freeze({
    idle: "idle",
    upload: "upload",
    analyzing: "analyzing",
    converting: "converting",
    "pdf-pages": "pdfPages",
    ocr: "ocr",
    batch: "batch",
    success: "success",
    error: "error"
  });

  let activeThemeId = "mouse";
  let lastKnownMascotState = "upload";
  let syncingMascot = false;
  let themeSelect = null;
  let themeLabel = null;

  function currentLanguage() {
    return document.documentElement.lang === "en-US" ? "en-US" : "zh-CN";
  }

  function normalizeThemeId(value) {
    const id = String(value || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(THEMES, id) ? id : "mouse";
  }

  function themeFor(id = activeThemeId) {
    return THEMES[normalizeThemeId(id)];
  }

  function assetForState(themeId, state) {
    const theme = themeFor(themeId);
    return theme.stateAssets[state] || theme.stateAssets.idle;
  }

  function parseLegacyMouseState(value) {
    const match = String(value || "").match(/mouse-(idle|upload|analyzing|converting|pdf-pages|ocr|batch|success|error)\.png(?:[?#].*)?$/i);
    return match ? legacyStateNames[match[1].toLowerCase()] : null;
  }

  function setImageSource(element, source) {
    if (!element || !source) return;
    const current = element.getAttribute("src") || "";
    if (current === source) return;
    element.setAttribute("src", source);
  }

  function applyThemeColors(theme) {
    for (const [name, value] of Object.entries(theme.colors || {})) {
      document.documentElement.style.setProperty(name, value);
    }
  }

  function syncMascot() {
    const mascot = document.querySelector("#mouseMascot");
    if (!mascot || syncingMascot) return;

    const detected = parseLegacyMouseState(mascot.getAttribute("src") || mascot.src);
    if (detected) lastKnownMascotState = detected;

    const target = assetForState(activeThemeId, lastKnownMascotState);
    if ((mascot.getAttribute("src") || "") === target) return;

    syncingMascot = true;
    mascot.setAttribute("src", target);
    syncingMascot = false;
  }

  function syncStaticCharacterImages() {
    const idleAsset = assetForState(activeThemeId, "idle");
    setImageSource(document.querySelector(".brand-mouse"), idleAsset);
    setImageSource(document.querySelector(".sponsor-mouse"), idleAsset);

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.setAttribute("href", idleAsset);
  }

  function updateSelectorLanguage() {
    const language = currentLanguage();
    if (themeLabel) themeLabel.textContent = language === "en-US" ? "Character" : "角色";
    if (!themeSelect) return;

    for (const option of themeSelect.options) {
      const theme = THEMES[option.value];
      if (theme) option.textContent = theme.labels[language] || theme.labels["zh-CN"] || theme.id;
    }
  }

  function applyTheme(themeId) {
    activeThemeId = normalizeThemeId(themeId);
    const theme = themeFor(activeThemeId);
    document.documentElement.dataset.characterTheme = activeThemeId;
    applyThemeColors(theme);
    syncStaticCharacterImages();
    syncMascot();
    if (themeSelect) themeSelect.value = activeThemeId;
  }

  async function persistTheme(themeId) {
    if (typeof bridge.updateSettings !== "function") return;
    try {
      await bridge.updateSettings({ characterTheme: normalizeThemeId(themeId) });
    } catch (error) {
      console.warn("Failed to persist character theme", error);
    }
  }

  function installSelector() {
    const actions = document.querySelector(".topbar-actions");
    if (!actions || document.querySelector("#characterThemeSelect")) return;

    const field = document.createElement("label");
    field.className = "language-field character-theme-field";

    themeLabel = document.createElement("span");
    field.appendChild(themeLabel);

    themeSelect = document.createElement("select");
    themeSelect.id = "characterThemeSelect";
    themeSelect.setAttribute("aria-label", "角色 / Character");

    for (const theme of Object.values(THEMES)) {
      const option = document.createElement("option");
      option.value = theme.id;
      themeSelect.appendChild(option);
    }

    themeSelect.addEventListener("change", () => {
      applyTheme(themeSelect.value);
      persistTheme(themeSelect.value);
    });

    field.appendChild(themeSelect);
    const languageField = actions.querySelector(".language-field");
    actions.insertBefore(field, languageField || actions.lastChild);
    updateSelectorLanguage();
  }

  function watchMascot() {
    const mascot = document.querySelector("#mouseMascot");
    if (!mascot) return;

    const observer = new MutationObserver(() => syncMascot());
    observer.observe(mascot, { attributes: true, attributeFilter: ["src"] });
  }

  async function restoreSavedTheme() {
    if (typeof bridge.getSettings !== "function") {
      applyTheme("mouse");
      return;
    }

    try {
      const settings = await bridge.getSettings();
      applyTheme(settings?.characterTheme || "mouse");
    } catch (error) {
      console.warn("Failed to restore character theme", error);
      applyTheme("mouse");
    }
  }

  function validateThemes() {
    for (const theme of Object.values(THEMES)) {
      for (const state of REQUIRED_STATES) {
        if (!theme.stateAssets[state]) {
          throw new Error(`Character theme ${theme.id} is missing state ${state}`);
        }
      }
    }
  }

  async function initialize() {
    validateThemes();
    installSelector();
    watchMascot();
    await restoreSavedTheme();

    const languageSelect = document.querySelector("#languageSelect");
    if (languageSelect) languageSelect.addEventListener("change", updateSelectorLanguage);
  }

  window.FlyingMouseCharacterThemes = Object.freeze({
    requiredStates: Object.freeze([...REQUIRED_STATES]),
    listThemes() {
      const language = currentLanguage();
      return Object.values(THEMES).map((theme) => ({
        id: theme.id,
        label: theme.labels[language] || theme.labels["zh-CN"] || theme.id
      }));
    },
    getActiveTheme() {
      return activeThemeId;
    },
    assetForState(state) {
      return assetForState(activeThemeId, state);
    }
  });

  initialize();
})();
