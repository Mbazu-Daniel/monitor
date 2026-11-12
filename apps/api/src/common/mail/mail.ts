import { getConfig } from "../config.ts";
import { logger } from "../logger.ts";
import type { MailMessage } from "./types.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

async function sendMail(message: MailMessage): Promise<void> {
  const config = getConfig();
  if (!config.RESEND_API_KEY) {
    logger.warn({ to: message.to, subject: message.subject }, "mail skipped: RESEND_API_KEY is not set");
    return;
  }
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`resend rejected the message (${response.status}): ${body}`);
  }
}

export async function trySendMail(message: MailMessage): Promise<void> {
  try {
    await sendMail(message);
  } catch (error) {
    logger.error({ err: error, to: message.to, subject: message.subject }, "mail failed");
  }
}
