"use client";

import { useActionState } from "react";
import { PageHeader, Field } from "@/components/ui";
import { createUser, type CreateUserState } from "./actions";

type UserHistory = {
  id: string | number;
  username: string | null;
  role: string;
  created_at: string;
  created_by_username: string | null;
};

const initialState: CreateUserState = {};

export function UsersClient({ history }: { history: UserHistory[] }) {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Create warehouse accounts and assign their access level."
      />

      <div className="users-management-grid">
        <div className="card user-form-card">
        <div className="user-form-heading">
          <h2>Create User</h2>
          <p>The user will sign in with this username and password.</p>
        </div>
        <form action={formAction} className="user-form">
          <Field label="Username">
            <input
              name="username"
              className="input"
              placeholder="e.g. warehouse_staff"
              autoComplete="username"
              required
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
            />
          </Field>
          <Field label="Temporary Password">
            <input
              name="password"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </Field>
          <Field label="Role">
            <select name="role" className="input" defaultValue="staff">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </Field>

          {state.error && <div className="login-error">{state.error}</div>}
          {state.success && <div className="user-success">{state.success}</div>}

          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Creating User..." : "Create User"}
          </button>
        </form>
        </div>
        <div className="card user-history-card">
          <div className="user-form-heading">
            <h2>User History</h2>
            <p>Accounts and who created them.</p>
          </div>
          <div className="table-scroll">
            <table className="data-table user-history-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Created</th><th>By</th></tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={4} className="text-muted">No users yet.</td></tr>
                ) : history.map((user) => (
                  <tr key={user.id}>
                    <td className="strong">{user.username || "—"}</td>
                    <td><span className={`badge ${user.role === "admin" ? "active" : "inactive"}`}>{user.role}</span></td>
                    <td className="text-muted">{new Date(user.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="text-muted">{user.created_by_username || "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
