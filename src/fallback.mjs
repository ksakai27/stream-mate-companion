function hasAny(text, patterns) {
  const normalized = (text || "").toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function pushAdvice(list, type, text, reason, useWhen) {
  if (list.some((item) => item.text === text)) {
    return;
  }

  list.push({ type, text, reason, useWhen });
}

export function generateFallbackAdvice(payload, streamer) {
  const transcript = payload.recentTranscript || "";
  const chat = payload.recentChat || "";
  const vc = payload.vcContext || "";
  const game = payload.gameState || "";
  const joined = [transcript, chat, vc, game].join("\n");
  const adviceCards = [];

  if (hasAny(joined, ["bad", "cooked", "washed", "stuck", "terrible", "aim", "gold"])) {
    pushAdvice(
      adviceCards,
      "energy_shift",
      "Break the self-drag loop and name one thing you did right.",
      "This keeps the energy from collapsing into repeated self-criticism.",
      "Use when you have called yourself bad multiple times in a row."
    );
    pushAdvice(
      adviceCards,
      "nudge",
      "Turn the complaint into a bit instead of repeating it.",
      "A small framing shift makes the moment more fun and more watchable.",
      "Use when the same complaint keeps coming back."
    );
  }

  if (hasAny(joined, ["what was i saying", "anyway", "back to", "forgot", "taiwan", "penlight", "zombie", "okayu"])) {
    pushAdvice(
      adviceCards,
      "topic_recovery",
      "That topic still has juice. Give it a one-line ending before you leave it.",
      "A quick ending makes the moment easier to follow and easier to clip.",
      "Use when a fun thought is getting interrupted."
    );
  }

  if (hasAny(joined, ["friend said", "they said", "vc", "discord", "party", "stack"])) {
    pushAdvice(
      adviceCards,
      "context_help",
      "Give first-time viewers the missing VC context in one sentence.",
      "This opens the moment up for people who do not know the private conversation.",
      "Use right after reacting to something from VC."
    );
  }

  if (hasAny(joined, ["first time viewer", "who said that", "what are you talking about"])) {
    pushAdvice(
      adviceCards,
      "context_help",
      "Recap the subject and who said what before moving on.",
      "This makes the stream friendlier to new viewers without slowing it down much.",
      "Use when chat looks lost."
    );
  }

  if (hasAny(joined, ["weird", "why would", "english", "taiwan", "penlight", "black", "gray", "white"])) {
    pushAdvice(
      adviceCards,
      "clip_hint",
      "That weird observation is the bit. Sit on it for one more beat.",
      "Your original odd thoughts are some of the strongest clip material.",
      "Use when a strange question or phrasing lands well."
    );
  }

  if (hasAny(joined, ["fight", "mid-round", "buy phase", "after death"])) {
    pushAdvice(
      adviceCards,
      "nudge",
      "Match the advice to the phase: focus during fights, expand during downtime.",
      "Separating gameplay and story beats keeps both clearer.",
      "Use when gameplay is constantly cutting off the bit."
    );
  }

  pushAdvice(
    adviceCards,
    "nudge",
    "Ask yourself what the funniest next sentence is, not the most accurate one.",
    "This encourages momentum and stream energy without forcing a fake persona.",
    "Use when you feel flat or overcareful."
  );

  return {
    summary: `${streamer.assistantName} is in companion mode and is showing local advice cards only.`,
    adviceCards: adviceCards.slice(0, 5)
  };
}
