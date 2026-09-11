"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { PageHeader, Field, Pagination, SearchBar, Modal } from "@/components/ui";
import { Eye, EyeOff, Pencil, Trash2 } from "@/components/icons";
import { createUser, type CreateUserState } from "./actions";
import { usePagedList } from "@/hooks/usePagedList";
import { createClient } from "@/lib/supabase/client";

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
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [editingUser, setEditingUser] = useState<UserHistory | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("staff");
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordVisible, setEditPasswordVisible] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserHistory | null>(null);
  const [actionError, setActionError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const passwordStrength = password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
    ? "high"
    : password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)
      ? "medium"
      : "low";
  const { query, setQuery, page, setPage, totalPages, paged, totalCount, pageSize } = usePagedList(
    history,
    (user, search) =>
      (user.username || "").toLowerCase().includes(search) ||
      user.role.toLowerCase().includes(search) ||
      (user.created_by_username || "").toLowerCase().includes(search)
  );

  const openEdit = (user: UserHistory) => {
    setEditingUser(user);
    setEditUsername(user.username || "");
    setEditRole(user.role);
    setEditPassword("");
  };

  const saveEdit = async () => {
    if (!editingUser || !editUsername.trim()) return;
    setEditSaving(true);
    const { error } = await supabase.rpc("update_profile_user", {
      p_id: Number(editingUser.id),
      p_username: editUsername.trim().toLowerCase(),
      p_role: editRole,
      p_password: editPassword || null,
    });
    setEditSaving(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setEditingUser(null);
    router.refresh();
  };

  const removeUser = (user: UserHistory) => setDeleteUser(user);

  const confirmDelete = async () => {
    if (!deleteUser) return;
    const { error } = await supabase.rpc("delete_profile_user", { p_id: Number(deleteUser.id) });
    if (error) {
      setDeleteUser(null);
      setActionError(error.message);
      return;
    }
    setDeleteUser(null);
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Create warehouse accounts and assign their access level."
      />

      <div className="tab-row bordered user-management-tabs" role="tablist" aria-label="User management views">
        <button type="button" role="tab" aria-selected={activeTab === "create"} className={`tab ${activeTab === "create" ? "active" : ""}`} onClick={() => setActiveTab("create")}>
          Create User
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "history"} className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          User History
        </button>
      </div>

      {activeTab === "create" ? (
        <div className="card user-form-card">
        <div className="user-form-heading">
          <h2>Create User</h2>
          <p>The user will sign in with this username and password.</p>
        </div>
        <form action={formAction} className="user-form" autoComplete="off">
          <Field label="Username">
            <input
              name="username"
              className="input"
              placeholder="e.g. warehouse_staff"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
            />
          </Field>
          <Field label="Password">
            <div className="password-input-wrap">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                className="input password-input"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle icon-btn"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <div className={`password-strength ${passwordStrength}`}>
              <span className="password-strength-bar" />
              <span className="password-strength-label">{password ? `${passwordStrength[0].toUpperCase()}${passwordStrength.slice(1)} password` : "Use 8+ characters with numbers"}</span>
            </div>
          </Field>
          <Field label="Role">
            <select name="role" className="input" defaultValue="staff">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </Field>

          {state.error && <div className="login-error">{state.error}</div>}
          {state.success && <div className="user-success">{state.success}</div>}

          <button type="submit" className="btn-primary" disabled={pending || passwordStrength === "low"}>
            {pending ? "Creating User..." : "Create User"}
          </button>
        </form>
        </div>
      ) : (
        <div className="card user-history-card">
          <div className="user-form-heading">
            <h2>User History</h2>
            <p>Accounts and who created them.</p>
          </div>
          <div className="list-toolbar">
            <SearchBar value={query} onChange={setQuery} placeholder="Search user, role or creator" />
          </div>
          <div className="table-scroll">
            <table className="data-table user-history-table">
              <thead>
                <tr><th>Sr</th><th>User</th><th>Role</th><th>Created</th><th>By</th><th></th></tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={6} className="text-muted">No users yet.</td></tr>
                ) : paged.map((user, index) => (
                  <tr key={user.id}>
                    <td className="text-muted">{(page - 1) * pageSize + index + 1}</td>
                    <td className="strong">{user.username || "—"}</td>
                    <td><span className={`badge ${user.role === "admin" ? "active" : "inactive"}`}>{user.role}</span></td>
                    <td className="text-muted">{new Date(user.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="text-muted">{user.created_by_username || "System"}</td>
                    <td className="user-history-actions">
                      <button type="button" className="icon-btn" title="Edit user" onClick={() => openEdit(user)}><Pencil size={14} /></button>
                      <button type="button" className="icon-btn" title="Delete user" onClick={() => removeUser(user)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
        </div>
      )}

      {editingUser && (
        <Modal title="Edit User" onClose={() => setEditingUser(null)}>
          <div className="user-form">
            <Field label="Username">
              <input className="input" value={editUsername} onChange={(event) => setEditUsername(event.target.value)} autoComplete="off" />
            </Field>
            <Field label="Role">
              <select className="input" value={editRole} onChange={(event) => setEditRole(event.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="New Password (optional)">
              <div className="password-input-wrap">
                <input className="input password-input" type={editPasswordVisible ? "text" : "password"} value={editPassword} onChange={(event) => setEditPassword(event.target.value)} autoComplete="off" minLength={6} />
                <button type="button" className="password-toggle icon-btn" onClick={() => setEditPasswordVisible((visible) => !visible)} aria-label={editPasswordVisible ? "Hide password" : "Show password"}>
                  {editPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              <button type="button" className="btn-primary" disabled={editSaving || editUsername.trim().length < 3} onClick={saveEdit}>{editSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </Modal>
      )}
      {deleteUser && (
        <Modal title="Confirm Delete" onClose={() => setDeleteUser(null)}>
          <p style={{ margin: "0 0 20px", color: "var(--text-dim)", fontSize: 13 }}>
            Delete user <strong>{deleteUser.username || "this user"}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => setDeleteUser(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={confirmDelete}>Delete User</button>
          </div>
        </Modal>
      )}
      {actionError && (
        <Modal title="Action Failed" onClose={() => setActionError("")}>
          <p style={{ margin: "0 0 20px", color: "var(--text-dim)", fontSize: 13 }}>{actionError}</p>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="btn-primary" onClick={() => setActionError("")}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
