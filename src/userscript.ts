const LOG_PREFIX = "[apple_watch_kindle_manipulator]";
const PANEL_ID = "apple-watch-kindle-manipulator-panel";
const HIDDEN_STORAGE_KEY = "apple_watch_kindle_manipulator:hidden";
const AUDIO_ID = "apple-watch-kindle-manipulator-silent-audio";
const FALLBACK_DELAY_MS = 90;

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

let statusLine: HTMLElement | null = null;
let detailsLine: HTMLElement | null = null;

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

function configFor(direction: Direction): DirectionConfig {
  const next = direction === "next";
  return {
    direction,
    arrowKey: next ? "ArrowRight" : "ArrowLeft",
    pointX: Math.round(innerWidth * (next ? 0.86 : 0.14)),
    pointY: Math.round(innerHeight * 0.5),
    words: next
      ? ["next", "next page", "forward", "go forward", "進む", "次", "次へ", "次ページ"]
      : ["previous", "prev", "previous page", "back", "go back", "戻る", "前", "前へ", "前ページ"]
  };
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
  const target = document.elementFromPoint(config.pointX, config.pointY) ?? document.body ?? document.documentElement;
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

  const actions: Array<[MediaSessionAction, Direction]> = [
    ["nexttrack", "next"],
    ["previoustrack", "previous"],
    ["seekforward", "next"],
    ["seekbackward", "previous"]
  ];
  const registered: string[] = [];
  for (const [action, direction] of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, () => void turnPage(direction, `mediaSession.${action}`));
      registered.push(action);
    } catch (error) {
      console.log(LOG_PREFIX, `Unsupported Media Session action: ${action}`, error);
    }
  }
  try {
    navigator.mediaSession.playbackState = "playing";
  } catch (error) {
    console.log(LOG_PREFIX, "Could not set Media Session playback state.", error);
  }
  report({ ok: true, action: "enable", method: "media-session", attempts: registered });
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}

function installStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    #${PANEL_ID} { position: fixed; right: 12px; bottom: 12px; z-index: 2147483647;
      width: min(320px, calc(100vw - 24px)); box-sizing: border-box; padding: 10px;
      border: 1px solid rgba(30,30,30,.18); border-radius: 8px; background: rgba(250,250,247,.96);
      color: #181818; box-shadow: 0 6px 24px rgba(0,0,0,.18);
      font: 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
    #${PANEL_ID}[hidden] { display: none; }
    #${PANEL_ID} .awkr-title { margin: 0 0 8px; overflow-wrap: anywhere; font-size: 13px; font-weight: 700; }
    #${PANEL_ID} .awkr-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    #${PANEL_ID} .awkr-button { min-height: 34px; box-sizing: border-box; border: 1px solid rgba(30,30,30,.22);
      border-radius: 6px; background: #fff; color: #181818; font: inherit; font-weight: 600;
      text-align: center; touch-action: manipulation; }
    #${PANEL_ID} .awkr-primary { grid-column: 1 / -1; background: #1457d9; border-color: #1457d9; color: #fff; }
    #${PANEL_ID} .awkr-secondary { background: #f0f0ed; }
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
  const title = document.createElement("div");
  title.className = "awkr-title";
  title.textContent = "Apple Watch Kindle Manipulator";
  const controls = document.createElement("div");
  controls.className = "awkr-controls";
  controls.append(
    button("Enable remote controls", "awkr-button awkr-primary", () => {
      void enableRemoteControls().catch((error: unknown) => {
        report({
          ok: false,
          action: "enable",
          method: "media-session",
          attempts: ["silent-audio", "action-handlers"],
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        });
      });
    }),
    button("Previous", "awkr-button", () => void turnPage("previous", "panel")),
    button("Next", "awkr-button", () => void turnPage("next", "panel")),
    button("Hide", "awkr-button awkr-secondary", () => {
      panel.hidden = true;
      sessionStorage.setItem(HIDDEN_STORAGE_KEY, "true");
    })
  );
  statusLine = document.createElement("div");
  statusLine.className = "awkr-status";
  statusLine.textContent = "Not enabled yet.";
  detailsLine = document.createElement("div");
  detailsLine.className = "awkr-details";
  detailsLine.textContent = "Open a book, then enable remote controls.";
  panel.append(title, controls, statusLine, detailsLine);
  document.documentElement.appendChild(panel);
  panel.hidden = sessionStorage.getItem(HIDDEN_STORAGE_KEY) === "true";
}

createPanel();
console.log(LOG_PREFIX, "Userscript ready.");
