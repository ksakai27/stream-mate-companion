import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateFallbackAdvice } from "./src/fallback.mjs";
import { buildSystemPrompt, buildUserPrompt, adviceSchema } from "./src/prompt.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const configExamplePath = path.join(__dirname, "config.example.json");
const configLocalPath = path.join(__dirname, "config.local.json");

const transcriptState = {
  entries: [],
  updatedAt: null,
  chunksProcessed: 0,
  lastError: null
};

async function loadJson(filePath) {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text);
}

async function loadConfig() {
  const base = await loadJson(configExamplePath);

  try {
    const local = await loadJson(configLocalPath);
    return {
      ...base,
      ...local,
      openai: {
        ...base.openai,
        ...(local.openai || {})
      },
      streamer: {
        ...base.streamer,
        ...(local.streamer || {})
      },
      app: {
        ...base.app,
        ...(local.app || {})
      }
    };
  } catch {
    return base;
  }
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(body, null, 2));
}

function sendText(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return false;
  }

  try {
    const url = new URL(origin);

    if (
      url.origin === "http://127.0.0.1:3030" ||
      url.origin === "http://localhost:3030" ||
      url.origin === "http://127.0.0.1" ||
      url.origin === "http://localhost"
    ) {
      return true;
    }

    if (url.protocol === "https:" && url.hostname.endsWith(".github.io")) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function applyCors(req, res) {
  const origin = req.headers.origin;

  if (!isAllowedOrigin(origin)) {
    return false;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");

  return true;
}

async function readRequestJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function readRequestBuffer(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.join(publicDir, pathname);

  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    sendText(res, 200, body, getContentType(filePath));
  } catch {
    sendText(res, 404, "Not found");
  }
}

function getRollingTranscript(limit = 12) {
  return transcriptState.entries
    .slice(-limit)
    .map((entry) => entry.text)
    .join(" ")
    .trim();
}

function pushTranscriptEntry(text) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }

  const last = transcriptState.entries[transcriptState.entries.length - 1];
  if (last && last.text === cleaned) {
    return last;
  }

  const entry = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text: cleaned,
    createdAt: new Date().toISOString()
  };

  transcriptState.entries.push(entry);
  transcriptState.updatedAt = entry.createdAt;
  transcriptState.chunksProcessed += 1;

  if (transcriptState.entries.length > 40) {
    transcriptState.entries = transcriptState.entries.slice(-40);
  }

  return entry;
}

function resetTranscriptState() {
  transcriptState.entries = [];
  transcriptState.updatedAt = new Date().toISOString();
  transcriptState.chunksProcessed = 0;
  transcriptState.lastError = null;
}

function resolveAudioExtension(mimeType) {
  const normalized = (mimeType || "").toLowerCase();

  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("mp4")) return "mp4";
  if (normalized.includes("mpeg")) return "mp3";
  if (normalized.includes("wav")) return "wav";

  return "webm";
}

async function transcribeAudioChunk(config, audioBuffer, mimeType) {
  const apiKey = config.openai.apiKey;
  const model = config.openai.transcriptionModel || "gpt-4o-mini-transcribe";
  const language = config.openai.transcriptionLanguage || "ja";

  if (!apiKey) {
    throw new Error("OpenAI API key is missing. Add it to config.local.json.");
  }

  const form = new FormData();
  const extension = resolveAudioExtension(mimeType);
  const blob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });

  form.append("file", blob, `chunk.${extension}`);
  form.append("model", model);

  if (language) {
    form.append("language", language);
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI transcription error: ${response.status} ${message}`);
  }

  const data = await response.json();
  return data.text || "";
}

async function generateWithOpenAI(config, payload) {
  const apiKey = config.openai.apiKey;
  const model = config.openai.model;

  if (!apiKey || !model) {
    return null;
  }

  const requestBody = {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: buildSystemPrompt(config.streamer)
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildUserPrompt(payload)
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "stream_companion_advice",
        strict: true,
        schema: adviceSchema
      }
    }
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI advice error: ${response.status} ${message}`);
  }

  const data = await response.json();
  const outputText = data.output
    ?.flatMap((item) => item.content || [])
    ?.filter((item) => item.type === "output_text")
    ?.map((item) => item.text)
    ?.join("")
    ?.trim();

  if (!outputText) {
    throw new Error("OpenAI advice error: no structured text was returned.");
  }

  const parsed = JSON.parse(outputText);

  return {
    ...parsed,
    source: "openai"
  };
}

async function generateAdvice(config, payload) {
  try {
    const aiResult = await generateWithOpenAI(config, payload);
    if (aiResult) {
      return aiResult;
    }
  } catch (error) {
    return {
      ...generateFallbackAdvice(payload, config.streamer),
      source: "fallback",
      warning: error.message
    };
  }

  return {
    ...generateFallbackAdvice(payload, config.streamer),
    source: "fallback"
  };
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const config = await loadConfig();
  const url = new URL(req.url, "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, {
      streamer: config.streamer,
      app: config.app,
      aiEnabled: Boolean(config.openai.apiKey && config.openai.model),
      transcriptionEnabled: Boolean(config.openai.apiKey),
      helperMode: "local_streaming_pc",
      postingMode: "disabled",
      transcriptionMode: "chunked_local_helper"
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      mode: "local helper online",
      host: "127.0.0.1",
      port: config.app.port || 3030,
      postingMode: "disabled",
      transcriptionMode: "chunked_local_helper"
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/transcript-state") {
    sendJson(res, 200, {
      entries: transcriptState.entries,
      rollingTranscript: getRollingTranscript(),
      updatedAt: transcriptState.updatedAt,
      chunksProcessed: transcriptState.chunksProcessed,
      lastError: transcriptState.lastError
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/transcript-reset") {
    resetTranscriptState();
    sendJson(res, 200, {
      ok: true,
      entries: transcriptState.entries,
      rollingTranscript: ""
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/transcribe-chunk") {
    try {
      const audioBuffer = await readRequestBuffer(req);

      if (!audioBuffer.length) {
        sendJson(res, 400, {
          error: "empty_audio",
          message: "No audio bytes received."
        });
        return;
      }

      const mimeType = req.headers["content-type"] || "audio/webm";
      const text = await transcribeAudioChunk(config, audioBuffer, mimeType);
      const entry = pushTranscriptEntry(text);
      transcriptState.lastError = null;

      sendJson(res, 200, {
        ok: true,
        text,
        entry,
        rollingTranscript: getRollingTranscript(),
        updatedAt: transcriptState.updatedAt
      });
    } catch (error) {
      transcriptState.lastError = error.message;
      sendJson(res, 500, {
        error: "transcription_failed",
        message: error.message
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/generate") {
    try {
      const payload = await readRequestJson(req);
      const result = await generateAdvice(config, payload);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        error: "generation_failed",
        message: error.message
      });
    }
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  sendText(res, 405, "Method not allowed");
});

const config = await loadConfig();
const port = Number(process.env.PORT || config.app.port || 3030);
const host = process.env.HOST || config.app.host || "127.0.0.1";

server.listen(port, host, () => {
  console.log(`Stream Mate Companion MVP running at http://${host}:${port}`);
});
