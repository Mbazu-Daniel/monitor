import { COLORS, FONT } from "./constants.ts";
import { escapeHtml, singleLine } from "./escape.ts";
import { renderLayout } from "./layout.ts";
import { renderButton } from "./button.ts";
import type { RenderedEmail, ResetPasswordEmailInput } from "../types.ts";

export function resetPasswordEmail({ name, url }: ResetPasswordEmailInput): RenderedEmail {
  const subject = "Reset your MivaCampus password";
  const text = `Hi ${singleLine(name)},

We received a request to reset the password for your MivaCampus account. The link is valid for 1 hour.

Reset your password: ${url}

If you didn't request this, you can ignore this email. Your password won't change.

The MivaCampus team`;
  const content = `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:26px;line-height:1.15;letter-spacing:-0.02em;font-weight:600;color:${COLORS.ink};">Reset your password.</h1>
<p style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.6;color:${COLORS.muted};">Hi ${escapeHtml(name)}, we received a request to reset the password for your MivaCampus account. The link is valid for 1 hour.</p>
${renderButton({ label: "Reset password", url })}
<p style="margin:20px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${COLORS.muted};">If you didn&apos;t request this, you can ignore this email &mdash; your password won&apos;t change.</p>`;
  return { subject, text, html: renderLayout({ preview: subject, content }) };
}
