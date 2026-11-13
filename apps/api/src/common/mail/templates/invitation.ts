import { COLORS, FONT } from "./constants.ts";
import { escapeHtml, singleLine } from "./escape.ts";
import { renderLayout } from "./layout.ts";
import { renderButton } from "./button.ts";
import type { RenderedEmail, InvitationEmailInput } from "../types.ts";

export function invitationEmail({ inviterName, organizationName, role, url }: InvitationEmailInput): RenderedEmail {
  const subject = `${singleLine(inviterName)} invited you to join ${singleLine(organizationName)} on MivaCampus`;
  const text = `${singleLine(inviterName)} invited you to join ${singleLine(organizationName)} on MivaCampus as ${singleLine(role)}.

Accept the invitation: ${url}

This invitation expires in 48 hours. You'll need to sign in with this email address to accept it.

If you weren't expecting this invitation, you can ignore this email.

The MivaCampus team`;
  const safeInviter = escapeHtml(inviterName);
  const safeOrganization = escapeHtml(organizationName);
  const safeRole = escapeHtml(role);
  const content = `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:26px;line-height:1.15;letter-spacing:-0.02em;font-weight:600;color:${COLORS.ink};">You&apos;re invited.</h1>
<p style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.6;color:${COLORS.muted};"><strong style="color:${COLORS.ink};">${safeInviter}</strong> invited you to join <strong style="color:${COLORS.ink};">${safeOrganization}</strong> on MivaCampus as <strong style="color:${COLORS.ink};">${safeRole}</strong>.</p>
${renderButton({ label: "Accept invitation", url })}
<p style="margin:20px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${COLORS.muted};">This invitation expires in 48 hours. You&apos;ll need to sign in with this email address to accept it. If you weren&apos;t expecting it, you can ignore this email.</p>`;
  return { subject, text, html: renderLayout({ preview: subject, content }) };
}
