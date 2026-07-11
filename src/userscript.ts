const LOG_PREFIX = "[apple_watch_kindle_manipulator]";
const PANEL_ID = "apple-watch-kindle-manipulator-panel";
const AUDIO_ID = "apple-watch-kindle-manipulator-silent-audio";
const FALLBACK_DELAY_MS = 90;
const REMOTE_HEARTBEAT_MS = 2_000;

interface DirectionConfig {
  direction: Direction;
  arrowKey: "ArrowRight" | "ArrowLeft";
  pointX: number;
  pointY: number;
  words: string[];
}

interface ResultDetail {
  ok: boolean;
  action: string;
  method: string;
  attempts: string[];
  error?: string;
}

type Direction = "next" | "previous";
type PageDirection = "auto" | "right" | "left";

let statusLine: HTMLElement | null = null;
let detailsLine: HTMLElement | null = null;
let remoteToggle: HTMLButtonElement | null = null;
let remoteEnabled = false;
let remoteHeartbeat: number | null = null;
let pageDirection: PageDirection = "auto";

function showResult(detail: ResultDetail): void {
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  if (statusLine) {
    statusLine.textContent = `${time} - ${detail.ok ? detail.action : `${detail.action} failed`}: ${detail.method}`;
  }
  if (detailsLine) {
    const text = `${detail.attempts.join(" -> ")}${detail.error ? ` Error: ${detail.error}` : ""}`;
    detailsLine.textContent = text;
    detailsLine.title = text;
  }
}

function report(detail: ResultDetail): void {
  console.log(LOG_PREFIX, "Result.", detail);
  showResult(detail);
}

function createSilentWavUrl(): string {
  const sampleRate = 8_000;
  const bytesPerSample = 2;
  const dataSize = sampleRate * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeText = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataSize, true);

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

function nextIsRight(): boolean {
  if (pageDirection !== "auto") return pageDirection === "right";
  const rootStyle = getComputedStyle(document.documentElement);
  const bodyStyle = document.body ? getComputedStyle(document.body) : rootStyle;
  return !(
    document.documentElement.dir === "rtl" ||
    document.body?.dir === "rtl" ||
    rootStyle.direction === "rtl" ||
    bodyStyle.direction === "rtl" ||
    rootStyle.writingMode.startsWith("vertical") ||
    bodyStyle.writingMode.startsWith("vertical")
  );
}

function configFor(direction: Direction): DirectionConfig {
  const physicalRight = direction === "next" ? nextIsRight() : !nextIsRight();
  return {
    direction,
    arrowKey: physicalRight ? "ArrowRight" : "ArrowLeft",
    pointX: Math.round(innerWidth * (physicalRight ? 0.86 : 0.14)),
    pointY: Math.round(innerHeight * 0.5),
    words: direction === "next"
      ? ["next", "next page", "forward", "go forward", "進む", "次", "次へ", "次ページ"]
      : ["previous", "prev", "previous page", "back", "go back", "戻る", "前", "前へ", "前ページ"]
  };
}

function elementAtPoint(x: number, y: number, root: Document = document): Element {
  const target = root.elementFromPoint(x, y) ?? root.body ?? root.documentElement;
  if (!(target instanceof HTMLIFrameElement)) return target;
  try {
    const frameDocument = target.contentDocument;
    if (!frameDocument) return target;
    const rect = target.getBoundingClientRect();
    return elementAtPoint(x - rect.left, y - rect.top, frameDocument);
  } catch {
    return target;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function dispatchAndObserve(dispatchAction: () => string | null): Promise<{
  method: string | null;
  changed: boolean;
}> {
  let changed = false;
  const observer = new MutationObserver(() => {
    changed = true;
  });
  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true
  });

  const method = dispatchAction();
  await wait(FALLBACK_DELAY_MS);
  observer.disconnect();
  return { method, changed };
}

function tag(element: Element): string {
  const name = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const role = element.getAttribute("role");
  return `${name}${id}${role ? `[role=${role}]` : ""}`;
}

function pointEvents(config: DirectionConfig): string {
  const target = elementAtPoint(config.pointX, config.pointY);
  target.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX: config.pointX,
    clientY: config.pointY,
    button: 0,
    buttons: 0
  }));
  return `point-click:${tag(target)}`;
}

function keyboard(config: DirectionConfig): string {
  const targets: EventTarget[] = [document, window];
  if (document.activeElement) targets.unshift(document.activeElement);
  for (const target of targets) {
    for (const type of ["keydown", "keyup"] as const) {
      target.dispatchEvent(new KeyboardEvent(type, {
        key: config.arrowKey,
        code: config.arrowKey,
        bubbles: true,
        cancelable: true,
        composed: true
      }));
    }
  }
  return `keyboard:${config.arrowKey}`;
}

function semanticClick(config: DirectionConfig): string | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(
    "button,a,[role='button'],[aria-label],[title],[data-testid],[class*='next' i],[class*='prev' i],[class*='back' i]"
  ));
  const scored = candidates.flatMap((element) => {
    if (element.closest(`#${PANEL_ID}`)) return [];
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (!rect.width || !rect.height || style.display === "none" || style.visibility === "hidden") return [];
    const fields = ["aria-label", "title", "role", "data-testid", "class", "id"]
      .map((name) => element.getAttribute(name)?.trim().toLowerCase() ?? "")
      .concat(element.textContent?.trim().toLowerCase() ?? "");
    const score = fields.reduce((total, field) => total + config.words.reduce(
      (subtotal, word) => subtotal + (field === word ? 4 : field.includes(word) ? 2 : 0), 0
    ), 0);
    return score > 1 ? [{ element, score }] : [];
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  best.element.click();
  return `semantic-click:${tag(best.element)}:score-${best.score}`;
}

async function turnPage(direction: Direction, source: string): Promise<void> {
  const config = configFor(direction);
  const attempts: string[] = [];
  try {
    let confirmedMethod: string | null = null;
    for (const attempt of [
      () => pointEvents(config),
      () => keyboard(config),
      () => semanticClick(config)
    ]) {
      const result = await dispatchAndObserve(attempt);
      if (!result.method) continue;
      attempts.push(result.method);
      if (result.changed) {
        confirmedMethod = result.method;
        break;
      }
    }

    const method = confirmedMethod ?? (attempts.length ? "all-dispatched-unconfirmed" : "none");
    const detail = { ok: confirmedMethod !== null, action: `${source}.${direction}`, method, attempts };
    console.log(LOG_PREFIX, "Page turn attempts completed.", detail);
    report(detail);
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.log(LOG_PREFIX, "Page turn failed.", error);
    report({ ok: false, action: `${source}.${direction}`, method: "error", attempts, error: message });
  }
}

const MEDIA_ACTIONS: Array<[MediaSessionAction, Direction]> = [
  ["nexttrack", "next"],
  ["previoustrack", "previous"],
  ["seekforward", "next"],
  ["seekbackward", "previous"]
];

function registerRemoteHandlers(): string[] {
  const registered: string[] = [];
  for (const [action, direction] of MEDIA_ACTIONS) {
    try {
      navigator.mediaSession.setActionHandler(action, () => void turnPage(direction, `mediaSession.${action}`));
      registered.push(action);
    } catch (error) {
      console.log(LOG_PREFIX, `Unsupported Media Session action: ${action}`, error);
    }
  }
  return registered;
}

function maintainRemoteControls(): void {
  if (!remoteEnabled) return;
  registerRemoteHandlers();
  try {
    navigator.mediaSession.playbackState = "playing";
  } catch (error) {
    console.log(LOG_PREFIX, "Could not maintain Media Session playback state.", error);
  }
}

async function enableRemoteControls(): Promise<void> {
  if (!("mediaSession" in navigator)) throw new Error("Media Session API is unavailable.");

  let audio = document.getElementById(AUDIO_ID) as HTMLAudioElement | null;
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = AUDIO_ID;
    audio.src = createSilentWavUrl();
    audio.loop = true;
    audio.hidden = true;
    document.documentElement.appendChild(audio);
  }
  await audio.play();

  if (typeof MediaMetadata === "function") {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Apple Watch Kindle Manipulator",
      artist: "Userscripts"
    });
  }

  remoteEnabled = true;
  const registered = registerRemoteHandlers();
  if (remoteHeartbeat !== null) window.clearInterval(remoteHeartbeat);
  remoteHeartbeat = window.setInterval(maintainRemoteControls, REMOTE_HEARTBEAT_MS);
  maintainRemoteControls();
  if (remoteToggle) remoteToggle.textContent = "Disable remote controls";
  report({ ok: true, action: "enable", method: "media-session", attempts: registered });
}

function disableRemoteControls(): void {
  remoteEnabled = false;
  if (remoteHeartbeat !== null) window.clearInterval(remoteHeartbeat);
  remoteHeartbeat = null;
  for (const [action] of MEDIA_ACTIONS) {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch (error) {
      console.log(LOG_PREFIX, `Could not clear Media Session action: ${action}`, error);
    }
  }
  const audio = document.getElementById(AUDIO_ID) as HTMLAudioElement | null;
  audio?.pause();
  try {
    navigator.mediaSession.playbackState = "none";
  } catch (error) {
    console.log(LOG_PREFIX, "Could not clear Media Session playback state.", error);
  }
  if (remoteToggle) remoteToggle.textContent = "Enable remote controls";
  report({ ok: true, action: "disable", method: "media-session", attempts: ["handlers", "silent-audio"] });
}

async function toggleRemoteControls(): Promise<void> {
  if (remoteEnabled) {
    disableRemoteControls();
    return;
  }
  await enableRemoteControls();
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}

function directionControl(): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "awkr-direction";
  label.textContent = "Page direction";
  const select = document.createElement("select");
  for (const [value, text] of [
    ["auto", "Auto"],
    ["right", "Next right"],
    ["left", "Next left"]
  ] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  }
  select.addEventListener("change", () => {
    pageDirection = select.value as PageDirection;
    report({ ok: true, action: "direction", method: pageDirection, attempts: [] });
  });
  label.appendChild(select);
  return label;
}

function makeCompactButtonDraggable(panel: HTMLElement, compact: HTMLButtonElement): void {
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let dragging = false;
  let suppressClick = false;

  compact.addEventListener("pointerdown", (event) => {
    const rect = panel.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    originLeft = rect.left;
    originTop = rect.top;
    dragging = true;
    suppressClick = false;
    compact.setPointerCapture(event.pointerId);
  });
  compact.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) < 6) return;
    suppressClick = true;
    const left = Math.max(8, Math.min(innerWidth - 52, originLeft + deltaX));
    const top = Math.max(8, Math.min(innerHeight - 52, originTop + deltaY));
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  });
  compact.addEventListener("pointerup", (event) => {
    dragging = false;
    compact.releasePointerCapture(event.pointerId);
  });
  compact.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    panel.classList.remove("awkm-collapsed");
    panel.removeAttribute("style");
  });
}

function installStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    #${PANEL_ID} { position: fixed; right: 12px; bottom: 12px; z-index: 2147483647;
      width: min(320px, calc(100vw - 24px)); box-sizing: border-box; padding: 10px;
      border: 1px solid rgba(30,30,30,.18); border-radius: 8px; background: rgba(250,250,247,.96);
      color: #181818; box-shadow: 0 6px 24px rgba(0,0,0,.18);
      font: 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
    #${PANEL_ID}.awkm-collapsed { width: 44px; padding: 0; border: 0; border-radius: 8px; background: transparent; box-shadow: none; }
    #${PANEL_ID}.awkm-collapsed .awkm-expanded { display: none; }
    #${PANEL_ID}:not(.awkm-collapsed) .awkm-compact { display: none; }
    #${PANEL_ID} .awkm-compact { width: 44px; height: 44px; padding: 0; border: 1px solid rgba(30,30,30,.24);
      border-radius: 8px; background: rgba(250,250,247,.96); color: #181818; box-shadow: 0 4px 16px rgba(0,0,0,.2);
      font: 700 22px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; touch-action: none; }
    #${PANEL_ID} .awkr-title { margin: 0 0 8px; overflow-wrap: anywhere; font-size: 13px; font-weight: 700; }
    #${PANEL_ID} .awkr-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    #${PANEL_ID} .awkr-button { min-height: 34px; box-sizing: border-box; border: 1px solid rgba(30,30,30,.22);
      border-radius: 6px; background: #fff; color: #181818; font: inherit; font-weight: 600;
      text-align: center; touch-action: manipulation; }
    #${PANEL_ID} .awkr-primary { grid-column: 1 / -1; background: #1457d9; border-color: #1457d9; color: #fff; }
    #${PANEL_ID} .awkr-secondary { background: #f0f0ed; }
    #${PANEL_ID} .awkr-direction { display: grid; grid-template-columns: auto 1fr; grid-column: 1 / -1;
      align-items: center; gap: 8px; margin-top: 2px; font-size: 12px; font-weight: 600; }
    #${PANEL_ID} .awkr-direction select { min-width: 0; min-height: 32px; border: 1px solid rgba(30,30,30,.22);
      border-radius: 6px; background: #fff; color: #181818; font: inherit; }
    #${PANEL_ID} .awkr-status { margin-top: 8px; font-size: 12px; font-weight: 700; }
    #${PANEL_ID} .awkr-details { min-height: 18px; margin-top: 3px; overflow: hidden; color: #55524d;
      font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  `;
  document.documentElement.appendChild(style);
}

function createPanel(): void {
  if (document.getElementById(PANEL_ID)) return;
  installStyles();

  const panel = document.createElement("aside");
  panel.id = PANEL_ID;
  panel.setAttribute("aria-label", "Apple Watch Kindle Manipulator controls");
  const expanded = document.createElement("div");
  expanded.className = "awkm-expanded";
  const title = document.createElement("div");
  title.className = "awkr-title";
  title.textContent = "Apple Watch Kindle Manipulator";
  const controls = document.createElement("div");
  controls.className = "awkr-controls";
  remoteToggle = button("Enable remote controls", "awkr-button awkr-primary", () => {
    void toggleRemoteControls().catch((error: unknown) => {
        report({
          ok: false,
          action: "enable",
          method: "media-session",
          attempts: ["silent-audio", "action-handlers"],
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        });
      });
  });
  controls.append(
    remoteToggle,
    button("Previous", "awkr-button", () => void turnPage("previous", "panel")),
    button("Next", "awkr-button", () => void turnPage("next", "panel")),
    directionControl(),
    button("Minimize", "awkr-button awkr-secondary", () => panel.classList.add("awkm-collapsed"))
  );
  statusLine = document.createElement("div");
  statusLine.className = "awkr-status";
  statusLine.textContent = "Not enabled yet.";
  detailsLine = document.createElement("div");
  detailsLine.className = "awkr-details";
  detailsLine.textContent = "Open a book, then enable remote controls.";
  expanded.append(title, controls, statusLine, detailsLine);
  const compact = button("≡", "awkm-compact", () => undefined);
  compact.setAttribute("aria-label", "Show controls");
  compact.title = "Show controls";
  makeCompactButtonDraggable(panel, compact);
  panel.append(expanded, compact);
  document.documentElement.appendChild(panel);
}

createPanel();
console.log(LOG_PREFIX, "Userscript ready.");
