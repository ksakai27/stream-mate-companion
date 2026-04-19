const form = document.getElementById("generatorForm");
const cards = document.getElementById("cards");
const summaryText = document.getElementById("summaryText");
const statusText = document.getElementById("statusText");
const warningBox = document.getElementById("warningBox");
const recentTranscriptField = document.getElementById("recentTranscript");
const transcriptFeed = document.getElementById("transcriptFeed");
const micStatus = document.getElementById("micStatus");
const transcriptStatus = document.getElementById("transcriptStatus");
const startMicButton = document.getElementById("startMicButton");
const stopMicButton = document.getElementById("stopMicButton");
const clearTranscriptButton = document.getElementById("clearTranscriptButton");
const autoAdviceCheckbox = document.getElementById("autoAdviceCheckbox");
const helperUrlField = document.getElementById("helperUrl");
const saveHelperUrlButton = document.getElementById("saveHelperUrlButton");

let mediaRecorder = null;
let mediaStream = null;
let micQueue = Promise.resolve();
let transcriptEntries = [];
let autoAdviceTimer = null;
let helperConfig = null;

function getDefaultApiBase() {
  const stored = window.localStorage.getItem("streamMateHelperUrl");
  if (stored) {
    return stored;
  }

  if (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  ) {
    return window.location.origin;
  }

  return "http://127.0.0.1:3030";
}

let apiBase = getDefaultApiBase();

const samples = {
  weird: {
    recentTranscript:
      "Why would a black penlight glow. Is zombie even gray. Why is okayu not white.",
    recentChat: "Do not drop that topic / that bit is good / first time viewer here",
    vcContext: "",
    gameState: "buy phase",
    currentNeed: "Topic recovery",
    extraNotes: "Grow the weird original observation into a clip moment."
  },
  selfdeprecate: {
    recentTranscript:
      "My aim is cooked. I have been stuck forever. I am dragging myself again.",
    recentChat: "here we go again / report-only carry arc",
    vcContext: "friend said my aim is cooked again",
    gameState: "after a loss",
    currentNeed: "More retorts",
    extraNotes: "Break the self-drag loop and push the flow forward."
  },
  vc: {
    recentTranscript: "No, that is not what I meant at all.",
    recentChat: "who said that / first time viewer here",
    vcContext: "friend told me to lock Raze again",
    gameState: "mid-round",
    currentNeed: "Viewer recap",
    extraNotes: "Make the VC context easier for first-time viewers to follow."
  }
};

function renderCards(items) {
  cards.innerHTML = "";

  if (!items.length) {
    cards.innerHTML = '<p class="empty">No advice yet.</p>';
    return;
  }

  for (const item of items) {
    const article = document.createElement("article");
    article.className = "card";
    article.innerHTML = `
      <div class="card-top">
        <span class="badge">${item.type}</span>
      </div>
      <p class="candidate">${escapeHtml(item.text)}</p>
      <p class="meta"><strong>Why it helps:</strong> ${escapeHtml(item.reason)}</p>
      <p class="meta"><strong>Use it when:</strong> ${escapeHtml(item.useWhen)}</p>
    `;
    cards.appendChild(article);
  }
}

function renderTranscriptFeed() {
  transcriptFeed.innerHTML = "";

  if (!transcriptEntries.length) {
    transcriptFeed.innerHTML = '<p class="empty">No live transcript yet.</p>';
    return;
  }

  for (const entry of transcriptEntries.slice().reverse()) {
    const row = document.createElement("article");
    row.className = "transcript-row";
    row.innerHTML = `
      <div class="transcript-time">${new Date(entry.createdAt).toLocaleTimeString()}</div>
      <div class="transcript-text">${escapeHtml(entry.text)}</div>
    `;
    transcriptFeed.appendChild(row);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applySample(name) {
  const sample = samples[name];
  if (!sample) {
    return;
  }

  for (const [key, value] of Object.entries(sample)) {
    const field = document.getElementById(key);
    if (field) {
      field.value = value;
    }
  }
}

function updateTranscriptField() {
  const rolling = transcriptEntries
    .slice(-12)
    .map((entry) => entry.text)
    .join(" ")
    .trim();

  recentTranscriptField.value = rolling;
}

function scheduleAutoAdvice() {
  if (!autoAdviceCheckbox.checked) {
    return;
  }

  clearTimeout(autoAdviceTimer);
  autoAdviceTimer = setTimeout(() => {
    requestAdvice();
  }, 700);
}

function pickSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];

  for (const mimeType of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

async function sendChunkForTranscription(blob) {
  const response = await fetch(`${apiBase}/api/transcribe-chunk`, {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "audio/webm"
    },
    body: blob
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Transcription failed.");
  }

  if (data.entry) {
    transcriptEntries.push(data.entry);
    if (transcriptEntries.length > 40) {
      transcriptEntries = transcriptEntries.slice(-40);
    }
    renderTranscriptFeed();
    updateTranscriptField();
    transcriptStatus.textContent = `Chunks: ${transcriptEntries.length} / updated ${new Date(data.updatedAt).toLocaleTimeString()}`;
    scheduleAutoAdvice();
  }
}

function enqueueChunk(blob) {
  micQueue = micQueue
    .then(async () => {
      if (!blob || !blob.size) {
        return;
      }

      transcriptStatus.textContent = "Transcribing latest chunk...";
      await sendChunkForTranscription(blob);
    })
    .catch((error) => {
      warningBox.textContent = error.message;
      warningBox.classList.remove("hidden");
      transcriptStatus.textContent = "Transcription error";
    });
}

async function startMic() {
  warningBox.classList.add("hidden");
  warningBox.textContent = "";

  if (!helperConfig?.transcriptionEnabled) {
    throw new Error("Microphone transcription needs an OpenAI API key in config.local.json.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support microphone capture.");
  }

  const mimeType = pickSupportedMimeType();
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1
    }
  });

  mediaRecorder = mimeType
    ? new MediaRecorder(mediaStream, { mimeType })
    : new MediaRecorder(mediaStream);

  mediaRecorder.addEventListener("dataavailable", (event) => {
    enqueueChunk(event.data);
  });

  mediaRecorder.addEventListener("stop", () => {
    micStatus.textContent = "Mic stopped";
    startMicButton.disabled = false;
    stopMicButton.disabled = true;
  });

  mediaRecorder.start(2500);
  micStatus.textContent = `Mic live (${mediaRecorder.mimeType || "default"})`;
  transcriptStatus.textContent = "Recording and waiting for first chunk...";
  startMicButton.disabled = true;
  stopMicButton.disabled = false;
}

function stopMic() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  if (mediaStream) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
  }

  mediaRecorder = null;
  mediaStream = null;
}

async function clearTranscript() {
  transcriptEntries = [];
  renderTranscriptFeed();
  recentTranscriptField.value = "";
  transcriptStatus.textContent = "Transcript cleared";

  await fetch(`${apiBase}/api/transcript-reset`, { method: "POST" });
}

async function loadStatus() {
  try {
    const [configResponse, healthResponse, transcriptResponse] = await Promise.all([
      fetch(`${apiBase}/api/config`),
      fetch(`${apiBase}/api/health`),
      fetch(`${apiBase}/api/transcript-state`)
    ]);

    helperConfig = await configResponse.json();
    const health = await healthResponse.json();
    const transcript = await transcriptResponse.json();

    const aiMode = helperConfig.aiEnabled ? "OpenAI on" : "fallback only";
    const transcriptionMode = helperConfig.transcriptionEnabled
      ? "mic transcription enabled"
      : "mic transcription needs API key";

    statusText.textContent = `${health.mode} / ${aiMode} / ${transcriptionMode} / helper ${apiBase}`;

    transcriptEntries = transcript.entries || [];
    renderTranscriptFeed();
    updateTranscriptField();
    transcriptStatus.textContent = transcript.entries?.length
      ? `Loaded ${transcript.entries.length} transcript entries`
      : "No chunks yet";
  } catch {
    statusText.textContent = `Local helper unavailable at ${apiBase}`;
  }
}

async function requestAdvice() {
  warningBox.classList.add("hidden");
  warningBox.textContent = "";
  summaryText.textContent = "Generating advice...";
  cards.innerHTML = "";

  const payload = {
    recentTranscript: document.getElementById("recentTranscript").value,
    recentChat: document.getElementById("recentChat").value,
    vcContext: document.getElementById("vcContext").value,
    gameState: document.getElementById("gameState").value,
    currentNeed: document.getElementById("currentNeed").value,
    extraNotes: document.getElementById("extraNotes").value
  };

  try {
    const response = await fetch(`${apiBase}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Advice generation failed.");
    }

    summaryText.textContent = `${data.summary} (${data.source || "unknown"})`;
    renderCards(data.adviceCards || []);

    if (data.warning) {
      warningBox.textContent = data.warning;
      warningBox.classList.remove("hidden");
    }
  } catch (error) {
    summaryText.textContent = "Advice generation failed.";
    warningBox.textContent = error.message;
    warningBox.classList.remove("hidden");
  }
}

document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => {
    applySample(button.dataset.sample);
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await requestAdvice();
});

startMicButton.addEventListener("click", async () => {
  try {
    await startMic();
  } catch (error) {
    warningBox.textContent = error.message;
    warningBox.classList.remove("hidden");
    micStatus.textContent = "Mic failed to start";
  }
});

stopMicButton.addEventListener("click", () => {
  stopMic();
});

clearTranscriptButton.addEventListener("click", async () => {
  await clearTranscript();
});

saveHelperUrlButton.addEventListener("click", async () => {
  const nextValue = helperUrlField.value.trim().replace(/\/+$/, "");
  if (!nextValue) {
    return;
  }

  window.localStorage.setItem("streamMateHelperUrl", nextValue);
  apiBase = nextValue;
  await loadStatus();
});

helperUrlField.value = apiBase;
loadStatus();
