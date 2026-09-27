type OperatorRecord = {
  id: string;
  status: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; email: string; emailVerifiedAt: Date | null };
};

/** Explicit banking-data-free projection for entity and platform administrators. */
export function toOperatorSummary(operator: OperatorRecord) {
  return {
    id: operator.id,
    user: {
      id: operator.user.id,
      name: operator.user.name,
      email: operator.user.email,
      emailVerifiedAt: operator.user.emailVerifiedAt,
    },
    status: operator.status,
    permissions: operator.permissions,
    createdAt: operator.createdAt,
    updatedAt: operator.updatedAt,
  };
}
