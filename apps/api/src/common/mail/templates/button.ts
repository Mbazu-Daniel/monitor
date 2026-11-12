import { COLORS, FONT } from "./constants.ts";
import { escapeHtml } from "./escape.ts";
import type { ButtonInput } from "../types.ts";

export function renderButton({ label, url }: ButtonInput): string {
  const safeUrl = escapeHtml(url);
  return `<a href="${safeUrl}" style="display:inline-block;background-color:${COLORS.primaryDeep};color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;letter-spacing:-0.01em;text-decoration:none;padding:13px 26px;border-radius:9999px;">${escapeHtml(label)}</a>
<p style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${COLORS.muted};word-break:break-all;">${safeUrl}</p>`;
}
