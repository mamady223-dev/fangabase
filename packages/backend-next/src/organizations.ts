import { randomUUID } from "node:crypto";
import { audit, BackendProblem, expiresIn, now, page } from "./common.js";
import { normalizeEmail, randomToken, tokenHash } from "./crypto.js";
import type { PublicUser } from "./identity.js";
import type {
  BackendState,
  InvitationRecord,
  MembershipRecord,
  OrganizationRecord,
} from "./state.js";

export class OrganizationService {
  list(state: BackendState, actor: PublicUser): OrganizationRecord[] {
    const ids = state.memberships
      .filter(
        (membership) => membership.userId === actor.id && !membership.revokedAt,
      )
      .map((membership) => membership.organizationId);
    return state.organizations.filter((organization) =>
      ids.includes(organization.id),
    );
  }

  create(
    state: BackendState,
    actor: PublicUser,
    input: { name: string; slug: string },
  ): OrganizationRecord {
    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();
    if (
      name.length < 2 ||
      name.length > 120 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    )
      throw new BackendProblem("VALIDATION_FAILED", 422);
    if (state.organizations.some((item) => item.slug === slug))
      throw new BackendProblem("CONFLICT", 409);
    const organization: OrganizationRecord = {
      id: randomUUID(),
      name,
      slug,
      status: "ACTIVE",
      createdAt: now(),
    };
    state.organizations.push(organization);
    state.memberships.push({
      organizationId: organization.id,
      userId: actor.id,
      role: "OWNER",
      revokedAt: null,
    });
    audit(
      state,
      actor.id,
      "organization.created",
      "organization",
      organization.id,
    );
    return organization;
  }

  show(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
  ): OrganizationRecord {
    this.membership(state, actor, organizationId);
    const organization = state.organizations.find(
      (candidate) => candidate.id === organizationId,
    );
    if (!organization) throw new BackendProblem("NOT_FOUND", 404);
    return organization;
  }

  update(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
    input: { name?: string | undefined },
  ): OrganizationRecord {
    this.requireRole(state, actor, organizationId, ["OWNER", "ADMIN"]);
    const organization = this.show(state, actor, organizationId);
    if (organization.status === "SUSPENDED")
      throw new BackendProblem("FORBIDDEN", 403);
    const name = input.name?.trim();
    if (!name || name.length < 2 || name.length > 120)
      throw new BackendProblem("VALIDATION_FAILED", 422);
    organization.name = name;
    audit(
      state,
      actor.id,
      "organization.updated",
      "organization",
      organization.id,
    );
    return organization;
  }

  members(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
  ): MembershipRecord[] {
    this.membership(state, actor, organizationId);
    return state.memberships.filter(
      (item) => item.organizationId === organizationId && !item.revokedAt,
    );
  }

  invite(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
    input: { email: string; role: "ADMIN" | "MEMBER" },
  ): { invitation: Omit<InvitationRecord, "tokenHash">; token: string } {
    this.requireRole(state, actor, organizationId, ["OWNER", "ADMIN"]);
    const organization = this.show(state, actor, organizationId);
    if (organization.status === "SUSPENDED")
      throw new BackendProblem("FORBIDDEN", 403);
    const email = normalizeEmail(input.email);
    for (const invitation of state.invitations)
      if (
        invitation.organizationId === organizationId &&
        invitation.email === email &&
        !invitation.usedAt &&
        !invitation.refusedAt
      )
        invitation.refusedAt = now();
    const token = randomToken();
    const invitation: InvitationRecord = {
      id: randomUUID(),
      organizationId,
      email,
      role: input.role,
      tokenHash: tokenHash(token),
      expiresAt: expiresIn(48 * 60 * 60),
      usedAt: null,
      refusedAt: null,
    };
    state.invitations.push(invitation);
    audit(state, actor.id, "organization.invited", "invitation", invitation.id);
    const { tokenHash: _, ...safe } = invitation;
    return { invitation: safe, token };
  }

  respondInvitation(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
    rawToken: string,
    accept: boolean,
  ): void {
    const invitation = state.invitations.find(
      (candidate) =>
        candidate.organizationId === organizationId &&
        candidate.tokenHash === tokenHash(rawToken),
    );
    if (
      !invitation ||
      invitation.usedAt ||
      invitation.refusedAt ||
      invitation.expiresAt <= now() ||
      invitation.email !== actor.email
    )
      throw new BackendProblem("NOT_FOUND", 404);
    if (accept) {
      invitation.usedAt = now();
      const membership = state.memberships.find(
        (item) =>
          item.organizationId === organizationId && item.userId === actor.id,
      );
      if (membership) {
        membership.role = invitation.role;
        membership.revokedAt = null;
      } else {
        state.memberships.push({
          organizationId,
          userId: actor.id,
          role: invitation.role,
          revokedAt: null,
        });
      }
    } else invitation.refusedAt = now();
    audit(
      state,
      actor.id,
      accept
        ? "organization.invitation.accepted"
        : "organization.invitation.refused",
      "invitation",
      invitation.id,
    );
  }

  changeMember(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
  ): void {
    this.requireRole(state, actor, organizationId, ["OWNER"]);
    const membership = state.memberships.find(
      (item) =>
        item.organizationId === organizationId &&
        item.userId === userId &&
        !item.revokedAt,
    );
    if (!membership) throw new BackendProblem("NOT_FOUND", 404);
    if (membership.role === "OWNER") throw new BackendProblem("CONFLICT", 409);
    membership.role = role;
    audit(state, actor.id, "organization.member.updated", "user", userId);
  }

  removeMember(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
    userId: string,
  ): void {
    this.requireRole(state, actor, organizationId, ["OWNER", "ADMIN"]);
    const membership = state.memberships.find(
      (item) =>
        item.organizationId === organizationId &&
        item.userId === userId &&
        !item.revokedAt,
    );
    if (!membership) throw new BackendProblem("NOT_FOUND", 404);
    if (membership.role === "OWNER") throw new BackendProblem("CONFLICT", 409);
    membership.revokedAt = now();
    audit(state, actor.id, "organization.member.revoked", "user", userId);
  }

  leave(state: BackendState, actor: PublicUser, organizationId: string): void {
    const membership = this.membership(state, actor, organizationId);
    if (membership.role === "OWNER") throw new BackendProblem("CONFLICT", 409);
    membership.revokedAt = now();
    audit(
      state,
      actor.id,
      "organization.member.left",
      "organization",
      organizationId,
    );
  }

  adminUsers(
    state: BackendState,
    actor: PublicUser,
    limit: number,
    cursor: string | null,
  ) {
    this.requireSuperadmin(actor);
    return page(
      state.users.map(({ passwordHash: _, ...user }) => user),
      limit,
      cursor,
    );
  }

  adminOrganizations(
    state: BackendState,
    actor: PublicUser,
    limit: number,
    cursor: string | null,
  ) {
    this.requireSuperadmin(actor);
    return page(state.organizations, limit, cursor);
  }

  updateUserStatus(
    state: BackendState,
    actor: PublicUser,
    userId: string,
    input: {
      status?: "ACTIVE" | "SUSPENDED" | undefined;
      role?: "USER" | "ADMIN" | "SUPERADMIN" | undefined;
    },
  ): void {
    this.requireSuperadmin(actor);
    const user = state.users.find((candidate) => candidate.id === userId);
    if (!user) throw new BackendProblem("NOT_FOUND", 404);
    if (
      user.role === "SUPERADMIN" &&
      input.role !== undefined &&
      input.role !== "SUPERADMIN" &&
      state.users.filter(
        (candidate) =>
          candidate.role === "SUPERADMIN" && candidate.status === "ACTIVE",
      ).length <= 1
    )
      throw new BackendProblem("CONFLICT", 409);
    if (
      user.role === "SUPERADMIN" &&
      input.status === "SUSPENDED" &&
      state.users.filter(
        (candidate) =>
          candidate.role === "SUPERADMIN" && candidate.status === "ACTIVE",
      ).length <= 1
    )
      throw new BackendProblem("CONFLICT", 409);
    if (input.status) user.status = input.status;
    if (input.role) user.role = input.role;
    if (user.status === "SUSPENDED")
      for (const session of state.sessions)
        if (session.userId === user.id) session.revokedAt = now();
    audit(state, actor.id, "admin.user.updated", "user", user.id);
  }

  updateOrganizationStatus(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
    status: "ACTIVE" | "SUSPENDED",
  ): void {
    this.requireSuperadmin(actor);
    const organization = state.organizations.find(
      (candidate) => candidate.id === organizationId,
    );
    if (!organization) throw new BackendProblem("NOT_FOUND", 404);
    organization.status = status;
    audit(
      state,
      actor.id,
      "admin.organization.updated",
      "organization",
      organizationId,
    );
  }

  requireSuperadmin(actor: PublicUser): void {
    if (actor.role !== "SUPERADMIN") throw new BackendProblem("FORBIDDEN", 403);
  }

  private membership(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
  ): MembershipRecord {
    const membership = state.memberships.find(
      (item) =>
        item.organizationId === organizationId &&
        item.userId === actor.id &&
        !item.revokedAt,
    );
    if (!membership) throw new BackendProblem("NOT_FOUND", 404);
    return membership;
  }

  private requireRole(
    state: BackendState,
    actor: PublicUser,
    organizationId: string,
    roles: MembershipRecord["role"][],
  ): MembershipRecord {
    const membership = this.membership(state, actor, organizationId);
    if (!roles.includes(membership.role))
      throw new BackendProblem("FORBIDDEN", 403);
    return membership;
  }
}
