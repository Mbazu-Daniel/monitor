import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { fail } from "@/lib/api-helpers";

// GET /api/docs — OpenAPI 3.0 description of the Maintenance API (authenticated)
export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return fail("You must be signed in to view API documentation.", 401);

  const doc = {
    openapi: "3.0.3",
    info: {
      title: "University Maintenance Service API",
      version: "1.0.0",
      description:
        "RESTful API for the campus maintenance service request system. Authentication uses an httpOnly JWT session cookie (ums_session) issued by /api/auth/login. Role-based access control: STUDENT, STAFF, OFFICER, ADMIN.",
    },
    servers: [{ url: "/" }],
    paths: {
      "/api/auth/register": {
        post: {
          summary: "Register a new student/staff account",
          tags: ["Auth"],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string", format: "password" }, role: { type: "string", enum: ["STUDENT", "STAFF"] }, department: { type: "string" }, phone: { type: "string" }, matricNo: { type: "string" } }, required: ["name", "email", "password"] } } } },
          responses: { "201": { description: "Account created, session cookie set" }, "409": { description: "Email already exists" }, "422": { description: "Validation error" } },
        },
      },
      "/api/auth/login": {
        post: { summary: "Sign in and receive a session cookie", tags: ["Auth"], responses: { "200": { description: "Signed in" }, "401": { description: "Invalid credentials" }, "403": { description: "Account deactivated" } } },
      },
      "/api/auth/logout": { post: { summary: "Clear the session cookie", tags: ["Auth"], responses: { "200": { description: "Signed out" } } } },
      "/api/auth/me": {
        get: { summary: "Get the current session user", tags: ["Auth"], responses: { "200": { description: "Current user" }, "401": { description: "Not signed in" } } },
        patch: { summary: "Update own profile", tags: ["Auth"], responses: { "200": { description: "Updated" } } },
      },
      "/api/auth/password": { post: { summary: "Change own password", tags: ["Auth"], responses: { "200": { description: "Password changed" }, "400": { description: "Current password incorrect" } } } },
      "/api/requests": {
        get: {
          summary: "List service requests (role-scoped, searchable, paginated)",
          tags: ["Requests"],
          parameters: [
            { name: "search", in: "query", schema: { type: "string" }, description: "Matches reference, title, description, location" },
            { name: "status", in: "query", schema: { type: "string", enum: ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REJECTED"] } },
            { name: "priority", in: "query", schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] } },
            { name: "categoryId", in: "query", schema: { type: "string" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "oldest", "priority"] } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 8, maximum: 50 } },
          ],
          responses: { "200": { description: "Paginated requests. STUDENT/STAFF see their own; OFFICER sees assigned; ADMIN sees all." } },
        },
        post: {
          summary: "Create a service request (with optional evidence images)",
          tags: ["Requests"],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, categoryId: { type: "string" }, location: { type: "string" }, priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] }, attachments: { type: "array", maxItems: 3, items: { type: "object", properties: { filename: { type: "string" }, mimeType: { type: "string", enum: ["image/jpeg", "image/png", "image/webp", "image/gif"] }, size: { type: "integer" }, data: { type: "string", description: "base64 content" } } } } }, required: ["title", "description", "categoryId", "location"] } } } },
          responses: { "201": { description: "Created (reference SR-YYYY-NNNN)" }, "422": { description: "Validation error" } },
        },
      },
      "/api/requests/{id}": {
        get: { summary: "Get request detail (timeline, comments, assignments)", tags: ["Requests"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Request detail" }, "403": { description: "No access" }, "404": { description: "Not found" } } },
        patch: { summary: "Update request details (owner while OPEN, or ADMIN)", tags: ["Requests"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated" } } },
        delete: { summary: "Delete request (owner while OPEN, or ADMIN)", tags: ["Requests"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" } } },
      },
      "/api/requests/{id}/assign": {
        post: { summary: "Assign a maintenance officer (ADMIN)", tags: ["Assignments"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { officerId: { type: "string" }, note: { type: "string" } }, required: ["officerId"] } } } }, responses: { "200": { description: "Assigned" }, "409": { description: "Invalid state" } } },
        delete: { summary: "Unassign and return request to queue (ADMIN)", tags: ["Assignments"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Unassigned" } } },
      },
      "/api/requests/{id}/status": {
        post: {
          summary: "Change request status (validated state machine)",
          tags: ["Requests"],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REJECTED"] }, note: { type: "string" } }, required: ["status"] } } } },
          responses: { "200": { description: "Status changed and logged" }, "403": { description: "Transition not permitted for this role" } },
        },
      },
      "/api/requests/{id}/comments": {
        get: { summary: "List comments on a request", tags: ["Comments"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Comments" } } },
        post: { summary: "Add a comment (participants only)", tags: ["Comments"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "201": { description: "Comment added" } } },
      },
      "/api/attachments/{id}": {
        get: { summary: "Download an evidence image (binary)", tags: ["Attachments"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Image bytes", content: { "image/*": { schema: { type: "string", format: "binary" } } } } } },
      },
      "/api/categories": {
        get: { summary: "List categories with request counts", tags: ["Categories"], responses: { "200": { description: "Categories" } } },
        post: { summary: "Create category (ADMIN)", tags: ["Categories"], responses: { "201": { description: "Created" } } },
      },
      "/api/categories/{id}": {
        patch: { summary: "Update category (ADMIN)", tags: ["Categories"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated" } } },
        delete: { summary: "Delete category (ADMIN, blocked when in use)", tags: ["Categories"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" }, "409": { description: "Category in use" } } },
      },
      "/api/users": {
        get: { summary: "List users with pagination (ADMIN)", tags: ["Users"], parameters: [{ name: "search", in: "query", schema: { type: "string" } }, { name: "role", in: "query", schema: { type: "string", enum: ["STUDENT", "STAFF", "OFFICER", "ADMIN"] } }], responses: { "200": { description: "Paginated users" } } },
        post: { summary: "Create any user incl. officers (ADMIN)", tags: ["Users"], responses: { "201": { description: "Created" } } },
      },
      "/api/users/{id}": {
        patch: { summary: "Update role, activation, profile or reset password (ADMIN)", tags: ["Users"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated" }, "400": { description: "Guard rail triggered (self-demotion, last admin)" } } },
      },
      "/api/notifications": { get: { summary: "List own notifications + unread count", tags: ["Notifications"], responses: { "200": { description: "Notifications" } } } },
      "/api/notifications/read-all": { post: { summary: "Mark all notifications read", tags: ["Notifications"], responses: { "200": { description: "Done" } } } },
      "/api/notifications/{id}/read": { post: { summary: "Mark one notification read", tags: ["Notifications"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Done" } } } },
      "/api/stats": { get: { summary: "Role-scoped dashboard statistics", tags: ["Analytics"], responses: { "200": { description: "Stats for STUDENT/STAFF, OFFICER or ADMIN" } } } },
      "/api/export/requests": { get: { summary: "Export requests to CSV (ADMIN/OFFICER)", tags: ["Analytics"], parameters: [{ name: "status", in: "query", schema: { type: "string" } }, { name: "priority", in: "query", schema: { type: "string" } }, { name: "categoryId", in: "query", schema: { type: "string" } }], responses: { "200": { description: "CSV file download" } } } },
      "/api/audit-logs": { get: { summary: "Paginated audit trail (ADMIN)", tags: ["Audit"], parameters: [{ name: "search", in: "query", schema: { type: "string" } }, { name: "action", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Audit log page" } } } },
    },
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "ums_session" },
      },
    },
    security: [{ cookieAuth: [] }],
  };

  return Response.json(doc);
}
