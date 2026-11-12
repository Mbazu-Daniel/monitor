type StaffNoContext = {
  member: {
    count(args: { where: { organizationId: string; role: "STAFF" | "STUDENT" | "OFFICER" | "ADMIN" } }): Promise<number>;
  };
};

export async function nextStaffNo(
  ctx: StaffNoContext,
  organizationId: string,
  slug: string,
  role: "STAFF" | "STUDENT" = "STAFF",
  prefix = "",
) {
  const count = await ctx.member.count({ where: { organizationId, role } });
  return `${slug}/${prefix}${String(count + 1).padStart(4, "0")}`;
}
