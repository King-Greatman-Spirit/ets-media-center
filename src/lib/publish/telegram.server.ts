// Telegram Bot API publisher. Server-only: never import from client code
// (route files, *.functions.ts top level). Load it dynamically inside handlers.

export type TelegramMedia =
  | { url: string; kind: "video" | "image" | "audio" }
  | null;

async function botCall(
  botToken: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<{ message_id?: number }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
    result?: { message_id?: number };
  } | null;
  if (!res.ok || !body?.ok) {
    throw new Error(body?.description ?? `Telegram API error (${res.status}).`);
  }
  return body.result ?? {};
}

/** Post text with optional media to a Telegram chat/channel. Returns a public link when possible. */
export async function publishToTelegram(opts: {
  botToken: string;
  chatId: string;
  title: string;
  body: string;
  media?: TelegramMedia;
}): Promise<{ url?: string }> {
  if (!opts.botToken) throw new Error("Telegram bot token is missing.");
  if (!opts.chatId) throw new Error("Telegram chat ID is missing. Add the channel chat ID in Connections.");

  const fullText = `${opts.title}\n\n${opts.body}`.trim().slice(0, 4000);
  let messageId: number | undefined;

  if (opts.media?.kind === "video") {
    const caption = fullText.slice(0, 1000);
    const r = await botCall(opts.botToken, "sendVideo", {
      chat_id: opts.chatId,
      video: opts.media.url,
      caption,
      supports_streaming: true,
    });
    messageId = r.message_id;
  } else if (opts.media?.kind === "image") {
    const caption = fullText.slice(0, 1000);
    const r = await botCall(opts.botToken, "sendPhoto", {
      chat_id: opts.chatId,
      photo: opts.media.url,
      caption,
    });
    messageId = r.message_id;
  } else if (opts.media?.kind === "audio") {
    const caption = fullText.slice(0, 1000);
    const r = await botCall(opts.botToken, "sendAudio", {
      chat_id: opts.chatId,
      audio: opts.media.url,
      caption,
    });
    messageId = r.message_id;
  } else {
    const r = await botCall(opts.botToken, "sendMessage", {
      chat_id: opts.chatId,
      text: fullText,
    });
    messageId = r.message_id;
  }

  // Public channels/groups expose message links; private chats do not.
  if (opts.chatId.startsWith("@") && messageId) {
    return { url: `https://t.me/${opts.chatId.slice(1)}/${messageId}` };
  }
  return {};
}
