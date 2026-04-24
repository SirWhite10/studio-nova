import type { UIMessage } from "ai";

export interface ChatItem {
  id: string;
  title: string;
  description: string;
  url: string;
  studioId?: string;
}

export interface ActiveChat {
  chatId: string;
  chatTitle: string;
  messages: UIMessage[];
}
