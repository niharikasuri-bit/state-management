/**
 * SMC - Registration & Delivery :: Form Configurator
 * Interactive mock driven by window.DIGIT_MODULE (see data.js).
 * No backend — all edits mutate the in-memory module object.
 */
(function () {
  "use strict";

  const MODULE = window.DIGIT_MODULE;

  // Transient drag-to-reorder state — not part of `state` since it doesn't
  // need to survive a re-render or be inspected anywhere else.
  let draggedFieldId = null;

  const state = {
    activeNav: "flows", // 'flows' | 'form-elements' | 'roles'
    expanded: new Set(["registration"]),
    search: "",
    openTabs: ["search-beneficiary"],
    activeScreenId: "search-beneficiary",
    activeElementId: null, // set when drilled into an element's properties view
    fieldTab: "elements", // 'elements' | 'logic', within the element properties view
    activeStateSubId: null, // set when drilled into one of a dynamic element's states
    stateSubTab: "elements", // 'elements' | 'logic', within that state's own properties view
  };

  // ---------- helpers ----------

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function flatScreens() {
    return MODULE.categories.flatMap((cat) =>
      cat.screens.map((s) => ({ ...s, _catKey: cat.key, _catLabel: cat.label }))
    );
  }

  function findScreen(id) {
    for (const cat of MODULE.categories) {
      const s = cat.screens.find((s) => s.id === id);
      if (s) return s;
    }
    return null;
  }

  function categoryOf(screenId) {
    return MODULE.categories.find((c) => c.screens.some((s) => s.id === screenId));
  }

  function badgeClasses(badge) {
    switch (badge) {
      case "Locked":
        return "bg-gray-100 text-gray-500";
      case "Fully Configurable":
        return "bg-emerald-50 text-emerald-700";
      default: // Partially Configurable
        return "bg-amber-50 text-amber-700";
    }
  }

  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.remove("opacity-0", "translate-y-2");
    el.classList.add("opacity-100", "translate-y-0");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.classList.add("opacity-0", "translate-y-2");
      el.classList.remove("opacity-100", "translate-y-0");
    }, 2200);
  }

  // ---------- Flows panel ----------

  function matchesSearch(screen) {
    if (!state.search) return true;
    return screen.name.toLowerCase().includes(state.search.toLowerCase());
  }

  function renderFlowsPanel() {
    const root = document.getElementById("flows-panel");
    if (state.activeNav !== "flows") {
      root.innerHTML = "";
      return;
    }

    const term = state.search.trim();
    const groups = MODULE.categories.map((cat) => {
      const screens = cat.screens.filter(matchesSearch);
      return { ...cat, screens };
    });

    const anyFilter = term.length > 0;

    const groupsHtml = groups
      .filter((g) => !anyFilter || g.screens.length > 0)
      .map((g) => {
        const isOpen = anyFilter ? true : state.expanded.has(g.key);
        const itemsHtml = g.screens
          .map((s) => {
            const active = s.id === state.activeScreenId;
            return `
              <button
                type="button"
                data-screen-id="${escapeHtml(s.id)}"
                class="flow-item w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                  active ? "bg-blue-50 text-[#c2410c] font-medium" : "text-gray-700 hover:bg-gray-50"
                }"
              >${escapeHtml(s.name)}</button>`;
          })
          .join("");

        return `
          <div class="flow-category">
            <button
              type="button"
              data-cat-key="${escapeHtml(g.key)}"
              class="cat-toggle w-full flex items-center justify-between px-1 py-2 text-[15px] font-semibold text-[#191D88]"
            >
              <span>${escapeHtml(g.label)}</span>
              <svg class="w-4 h-4 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}" viewBox="0 0 20 20" fill="none">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="border border-gray-200 rounded-md overflow-hidden mb-3 ${isOpen ? "" : "hidden"}">
              ${itemsHtml || `<div class="px-4 py-3 text-sm text-gray-400">No screens</div>`}
            </div>
          </div>`;
      })
      .join("");

    root.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-800">Flows</h2>
        <button id="close-flows" type="button" class="text-gray-400 hover:text-gray-600" aria-label="Close flows panel">
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="relative mb-4">
        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M17 17L13.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input id="flow-search" type="text" value="${escapeHtml(state.search)}" placeholder="Flows"
          class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c2410c]/30 focus:border-[#c2410c]"/>
      </div>
      ${groupsHtml}
    `;

    document.getElementById("flow-search").addEventListener("input", (e) => {
      state.search = e.target.value;
      renderFlowsPanel();
    });
    document.getElementById("close-flows").addEventListener("click", () => {
      state.activeNav = null;
      render();
    });
    root.querySelectorAll(".cat-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.catKey;
        if (state.expanded.has(key)) state.expanded.delete(key);
        else state.expanded.add(key);
        renderFlowsPanel();
      });
    });
    root.querySelectorAll(".flow-item").forEach((btn) => {
      btn.addEventListener("click", () => selectScreen(btn.dataset.screenId));
    });
  }

  function selectScreen(id) {
    const previousScreen = findScreen(state.activeScreenId);
    if (previousScreen) resetStatePreviews(previousScreen, null);
    state.activeScreenId = id;
    state.activeElementId = null;
    state.activeStateSubId = null;
    if (!state.openTabs.includes(id)) state.openTabs.push(id);
    const cat = categoryOf(id);
    if (cat) state.expanded.add(cat.key);
    render();
  }

  function closeTab(id) {
    const idx = state.openTabs.indexOf(id);
    if (idx === -1) return;
    state.openTabs.splice(idx, 1);
    if (state.activeScreenId === id) {
      state.activeScreenId = state.openTabs[idx] || state.openTabs[idx - 1] || state.openTabs[0] || null;
    }
    render();
  }

  // ---------- Tabs + canvas ----------

  function renderTabs() {
    const root = document.getElementById("tabs-row");
    if (!state.openTabs.length) {
      root.innerHTML = "";
      return;
    }
    root.innerHTML = state.openTabs
      .map((id) => {
        const s = findScreen(id);
        if (!s) return "";
        const active = id === state.activeScreenId;
        return `
          <div data-tab-id="${escapeHtml(id)}"
            class="tab-pill flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer border ${
              active ? "border-[#c2410c] text-[#c2410c] bg-orange-50 font-medium" : "border-transparent text-gray-500 hover:bg-gray-100"
            }">
            <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none"><path d="M3 4h14M3 10h9M3 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            <span>${escapeHtml(s.name)}</span>
            <button data-close-id="${escapeHtml(id)}" class="tab-close text-gray-400 hover:text-gray-700" aria-label="Close tab">
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>
          </div>`;
      })
      .join("");

    root.querySelectorAll(".tab-pill").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".tab-close")) return;
        selectScreen(el.dataset.tabId);
      });
    });
    root.querySelectorAll(".tab-close").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(btn.dataset.closeId);
      });
    });
  }

  // Every element rendered in the phone preview is clickable — it opens the
  // same properties drawer as clicking its card in the side panel (see the
  // ".canvas-el" wiring in renderCanvas).
  const CANVAS_EL_CLASS = "canvas-el cursor-pointer hover:ring-2 hover:ring-[#191D88]/40 transition-shadow";
  const canvasElAttr = (el) => `data-canvas-el-id="${escapeHtml(el.id)}"`;

  // Marks text that will be replaced by real record data at runtime (a
  // beneficiary's actual name, address, age...) — a dashed underline,
  // distinct from a label/heading, which is the static text an admin
  // configures and that always shows as-is in the real app.
  // Not italic — italics hurt legibility/accessibility for a lot of readers.
  // The dashed underline alone is the "this is placeholder data" signal, and
  // text-gray-600 keeps ~7:1 contrast on white (passes WCAG AA/AAA), unlike
  // the lighter gray-400 this used to be.
  // Every dynamic value: plain text with a dotted underline, same size and
  // colour wherever it sits. No tinted box — the light orange tint is kept
  // only for preview placeholders (Search Results, Vaccination History).
  // The dotted line also shows on empty values (e.g. table cells).
  const dynamicValue = (text) =>
    `<span class="inline-block align-middle min-w-[2.5rem] border-b-[1.5px] border-dotted border-slate-500 text-sm leading-snug font-normal text-slate-700 whitespace-nowrap">${escapeHtml(
      text || ""
    )}</span>`;

  // Same dotted-underline marker without the tinted box — used inside the
  // grey member card (Member Name, Gender | Age), where the box isn't wanted.
  // Inherits the surrounding font so the heading stays a heading.
  const dynamicPlain = (text) =>
    `<span class="inline-block min-w-[2.5rem] border-b-[1.5px] border-dotted border-slate-500 leading-snug">${escapeHtml(
      text || ""
    )}</span>`;

  function searchbarPill(el) {
    return `
      <div class="${CANVAS_EL_CLASS} flex-1 min-w-0 h-10 flex items-center gap-2 border border-gray-300 rounded-md px-3 bg-white" ${canvasElAttr(
        el
      )}>
        <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M17 17L13.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span class="text-xs text-gray-400 truncate">${escapeHtml(el.placeholder)}</span>
      </div>`;
  }

  function buttonIcon(name) {
    switch (name) {
      case "filter":
        return `<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none"><path d="M3 4h14l-5.25 6.12V16l-3.5-1.75v-4.13L3 4z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
      case "download":
        return `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="none"><path d="M10 3v9m0 0l-3-3m3 3l3-3M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      case "person-add":
        return `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M15.5 6v4M13.5 8h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
      case "qr":
        return `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="5" height="5" stroke="currentColor" stroke-width="1.4"/><rect x="12" y="3" width="5" height="5" stroke="currentColor" stroke-width="1.4"/><rect x="3" y="12" width="5" height="5" stroke="currentColor" stroke-width="1.4"/><path d="M12 12h2v2h-2zM16 12h1M12 16h1M15 16h2v1h-2z" fill="currentColor"/></svg>`;
      case "edit":
        return `<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none"><path d="M13.5 3.5l3 3-9 9-3.5.5.5-3.5 9-9z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      case "add-circle":
        return `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="9"/><path d="M10 6v8M6 10h8" stroke="white" stroke-width="1.6" stroke-linecap="round"/></svg>`;
      default:
        return "";
    }
  }

  // Three real button tiers, like the rest of the DIGIT design system:
  // primary (filled), secondary/"outline" (bordered), tertiary (text +
  // icon only, no chrome at all — e.g. "Edit" next to a name, "Add Member").
  function buttonMarkup(el, { inline = false } = {}) {
    const icon = buttonIcon(el.icon);

    if (el.style === "tertiary") {
      return `<div class="${CANVAS_EL_CLASS} flex items-center justify-center gap-1.5 text-sm font-semibold text-[#c2410c] py-2 rounded-md flex-shrink-0" ${canvasElAttr(
        el
      )}>${icon}${escapeHtml(el.text)}</div>`;
    }

    const style = el.style === "outline" ? "border border-[#c2410c] text-[#c2410c] bg-white" : "bg-[#c2410c] text-white";
    let layout;
    if (inline) {
      layout = "h-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium";
    } else if (el.compact) {
      // Auto-width, left-aligned — e.g. "Edit Household" above a card.
      layout = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium mb-3";
    } else {
      // mb-2.5: the footer wrapper used to space these via space-y; standalone/
      // in-card buttons need their own margin since they're not always in
      // that wrapper (e.g. stacked inside a member card).
      layout = "w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold mb-2.5";
    }
    return `<div class="${CANVAS_EL_CLASS} ${layout} ${style}" ${canvasElAttr(el)}>${icon}${escapeHtml(el.text)}</div>`;
  }

  // Standalone (non-inline) buttons are pinned in the phone's bottom footer,
  // not the scrolling content area. Inline buttons (e.g. Filter, merged next
  // to a searchbar) and contextual buttons (e.g. an "Open" action next to a
  // result row, not a full-width page action) stay with the content instead.
  function isFooterButton(el) {
    return el.type === "button" && !el.inlineWithSearch && !el.contextual;
  }

  // A dynamic element with `states` (e.g. Delivery Status) can gate other
  // elements — usually buttons — to only its currently-active state. Any
  // button referenced by ANY state is "controlled": it only renders while
  // the state that lists it is the active one. With no active state (the
  // default, uncluttered view), every controlled button stays hidden.
  // Normalizes a state's controlled elements to [{id, required}], regardless
  // of which of the two shapes it was authored with:
  // - `elementIds: [...]` (legacy/simple — e.g. Delivery Status's buttons):
  //   flat list, always required, all-or-nothing per state.
  // - `elements: [{id, required}, ...]` (e.g. Search Results): per-element
  //   control — required ones always show when the state is active,
  //   optional ones can be toggled off via elementOverrides.
  function stateElementEntries(s) {
    if (s.elements) return s.elements;
    return (s.elementIds || []).map((id) => ({ id, required: true }));
  }

  function computeStateGating(screen) {
    const controlledIds = new Set();
    const allowedIds = new Set();
    screen.elements.forEach((el) => {
      if (!el.states) return;
      el.states.forEach((s) => stateElementEntries(s).forEach((entry) => controlledIds.add(entry.id)));
      if (!el.visible) return; // a hidden dynamic element grants nothing, regardless of activeStateId
      const active = el.activeStateId && el.states.find((s) => s.id === el.activeStateId);
      if (!active) return;
      const overrides = active.elementOverrides || {};
      stateElementEntries(active).forEach((entry) => {
        if (entry.required || overrides[entry.id] !== false) allowedIds.add(entry.id);
      });
    });
    return { controlledIds, allowedIds };
  }

  // Clears any active state preview on a screen's states-driven elements
  // (e.g. Delivery Status) — collapsing back to the generic default tag —
  // except the one given (if any). Returns whether anything actually
  // changed, so callers know whether a re-render is needed.
  function resetStatePreviews(screen, exceptElId) {
    let changed = false;
    screen.elements.forEach((el) => {
      if (el.states && el.id !== exceptElId && el.activeStateId) {
        el.activeStateId = null;
        changed = true;
      }
    });
    return changed;
  }

  function isEffectivelyVisible(el, gating) {
    if (gating.controlledIds.has(el.id)) return el.visible && gating.allowedIds.has(el.id);
    return el.visible;
  }

  // Same idea as resetStatePreviews, but for a "replaces" pair (e.g.
  // "Download Beneficiary IDs" swapped in for "Register New Beneficiary")
  // — clicking on anything else in the UI puts the pair back to its
  // default (the replacer hidden, the replaced one showing again).
  function resetReplacePreviews(screen, exceptElId) {
    let changed = false;
    screen.elements.forEach((el) => {
      if (!el.replaces) return;
      if (el.id === exceptElId || el.replaces === exceptElId) return; // this pair is what was just clicked — leave it
      if (el.visible) {
        el.visible = false;
        const replaced = screen.elements.find((x) => x.id === el.replaces);
        if (replaced) replaced.visible = true;
        changed = true;
      }
    });
    return changed;
  }

  // Same idea again, but for a "peek" element (el.peek) — no toggle of its
  // own, hidden by default, with nothing else it swaps places with (e.g.
  // the Low Beneficiary ID popup). Clicking on anything else puts it back
  // to hidden.
  function resetPeekPreviews(screen, exceptElId) {
    let changed = false;
    screen.elements.forEach((el) => {
      if (!el.peek || el.id === exceptElId) return;
      if (el.visible) {
        el.visible = false;
        changed = true;
      }
    });
    return changed;
  }

  // Clicking any element (in Page Properties or the canvas) should let you
  // see it in context: if it's already showing (not gated, or its owning
  // state is active), leave the preview alone — for buttons it'll just get
  // highlighted. If it's gated by a state that isn't active — a button, a
  // whole result card, anything — switch to the first state that includes
  // it so it actually appears. Returns whether any state preview changed.
  function revealElementInPreview(screen, targetEl, { fromCanvas = false } = {}) {
    // Clicking on anything else resets any "replaces" pair (e.g. Download
    // Beneficiary IDs / Register New Beneficiary) and any "peek" element
    // (e.g. a popup) back to their defaults — same idea as clearing an
    // unrelated state preview below.
    const replaceReset = resetReplacePreviews(screen, targetEl.id);
    const peekReset = resetPeekPreviews(screen, targetEl.id);

    // e.g. "Download Beneficiary IDs" also opens its alert popup — but only
    // when actually clicked in the live preview itself. Clicking its card
    // in Page Properties should just reveal/swap the button, the way every
    // other card click does, without also popping the alert open.
    let popupOpened = false;
    if (fromCanvas && targetEl.triggersPopup) {
      const popup = screen.elements.find((x) => x.id === targetEl.triggersPopup);
      if (popup && !popup.visible) {
        popup.visible = true;
        popupOpened = true;
      }
    }

    // A button that explicitly "replaces" another (e.g. "Download
    // Beneficiary IDs" vs. "Register New Beneficiary") isn't gated by a
    // states group — clicking whichever one of the pair is currently
    // hidden reveals it and hides its counterpart in its place.
    if (!targetEl.visible) {
      if (targetEl.replaces) {
        targetEl.visible = true;
        const replaced = screen.elements.find((x) => x.id === targetEl.replaces);
        if (replaced) replaced.visible = false;
        resetStatePreviews(screen, null); // none of these are gated by a states group — clear any unrelated one
        return true;
      }
      const replacer = screen.elements.find((x) => x.replaces === targetEl.id && x.visible);
      if (replacer) {
        targetEl.visible = true;
        replacer.visible = false;
        resetStatePreviews(screen, null);
        return true;
      }
      // A "peek" element has nothing to swap with — clicking it just
      // reveals it on its own.
      if (targetEl.peek) {
        targetEl.visible = true;
        resetStatePreviews(screen, null);
        return true;
      }
    }
    const gating = computeStateGating(screen);
    if (!gating.controlledIds.has(targetEl.id)) {
      return resetStatePreviews(screen, null) || replaceReset || peekReset || popupOpened; // not gated — clear any unrelated preview
    }
    if (isEffectivelyVisible(targetEl, gating)) return replaceReset || peekReset || popupOpened; // already showing under the current preview
    for (const el of screen.elements) {
      if (!el.states) continue;
      const owningState = el.states.find((s) => stateElementEntries(s).some((entry) => entry.id === targetEl.id));
      if (owningState) {
        resetStatePreviews(screen, el.id);
        el.activeStateId = owningState.id;
        return true;
      }
    }
    return replaceReset || peekReset || popupOpened;
  }

  // Shared by both click entry points (Page Properties cards and the
  // canvas): clicking a states-holder itself (e.g. Delivery Status) must
  // never clear its own preview, but clicking anything else should reveal
  // it if some other state is hiding it, or clear an unrelated preview
  // otherwise. Returns whether any state preview changed.
  function handleElementPreviewClick(screen, clickedEl, opts) {
    if (!clickedEl) return false;
    if (clickedEl.states) return resetStatePreviews(screen, clickedEl.id);
    return revealElementInPreview(screen, clickedEl, opts);
  }

  // Which card should Page Properties scroll to for a given clicked
  // element? If it's a states-holder itself (e.g. Delivery Status), its own
  // card. If it's gated by one (e.g. Redose, only shown under a state),
  // the owning states-holder's card — that's the useful context, not the
  // button buried in a "Buttons" group further down. Otherwise, its own.
  function scrollTargetIdFor(screen, clickedEl) {
    if (clickedEl.states) return clickedEl.id;
    for (const el of screen.elements) {
      if (el.states && el.states.some((s) => stateElementEntries(s).some((entry) => entry.id === clickedEl.id))) return el.id;
    }
    return clickedEl.id;
  }

  // Scrolls Page Properties so the given element's card is in view —
  // clicking something in the phone preview shouldn't leave you hunting
  // for it in a long list.
  function scrollPropertiesToElement(elId) {
    const node = document.querySelector(`#properties-panel [data-el-card-id="${elId}"]`);
    if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Briefly rings the given element in the canvas — used so clicking a
  // button (or anything else) in Page Properties visibly points at it.
  function highlightCanvasElement(elId) {
    const node = document.querySelector(`#canvas [data-canvas-el-id="${elId}"]`);
    if (!node) return;
    node.classList.add("ring-2", "ring-[#c2410c]", "ring-offset-2");
    clearTimeout(highlightCanvasElement._timer);
    highlightCanvasElement._timer = setTimeout(() => {
      node.classList.remove("ring-2", "ring-[#c2410c]", "ring-offset-2");
    }, 1600);
  }

  // Two independently-configurable caption values shown on one line,
  // separated by "|" (e.g. Gender | Age) — each stays its own clickable
  // element in the canvas, not merged into a single one.
  function captionPairMarkup(a, b) {
    const valueSpan = (el) =>
      `<span class="${CANVAS_EL_CLASS} rounded-md" ${canvasElAttr(el)}>${(el.innerCard ? dynamicPlain : dynamicValue)(el.value || el.label)}</span>`;
    return `<div class="flex items-center gap-1.5 text-sm text-gray-500 mb-3">${valueSpan(a)}<span class="text-gray-300">|</span>${valueSpan(
      b
    )}</div>`;
  }

  // Renders a flat run of elements, merging:
  // - a heading-style text template with an immediately-following
  //   "inlineWithText" button (e.g. a member name + its "Edit" action)
  // - two consecutive caption text templates flagged "joinNext" onto one
  //   line (e.g. Gender | Age — still two separate configurable elements)
  // Used both for top-level content and for an inner card's contents.
  function renderElementSequence(items) {
    let html = "";
    let i = 0;
    while (i < items.length) {
      const el = items[i];
      const next = items[i + 1];
      if (el.type === "textTemplate" && next && next.type === "button" && next.inlineWithText) {
        html += `<div class="flex items-center justify-between gap-2 mb-2">${elementHtml(el)}${buttonMarkup(next, {
          inline: true,
        })}</div>`;
        i += 2;
        continue;
      }
      if (el.type === "textTemplate" && el.joinNext && next && next.type === "textTemplate") {
        html += captionPairMarkup(el, next);
        i += 2;
        continue;
      }
      html += elementHtml(el);
      i += 1;
    }
    return html;
  }

  // A nested gray "member card" inside an outer white card — groups a run
  // of consecutive innerCard elements together.
  function renderInnerCardGroups(items) {
    let html = "";
    let i = 0;
    while (i < items.length) {
      const el = items[i];
      if (el.innerCard) {
        const group = [];
        while (i < items.length && items[i].innerCard) {
          group.push(items[i]);
          i += 1;
        }
        html += `<div class="bg-[#F2F2F2] rounded-lg p-4 mb-3 [&>*:last-child]:mb-0">${renderElementSequence(group)}</div>`;
        continue;
      }
      // Collect a run of consecutive non-innerCard elements together (not
      // one at a time) so pairing logic in renderElementSequence — e.g. a
      // heading + its button — can actually see the next sibling.
      const run = [];
      while (i < items.length && !items[i].innerCard) {
        run.push(items[i]);
        i += 1;
      }
      html += renderElementSequence(run);
    }
    return html;
  }

  // Renders a screen's visible, non-footer elements. Content sits directly on
  // the page background — things that get their own container are: a
  // searchbar (its own pill, optionally merged with an inline Filter button),
  // any run of consecutive form fields (grouped into one shared card), and
  // any run of consecutive "outerCard" elements (grouped into one shared
  // white card, which can itself contain a nested "innerCard" group).
  function renderElementsHtml(elements, gating) {
    // A button that belongs to a popup (el.popupId) renders inside that
    // popup's own overlay card, not in the normal scrolling content.
    const visible = elements.filter((el) => isEffectivelyVisible(el, gating) && !isFooterButton(el) && !el.popupId);
    let html = "";
    let i = 0;
    while (i < visible.length) {
      const el = visible[i];
      const next = visible[i + 1];

      if (el.outerCard) {
        const group = [];
        // A different cardGroup starts a new white card (e.g. one card per
        // cycle table on Vaccination Summary).
        while (i < visible.length && visible[i].outerCard && (visible[i].cardGroup || null) === (el.cardGroup || null)) {
          group.push(visible[i]);
          i += 1;
        }
        html += `<div class="bg-white rounded-xl shadow-sm p-5 mb-4 [&>*:last-child]:mb-0">${renderInnerCardGroups(
          group
        )}</div>`;
        continue;
      }

      if (el.type === "searchbar" && next && next.type === "button" && next.inlineWithSearch) {
        html += `<div class="flex items-center gap-2 mb-4">${searchbarPill(el)}${buttonMarkup(next, { inline: true })}</div>`;
        i += 2;
        continue;
      }

      if (el.type === "field") {
        const group = [];
        while (i < visible.length && visible[i].type === "field") {
          group.push(visible[i]);
          i += 1;
        }
        html += `<div class="bg-white rounded-xl shadow-sm p-4 mb-4 space-y-4">${group
          .map(fieldInnerHtml)
          .join("")}</div>`;
        continue;
      }

      html += elementHtml(el);
      i += 1;
    }
    return html;
  }

  function elementHtml(el) {
    switch (el.type) {
      case "searchbar":
        return `<div class="flex items-center gap-2 mb-4">${searchbarPill(el)}</div>`;
      case "resultGroup":
        // A placeholder card — not a small tag/pill, since this stands in
        // for a whole content section, not a single value — representing
        // the states-driven element in the default/uncluttered view. Once
        // a specific result state is being previewed, the real content it
        // gates (the found result, the empty state, etc.) takes over
        // instead, so the card steps aside.
        if (el.activeStateId) return "";
        // No white card — a squarish block in the same light orange tint as
        // the dynamic chips, with the dotted-underlined label centred in it.
        return `
          <div class="${CANVAS_EL_CLASS} flex items-center justify-center h-28 mb-3 rounded-md border border-[#F9E2D4] bg-[#FFF8F3] text-sm text-slate-700" ${canvasElAttr(el)}>
            ${dynamicPlain(el.label)}
          </div>`;
      case "emptyState":
        return `
          <div class="${CANVAS_EL_CLASS} flex flex-col items-center text-center py-6 px-2 rounded-md" ${canvasElAttr(el)}>
            <div class="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-3">
              <svg class="w-7 h-7 text-[#c2410c]" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1.6"/><path d="M20 20L15.5 15.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </div>
            <div class="text-sm font-semibold text-[#191D88] mb-1">${escapeHtml(el.title)}</div>
            <div class="text-xs text-gray-500 leading-snug">${escapeHtml(el.message)}</div>
          </div>`;
      case "button":
        return buttonMarkup(el);
      case "list":
        return `
          <div class="${CANVAS_EL_CLASS} bg-white border border-gray-200 rounded-md overflow-hidden mb-3" ${canvasElAttr(el)}>
            ${el.items
              .map(
                (it) => `
              <div class="px-3 py-2.5 border-b border-gray-100 last:border-b-0">
                <div class="text-sm text-gray-800">${escapeHtml(it.title)}</div>
                <div class="text-xs text-gray-500">${escapeHtml(it.subtitle)}</div>
              </div>`
              )
              .join("")}
          </div>`;
      case "field":
        // Lone field rendered outside a group (defensive fallback — normally
        // renderElementsHtml groups consecutive fields into one shared card).
        return `<div class="bg-white rounded-xl shadow-sm p-4 mb-4">${fieldInnerHtml(el)}</div>`;
      case "card":
        return `
          <div class="${CANVAS_EL_CLASS} bg-white border border-gray-200 rounded-md p-3 mb-3" ${canvasElAttr(el)}>
            <div>${dynamicValue(el.title)}</div>
            <div class="mt-1.5">${dynamicValue(el.subtitle)}</div>
          </div>`;
      case "success":
        return `
          <div class="${CANVAS_EL_CLASS} flex flex-col items-center text-center py-8 rounded-md" ${canvasElAttr(el)}>
            <div class="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <svg class="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none"><path d="M5 12.5L9.5 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="text-sm font-medium text-[#191D88]">${escapeHtml(el.message)}</div>
          </div>`;
      case "textTemplate":
        // A heading/caption/plain textTemplate has no separate static label
        // — the whole line IS the dynamic value (a placeholder for the real
        // beneficiary's name, age, etc.), so the whole thing gets the marker.
        if (el.variant === "heading") {
          return `<div class="${CANVAS_EL_CLASS} text-base font-semibold text-gray-800 rounded-md" ${canvasElAttr(
            el
          )}>${(el.innerCard ? dynamicPlain : dynamicValue)(el.value || el.label)}</div>`;
        }
        if (el.variant === "caption") {
          return `<div class="${CANVAS_EL_CLASS} text-sm text-gray-500 mb-3 rounded-md" ${canvasElAttr(el)}>${dynamicValue(
            el.value || el.label
          )}</div>`;
        }
        if (el.variant === "plain") {
          return `<div class="${CANVAS_EL_CLASS} text-sm text-gray-700 mb-1.5 rounded-md" ${canvasElAttr(el)}>${dynamicValue(
            el.value || el.label
          )}</div>`;
        }
        return `
          <div class="${CANVAS_EL_CLASS} mb-3 rounded-md" ${canvasElAttr(el)}>
            <div class="text-xs text-gray-500 mb-0.5">${escapeHtml(el.label)}</div>
            <div class="text-sm font-medium text-gray-800">${dynamicValue(el.value || "")}</div>
          </div>`;
      case "labelPairList":
        return `
          <div class="${CANVAS_EL_CLASS} mb-3 rounded-md" ${canvasElAttr(el)}>
            ${(el.pairs || [])
              .filter((p) => p.enabled !== false)
              .map(
                (p) => `
              <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <span class="text-sm font-bold text-gray-900">${escapeHtml(p.label)}</span>
                <span class="text-sm text-gray-700">${p.value ? dynamicValue(p.value) : "*"}</span>
              </div>`
              )
              .join("")}
          </div>`;
      case "labelValueRow":
        // Same "bold label, plain value" row as labelPairList, but as its
        // own independently-configurable element (e.g. "Member in House").
        // Label = static text an admin configures; value = dynamic data.
        return `
          <div class="${CANVAS_EL_CLASS} flex items-center justify-between mb-2 rounded-md" ${canvasElAttr(el)}>
            <span class="text-sm font-bold text-gray-900">${escapeHtml(el.label)}</span>
            <span class="text-sm text-gray-700">${dynamicValue(el.value || "")}</span>
          </div>`;
      case "tag": {
        // A states-driven tag (e.g. Delivery Status) shows its generic label
        // by default (no state selected — uncluttered) or the active
        // state's own name + color once one's picked for preview.
        const active = el.states && el.activeStateId ? el.states.find((s) => s.id === el.activeStateId) : null;
        const displayText = active ? active.name : el.value || el.label;
        const tagStyle = active ? active.tagStyle : el.tagStyle;
        const shape = tagStyle === "id" ? "rounded-lg" : "rounded-full";
        const weight = tagStyle === "id" ? "font-bold" : "font-medium";
        // Dashed underline signals "this is dynamic" (not italic — same
        // accessibility reasoning as dynamicValue) — only on the generic
        // default, though. Once a specific state is actively being
        // previewed, its name is the literal, exact text that would show
        // (an admin authored it) — the underline would wrongly imply that
        // text itself is a placeholder, when really the dynamism is just
        // *which* state applies. It's on an inner span around just the
        // text, not the pill's own edge — a border-b on the pill itself
        // sits under the padding, not the text, and reads as a shape accent
        // rather than an underline. A fixed gray-500 border also renders
        // reliably against every pill color, unlike a `border-current`
        // opacity modifier, which Tailwind doesn't reliably generate.
        // Generic default = the shared dynamic chip, like every other
        // dynamic value; a previewed state shows the real coloured tag.
        if (!active) {
          // Beneficiary ID: no orange box, just the dotted-underlined text.
          // A states-driven tag (Delivery Status) is a preview placeholder,
          // so it gets the light orange tint like Search Results.
          if (el.states) {
            return `<div class="${CANVAS_EL_CLASS} block w-fit mb-3 px-2.5 py-1 rounded-md border border-[#F9E2D4] bg-[#FFF8F3] text-sm text-slate-700" ${canvasElAttr(el)}>${dynamicPlain(displayText)}</div>`;
          }
          const mark = tagStyle === "id" ? dynamicPlain : dynamicValue;
          return `<div class="${CANVAS_EL_CLASS} block w-fit mb-3 rounded-md text-sm text-slate-700" ${canvasElAttr(el)}>${mark(displayText)}</div>`;
        }
        const text = escapeHtml(displayText);
        return `
          <div class="${CANVAS_EL_CLASS} block w-fit mb-3 ${shape}" ${canvasElAttr(el)}>
            <span class="inline-block text-xs ${weight} px-2.5 py-1 ${shape} ${tagColorClasses(tagStyle)}">${text}</span>
          </div>`;
      }
      case "table": {
        const columns = (el.columns || []).filter((c) => c.enabled !== false);
        const rows = el.rows && el.rows.length ? el.rows : [columns.map(() => "")];
        return `
          ${el.title ? `<div class="text-base font-semibold text-gray-800 mb-2">${escapeHtml(el.title)}</div>` : ""}
          <div class="${CANVAS_EL_CLASS} border border-gray-200 rounded-md overflow-hidden mb-3" ${canvasElAttr(el)}>
            <div class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="bg-gray-100">
                    ${columns
                      .map(
                        (c) =>
                          `<th class="text-left font-bold text-[#191D88] px-3 py-2 whitespace-nowrap">${escapeHtml(c.label)}</th>`
                      )
                      .join("")}
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map(
                      (row) => `
                    <tr class="border-t border-gray-100">
                      ${row.map((cell) => `<td class="px-3 py-3 whitespace-nowrap">${dynamicValue(cell)}</td>`).join("")}
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
            <div class="flex items-center justify-center gap-2 py-1.5 bg-gray-50 border-t border-gray-100 text-gray-300">
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <div class="h-1.5 w-16 rounded-full bg-gray-200"></div>
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none"><path d="M8 4L14 10L8 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>${
            el.showMore
              ? `<div class="flex items-center gap-1 text-sm text-[#c2410c] underline underline-offset-2 mb-1">Show More<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M5 11l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
              : ""
          }`;
      }
      default:
        return "";
    }
  }

  function tagColorClasses(style) {
    switch (style) {
      case "success":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "danger":
        return "bg-red-50 text-red-700 border border-red-200";
      case "warning":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "info":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "id":
        // Cream background, navy text, less rounded — matches the
        // "Beneficiary ID" tag's distinct look (an identifier, not a status).
        return "bg-amber-50 text-[#191D88] border border-amber-100";
      default:
        // Slightly more visible than gray-100 (which nearly disappeared
        // against the card's own #F2F2F2 background) while keeping the
        // slate-700-on-slate-200 contrast well above WCAG AA.
        return "bg-slate-200 text-slate-700 border border-slate-300";
    }
  }

  function fieldInnerHtml(el) {
    const isSelect = el.inputType === "select";
    const placeholder = el.placeholder || `${isSelect ? "Choose" : "Enter"} ${el.label.toLowerCase()}`;
    return `
      <div class="${CANVAS_EL_CLASS} p-1.5 -m-1.5 rounded-md" ${canvasElAttr(el)}>
        <div class="text-xs font-medium text-gray-700 mb-1.5">${escapeHtml(el.label)}${
          el.required ? ' <span class="text-red-500">*</span>' : ""
        }</div>
        <div class="flex items-center justify-between gap-2 border border-gray-300 rounded-md px-3 py-2.5 text-xs text-gray-400">
          <span>${el.inputType === "number" ? "0" : escapeHtml(placeholder)}</span>
          ${
            isSelect
              ? `<svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
              : ""
          }
        </div>
        ${
          el.helpTextEnabled && el.helpText
            ? `<div class="text-[11px] text-gray-400 mt-1 leading-snug">${escapeHtml(el.helpText)}</div>`
            : ""
        }
      </div>`;
  }

  function renderCanvas() {
    const canvasEl = document.getElementById("canvas");
    const screen = findScreen(state.activeScreenId);
    if (!screen) {
      canvasEl.innerHTML = `<div class="text-sm text-gray-400 py-24 text-center">Select a screen from Flows to preview it here.</div>`;
      return;
    }

    const gating = computeStateGating(screen);

    const toolbarEl = document.getElementById("canvas-toolbar");
    if (toolbarEl) {
      toolbarEl.innerHTML = `
        <div class="flex-shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-xs font-medium text-[#191D88]">
          <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="3" y="12" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.4"/></svg>
          ${escapeHtml(screen.name)}
        </div>`;
    }

    canvasEl.innerHTML = `
      <div class="relative h-full max-h-[660px] flex items-center">
      <div class="phone-frame relative rounded-[2rem] border-[10px] border-black bg-white shadow-xl overflow-hidden flex flex-col">
        <div class="flex items-center gap-2 px-4 py-3 bg-[#0f3d4e] text-white flex-shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          <div class="flex items-center gap-1.5 font-semibold text-sm">
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6"/></svg>
            DIGIT
          </div>
        </div>
        <div class="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 flex-shrink-0">
          <div class="flex items-center gap-1 text-sm font-medium text-[#191D88]">
            <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Back
          </div>
          ${
            screen.pageHelp
              ? `<div class="flex items-center gap-1 text-sm font-medium text-[#c2410c]">
                  Help
                  <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4"/><path d="M7.8 8a2.2 2.2 0 114 1.2c-.4.5-1.1.9-1.1 1.7v.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="10" cy="14" r="0.7" fill="currentColor"/></svg>
                </div>`
              : ""
          }
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 bg-[#EEEEEE]">
          <h3 class="text-lg font-bold text-[#191D88] mb-1">${escapeHtml(screen.pageHeading)}</h3>
          ${
            screen.pageDescription
              ? `<p class="text-xs text-gray-500 mb-4 leading-snug">${escapeHtml(screen.pageDescription)}</p>`
              : ""
          }
          ${renderElementsHtml(screen.elements, gating)}
        </div>
        ${renderFooterHtml(screen.elements, gating)}
        ${renderPopupOverlayHtml(screen.elements, gating)}
      </div>
      </div>`;

    canvasEl.querySelectorAll(".canvas-el").forEach((node) => {
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        const clickedEl = screen.elements.find((x) => x.id === node.dataset.canvasElId);
        // A gated element (a button, a whole result card, anything) is only
        // visible because some state is active — blindly resetting previews
        // here would immediately hide the very thing just clicked.
        const changed = handleElementPreviewClick(screen, clickedEl, { fromCanvas: true });
        state.activeElementId = node.dataset.canvasElId;
        state.fieldTab = "elements";
        // A tag (or any states-driven element) showing a specific type in
        // the preview — e.g. Delivery Status reading "Administered
        // Successfully" — should take you straight to that type's own
        // properties, not just back to the plain list.
        if (clickedEl && clickedEl.states && clickedEl.activeStateId) {
          state.activeStateSubId = clickedEl.activeStateId;
          state.stateSubTab = "elements";
        }
        renderPropertiesPanel();
        if (changed) renderCanvas();
        // If a drawer opened instead of the main list, there's no card to
        // scroll to — this is a harmless no-op in that case.
        if (clickedEl) scrollPropertiesToElement(scrollTargetIdFor(screen, clickedEl));
      });
    });

    // The cross on the popup card itself minimizes the preview — same
    // reset as clicking the backdrop, but without needing to click outside
    // the card. Stops the click from also bubbling to the card's own
    // ".canvas-el" handler (which would otherwise open its properties).
    canvasEl.querySelectorAll(".popup-close").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        resetPeekPreviews(screen, null);
        renderPropertiesPanel();
        renderCanvas();
      });
    });

    // The dark backdrop behind a popup covers the whole frame, so it's the
    // only thing left to click once one is showing — clicking it (not the
    // card on top of it) dismisses the popup, same as clicking any other
    // element does from Page Properties.
    canvasEl.querySelectorAll("[data-popup-backdrop]").forEach((node) => {
      node.addEventListener("click", (e) => {
        if (e.target !== node) return; // a click on the card itself bubbles here too — ignore it
        const popupEl = screen.elements.find((x) => x.id === node.dataset.popupBackdrop);
        if (popupEl) resetPeekPreviews(screen, null);
        renderPropertiesPanel();
        renderCanvas();
      });
    });
  }

  function renderFooterHtml(elements, gating) {
    // Same as above — a popup's own buttons stay out of the page footer.
    const footerButtons = elements.filter((el) => isEffectivelyVisible(el, gating) && isFooterButton(el) && !el.popupId);
    if (!footerButtons.length) return "";
    return `
      <div class="flex-shrink-0 bg-white px-4 pt-2.5" style="box-shadow: 0 -2px 8px rgba(0,0,0,0.06);">
        ${footerButtons.map((el) => buttonMarkup(el)).join("")}
      </div>`;
  }

  // A popup renders as an overlay on top of the whole phone frame — not
  // inline in the scrollable content like every other element — so it gets
  // its own layer here instead of a case in elementHtml. Clicking the card
  // still opens the same Element properties as any other canvas element.
  // The backdrop itself (data-popup-backdrop) covers everything behind it,
  // so it also needs its own click-to-dismiss wiring — otherwise there's
  // no way to get back to any other element in the canvas once it's shown.
  function renderPopupOverlayHtml(elements, gating) {
    const popups = elements.filter((el) => el.type === "popup" && isEffectivelyVisible(el, gating));
    if (!popups.length) return "";
    return popups
      .map((el) => {
        const buttons = elements.filter(
          (b) => b.type === "button" && b.popupId === el.id && isEffectivelyVisible(b, gating)
        );
        return `
        <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-6" data-popup-backdrop="${escapeHtml(
          el.id
        )}">
          <div class="${CANVAS_EL_CLASS} relative bg-white rounded-xl shadow-xl p-4 pt-6 w-full max-w-[240px]" ${canvasElAttr(el)}>
            <button type="button" class="popup-close absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600" data-popup-close="${escapeHtml(
              el.id
            )}" aria-label="Minimize preview">
              <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </button>
            <div class="text-sm font-bold text-[#191D88] mb-1.5">${escapeHtml(el.title)}</div>
            ${
              el.filterOptions
                ? `<div class="text-left mb-3">
                    ${el.filterOptions
                      .filter((opt) => opt.enabled !== false)
                      .map(
                        (opt) => `
                      <label class="flex items-center gap-2 text-xs text-gray-700 py-1">
                        <input type="checkbox" class="w-3.5 h-3.5 rounded border-gray-300 text-[#c2410c] focus:ring-0"/>
                        ${escapeHtml(opt.label)}
                      </label>`
                      )
                      .join("")}
                  </div>`
                : `<div class="text-xs text-gray-500 leading-snug ${buttons.length ? "mb-3" : ""}">${escapeHtml(
                    el.message
                  )}</div>`
            }
            ${buttons.map((b) => buttonMarkup(b)).join("")}
          </div>
        </div>`;
      })
      .join("");
  }

  function stepScreen(delta) {
    const flat = flatScreens();
    const idx = flat.findIndex((s) => s.id === state.activeScreenId);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= flat.length) return;
    selectScreen(flat[nextIdx].id);
  }

  function renderNavArrows() {
    const flat = flatScreens();
    const idx = flat.findIndex((s) => s.id === state.activeScreenId);
    const prevBtn = document.getElementById("nav-prev");
    const nextBtn = document.getElementById("nav-next");
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx === -1 || idx >= flat.length - 1;
    prevBtn.classList.toggle("opacity-30", prevBtn.disabled);
    nextBtn.classList.toggle("opacity-30", nextBtn.disabled);
  }

  // ---------- Page Properties panel ----------

  const TOGGLE_ON = "#c2410c";
  const TOGGLE_OFF = "#d1d5db"; // gray-300

  // Generic on/off switch, styled directly in JS (background-color + knob
  // transform only) instead of a CSS peer-checked switch — avoids relying on
  // sibling/pseudo-class state and guarantees off = gray, on = orange, with
  // no layout reflow.
  function toggleButtonHtml({ checked, disabled = false, dataset = {}, className = "" }) {
    const datasetAttrs = Object.entries(dataset)
      .map(([k, v]) => `data-${k}="${escapeHtml(v)}"`)
      .join(" ");
    return `
      <button type="button" ${datasetAttrs} ${disabled ? "disabled" : ""}
        role="switch" aria-checked="${checked ? "true" : "false"}"
        class="${className} relative inline-flex w-9 h-5 rounded-full flex-shrink-0 transition-colors ${
          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
        }"
        style="background-color:${checked ? TOGGLE_ON : TOGGLE_OFF};">
        <span class="toggle-knob absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style="transform:translateX(${checked ? "16px" : "0px"});"></span>
      </button>`;
  }

  // Buttons group under a named category (e.g. "General actions") when a
  // button has ctaGroup set — a nested sub-heading per group, each with its
  // own button cards, rather than one flat list. Buttons without a
  // ctaGroup just render plainly after any named groups.
  function renderButtonGroups(screen, buttonEls) {
    const groups = new Map();
    const ungrouped = [];
    buttonEls.forEach((el) => {
      if (!el.ctaGroup) {
        ungrouped.push(el);
        return;
      }
      if (!groups.has(el.ctaGroup)) groups.set(el.ctaGroup, []);
      groups.get(el.ctaGroup).push(el);
    });

    // Alternating pattern: the panel itself is white, so the group
    // container is gray (FAFAFA) — and its button cards inside go white,
    // same rhythm as "Types of Delivery Status" one level further in.
    let html = "";
    groups.forEach((els, groupName) => {
      html += `
        <div class="border border-gray-200 rounded-md p-3 mb-3 bg-[#FAFAFA]">
          <div class="text-sm font-bold text-gray-700 mb-2">${escapeHtml(groupName)}</div>
          ${els.map((el) => elementCardHtml(screen, el, { bg: "bg-white" })).join("")}
        </div>`;
    });
    html += ungrouped.map((el) => elementCardHtml(screen, el)).join("");
    return html;
  }

  // Every non-button element (field or otherwise) gets the same clickable
  // card: a toggle plus a label, no inline editing on the card itself, no
  // grouping/categorization. Clicking anywhere on the card except the toggle
  // opens the Element/Field properties view — this works regardless of
  // whether the toggle is on, off, or disabled, and regardless of the
  // screen's or element's configurable/badge state (e.g. Partially
  // Configurable screens get the same drawer as Fully Configurable ones).
  function elementCardHtml(screen, el, { bg = "bg-[#FAFAFA]" } = {}) {
    const locked = screen.badge === "Locked" || !el.configurable;
    // Buttons are always present on their screen — no visibility switch,
    // just the label — but they still open the same drawer on click. Search
    // Results is likewise always present (exactly one of its types applies
    // per search, there's no "off" state for the group itself). A search
    // bar is core to the screen it's on — always shown, same as a button.
    // A few structural template-text elements (e.g. Household Details,
    // Name) are marked noToggle for the same reason — always shown.
    const showToggle =
      el.type !== "button" && el.type !== "resultGroup" && el.type !== "popup" && el.type !== "searchbar" && !el.noToggle;
    // Only form fields are reorderable — that's what "shuffling" means on a
    // form screen. Dragging is disabled on locked/non-configurable fields.
    const draggable = el.type === "field" && !locked;
    return `
      <div class="element-card border border-gray-200 rounded-md px-3 py-3 mb-2 ${bg} transition-colors ${
        el.states ? "" : "cursor-pointer hover:border-[#191D88]/50"
      }" data-el-card-id="${escapeHtml(el.id)}" ${
      draggable ? `draggable="true" data-drag-field-id="${escapeHtml(el.id)}"` : ""
    }>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${
              draggable
                ? `<svg class="drag-handle w-3.5 h-4 text-gray-300 flex-shrink-0 cursor-grab active:cursor-grabbing" viewBox="0 0 12 20" fill="currentColor" title="Drag to reorder">
                    <circle cx="3" cy="3" r="1.4"/><circle cx="9" cy="3" r="1.4"/>
                    <circle cx="3" cy="10" r="1.4"/><circle cx="9" cy="10" r="1.4"/>
                    <circle cx="3" cy="17" r="1.4"/><circle cx="9" cy="17" r="1.4"/>
                  </svg>`
                : ""
            }
            <div class="flex flex-col">
              <span class="text-sm font-bold text-gray-900 flex items-center gap-2">
                ${escapeHtml(el.label)}
              </span>
              ${
                el.type !== "button"
                  ? `<span class="inline-block w-fit text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 mt-1">${escapeHtml(
                      elementTypeLabel(el)
                    )}</span>`
                  : ""
              }
            </div>
          </div>
          ${
            showToggle
              ? `
          <div class="flex items-center gap-2">
            <button type="button" data-el-id="${escapeHtml(el.id)}" ${locked ? "disabled" : ""}
              role="switch" aria-checked="${el.visible ? "true" : "false"}" aria-label="Show ${escapeHtml(el.label)}"
              class="prop-toggle relative inline-flex w-9 h-5 rounded-full flex-shrink-0 transition-colors ${
                locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }"
              style="background-color:${el.visible ? TOGGLE_ON : TOGGLE_OFF};">
              <span class="toggle-knob absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style="transform:translateX(${el.visible ? "16px" : "0px"});"></span>
            </button>
          </div>`
              : ""
          }
        </div>
        ${el.states && el.visible ? statesEditorHtml(el) : ""}
      </div>`;
  }

  function fieldTypeLabel(el) {
    if (el.fieldType) return el.fieldType;
    return { text: "Text", number: "Number", select: "Dropdown" }[el.inputType] || "Text";
  }

  // The template/interaction type shown in the drawer's "Type" box and, for
  // non-button elements, as a caption on the card in the side panel.
  function elementTypeLabel(el) {
    // A button's "Type" is its style — Primary or Secondary ("outline" and
    // "tertiary" both read as the lower-emphasis, Secondary look) — not
    // its functional elementType (e.g. "QR Scan", "Action popup").
    if (el.type === "button") return el.style === "outline" || el.style === "tertiary" ? "Secondary Button" : "Primary Button";
    if (el.elementType) return el.elementType;
    if (el.type === "field") return fieldTypeLabel(el);
    return (
      {
        searchbar: "Search Bar",
        button: "Button",
        emptyState: "Result Card",
        list: "Table",
        card: "Template text",
        success: "Success Message",
        textTemplate: "Template text",
        labelPairList: "Template text",
        labelValueRow: "Template text",
        tag: "Template tag",
        table: "Table",
        resultGroup: "Template card",
        popup: "Popup",
      }[el.type] || "Element"
    );
  }

  // Small text/textarea field used inside the Elements tab, wired generically
  // by data-field name (see wireElementsTab) rather than one-off ids per type.
  // Dynamic values (populated from the real record at runtime) don't get one
  // of these at all — there's nothing an admin can edit, so callers simply
  // don't render a field for them (see the "value" cases in renderElementsTab).
  function inputField(labelText, field, value, { area = false } = {}) {
    const inputHtml = area
      ? `<textarea data-field="${field}" rows="2"
          class="elem-input w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c2410c]/30">${escapeHtml(
            value || ""
          )}</textarea>`
      : `<input type="text" data-field="${field}" value="${escapeHtml(value || "")}"
          class="elem-input w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c2410c]/30"/>`;
    return `
      <div class="border border-gray-200 rounded-md px-3 py-3 mb-3 bg-[#FAFAFA]">
        <label class="block text-sm text-gray-700 mb-1.5">${escapeHtml(labelText)}</label>
        ${inputHtml}
      </div>`;
  }

  function renderElementDetailView(root, screen, el) {
    if (el.states) {
      const activeState = state.activeStateSubId && el.states.find((s) => s.id === state.activeStateSubId);
      if (activeState) {
        renderStateDetailView(root, screen, el, activeState);
        return;
      }
      // A states-driven element's own card already shows its types list
      // inline in the main Page Properties list (see elementCardHtml) — it
      // has no separate drawer of its own. Landing here otherwise means a
      // stale/invalid activeStateSubId; bounce back to the main list.
      state.activeElementId = null;
      state.activeStateSubId = null;
      renderPropertiesPanel();
      return;
    }

    const tab = state.fieldTab === "logic" ? "logic" : "elements";
    const title =
      { field: "Field properties", button: "Button properties", popup: "Popup properties" }[el.type] || "Element properties";

    root.innerHTML = `
      <button id="back-to-page-props" type="button"
        class="flex items-center gap-1.5 border border-[#c2410c] text-[#c2410c] rounded-md px-3 py-1.5 text-sm font-medium mb-4 hover:bg-orange-50">
        <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Back to page properties
      </button>

      <div class="flex items-center gap-1.5 mb-4">
        <h2 class="text-base font-semibold text-[#191D88]">${title}</h2>
        <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.3"/><path d="M10 9v5M10 6.5v.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </div>

      <div class="flex border border-gray-300 rounded-md overflow-hidden mb-4">
        <button data-tab="elements" class="field-tab flex-1 py-2 text-sm font-medium transition-colors ${
          tab === "elements" ? "bg-[#c2410c] text-white" : "bg-white text-gray-600"
        }">Elements</button>
        <button data-tab="logic" class="field-tab flex-1 py-2 text-sm font-medium transition-colors ${
          tab === "logic" ? "bg-[#c2410c] text-white" : "bg-white text-gray-600"
        }">Logic</button>
      </div>

      ${tab === "elements" ? renderElementsTab(screen, el) : renderLogicTab(el)}
    `;

    document.getElementById("back-to-page-props").addEventListener("click", () => {
      state.activeElementId = null;
      state.activeStateSubId = null;
      renderPropertiesPanel();
    });
    root.querySelectorAll(".field-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.fieldTab = btn.dataset.tab;
        renderPropertiesPanel();
      });
    });

    if (tab === "elements") wireElementsTab(root, screen, el);
  }

  // ---------- A single state's own properties (label + conditional logic) ----------

  function renderStateDetailView(root, screen, parentEl, s) {
    const tab = state.stateSubTab === "logic" ? "logic" : "elements";

    root.innerHTML = `
      <button id="back-to-states-list" type="button"
        class="flex items-center gap-1.5 border border-[#c2410c] text-[#c2410c] rounded-md px-3 py-1.5 text-sm font-medium mb-4 hover:bg-orange-50">
        <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Back to page properties
      </button>

      <div class="flex items-center gap-1.5 mb-4">
        <h2 class="text-base font-semibold text-[#191D88]">Element properties</h2>
      </div>

      <div class="flex border border-gray-300 rounded-md overflow-hidden mb-4">
        <button data-sub-tab="elements" class="state-sub-tab flex-1 py-2 text-sm font-medium transition-colors ${
          tab === "elements" ? "bg-[#c2410c] text-white" : "bg-white text-gray-600"
        }">Elements</button>
        <button data-sub-tab="logic" class="state-sub-tab flex-1 py-2 text-sm font-medium transition-colors ${
          tab === "logic" ? "bg-[#c2410c] text-white" : "bg-white text-gray-600"
        }">Logic</button>
      </div>

      ${tab === "elements" ? renderStateElementsTab(screen, s) : renderStateLogicTab(s)}
    `;

    document.getElementById("back-to-states-list").addEventListener("click", () => {
      state.activeStateSubId = null;
      renderPropertiesPanel();
    });
    root.querySelectorAll(".state-sub-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.stateSubTab = btn.dataset.subTab;
        renderPropertiesPanel();
      });
    });

    // Logic tab is read-only (a preview, not an editor) — nothing to wire.
    if (tab === "elements") wireStateElementsTab(root, screen, s);
  }

  // Two shapes of "elements" tab, depending on how this state was authored:
  //  - New format (state.elements is set, e.g. Search Results): show the
  //    list of elements this state brings into the preview, each as a card
  //    matching the main list's style. Required elements (always shown when
  //    this state is active) render with no toggle at all; optional ones get
  //    a toggle so the admin can decide whether they show up.
  //  - Legacy format (state.elementIds, e.g. Delivery Status): keep the
  //    existing rename-the-label input — there's nothing to individually
  //    toggle, the whole point is picking the tag's own text.
  // CTAs (buttons) always come along with a type when it's active — they're
  // not something to individually show/hide, so they're left out of this
  // list entirely, required or not.
  function nonButtonStateEntries(screen, s) {
    return stateElementEntries(s).filter((entry) => {
      const el = screen.elements.find((e) => e.id === entry.id);
      return !el || el.type !== "button";
    });
  }

  function renderStateElementsTab(screen, s) {
    if (s.elements) {
      const entries = nonButtonStateEntries(screen, s);
      // A type with exactly one non-CTA element (e.g. "No Beneficiary" only
      // brings in "Beneficiary Not Found") has nothing to pick between —
      // skip straight to that element's own label/description fields
      // instead of showing a one-row list first.
      if (entries.length === 1) {
        const onlyEl = screen.elements.find((e) => e.id === entries[0].id);
        if (onlyEl) return renderElementsTab(screen, onlyEl);
      }
      const overrides = s.elementOverrides || (s.elementOverrides = {});
      return `
        <p class="text-xs text-gray-500 mb-4 leading-snug">These are the elements shown in the preview whenever this type is the active one. Required elements are always shown; the rest can be switched off.</p>
        ${entries
          .map((entry) => {
            const el = screen.elements.find((e) => e.id === entry.id);
            const checked = overrides[entry.id] !== false;
            const label = el ? el.label : entry.id;
            // A table's row keeps the exact same FAFAFA card as every
            // other entry — the nested white checkbox box sits inside it,
            // same as under "Coordinates" etc. Needs its own top margin
            // when shown — the header row has no bottom margin otherwise,
            // so the box would sit flush against it.
            const isTable = el && el.type === "table";
            return `
              <div class="border border-gray-200 rounded-md px-3 py-3 mb-2 bg-[#FAFAFA]">
                <div class="flex items-center justify-between gap-2 ${isTable && checked ? "mb-3" : ""}">
                  <span class="text-sm font-bold text-gray-900">${escapeHtml(label)}</span>
                  ${
                    entry.required
                      ? ""
                      : toggleButtonHtml({
                          checked,
                          dataset: { stateElToggleId: entry.id },
                          className: "state-el-toggle",
                        })
                  }
                </div>
                ${isTable && checked ? tableColumnsGreyBoxHtml(el) : ""}
              </div>`;
          })
          .join("")}`;
    }

    return `
      <p class="text-xs text-gray-500 mb-4 leading-snug">This is the label shown in the preview whenever this type is the active one.</p>
      <div class="border border-gray-200 rounded-md px-3 py-3 mb-3 bg-[#FAFAFA]">
        <label class="block text-sm text-gray-700 mb-1.5">Label</label>
        <input id="state-label-input" type="text" value="${escapeHtml(s.name)}"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c2410c]/30"/>
      </div>`;
  }

  function wireStateElementsTab(root, screen, s) {
    if (s.elements) {
      const entries = nonButtonStateEntries(screen, s);
      if (entries.length === 1) {
        const onlyEl = screen.elements.find((e) => e.id === entries[0].id);
        if (onlyEl) wireElementsTab(root, screen, onlyEl);
        return;
      }
      // A row with more than one element listed is a plain show/hide row —
      // only its toggle does anything.
      root.querySelectorAll(".state-el-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          const entryId = btn.dataset.stateElToggleId;
          const overrides = s.elementOverrides || (s.elementOverrides = {});
          const currentlyOn = overrides[entryId] !== false;
          overrides[entryId] = !currentlyOn;
          renderPropertiesPanel();
          renderCanvas();
        });
      });
      // A table's column checkboxes are nested right in its own grey box
      // (see tableColumnsGreyBoxHtml) — no separate drawer to wire.
      root.querySelectorAll(".table-col-toggle").forEach((row) => {
        row.addEventListener("click", () => {
          const tableEl = screen.elements.find((x) => x.id === row.dataset.tableId);
          const col = tableEl && (tableEl.columns || [])[Number(row.dataset.colIdx)];
          if (!col || !toggleTableColumn(tableEl, col)) return;
          renderPropertiesPanel();
          renderCanvas();
        });
      });
      return;
    }
    const labelInput = document.getElementById("state-label-input");
    if (labelInput) {
      labelInput.addEventListener("input", (e) => {
        s.name = e.target.value;
        renderCanvas(); // this state is the one being previewed, so update live
      });
    }
  }

  // A single read-only value in the condition grid below — this tab is a
  // preview of each type's existing logic, not an editor, so everything
  // here is plain display, not an input.
  // A rounded, bold-blue pill for a value inside a logic sentence — plain
  // display (not an input), matching the reference's "If [Gender] on page
  // [Individual details] equals [Yes]" look.
  function logicPill(text) {
    return `<span class="inline-block bg-blue-50 text-[#191D88] text-sm font-bold rounded-full px-2.5 py-1">${escapeHtml(
      text || "—"
    )}</span>`;
  }

  // One condition, read as a sentence — "If [Field] on page [Page]
  // [operator] [Value]" — instead of a form-style grid, matching the
  // reference exactly. Not every field comes from a page someone fills in
  // though — a count like "Beneficiary ID" comes from MDMS master data, so
  // that segment swaps to "from [source]" (cond.source) instead of "on
  // page [page]" when there's no page to point at.
  function conditionRowHtml(cond) {
    return `
      <div class="border border-gray-200 rounded-md px-3 py-3 mb-2 bg-[#FAFAFA] flex items-center flex-wrap gap-1.5 text-sm text-gray-700">
        <span>If</span>
        ${logicPill(cond.field)}
        ${
          cond.page
            ? `<span>on page</span>${logicPill(cond.page)}`
            : cond.source
            ? `<span>from</span>${logicPill(cond.source)}`
            : ""
        }
        <span>${escapeHtml(cond.operator || "")}</span>
        ${logicPill(cond.value)}
      </div>`;
  }

  // One logic block, read as a sentence — "Shows [X] when: [conditions]" —
  // shared by states (Delivery Status, etc.) and by plain buttons that have
  // their own conditional logic (e.g. which of two CTAs shows, or which
  // flow a CTA leads into).
  function renderLogicPreview(logic) {
    const { conditions, connector, thenShow } = logic;
    return `
      <div class="flex items-center flex-wrap gap-1.5 text-sm mb-4">
        <span class="font-bold text-gray-900">Shows</span>
        ${logicPill(thenShow)}
        <span class="font-bold text-gray-900">when:</span>
      </div>
      <div>
        ${conditions
          .map(
            (c, idx) =>
              conditionRowHtml(c) +
              (idx < conditions.length - 1
                ? `<div class="flex justify-center my-1">
                    <span class="text-xs font-semibold text-amber-700 bg-amber-50 rounded-full px-3 py-1">${escapeHtml(
                      connector
                    )}</span>
                  </div>`
                : "")
          )
          .join("")}
      </div>`;
  }

  function renderStateLogicTab(s) {
    if (!s.logic) {
      return `<div class="text-xs text-gray-400 bg-[#FAFAFA] border border-gray-200 rounded-md px-3 py-3">No logic defined for this type.</div>`;
    }
    return renderLogicPreview(s.logic);
  }

  // Elements tab content is type-aware: fields get the full Field type /
  // Label / Help text / Tooltip treatment; everything else gets whatever
  // properties actually apply to that element type.
  // "Types of X" editor for a states-driven dynamic element (e.g. Delivery
  // Status). Clicking a type previews it in the canvas — including which
  // buttons that state shows — without needing real data. "Show default"
  // clears back to the generic, uncluttered view.
  // Nested inline in the element's own card in the main Page Properties
  // list (see elementCardHtml) — not behind a click-through drawer. Rows
  // carry data-parent-id since this renders inside a .map() over every
  // element on the screen, so the click wiring (in renderPropertiesPanel)
  // knows which element each row belongs to.
  function statesEditorHtml(el) {
    return `
      <div class="mt-3 border border-gray-200 rounded-md p-3 bg-white">
        <div class="text-sm font-bold text-gray-700 mb-2">Types of ${escapeHtml(el.label)}</div>
        <div class="flex items-start gap-2 bg-blue-50 text-blue-700 text-xs rounded-md p-2.5 mb-2 leading-snug">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="currentColor"/><path d="M10 9v5M10 6.5v.01" stroke="white" stroke-width="1.6" stroke-linecap="round"/></svg>
          <span>${escapeHtml(el.infoText || `Choose which ${el.label.toLowerCase()} type shows in the preview.`)}</span>
        </div>
        ${el.states
          .map((s) => {
            // Require el.visible too — a type can't be "previewing" if the
            // whole element is toggled off, even if activeStateId is stale.
            const isActive = el.visible && el.activeStateId === s.id;
            // Open eye = currently previewing; closed eye = click to preview.
            // Lashed eye, filled pupil (open = visible) vs. just the closed
            // lashed lid (invisible) — matching the reference icon set.
            const eyeIcon = isActive
              ? `<svg class="w-4 h-4" viewBox="0 0 20 16" fill="none">
                  <path d="M4 4.5L3 2.2M7.3 2.8L6.7 0.6M10 2.2L10 0M12.7 2.8L13.3 0.6M16 4.5L17 2.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                  <path d="M2 9C4 5 7 3 10 3s6 2 8 6c-2 4-5 6-8 6s-6-2-8-6z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
                  <circle cx="10" cy="9" r="2.6" fill="currentColor"/>
                </svg>`
              : `<svg class="w-4 h-4" viewBox="0 0 20 16" fill="none">
                  <path d="M2 8c2 3 5 4.5 8 4.5s6-1.5 8-4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M4 11.5L3 13.8M7.3 13L6.7 15.2M10 13.5L10 16M12.7 13L13.3 15.2M16 11.5L17 13.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                </svg>`;
            return `
          <button type="button" data-parent-id="${escapeHtml(el.id)}" data-state-id="${escapeHtml(s.id)}"
            class="state-row w-full text-left flex items-center gap-2 border rounded-md pl-3 pr-1.5 py-1.5 mb-1.5 text-sm font-medium transition-colors ${
              // Hovering the row gives it a slightly darker bg; hovering the
              // eye instead lights up only the eye box, never both at once.
              isActive
                ? "border-[#c2410c] bg-orange-50 text-[#c2410c] hover:bg-orange-100 [&:has(.state-eye:hover)]:!bg-orange-50"
                : "border-gray-200 bg-[#FAFAFA] text-gray-700 hover:bg-orange-50 [&:has(.state-eye:hover)]:!bg-[#FAFAFA]"
            }">
            <!-- Long names wrap onto a second line rather than truncating -->
            <span class="flex-1 min-w-0 break-words">${escapeHtml(s.name)}</span>
            <!-- Eye is its own small boxed button so it reads as a separate,
                 preview-only control rather than part of the row -->
            <span role="button" tabindex="0" data-parent-id="${escapeHtml(el.id)}" data-state-id="${escapeHtml(s.id)}"
              class="state-eye ${
                isActive
                  ? "text-[#9a3412] border-[#c2410c] bg-white hover:bg-orange-100"
                  : "text-gray-400 border-gray-200 bg-white hover:bg-orange-50 hover:text-[#c2410c]"
              } flex-shrink-0 w-7 h-7 flex items-center justify-center border rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c2410c]/40" aria-label="${
              isActive ? "Previewing — click to stop previewing" : "Preview this state"
            }" title="${isActive ? "Stop previewing" : "Preview this state"}">${eyeIcon}</span>
          </button>`;
          })
          .join("")}
      </div>`;
  }

  // A label/value pair's value is dynamic (sourced from data), but the
  // admin can still switch each pair on/off — e.g. hide "Member Count"
  // without touching "Household Head".
  function labelPairsSectionHtml(el) {
    return (el.pairs || [])
      .map(
        (pair, idx) => `
        <div class="border border-gray-200 rounded-md px-3 py-3 mb-2 bg-[#FAFAFA] flex items-center justify-between gap-2">
          <span class="text-sm font-bold text-gray-900">${escapeHtml(pair.label)}</span>
          ${toggleButtonHtml({
            checked: pair.enabled !== false,
            dataset: { pairIdx: idx },
            className: "label-pair-toggle",
          })}
        </div>`
      )
      .join("");
  }

  // A table always needs at least one visible column — refuses to turn
  // off the last one still enabled. Returns whether the flip went through.
  function toggleTableColumn(tableEl, col) {
    const currentlyOn = col.enabled !== false;
    if (currentlyOn) {
      const enabledCount = (tableEl.columns || []).filter((c) => c.enabled !== false).length;
      if (enabledCount <= 1) return false;
    }
    col.enabled = !currentlyOn;
    return true;
  }

  // One column row, shared everywhere a table's columns show up. "Grey"
  // means #FAFAFA specifically, not a darker gray-200/300 — the contrast
  // is FAFAFA (unchecked row + its checkbox) against the white wrapping
  // box (see tableColumnsGreyBoxHtml), not against each other.
  function tableColumnRowHtml(tableEl, col, idx) {
    const checked = col.enabled !== false;
    return `
      <div class="table-col-toggle flex items-center gap-2.5 border rounded-lg px-3 py-2.5 mb-2 last:mb-0 cursor-pointer transition-colors ${
        checked ? "border-[#c2410c] bg-orange-50" : "border-gray-200 bg-[#FAFAFA]"
      }" data-table-id="${escapeHtml(tableEl.id)}" data-col-idx="${idx}">
        <span class="w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center ${
          checked ? "bg-white border-[#c2410c]" : "bg-white border-gray-300"
        }">
          ${
            checked
              ? `<svg class="w-3 h-3 text-[#c2410c]" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
              : ""
          }
        </span>
        <span class="text-sm font-medium text-gray-800">${escapeHtml(col.label)}</span>
      </div>`;
  }

  // The white box holding a table's column rows — the header (label +
  // toggle) lives outside this, in whatever card is showing the table
  // itself (a state's FAFAFA row, or the table's own header).
  function tableColumnsGreyBoxHtml(el) {
    return `
      <div class="border border-gray-200 rounded-md p-2 bg-white">
        ${(el.columns || []).map((col, idx) => tableColumnRowHtml(el, col, idx)).join("")}
      </div>`;
  }

  // A table's own card: its label + a master visibility switch, then the
  // white box of column checkboxes. Rows themselves are sourced from data
  // and aren't editable. Wrapped in the same FAFAFA card the nested,
  // in-a-state's-element-list version already sits inside (that one's
  // fine as-is — don't touch it) — clicking the table individually should
  // land on this exact look too.
  function tableColumnsSectionHtml(el) {
    return `
      <div class="border border-gray-200 rounded-md px-3 py-3 mb-3 bg-[#FAFAFA]">
        <div class="flex items-center justify-between ${el.visible ? "mb-3" : ""}">
          <span class="text-sm font-bold text-gray-900">${escapeHtml(el.label)}</span>
          ${toggleButtonHtml({ checked: !!el.visible, className: "table-visible-toggle" })}
        </div>
        ${el.visible ? tableColumnsGreyBoxHtml(el) : ""}
      </div>`;
  }

  function typeBoxHtml(el) {
    return `
      <div class="border border-gray-200 rounded-md px-3 py-3 mb-3 bg-[#FAFAFA]">
        <div class="text-xs text-gray-500 mb-1.5">Type</div>
        <div class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-100 text-gray-400">${escapeHtml(
          elementTypeLabel(el)
        )}</div>
      </div>`;
  }

  // A filter popup's options are just switched on/off, not edited as text
  // — there's no free-form label to write, only which checkboxes show up.
  function filterOptionsSectionHtml(el) {
    return `
      <div class="flex items-center gap-1.5 mb-2 mt-1">
        <span class="text-sm font-semibold text-[#191D88]">Popup content</span>
      </div>
      ${el.filterOptions
        .map(
          (opt, idx) => `
          <div class="border border-gray-200 rounded-md px-3 py-3 mb-2 bg-[#FAFAFA] flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-gray-900">${escapeHtml(opt.label)}</span>
            ${toggleButtonHtml({
              checked: opt.enabled !== false,
              dataset: { filterOptionIdx: idx },
              className: "filter-option-toggle",
            })}
          </div>`
        )
        .join("")}`;
  }

  // A popup's own action buttons don't get their own editable label (see
  // the "button" case below) — instead, their text is edited right here,
  // from inside the popup's own properties, one input per button.
  function popupButtonsSectionHtml(screen, popupEl) {
    const buttons = screen.elements.filter((b) => b.type === "button" && b.popupId === popupEl.id);
    if (!buttons.length) return "";
    return `
      <div class="flex items-center gap-1.5 mb-2 mt-1">
        <span class="text-sm font-semibold text-[#191D88]">Popup buttons</span>
      </div>
      ${buttons
        .map(
          (b) => `
          <div class="border border-gray-200 rounded-md px-3 py-3 mb-3 bg-[#FAFAFA]">
            <label class="block text-sm text-gray-700 mb-1.5">${escapeHtml(b.label)}</label>
            <input type="text" data-popup-btn-id="${escapeHtml(b.id)}" value="${escapeHtml(b.text || "")}"
              class="popup-btn-input w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c2410c]/30"/>
          </div>`
        )
        .join("")}`;
  }

  function renderElementsTab(screen, el) {
    if (el.type === "field") {
      return `
        <p class="text-xs text-gray-500 mb-4 leading-snug">In Elements you can edit form labels, heading and fields. You can customize each field's name, type, and behaviour to match your campaign needs.</p>

        ${typeBoxHtml(el)}

        ${inputField("Label", "label", el.label)}

        <div class="border border-gray-200 rounded-md px-3 py-3 mb-3 bg-[#FAFAFA]">
          <div class="flex items-center justify-between ${el.helpTextEnabled ? "mb-2" : ""}">
            <span class="text-sm font-bold text-[#191D88]">Help text</span>
            ${toggleButtonHtml({ checked: !!el.helpTextEnabled, dataset: { toggle: "helpTextEnabled" }, className: "field-toggle" })}
          </div>
          ${
            el.helpTextEnabled
              ? `<textarea data-field="helpText" rows="2"
                  class="elem-input w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c2410c]/30">${escapeHtml(
                    el.helpText || ""
                  )}</textarea>`
              : ""
          }
        </div>

        <div class="border border-gray-200 rounded-md px-3 py-3 mb-3 bg-[#FAFAFA]">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold text-[#191D88]">Tooltip</span>
            ${toggleButtonHtml({ checked: !!el.tooltipEnabled, dataset: { toggle: "tooltipEnabled" }, className: "field-toggle" })}
          </div>
        </div>
      `;
    }

    let body = "";
    switch (el.type) {
      case "button":
        // A popup's own action buttons (e.g. "Download ID" / "Skip") are
        // fixed to that popup — their label isn't admin-editable, unlike a
        // regular page button's. Its style (Primary/Secondary) already
        // shows in the "Type" box above (see elementTypeLabel).
        body = el.popupId
          ? `<div class="text-xs text-gray-400 bg-[#FAFAFA] border border-gray-200 rounded-md px-3 py-3">This button's label isn't editable here.</div>`
          : inputField("Button label", "text", el.text);
        break;
      case "searchbar":
        body = inputField("Placeholder", "placeholder", el.placeholder);
        break;
      case "emptyState":
        body = inputField("Title", "title", el.title) + inputField("Description", "message", el.message, { area: true });
        break;
      case "popup":
        // A filter popup has nothing to write — just which options show up
        // as checkboxes, so it gets enable/disable toggles instead of the
        // usual Title/Description text fields.
        body = el.filterOptions
          ? filterOptionsSectionHtml(el) + popupButtonsSectionHtml(screen, el)
          : `<div class="flex items-center gap-1.5 mb-2 mt-1">
              <span class="text-sm font-semibold text-[#191D88]">Popup content</span>
            </div>` +
            inputField("Title", "title", el.title) +
            inputField("Description", "message", el.message, { area: true }) +
            popupButtonsSectionHtml(screen, el);
        break;
      case "success":
        body = inputField("Message", "message", el.message, { area: true });
        break;
      case "card":
        // Title/subtitle here are dynamic (a specific beneficiary's name and
        // ID) — nothing an admin can edit, so no field is shown for them.
        body = "";
        break;
      case "textTemplate":
        body = "";
        break;
      case "labelValueRow":
        // Label is static config text (editable); the value is dynamic, so
        // it doesn't get a field at all.
        body = inputField("Label", "label", el.label);
        break;
      case "tag":
        // A states-driven tag never reaches this generic tab — its card in
        // the main list shows the types list inline (see elementCardHtml).
        body = "";
        break;
      case "labelPairList":
        // Each pair's value is dynamic (sourced from data), but which
        // pairs show up at all can still be switched on/off.
        body = labelPairsSectionHtml(el);
        break;
      case "table":
        // Rows are sourced from data (not editable), but the table itself
        // and each column can be switched on/off.
        body = tableColumnsSectionHtml(el);
        break;
      case "list":
        body = `<div class="text-xs text-gray-400 bg-[#FAFAFA] border border-gray-200 rounded-md px-3 py-3">Items are sourced from data — not editable here.</div>`;
        break;
    }
    return `<p class="text-xs text-gray-500 mb-4 leading-snug">Edit this element's content below.</p>${typeBoxHtml(el)}${body}`;
  }

  // A plain element's (mainly a button's) own Logic tab — read-only preview,
  // same pill-sentence style as a state's Logic tab. A button can carry a
  // single logic block (e.g. "Download Beneficiary IDs" only shows under
  // one condition) or an array of them (e.g. one CTA that leads to a
  // different flow depending on which branch's conditions match).
  function renderLogicTab(el) {
    if (!el.logic) {
      return `<div class="text-xs text-gray-400 bg-[#FAFAFA] border border-gray-200 rounded-md px-3 py-3">No logic defined for this element.</div>`;
    }
    const blocks = Array.isArray(el.logic) ? el.logic : [el.logic];
    return blocks
      .map(
        (logic, idx) =>
          renderLogicPreview(logic) +
          (idx < blocks.length - 1
            ? `<div class="flex justify-center my-2">
                <span class="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">Otherwise</span>
              </div>`
            : "")
      )
      .join("");
  }

  function wireElementsTab(root, screen, el) {
    root.querySelectorAll(".elem-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        el[e.target.dataset.field] = e.target.value;
        // A button's card in the Buttons list shows its label, so keep the
        // label in step with the text the admin types.
        if (el.type === "button" && e.target.dataset.field === "text") el.label = e.target.value;
        renderCanvas();
      });
    });
    root.querySelectorAll(".field-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        el[btn.dataset.toggle] = !el[btn.dataset.toggle];
        renderPropertiesPanel(); // re-render so e.g. the help-text textarea shows/hides
        renderCanvas();
      });
    });
    // Each input here edits a different element (one of the popup's own
    // buttons), not `el` (the popup) itself.
    root.querySelectorAll(".popup-btn-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const btnEl = screen.elements.find((x) => x.id === e.target.dataset.popupBtnId);
        if (!btnEl) return;
        btnEl.text = e.target.value;
        btnEl.label = e.target.value;
        renderCanvas();
      });
    });
    root.querySelectorAll(".filter-option-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const opt = el.filterOptions[Number(btn.dataset.filterOptionIdx)];
        if (!opt) return;
        opt.enabled = opt.enabled === false; // flip, defaulting to "was on" the first time
        renderPropertiesPanel();
        renderCanvas();
      });
    });
    root.querySelectorAll(".label-pair-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pair = (el.pairs || [])[Number(btn.dataset.pairIdx)];
        if (!pair) return;
        pair.enabled = pair.enabled === false;
        renderPropertiesPanel();
        renderCanvas();
      });
    });
    root.querySelectorAll(".table-visible-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        el.visible = !el.visible;
        renderPropertiesPanel(); // re-render so the outer card's own toggle stays in sync
        renderCanvas();
      });
    });
    root.querySelectorAll(".table-col-toggle").forEach((row) => {
      row.addEventListener("click", () => {
        const col = (el.columns || [])[Number(row.dataset.colIdx)];
        if (!col || !toggleTableColumn(el, col)) return;
        renderPropertiesPanel();
        renderCanvas();
      });
    });
  }

  function renderPropertiesPanel() {
    const root = document.getElementById("properties-panel");
    const screen = findScreen(state.activeScreenId);
    if (!screen) {
      root.innerHTML = `<div class="text-sm text-gray-400">No screen selected.</div>`;
      return;
    }

    if (state.activeElementId) {
      const activeEl = screen.elements.find((e) => e.id === state.activeElementId);
      if (activeEl) {
        renderElementDetailView(root, screen, activeEl);
        return;
      }
      state.activeElementId = null; // stale reference (e.g. screen changed) — fall through
    }

    const locked = screen.badge === "Locked";
    const gating = computeStateGating(screen);
    // A button gated by a "resultGroup" (e.g. "Open", only shown under
    // Search Results' found states) is entirely contextual to that
    // group's own "Types of X" list — unlike Delivery Status's gated
    // buttons (a "tag"), which are deliberately still managed from the
    // main Buttons section, "Open" doesn't need a second entry there too.
    const resultGroupGatedButtonIds = new Set();
    screen.elements.forEach((holder) => {
      if (holder.type !== "resultGroup" || !holder.states) return;
      holder.states.forEach((s) =>
        stateElementEntries(s).forEach((entry) => resultGroupGatedButtonIds.add(entry.id))
      );
    });
    // A button that belongs to a popup (el.popupId) is likewise managed
    // from inside that popup's own card (see popupButtonsHtml).
    const buttonEls = screen.elements.filter(
      (el) => el.type === "button" && !el.popupId && !resultGroupGatedButtonIds.has(el.id)
    );
    const popupEls = screen.elements.filter((el) => el.type === "popup");
    // An element already reachable through a states-holder's own "Types
    // of X" list (e.g. every element under Search Results) doesn't need a
    // second, standalone card here too — that would just be the same
    // element listed twice. Popups get their own section below, same as
    // buttons, so they're excluded here too.
    const nonButtonEls = screen.elements.filter(
      (el) => el.type !== "button" && el.type !== "popup" && !gating.controlledIds.has(el.id)
    );
    const buttonsHtml = renderButtonGroups(screen, buttonEls);
    // A screen with any form fields is a "form screen" — label the section
    // accordingly instead of the generic "General Elements".
    const isFormScreen = screen.elements.some((el) => el.type === "field");
    const elementsSectionLabel = isFormScreen ? "Form Elements" : "General Elements";

    root.innerHTML = `
      <h2 class="text-lg font-semibold text-[#191D88] mb-3">Page Properties</h2>
      <div class="inline-block text-xs font-medium px-2.5 py-1 rounded-md mb-5 ${badgeClasses(screen.badge)}">${escapeHtml(screen.badge)}</div>

      <label class="block text-sm text-gray-600 mb-1">Page Heading</label>
      <input id="prop-heading" type="text" value="${escapeHtml(screen.pageHeading)}" ${locked ? "disabled" : ""}
        class="w-full mb-4 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c2410c]/30 disabled:bg-gray-50 disabled:text-gray-400"/>

      <label class="block text-sm text-gray-600 mb-1">Page Description</label>
      <textarea id="prop-description" rows="3" ${locked ? "disabled" : ""}
        class="w-full mb-5 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c2410c]/30 disabled:bg-gray-50 disabled:text-gray-400">${escapeHtml(screen.pageDescription)}</textarea>

      ${locked ? `<div class="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 mb-3">This screen is locked and can't be edited.</div>` : ""}

      <div class="flex items-center gap-1.5 mb-3">
        <span class="text-sm font-semibold text-[#191D88]">${elementsSectionLabel}</span>
        <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.3"/><path d="M10 9v5M10 6.5v.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </div>
      ${
        nonButtonEls.length
          ? nonButtonEls.map((el) => elementCardHtml(screen, el)).join("")
          : `<div class="text-xs text-gray-400 mb-3">No ${elementsSectionLabel.toLowerCase()} on this screen.</div>`
      }

      ${
        popupEls.length
          ? `
        <div class="flex items-center gap-1.5 mb-3 mt-5">
          <span class="text-sm font-semibold text-[#191D88]">Popups</span>
          <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.3"/><path d="M10 9v5M10 6.5v.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        </div>
        ${popupEls.map((el) => elementCardHtml(screen, el)).join("")}
        `
          : ""
      }

      ${
        buttonEls.length
          ? `
        <div class="flex items-center gap-1.5 mb-3 mt-5">
          <span class="text-sm font-semibold text-[#191D88]">Buttons</span>
          <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.3"/><path d="M10 9v5M10 6.5v.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        </div>
        ${buttonsHtml}
        `
          : ""
      }
    `;

    document.getElementById("prop-heading").addEventListener("input", (e) => {
      screen.pageHeading = e.target.value;
      renderCanvas();
    });
    document.getElementById("prop-description").addEventListener("input", (e) => {
      screen.pageDescription = e.target.value;
      renderCanvas();
    });
    root.querySelectorAll(".prop-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const el = screen.elements.find((x) => x.id === btn.dataset.elId);
        el.visible = !el.visible;
        // Turning the whole element off while a type was being previewed
        // left a stale "Previewing" row showing even though nothing
        // actually renders — clear it so the UI can't say both at once.
        if (el.states && !el.visible) el.activeStateId = null;
        // Some buttons take the place of another rather than showing
        // alongside it (e.g. "Download Beneficiary IDs" replaces "Register
        // New Beneficiary") — switching this one on hides the other, and
        // switching it back off restores it.
        if (el.replaces) {
          const replaced = screen.elements.find((x) => x.id === el.replaces);
          if (replaced) replaced.visible = !el.visible;
        }
        renderPropertiesPanel(); // full re-render so the card's "Hidden" badge updates too
        renderCanvas();
      });
    });
    root.querySelectorAll(".element-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        // Let the toggle/drag/nested state-row handle their own interaction;
        // don't also open the detail view.
        if (e.target.closest(".prop-toggle") || e.target.closest(".drag-handle") || e.target.closest(".state-row")) return;
        const clickedEl = screen.elements.find((x) => x.id === card.dataset.elCardId);
        if (clickedEl && clickedEl.states) return; // states-driven — its types list is already inline, nothing else to open
        // Reveal it in the preview if a state is hiding it (a button, a
        // whole result card, anything), or leave things be if it's already
        // showing — either way, highlight it after render.
        if (clickedEl) revealElementInPreview(screen, clickedEl);
        state.activeElementId = card.dataset.elCardId;
        state.fieldTab = "elements";
        renderPropertiesPanel();
        renderCanvas();
        if (clickedEl) highlightCanvasElement(clickedEl.id);
      });
    });
    root.querySelectorAll(".state-row[data-parent-id]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const parentEl = screen.elements.find((x) => x.id === btn.dataset.parentId);
        if (!parentEl) return;
        resetStatePreviews(screen, parentEl.id); // only one active preview on screen at a time
        // Selecting a type previews it live AND opens its own properties
        // (rename it, define the logic for when it applies) — both at once.
        parentEl.activeStateId = btn.dataset.stateId;
        state.activeElementId = parentEl.id;
        state.activeStateSubId = btn.dataset.stateId;
        state.stateSubTab = "elements";
        renderPropertiesPanel();
        renderCanvas();
      });
    });
    // The eye on its own only toggles the canvas preview — it never opens
    // the type's properties, unlike clicking the rest of the row.
    root.querySelectorAll(".state-eye[data-parent-id]").forEach((eye) => {
      const togglePreview = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const parentEl = screen.elements.find((x) => x.id === eye.dataset.parentId);
        if (!parentEl) return;
        const alreadyActive = parentEl.visible && parentEl.activeStateId === eye.dataset.stateId;
        resetStatePreviews(screen, parentEl.id); // only one active preview on screen at a time
        parentEl.activeStateId = alreadyActive ? null : eye.dataset.stateId;
        renderPropertiesPanel();
        renderCanvas();
      };
      eye.addEventListener("click", togglePreview);
      eye.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") togglePreview(e);
      });
    });
    root.querySelectorAll('.element-card[draggable="true"]').forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        draggedFieldId = card.dataset.dragFieldId;
        e.dataTransfer.effectAllowed = "move";
        card.classList.add("opacity-40");
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("opacity-40");
        draggedFieldId = null;
      });
      card.addEventListener("dragover", (e) => {
        e.preventDefault(); // required to allow dropping
        if (draggedFieldId && draggedFieldId !== card.dataset.dragFieldId) {
          card.classList.add("ring-2", "ring-[#191D88]/40");
        }
      });
      card.addEventListener("dragleave", () => {
        card.classList.remove("ring-2", "ring-[#191D88]/40");
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("ring-2", "ring-[#191D88]/40");
        const targetId = card.dataset.dragFieldId;
        if (!draggedFieldId || draggedFieldId === targetId) return;
        const fromIdx = screen.elements.findIndex((x) => x.id === draggedFieldId);
        const toIdx = screen.elements.findIndex((x) => x.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = screen.elements.splice(fromIdx, 1);
        screen.elements.splice(toIdx, 0, moved);
        draggedFieldId = null;
        renderPropertiesPanel();
        renderCanvas();
      });
    });
  }

  // ---------- Left nav rail ----------

  function renderNavRail() {
    document.querySelectorAll(".rail-item").forEach((btn) => {
      const isActive = btn.dataset.rail === state.activeNav;
      btn.classList.toggle("bg-blue-50", isActive);
      btn.classList.toggle("text-[#191D88]", isActive);
      btn.classList.toggle("font-medium", isActive);
      btn.classList.toggle("text-gray-500", !isActive);
    });
  }

  function renderMainArea() {
    const placeholder = document.getElementById("nav-placeholder");
    const workspace = document.getElementById("workspace");
    if (state.activeNav === "flows") {
      placeholder.classList.add("hidden");
      workspace.classList.remove("hidden");
    } else if (state.activeNav === null) {
      placeholder.classList.add("hidden");
      workspace.classList.remove("hidden");
      document.getElementById("flows-panel").innerHTML = "";
    } else {
      placeholder.classList.remove("hidden");
      workspace.classList.add("hidden");
      placeholder.innerHTML = `
        <div class="text-center text-gray-400 py-24">
          <div class="text-base font-medium text-gray-500 mb-1">${state.activeNav === "form-elements" ? "Form Elements" : "Roles"}</div>
          <div class="text-sm">Coming soon in this mock.</div>
        </div>`;
    }
  }

  // ---------- top-level render ----------

  function render() {
    renderNavRail();
    renderMainArea();
    if (state.activeNav === "flows" || state.activeNav === null) {
      renderFlowsPanel();
      renderTabs();
      renderCanvas();
      renderNavArrows();
      renderPropertiesPanel();
    }
  }

  // ---------- Campaign selection (before the configurator) ----------

  function escapeText(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function renderCampaignSelect() {
    const grid = document.getElementById("campaign-grid");
    grid.innerHTML = (window.DIGIT_CAMPAIGNS || []).map((c, i) => `
      <button type="button" data-campaign="${i}"
        class="text-left bg-white border border-gray-200 rounded-lg p-5 hover:border-[#c2410c] hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c2410c] transition flex flex-col">
        <div class="flex items-start justify-between gap-3 mb-1">
          <span class="text-lg font-semibold text-[#363636]">${escapeText(c.name)}</span>
          <svg class="w-5 h-5 text-[#c2410c] flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M8 4L14 10L8 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="text-sm text-[#707070] mb-4">${escapeText(c.flow)}</span>
        <ul class="flex flex-col gap-2 border-t border-gray-100 pt-3">
          ${c.screens.map((s) => `
            <li class="flex items-center gap-2 text-sm text-[#363636]">
              <span class="w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>${escapeText(s)}
            </li>`).join("")}
        </ul>
      </button>`).join("");

    grid.querySelectorAll("[data-campaign]").forEach((btn) => {
      btn.addEventListener("click", () => openCampaign(window.DIGIT_CAMPAIGNS[Number(btn.dataset.campaign)]));
    });
  }

  // Full screen library, captured once so each campaign can pick its own set.
  const MASTER_CATEGORIES = structuredClone(MODULE.categories);
  // Each campaign keeps its own copy, so edits in one never leak into another.
  const campaignCategories = {};

  function masterScreen(id) {
    for (const cat of MASTER_CATEGORIES) {
      const s = cat.screens.find((s) => s.id === id);
      if (s) return { cat, screen: s };
    }
    return null;
  }

  // Screens that exist in the library under the same name, or are derived
  // from a library screen when a campaign uses a different name.
  function buildScreen(name) {
    for (const cat of MASTER_CATEGORIES) {
      const s = cat.screens.find((s) => s.name === name);
      if (s) return { catKey: cat.key, screen: structuredClone(s) };
    }
    if (name === "Delivery Summary") {
      const src = masterScreen("vaccination-summary");
      const json = JSON.stringify(src.screen)
        .replace(/Vaccination/g, "Delivery")
        .replace(/vaccination/g, "delivery")
        .replace(/Vaccinate/g, "Deliver")
        .replace(/vaccinate/g, "deliver");
      return { catKey: src.cat.key, screen: JSON.parse(json) };
    }
    if (name === "Search Households") {
      const src = masterScreen("search-beneficiary");
      const screen = structuredClone(src.screen);
      Object.assign(screen, { id: "search-households", name, pageHeading: name });
      return { catKey: src.cat.key, screen };
    }
    return null;
  }

  // Swap in a campaign's own Delivery Status types. Each one reveals the same
  // action buttons as the library status with the same tag colour.
  function applyDeliveryStatuses(cats, statuses) {
    for (const cat of cats) {
      for (const screen of cat.screens) {
        const el = screen.elements.find((e) => e.id === "delivery-status");
        if (!el) continue;
        const byStyle = Object.fromEntries(el.states.map((s) => [s.tagStyle, s]));
        el.activeStateId = null;
        const oldIds = el.states.flatMap((s) => s.elementIds);
        el.states = statuses.map((s) => ({
          ...s,
          elementIds: [...(byStyle[s.tagStyle]?.elementIds || [])],
          logic: dummyLogic(s.name),
        }));
        // Buttons only a dropped status revealed (e.g. View Redose Detail)
        // have no status left to show them, so they leave the screen.
        const keep = new Set(el.states.flatMap((s) => s.elementIds));
        const dropped = new Set(oldIds.filter((id) => !keep.has(id)));
        screen.elements = screen.elements.filter((e) => !dropped.has(e.id));
      }
    }
  }

  function categoriesFor(c) {
    if (campaignCategories[c.name]) return campaignCategories[c.name];
    const built = c.screens.map(buildScreen).filter(Boolean);
    const cats = MASTER_CATEGORIES
      .map((cat) => ({
        key: cat.key,
        label: cat.label,
        screens: built.filter((b) => b.catKey === cat.key).map((b) => b.screen),
      }))
      .filter((cat) => cat.screens.length);
    if (c.deliveryStatuses) applyDeliveryStatuses(cats, c.deliveryStatuses);
    campaignCategories[c.name] = cats;
    return cats;
  }

  function openCampaign(c) {
    MODULE.categories = categoriesFor(c);
    const first = MODULE.categories[0].screens[0];
    Object.assign(state, {
      activeNav: "flows",
      expanded: new Set(MODULE.categories.map((cat) => cat.key)),
      search: "",
      openTabs: [first.id],
      activeScreenId: first.id,
      activeElementId: null,
      fieldTab: "elements",
      activeStateSubId: null,
      stateSubTab: "elements",
    });
    document.getElementById("module-title").textContent = `${c.name} - ${c.flow}`;
    document.title = `${c.name} - ${c.flow} | Form Configurator`;
    document.getElementById("campaign-select").classList.add("hidden");
    render();
  }

  function init() {
    document.getElementById("module-title").textContent = MODULE.name;
    document.getElementById("module-version").textContent = `(AppConfig Version - ${MODULE.version})`;

    renderCampaignSelect();
    document.getElementById("back-to-campaigns").addEventListener("click", () => {
      document.getElementById("campaign-select").classList.remove("hidden");
    });

    document.querySelectorAll(".rail-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeNav = btn.dataset.rail;
        render();
      });
    });

    document.getElementById("nav-prev").addEventListener("click", () => stepScreen(-1));
    document.getElementById("nav-next").addEventListener("click", () => stepScreen(1));

    document.getElementById("save-config").addEventListener("click", () => {
      toast("Configuration saved");
      // eslint-disable-next-line no-console
      console.log("Saved module state:", JSON.parse(JSON.stringify(MODULE)));
    });

    document.getElementById("open-flows").addEventListener("click", () => {
      state.activeNav = "flows";
      render();
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
