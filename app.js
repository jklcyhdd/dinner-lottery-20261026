import { recipes, recipeById, replacementIds } from "./src/recipes.js?v=20261028r3";
import { renderRecipeImage } from "./src/share-card.js";
import {
  STORAGE_KEY,
  confirmDish,
  createState,
  drawDish,
  latestConfirmedId,
  sanitizeState,
  serializeState,
} from "./src/state.js?v=20261028r3";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const migrationOptions = { replacements: replacementIds, historyRecipes: [...recipeById.values()] };

const elements = {
  roundNumber: $("#round-number"),
  roundCopy: $("#round-copy"),
  roundCount: $("#round-count"),
  progressFill: $("#progress-fill"),
  emptyState: $("#empty-state"),
  resultCard: $("#result-card"),
  drawButton: $("#draw-button"),
  homeButton: $("#home-button"),
  resumeButton: $("#resume-button"),
  dishImage: $("#dish-image"),
  dishMethod: $("#dish-method"),
  dishProtein: $("#dish-protein"),
  dishName: $("#dish-name"),
  dishTime: $("#dish-time"),
  ingredients: $("#ingredient-list"),
  steps: $("#step-list"),
  doneness: $("#dish-doneness"),
  seasoning: $("#dish-seasoning"),
  source: $("#dish-source"),
  rerollButton: $("#reroll-button"),
  confirmButton: $("#confirm-button"),
  snapshotButton: $("#snapshot-button"),
  confirmedPanel: $("#confirmed-panel"),
  confirmedTitle: $("#confirmed-title"),
  confirmedCopy: $("#confirmed-copy"),
  confirmedSnapshotButton: $("#confirmed-snapshot-button"),
  nextDrawButton: $("#next-draw-button"),
  historyList: $("#history-list"),
  recipeGrid: $("#recipe-grid"),
  recipeSearch: $("#recipe-search"),
  recipeCount: $("#recipe-count"),
  recipeDialog: $("#recipe-dialog"),
  detailDialogContent: $("#detail-dialog-content"),
  snapshotDialog: $("#snapshot-dialog"),
  snapshotContent: $("#snapshot-content"),
  shareButton: $("#share-button"),
  saveImageButton: $("#save-image-button"),
  imageView: $("#snapshot-image-view"),
  exportedImage: $("#exported-image"),
  shareImageButton: $("#share-image-button"),
  backCardButton: $("#back-card-button"),
  downloadImageLink: $("#download-image-link"),
  dataDialog: $("#data-dialog"),
  dataButton: $("#data-button"),
  exportButton: $("#export-button"),
  importInput: $("#import-input"),
  toast: $("#toast"),
};

let storageAvailable = true;
let state;
let lastConfirmedId = null;
let activeSnapshotRecipe = null;
let snapshotImageUrl = null;
let snapshotImageFile = null;
let snapshotImageRequest = 0;
let toastTimer = 0;

function readSavedState() {
  try {
    return { raw: localStorage.getItem(STORAGE_KEY), warning: null };
  } catch {
    storageAvailable = false;
    return { raw: null, warning: "STORAGE_UNAVAILABLE" };
  }
}

function saveState() {
  if (!storageAvailable) {
    showToast("Safari 未允许本地存储，本次记录关闭页面后会丢失");
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, serializeState(state));
    return true;
  } catch {
    showToast("本地存储失败，请先在“备份与说明”导出数据");
    return false;
  }
}

function showToast(message, duration = 2400) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, duration);
}

function createList(items, parent, itemTag = "li") {
  parent.replaceChildren(
    ...items.map((text) => {
      const item = document.createElement(itemTag);
      item.textContent = text;
      return item;
    }),
  );
}

function setImage(image, recipe) {
  image.src = recipe.image;
  image.alt = `${recipe.name}成品`;
  image.onerror = () => {
    image.hidden = true;
    image.parentElement?.classList.add("image-missing");
  };
  image.hidden = false;
  image.parentElement?.classList.remove("image-missing");
}

function renderProgress() {
  const eaten = state.eatenIds.length;
  elements.roundNumber.textContent = String(state.round);
  elements.roundCopy.textContent = `已确认 ${eaten} / ${recipes.length} 道`;
  elements.roundCount.textContent = String(eaten);
  elements.progressFill.style.transform = `scaleX(${eaten / recipes.length})`;
  elements.roundCopy.title = state.lastRound
    ? `上一轮已在 ${new Date(state.lastRound.completedAt).toLocaleDateString("zh-CN")} 完成`
    : "";
}

function currentDisplayedRecipe() {
  return recipeById.get(state.pendingId || lastConfirmedId) || null;
}

function renderTonight() {
  renderProgress();
  const recipe = currentDisplayedRecipe();
  const confirmed = Boolean(lastConfirmedId && !state.pendingId);
  elements.emptyState.hidden = Boolean(recipe);
  elements.resultCard.hidden = !recipe;
  elements.confirmedPanel.hidden = !confirmed;
  elements.homeButton.hidden = !recipe;
  elements.resumeButton.hidden = true;
  if (!recipe) return;

  setImage(elements.dishImage, recipe);
  elements.dishMethod.textContent = recipe.method;
  elements.dishProtein.textContent = recipe.protein;
  elements.dishName.textContent = recipe.name;
  elements.dishTime.textContent = `约 ${recipe.minutes} 分钟`;
  createList(recipe.ingredients, elements.ingredients);
  createList(recipe.steps, elements.steps);
  elements.doneness.textContent = recipe.doneness;
  elements.seasoning.textContent = recipe.seasoning;
  elements.source.href = recipe.source;
  elements.source.textContent = `${recipe.image.endsWith('.svg') ? '查看配图说明' : '查看图片原始来源'} · ${recipe.photoCredit}`;
  elements.confirmButton.hidden = confirmed;
  elements.rerollButton.hidden = confirmed;
  elements.snapshotButton.textContent = confirmed ? "查看今晚截图卡" : "进入截图卡";
  if (confirmed) {
    elements.confirmedTitle.textContent = `${recipe.name}，今晚吃这个`;
    elements.confirmedCopy.textContent = `已记入第 ${state.history.at(-1)?.round || state.round} 轮。明天打开时再抽下一道。`;
  }
}

function pickDish({ replace = false } = {}) {
  const before = state.pendingId;
  const next = drawDish(state, recipes);
  if (next === state || next.pendingId === before) {
    showToast("今天只剩这一道未确认，先尝尝它吧");
    return;
  }
  state = next;
  lastConfirmedId = null;
  saveState();
  renderTonight();
  elements.resultCard.scrollIntoView({ block: "start", behavior: replace ? "smooth" : "auto" });
}

function confirmCurrentDish() {
  const id = state.pendingId;
  if (!id) {
    showToast("当前没有待确认的菜");
    return;
  }
  const recipe = recipeById.get(id);
  const round = state.round;
  const wasLastInRound = state.eatenIds.length === recipes.length - 1;
  state = confirmDish(state, id);
  lastConfirmedId = id;
  saveState();
  renderTonight();
  navigator.storage?.persist?.().catch(() => {});
  if (wasLastInRound) {
    showToast(`第 ${round} 轮 60 道已集齐，下一轮已开启`, 4200);
  } else {
    showToast(`已确认：${recipe.name}`);
  }
  elements.confirmedPanel.scrollIntoView({ block: "center", behavior: "smooth" });
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function localDateKey(dateValue) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function renderHistory() {
  const entries = [...state.history]
    .filter((entry) => recipeById.has(entry.id))
    .sort((a, b) => new Date(b.eatenAt) - new Date(a.eatenAt));

  if (entries.length === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-history">
        <strong>餐桌还是空白</strong>
        今天确认一道菜后，这里会留下日期、轮次和菜名。
      </div>`;
    return;
  }

  const groups = new Map();
  for (const entry of entries) {
    const key = localDateKey(entry.eatenAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  elements.historyList.replaceChildren(
    ...[...groups.entries()].map(([key, group]) => {
      const section = document.createElement("section");
      section.className = "history-day";
      const heading = document.createElement("h3");
      heading.textContent = key === localDateKey(new Date()) ? "今天" : formatDate(group[0].eatenAt);
      section.append(heading);
      for (const entry of group) {
        const recipe = recipeById.get(entry.id);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-row";
        button.dataset.recipeId = recipe.id;
        button.innerHTML = `
          <img src="${recipe.image}" alt="" loading="lazy">
          <span><strong>${recipe.name}</strong><span>${formatDate(entry.eatenAt)} · 第 ${entry.round} 轮</span></span>
          <span class="history-arrow" aria-hidden="true">›</span>`;
        section.append(button);
      }
      return section;
    }),
  );
}

function renderRecipeGrid(query = "") {
  const normalized = query.trim().toLowerCase();
  const filtered = recipes.filter((recipe) => {
    if (!normalized) return true;
    return [recipe.name, recipe.protein, recipe.method, ...recipe.ingredients]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
  const eaten = new Set(state.eatenIds);
  elements.recipeCount.textContent = normalized
    ? `找到 ${filtered.length} 道`
    : `第 ${state.round} 轮还有 ${recipes.length - eaten.size} 道没确认`;

  if (filtered.length === 0) {
    elements.recipeGrid.innerHTML = `
      <div class="empty-history" style="grid-column:1/-1">
        <strong>没有匹配的菜</strong>
        换个菜名或食材再找找。
      </div>`;
    return;
  }

  elements.recipeGrid.replaceChildren(
    ...filtered.map((recipe) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "recipe-tile";
      tile.dataset.recipeId = recipe.id;
      tile.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.name}" loading="lazy">
        ${eaten.has(recipe.id) ? '<span class="eaten-ribbon">本轮已吃</span>' : ""}
        <span class="recipe-tile-copy">
          <span class="tile-tag">${recipe.protein} · ${recipe.method}</span>
          <h3>${recipe.name}</h3>
          <small>约 ${recipe.minutes} 分钟 · 1 人份</small>
        </span>`;
      return tile;
    }),
  );
}

function openRecipeDetail(recipe) {
  elements.detailDialogContent.innerHTML = `
    <div class="detail-hero">
      <img src="${recipe.image}" alt="${recipe.name}成品">
      <div class="detail-title">
        <h2>${recipe.name}</h2>
        <p class="detail-meta">${recipe.protein} · ${recipe.method}<br>${recipe.portion} · 约 ${recipe.minutes} 分钟<br>固定搭配：小碗米饭＋炒青菜</p>
      </div>
    </div>
    <div class="detail-actions">
      <button class="button button-primary" type="button" data-make-tonight="${recipe.id}" ${replacementIds[recipe.id] ? 'disabled' : ''}>${replacementIds[recipe.id] ? '原菜已移出抽签池' : '抽它当今晚'}</button>
      <button class="button button-secondary" type="button" data-snapshot-id="${recipe.id}">查看截图卡</button>
    </div>
    <section class="recipe-section">
      <div class="section-heading"><span class="section-index">01</span><h3>一人份食材</h3></div>
      <ul class="ingredient-list">${recipe.ingredients.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
    <section class="recipe-section">
      <div class="section-heading"><span class="section-index">02</span><h3>详细步骤</h3></div>
      <ol class="step-list">${recipe.steps.map((item) => `<li>${item}</li>`).join("")}</ol>
    </section>
    <div class="checks-grid">
      <section class="check-row"><span class="check-label">熟透判断</span><p>${recipe.doneness}</p></section>
      <section class="check-row"><span class="check-label">调味建议</span><p>${recipe.seasoning}</p></section>
    </div>
    <p class="source-link-wrap"><a href="${recipe.source}" target="_blank" rel="noreferrer">${recipe.image.endsWith('.svg') ? '查看配图说明' : '查看图片原始来源'} · ${recipe.photoCredit}</a></p>`;
  elements.recipeDialog.showModal();
}

function snapshotMarkup(recipe) {
  return `
    <article class="snapshot-card">
      <div class="snapshot-brand">
        <span>今晚吃什么</span>
        <span>第 ${state.round} 轮</span>
      </div>
      <div class="snapshot-hero">
        <img src="${recipe.image}" alt="${recipe.name}成品">
        <div class="snapshot-title">
          <h2>${recipe.name}</h2>
          <p><strong>${recipe.protein} · ${recipe.method}</strong><br>1 人份 · 约 ${recipe.minutes} 分钟</p>
        </div>
      </div>
      <div class="snapshot-meta">
        <span>固定搭配</span><span>一小碗米饭</span><span>一份炒青菜</span>
      </div>
      <section class="snapshot-section">
        <h3>一人份食材</h3>
        <ul class="snapshot-ingredients">${recipe.ingredients.map((item) => `<li>${item}</li>`).join("")}</ul>
      </section>
      <section class="snapshot-section">
        <h3>照着做</h3>
        <ol class="snapshot-steps">${recipe.steps.map((item) => `<li>${item}</li>`).join("")}</ol>
      </section>
      <div class="snapshot-checks">
        <div><b>熟透判断</b><p>${recipe.doneness}</p></div>
        <div><b>调味建议</b><p>${recipe.seasoning}</p></div>
      </div>
      <footer class="snapshot-footer">
        <strong>米饭一小碗 · 青菜一盘</strong>
        <span>少油 · 一人份 · 今晚吃什么</span>
        ${recipe.source.startsWith("https://commons.wikimedia.org/") ? `<p class="photo-credit">照片：<a href="${recipe.source}">${recipe.photoCredit}</a> · 缩放转 WebP</p>` : ""}
      </footer>
    </article>`;
}

function openSnapshot(recipe) {
  if (!recipe) return;
  activeSnapshotRecipe = recipe;
  snapshotImageRequest += 1;
  if (snapshotImageUrl) URL.revokeObjectURL(snapshotImageUrl);
  snapshotImageUrl = null;
  snapshotImageFile = null;
  elements.exportedImage.removeAttribute("src");
  elements.imageView.hidden = true;
  elements.snapshotContent.hidden = false;
  elements.saveImageButton.hidden = false;
  elements.saveImageButton.disabled = false;
  elements.saveImageButton.textContent = "生成整张图片";
  elements.snapshotContent.innerHTML = snapshotMarkup(recipe);
  if (elements.recipeDialog.open) elements.recipeDialog.close();
  elements.snapshotDialog.showModal();
  elements.snapshotDialog.scrollTop = 0;
}

async function generateSnapshotImage() {
  const recipe = activeSnapshotRecipe;
  if (!recipe) return;
  const request = ++snapshotImageRequest;
  elements.saveImageButton.disabled = true;
  elements.saveImageButton.textContent = "正在生成…";
  try {
    const blob = await renderRecipeImage(recipe);
    if (request !== snapshotImageRequest || !elements.snapshotDialog.open) return;
    if (snapshotImageUrl) URL.revokeObjectURL(snapshotImageUrl);
    snapshotImageUrl = URL.createObjectURL(blob);
    snapshotImageFile = new File([blob], `今晚吃什么-${recipe.name}.png`, { type: "image/png" });
    elements.exportedImage.src = snapshotImageUrl;
    elements.downloadImageLink.href = snapshotImageUrl;
    elements.downloadImageLink.download = snapshotImageFile.name;
    elements.shareImageButton.hidden = !navigator.canShare?.({ files: [snapshotImageFile] });
    elements.snapshotContent.hidden = true;
    elements.imageView.hidden = false;
    elements.saveImageButton.hidden = true;
    elements.snapshotDialog.scrollTop = 0;
  } catch {
    if (request === snapshotImageRequest) showToast("图片生成失败，请重试；未改动晚餐记录", 4000);
  } finally {
    if (request === snapshotImageRequest) {
      elements.saveImageButton.disabled = false;
      elements.saveImageButton.textContent = "生成整张图片";
    }
  }
}

async function shareSnapshotImage() {
  if (!snapshotImageFile) return;
  try {
    await navigator.share({ files: [snapshotImageFile], title: `今晚吃：${activeSnapshotRecipe.name}` });
  } catch (error) {
    if (error?.name !== "AbortError") showToast("可长按下面整张图片保存到相册，再发给妈妈", 4000);
  }
}

function showDrawHome() {
  $$("dialog[open]").forEach((dialog) => dialog.close());
  switchView("tonight-view");
  elements.emptyState.hidden = false;
  elements.resultCard.hidden = true;
  elements.confirmedPanel.hidden = true;
  elements.homeButton.hidden = true;
  elements.resumeButton.hidden = !currentDisplayedRecipe();
  elements.drawButton.focus({ preventScroll: true });
}

function shareTextFor(recipe) {
  return [
    `今晚吃：${recipe.name}`,
    `固定搭配：一小碗米饭＋炒青菜`,
    `食材：${recipe.ingredients.join("、")}`,
    `做法：${recipe.steps.join(" ")}`,
    `熟透判断：${recipe.doneness}`,
    `调味：${recipe.seasoning}`,
  ].join("\n");
}

async function shareCurrentSnapshot() {
  if (!activeSnapshotRecipe) return;
  const text = shareTextFor(activeSnapshotRecipe);
  try {
    if (navigator.share) {
      await navigator.share({ title: `今晚吃：${activeSnapshotRecipe.name}`, text });
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast("菜谱文字已复制");
  } catch (error) {
    if (error?.name !== "AbortError") showToast("文字分享不可用，可点“生成整张图片”保存完整菜谱");
  }
}

function switchView(viewId) {
  $$(".view").forEach((view) => {
    view.hidden = view.id !== viewId;
  });
  $$(".tab").forEach((tab) => {
    const active = tab.dataset.view === viewId;
    tab.classList.toggle("is-active", active);
    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  if (viewId === "history-view") renderHistory();
  if (viewId === "recipes-view") renderRecipeGrid(elements.recipeSearch.value);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function downloadBackup() {
  const blob = new Blob(
    [JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `今晚吃什么-备份-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("备份文件已生成");
}

async function importBackup(file) {
  try {
    const parsed = createState(await file.text());
    if (parsed.warning) throw new Error("文件不是有效的备份");
    const imported = sanitizeState(parsed.state, recipes, migrationOptions);
    if (!window.confirm("恢复备份会替换当前晚餐记录，继续吗？")) return;
    state = imported;
    lastConfirmedId = latestConfirmedId(state);
    saveState();
    renderTonight();
    renderHistory();
    renderRecipeGrid();
    elements.dataDialog.close();
    showToast("备份已恢复");
  } catch {
    showToast("备份文件无效，当前记录未改变", 3500);
  } finally {
    elements.importInput.value = "";
  }
}

function makeRecipeTonight(recipe) {
  if (!recipe || !recipes.some((item) => item.id === recipe.id)) {
    showToast("这道原菜已移出抽签池，请从新版菜谱中选一道");
    return;
  }
  if (state.eatenIds.includes(recipe.id) && state.pendingId !== recipe.id) {
    showToast("这道在本轮已经确认过了");
    return;
  }
  state = { ...state, pendingId: recipe.id };
  lastConfirmedId = null;
  saveState();
  if (elements.recipeDialog.open) elements.recipeDialog.close();
  switchView("tonight-view");
  renderTonight();
  elements.resultCard.scrollIntoView({ block: "start", behavior: "smooth" });
}

function bindEvents() {
  elements.drawButton.addEventListener("click", () => pickDish());
  elements.homeButton.addEventListener("click", showDrawHome);
  elements.resumeButton.addEventListener("click", renderTonight);
  elements.rerollButton.addEventListener("click", () => pickDish({ replace: true }));
  elements.confirmButton.addEventListener("click", confirmCurrentDish);
  elements.snapshotButton.addEventListener("click", () => openSnapshot(currentDisplayedRecipe()));
  elements.confirmedSnapshotButton.addEventListener("click", () => openSnapshot(currentDisplayedRecipe()));
  elements.nextDrawButton.addEventListener("click", () => pickDish());
  elements.shareButton.addEventListener("click", shareCurrentSnapshot);
  elements.saveImageButton.addEventListener("click", generateSnapshotImage);
  elements.shareImageButton.addEventListener("click", shareSnapshotImage);
  elements.backCardButton.addEventListener("click", () => {
    elements.imageView.hidden = true;
    elements.snapshotContent.hidden = false;
    elements.saveImageButton.hidden = false;
    elements.snapshotDialog.scrollTop = 0;
  });
  elements.dataButton.addEventListener("click", () => elements.dataDialog.showModal());
  elements.exportButton.addEventListener("click", downloadBackup);
  elements.importInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importBackup(file);
  });

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => tab.dataset.view === "tonight-view" ? showDrawHome() : switchView(tab.dataset.view));
  });

  elements.recipeSearch.addEventListener("input", () => {
    renderRecipeGrid(elements.recipeSearch.value);
  });

  document.addEventListener("click", (event) => {
    const recipeTarget = event.target.closest("[data-recipe-id]");
    if (recipeTarget) {
      const recipe = recipeById.get(recipeTarget.dataset.recipeId);
      if (recipe) openRecipeDetail(recipe);
      return;
    }
    const snapshotTarget = event.target.closest("[data-snapshot-id]");
    if (snapshotTarget) {
      openSnapshot(recipeById.get(snapshotTarget.dataset.snapshotId));
      return;
    }
    const tonightTarget = event.target.closest("[data-make-tonight]");
    if (tonightTarget) {
      makeRecipeTonight(recipeById.get(tonightTarget.dataset.makeTonight));
      return;
    }
    const closeTarget = event.target.closest("[data-close-dialog]");
    if (closeTarget) closeTarget.closest("dialog")?.close();
  });

  $$("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  window.addEventListener("online", () => showToast("网络已恢复"));
  window.addEventListener("offline", () => showToast("已离线，内置菜谱仍可继续使用", 3200));
}

function initialize() {
  const saved = readSavedState();
  const restored = createState(saved.raw);
  state = sanitizeState(restored.state, recipes, migrationOptions);
  lastConfirmedId = latestConfirmedId(state);
  bindEvents();
  renderTonight();
  renderHistory();
  renderRecipeGrid();
  if (saved.warning === "STORAGE_UNAVAILABLE") {
    showToast("Safari 未允许本地存储，记录仅在本次打开有效", 4200);
  } else if (restored.warning) {
    showToast("本地记录损坏，已安全恢复为空记录；可导入备份", 4200);
    saveState();
  } else if (saved.raw && serializeState(state) !== saved.raw) {
    saveState();
  }

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
    navigator.serviceWorker.register("./sw.js?v=20261028r3", { updateViaCache: "none" }).catch(() => {
      showToast("离线缓存暂未启用，联网时重新打开可重试");
    });
  }
}

initialize();
