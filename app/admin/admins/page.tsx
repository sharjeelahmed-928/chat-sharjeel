"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface AdminUserRow {
  id: string;
  email: string;
  role: "super_admin" | "admin";
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/admins")
      .then((r) => r.json())
      .then(setAdmins);
  }

  useEffect(load, []);

  async function handleCreate() {
    setError(null);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create admin.");
      return;
    }
    setAdmins((prev) => [...prev, data]);
    setCreating(false);
    setEmail("");
    setPassword("");
    setRole("admin");
  }

  async function toggleActive(admin: AdminUserRow) {
    const res = await fetch(`/api/admin/admins/${admin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !admin.is_active }),
    });
    if (res.ok) {
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, is_active: !a.is_active } : a)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Admins</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who has access to this admin panel. Super admin only.
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New admin
        </Button>
      </div>

      {creating && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "super_admin")}
                className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
          <Button className="mt-4" onClick={handleCreate}>
            Create admin
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Last login</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {admins.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2.5">{a.email}</td>
                <td className="px-4 py-2.5 capitalize">{a.role.replace("_", " ")}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      a.is_active ? "bg-accent/15 text-accent" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {a.is_active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {a.last_login_at ? new Date(a.last_login_at).toLocaleString() : "Never"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(a)}>
                    {a.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
