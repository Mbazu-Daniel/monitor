import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins/organization";
import { openAPI } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "../utils/prisma.ts";
import { getConfig } from "../config.ts";
import { hashPassword, verifyPassword } from "../utils/password.ts";
import { ac, ADMIN, OFFICER, STAFF, STUDENT } from "../utils/access-control.ts";
import { auditPlatform } from "../utils/audit.ts";
import { trySendMail } from "../mail/mail.ts";
import { welcomeEmail } from "../mail/templates/welcome.ts";
import { resetPasswordEmail } from "../mail/templates/reset-password.ts";
import { invitationEmail } from "../mail/templates/invitation.ts";

const TRUSTED_ORIGINS = getConfig().webOrigins;
const isProduction = getConfig().NODE_ENV === "production";
const WEB_URL = getConfig().WEB_URL.replace(/\/$/, "");




export const auth = betterAuth({
  basePath: "/api/v1/auth",
  trustedOrigins: TRUSTED_ORIGINS,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: {
    database: {
      joins: true,
      generateId: false, 
    },
    ...(isProduction
      ? {
          useSecureCookies: true,
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        }
      : {}),
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    sendResetPassword: async ({ user, url }) => {
      await trySendMail({
        to: user.email,
        ...resetPasswordEmail({ name: user.name, url }),
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await trySendMail({
            to: user.email,
            ...welcomeEmail({ name: user.name, url: WEB_URL }),
          });
        },
      },
    },
  },
  user: {
    additionalFields: {
      isActive: { type: "boolean", defaultValue: true, input: false },
      department: { type: "string", required: false },
      phone: { type: "string", required: false },
      matricNo: { type: "string", required: false },
    },
  },
  plugins: [
    organization({
      creatorRole: "ADMIN",
      requireEmailVerificationOnInvitation: false,
      teams: undefined,
      schema: {
        organization: {
          additionalFields: {
            code: { type: "string", required: true, input: true, unique: true },
          },
        },
      },
      ac,
      roles: { ADMIN, OFFICER, STAFF, STUDENT },
      sendInvitationEmail: async ({ id, email, role, organization: org, inviter }) => {
        await trySendMail({
          to: email,
          ...invitationEmail({
            inviterName: inviter.user.name,
            organizationName: org.name,
            role,
            url: `${WEB_URL}/accept-invitation?id=${id}`,
          }),
        });
      },
      organizationHooks: {
        afterCreateInvitation: async ({ invitation, inviter, organization: org }) => {
          await auditPlatform({
            userId: inviter.id,
            action: "MEMBER_INVITED",
            entityType: "ORGANIZATION",
            entityId: org.id,
            details: `${inviter.name} invited ${invitation.email} as ${invitation.role}`,
            organizationId: org.id,
          });
        },
      },
    }),
    openAPI(),
  ],
});
