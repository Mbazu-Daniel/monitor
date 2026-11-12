export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type MailMessage = RenderedEmail & {
  to: string;
};

export type LayoutInput = {
  preview: string;
  content: string;
};

export type ButtonInput = {
  label: string;
  url: string;
};

export type WelcomeEmailInput = {
  name: string;
  url: string;
};

export type ResetPasswordEmailInput = {
  name: string;
  url: string;
};

export type InvitationEmailInput = {
  inviterName: string;
  organizationName: string;
  role: string;
  url: string;
};
