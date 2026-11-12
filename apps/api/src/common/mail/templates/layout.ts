import { COLORS, FONT } from "./constants.ts";
import { escapeHtml } from "./escape.ts";
import type { LayoutInput } from "../types.ts";

export function renderLayout({ preview, content }: LayoutInput): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>MivaCampus</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.paper};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.paper};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">
        <tr>
          <td style="padding:0 4px 20px 4px;">
            <span style="font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.03em;color:${COLORS.ink};">miva<span style="color:${COLORS.accent};">&#9679;</span>campus</span>
          </td>
        </tr>
        <tr>
          <td style="background-color:${COLORS.card};border:1px solid ${COLORS.outline};border-radius:16px;padding:32px 28px;">
${content}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 4px 0 4px;">
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${COLORS.muted};">MivaCampus · your campus fault desk.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
