"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { usersApi, User } from "@/lib/api";

const ROLES: ("USER" | "SYSTEM_ADMIN")[] = ["USER", "SYSTEM_ADMIN"];
const THEMES: ("LIGHT" | "DARK")[] = ["LIGHT", "DARK"];

const PAGE_LIMIT = 10;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updatingUser, setUpdatingUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    mobile_no: "",
    password: "",
    role: "USER" as "USER" | "SYSTEM_ADMIN",
    theme: "LIGHT" as "LIGHT" | "DARK",
  });

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const fetchUsers = async (pageNumber: number) => {
    try {
      setLoading(true);

      const res = await usersApi.getUsers(pageNumber, PAGE_LIMIT);

      const data = res.data?.data || [];
      const meta = res.data?.meta;

      setUsers(data);
      setTotalPages(meta?.totalPages || 1);

      if (data.length && !selectedUser) {
        setSelectedUser(data[0]);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !createForm.name ||
      !createForm.email ||
      !createForm.mobile_no ||
      !createForm.password
    ) {
      setError("Name, email , mobile number and password are required.");
      return;
    }

    try {
      const res = await usersApi.createUser(createForm);
      const created: User = res.data?.data;

      // Refresh current page from API
      fetchUsers(page);

      setShowCreateModal(false);

      // Reset form
      setCreateForm({
        name: "",
        email: "",
        mobile_no: "",
        password: "",
        role: "USER",
        theme: "LIGHT",
      });

      toast.success("User created successfully");
    } catch (err: any) {
      setError(err.message ?? "Failed to create user");
      toast.error(err.message ?? "Failed to create user");
    }
  };

  const toggleUserBlocked = async (user: User) => {
    try {
      const res = await usersApi.toggleUserBlocked(user.id, !user.is_blocked);
      console.log(">>>>>. the value of the RES is : ", res);

      const updated: User = res.data?.data;
      console.log(">>>>> the value of the UPDATED is : ", updated);

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

      if (selectedUser?.id === updated.id) {
        setSelectedUser(updated);
      }

      toast.success(
        updated.is_blocked
          ? "User blocked successfully"
          : "User unblocked successfully",
      );
    } catch (err: any) {
      setError(err.message ?? "Failed to update status");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingUser) return;

    try {
      const res = await usersApi.updateUser(updatingUser.id, {
        name: updatingUser.name,
        mobile_no: updatingUser.mobile_no,
        role: updatingUser.role,
        theme: updatingUser.theme,
      });

      const updated: User = res.data?.data;

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

      setUpdatingUser(null);
      setError(null);
      toast.success("User updated successfully");
    } catch (err: any) {
      setError(err.message ?? "Failed to update user");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Manage System Users</h2>
        <Button onClick={() => setShowCreateModal(true)}>Add User</Button>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant={user.is_blocked ? "destructive" : "default"}
                        onClick={() => toggleUserBlocked(user)}
                      >
                        {user.is_blocked ? "Blocked" : "Active"}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUpdatingUser(user)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <Button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
            >
              Previous
            </Button>

            <span className="text-sm">
              Page {page} of {totalPages}
            </span>

            <Button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {updatingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit User</h3>

            <form onSubmit={handleUpdateUser} className="space-y-3">
              <input
                className="w-full border px-2 py-1 rounded"
                value={updatingUser.name}
                onChange={(e) =>
                  setUpdatingUser({
                    ...updatingUser,
                    name: e.target.value,
                  })
                }
              />

              <input
                className="w-full border px-2 py-1 rounded"
                value={updatingUser.mobile_no || ""}
                onChange={(e) =>
                  setUpdatingUser({
                    ...updatingUser,
                    mobile_no: e.target.value,
                  })
                }
              />

              <select
                className="w-full border px-2 py-1 rounded"
                value={updatingUser.role}
                onChange={(e) =>
                  setUpdatingUser({
                    ...updatingUser,
                    role: e.target.value as any,
                  })
                }
              >
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>

              <select
                className="w-full border px-2 py-1 rounded"
                value={updatingUser.theme}
                onChange={(e) =>
                  setUpdatingUser({
                    ...updatingUser,
                    theme: e.target.value as any,
                  })
                }
              >
                {THEMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUpdatingUser(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <input
                placeholder="Full Name *"
                className="w-full border px-2 py-2 rounded"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
              />

              <input
                placeholder="Email *"
                type="email"
                className="w-full border px-2 py-2 rounded"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
              />

              <input
                placeholder="Mobile Number"
                className="w-full border px-2 py-2 rounded"
                value={createForm.mobile_no}
                onChange={(e) =>
                  setCreateForm({ ...createForm, mobile_no: e.target.value })
                }
              />

              <input
                type="password"
                placeholder="Password *"
                className="w-full border px-2 py-2 rounded"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
              />

              <select
                className="w-full border px-2 py-2 rounded"
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    role: e.target.value as any,
                  })
                }
              >
                <option value="USER">User</option>
                <option value="SYSTEM_ADMIN">System Admin</option>
              </select>

              <select
                className="w-full border px-2 py-2 rounded"
                value={createForm.theme}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    theme: e.target.value as any,
                  })
                }
              >
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
              </select>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>

                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
