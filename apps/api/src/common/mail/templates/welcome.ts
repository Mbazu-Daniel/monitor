import { COLORS, FONT } from "./constants.ts";
import { escapeHtml, singleLine } from "./escape.ts";
import { renderLayout } from "./layout.ts";
import { renderButton } from "./button.ts";
import type { RenderedEmail, WelcomeEmailInput } from "../types.ts";

export function welcomeEmail({ name, url }: WelcomeEmailInput): RenderedEmail {
  const subject = "Welcome to MivaCampus";
  const greeting = singleLine(name);
  const text = `Hi ${greeting},

Your MivaCampus account is ready. Sign in and join your campus with the code your campus administrator gave you.

Sign in: ${url}

The MivaCampus team`;
  const content = `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:26px;line-height:1.15;letter-spacing:-0.02em;font-weight:600;color:${COLORS.ink};">Your account is ready.</h1>
<p style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.6;color:${COLORS.muted};">Hi ${escapeHtml(name)}, your MivaCampus account is set up. Sign in and join your campus with the code your campus administrator gave you.</p>
${renderButton({ label: "Sign in to MivaCampus", url })}`;
  return { subject, text, html: renderLayout({ preview: subject, content }) };
}
