export type ConversationTurn = { role: "user" | "model"; text: string };

// shortcut: retain only the latest 10 exchanges in memory; use summaries if longer bills need full context.
const MAX_TURNS = 20;
const MAX_TURN_LENGTH = 500;

export function appendExchange(history: ConversationTurn[], message: string, reply: string): ConversationTurn[] {
  return [...history, { role: "user" as const, text: message.slice(0, MAX_TURN_LENGTH) }, { role: "model" as const, text: reply.slice(0, MAX_TURN_LENGTH) }].slice(-MAX_TURNS);
}

export function validHistory(value: unknown): ConversationTurn[] | null {
  if (!Array.isArray(value) || value.length > MAX_TURNS || value.length % 2 !== 0) return null;
  if (!value.every((turn, i) => turn && typeof turn === "object" && turn.role === (i % 2 === 0 ? "user" : "model") && typeof turn.text === "string" && turn.text.length > 0 && turn.text.length <= MAX_TURN_LENGTH)) return null;
  return value;
}
