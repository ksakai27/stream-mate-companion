export function buildSystemPrompt(streamer) {
  return [
    "You are a live stream companion assistant.",
    "You do not post to Twitch chat.",
    "You do not act as an autonomous commenting bot.",
    "Your job is to give the streamer short, real-time advice cards they can read on screen and react to.",
    "Focus on helping the streamer keep momentum, recover dropped topics, explain context for first-time viewers, and avoid self-deprecation loops.",
    "Advice should be short, practical, and easy to act on immediately.",
    "Prefer playful, useful guidance over praise-heavy wording.",
    "Do not be cruel, do not lecture, and do not produce long paragraphs.",
    "Streamer profile:",
    `- streamer_name: ${streamer.streamerName}`,
    `- companion_name: ${streamer.assistantName}`,
    `- persona: ${streamer.persona}`,
    `- target_style: ${streamer.targetStyle}`,
    `- strengths: ${streamer.strengths.join(" / ")}`,
    `- avoid: ${streamer.avoid.join(" / ")}`,
    `- preferred_modes: ${streamer.preferredModes.join(" / ")}`,
    "Return only structured JSON that matches the schema."
  ].join("\n");
}

export function buildUserPrompt(payload) {
  const recentTranscript = (payload.recentTranscript || "").trim() || "none";
  const recentChat = (payload.recentChat || "").trim() || "none";
  const vcContext = (payload.vcContext || "").trim() || "none";
  const gameState = (payload.gameState || "").trim() || "none";
  const currentNeed = (payload.currentNeed || "").trim() || "auto";
  const extraNotes = (payload.extraNotes || "").trim() || "none";

  return [
    "Generate up to 5 short advice cards for the streamer.",
    "These are local on-screen suggestions, not Twitch messages.",
    "",
    "[recent_streamer_speech]",
    recentTranscript,
    "",
    "[recent_chat_flow]",
    recentChat,
    "",
    "[vc_context]",
    vcContext,
    "",
    "[game_state]",
    gameState,
    "",
    "[preferred_advice_mode]",
    currentNeed,
    "",
    "[extra_notes]",
    extraNotes,
    "",
    "Requirements:",
    "- Each item must be short and immediately usable.",
    "- Include at least one context or recap style suggestion when needed.",
    "- If the streamer seems to be dropping a good topic, include a recovery suggestion.",
    "- If self-deprecation is repeating, include a redirect suggestion.",
    "- Advice text should sound like a helpful stream sidekick talking to the streamer."
  ].join("\n");
}

export const adviceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "adviceCards"],
  properties: {
    summary: {
      type: "string",
      description: "Brief diagnosis of the current stream flow."
    },
    adviceCards: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "text", "reason", "useWhen"],
        properties: {
          type: {
            type: "string",
            enum: ["nudge", "topic_recovery", "context_help", "energy_shift", "clip_hint"]
          },
          text: {
            type: "string",
            description: "Short advice for the streamer to see on screen."
          },
          reason: {
            type: "string",
            description: "Why this advice helps right now."
          },
          useWhen: {
            type: "string",
            description: "When the streamer should use this advice."
          }
        }
      }
    }
  }
};
