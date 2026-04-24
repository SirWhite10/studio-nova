import type { UIMessage } from "ai";

export type NovaUIMessage = UIMessage & {
  createdAt?: number;
};

type PersistedMessageLike = {
  _id?: string;
  id?: string;
  role: string;
  content?: string | null;
  parts?: any[] | null;
  createdAt?: number | null;
};

export function toUIMessage(msg: PersistedMessageLike): NovaUIMessage | null {
  if (msg.role === "tool" || msg.role === "system") return null;

  if (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
    const toolCalls = new Map<string, any>();
    const ordered: any[] = [];

    for (const part of msg.parts) {
      if (part.type === "tool-call") {
        const toolCall = {
          type: "tool-call",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          state: "input-available",
          input: part.input,
          output: undefined,
        };
        toolCalls.set(part.toolCallId, toolCall);
        ordered.push(toolCall);
        continue;
      }

      if (part.type === "tool-result") {
        const existing = toolCalls.get(part.toolCallId);
        if (existing) {
          existing.output = part.output;
          existing.state = part.error ? "output-error" : "output-available";
          if (part.error) existing.errorText = part.error;
        }
        continue;
      }

      ordered.push(part);
    }

    return {
      id: String(msg._id ?? msg.id),
      role: msg.role as "user" | "assistant",
      parts: ordered,
      createdAt: msg.createdAt ?? undefined,
    };
  }

  return {
    id: String(msg._id ?? msg.id),
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text", text: msg.content ?? "" }],
    createdAt: msg.createdAt ?? undefined,
  };
}

export function toUIMessages(messages: PersistedMessageLike[]): NovaUIMessage[] {
  return messages.map(toUIMessage).filter((message): message is NovaUIMessage => message !== null);
}
