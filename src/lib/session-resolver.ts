import { Role } from "@prisma/client";

export type SessionRecord = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
} | null;

export type SessionIdentity = {
  userId: string;
};

export type ResolvedSessionUser = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
};

export function resolveSessionUser(
  identity: SessionIdentity,
  currentUser: SessionRecord,
): ResolvedSessionUser | null {
  if (!currentUser || currentUser.id !== identity.userId) {
    return null;
  }

  return {
    userId: currentUser.id,
    email: currentUser.email,
    displayName: currentUser.displayName,
    role: currentUser.role,
  };
}
