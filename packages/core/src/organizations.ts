export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER";
export type Membership = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
};

export class OrganizationPolicy {
  constructor(private readonly memberships: readonly Membership[]) {}
  require(
    userId: string,
    organizationId: string,
    allowed: readonly OrganizationRole[],
  ): Membership {
    const membership = this.memberships.find(
      (item) =>
        item.userId === userId && item.organizationId === organizationId,
    );
    if (!membership || !allowed.includes(membership.role))
      throw new Error("NOT_FOUND");
    return membership;
  }
  filterFor(userId: string, organizationIds: readonly string[]): string[] {
    const accessible = new Set(
      this.memberships
        .filter((item) => item.userId === userId)
        .map((item) => item.organizationId),
    );
    return organizationIds.filter((id) => accessible.has(id));
  }
}

export type AuditEvent = Readonly<{
  id: string;
  actorId: string;
  organizationId: string | null;
  action: string;
  targetId: string;
  reason: string | null;
  occurredAt: Date;
}>;
export class AuditLog {
  #events: AuditEvent[] = [];
  append(event: AuditEvent): void {
    this.#events.push(Object.freeze({ ...event }));
  }
  all(): readonly AuditEvent[] {
    return this.#events.slice();
  }
}
