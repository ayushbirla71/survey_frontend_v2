"use client";

import { Button } from "@/components/ui/button";
import {
  Vendor,
  VendorApiConfig,
  VendorAuthType,
  VendorKey,
  vendorsApi,
} from "@/lib/api";
import { useEffect, useState } from "react";
// app/admin/vendors/types.ts (optional)

const VENDOR_KEYS: VendorKey[] = ["INNOVATEMR"];

const AUTH_TYPES: VendorAuthType[] = ["API_KEY", "BASIC", "OAUTH2", "CUSTOM"];

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createVendorForm, setCreateVendorForm] = useState<{
    key: VendorKey | "";
    name: string;
  }>({ key: "", name: "" });
  const [createConfigForm, setCreateConfigForm] = useState<{
    api_version: string;
    base_url: string;
    auth_type: VendorAuthType | "";
    token: string; // simple credentials example
    is_default: boolean;
  }>({
    api_version: "",
    base_url: "",
    auth_type: "",
    token: "",
    is_default: true,
  });
  const [updatingVendor, setUpdatingVendor] = useState<{
    id: string;
    name: string;
    is_active: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchingQuestions, setFetchingQuestions] = useState<
    Record<string, boolean>
  >({});

  // Load vendors on mount
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await vendorsApi.getVendors();
      console.log(">>>>> the value of the RES is : ", res);
      const data = res.data?.data || [];
      console.log(">>>>> the value of the DATA is : ", data);
      setVendors(data);
      if (data.length && !selectedVendor) setSelectedVendor(data[0]);
    } catch (err: any) {
      setError(err.message ?? "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setError(null);
    setCreateVendorForm({ key: "", name: "" });
    setCreateConfigForm({
      api_version: "",
      base_url: "",
      auth_type: "",
      token: "",
      is_default: true,
    });
    setShowCreateModal(true);
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!createVendorForm.key || !createVendorForm.name) {
      setError("Vendor key and name are required.");
      return;
    }
    if (
      !createConfigForm.api_version ||
      !createConfigForm.base_url ||
      !createConfigForm.auth_type ||
      !createConfigForm.token
    ) {
      setError("API Config is required (version, base URL, auth type, token).");
      return;
    }

    try {
      const res = await vendorsApi.createVendor({
        key: createVendorForm.key,
        name: createVendorForm.name,
        apiConfig: {
          api_version: createConfigForm.api_version,
          base_url: createConfigForm.base_url,
          auth_type: createConfigForm.auth_type,
          credentials: { token: createConfigForm.token },
          is_default: createConfigForm.is_default,
        },
      });

      const created: Vendor = res.data?.data || (res as any).data;
      setVendors((prev) => [...prev, created]);
      setSelectedVendor(created);
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to create vendor");
    }
  };

  const startEditVendor = (vendor: Vendor) => {
    setUpdatingVendor({
      id: vendor.id,
      name: vendor.name,
      is_active: vendor.is_active,
    });
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingVendor) return;
    setError(null);

    try {
      const res = await vendorsApi.updateVendor(updatingVendor.id, {
        name: updatingVendor.name,
        is_active: updatingVendor.is_active,
      });

      const updated: Vendor = res.data?.data || (res as any).data;

      setVendors((prev) =>
        prev.map((v) => (v.id === updated.id ? updated : v))
      );
      if (selectedVendor?.id === updated.id) {
        setSelectedVendor(updated);
      }
      setUpdatingVendor(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to update vendor");
    }
  };

  const toggleVendorActive = async (vendor: Vendor) => {
    setError(null);
    try {
      console.log(">>>>> the value of the VENDOR ID is : ", vendor.id);
      const res = await vendorsApi.toggleVendorActive(
        vendor.id,
        !vendor.is_active
      );

      const updated: Vendor = res.data?.data || (res as any).data;
      console.log(">>>>> the value of the UPDATED is : ", updated);
      setVendors((prev) =>
        prev.map((v) => (v.id === updated.id ? updated : v))
      );
      if (selectedVendor?.id === updated.id) {
        setSelectedVendor(updated);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to toggle vendor");
    }
  };

  const handleFetchQuestionsLibrary = async (vendor: any) => {
    try {
      setError(null);
      setFetchingQuestions((prev) => ({ ...prev, [vendor.id]: true }));

      console.log(">>>>> the value of VENDOR is : ", vendor);
      const res = await vendorsApi.getVendorQuestions(vendor.id, {
        countryCode: "IN",
        language: "ENGLISH",
      });
      console.log(">>>>> the value of the VENDOR QUESTIONS is : ", res);
      fetchVendors();
    } catch (err: any) {
      setError(err.message ?? "Failed to fetch questions");
    } finally {
      setFetchingQuestions((prev) => ({ ...prev, [vendor.id]: false }));
    }
  };

  const currentVendorConfigs: VendorApiConfig[] =
    selectedVendor?.api_configs ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Manage Vendors</h2>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          Create Vendor
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading vendors...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendors list */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Active
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Questions Library
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className={`border-t hover:bg-gray-50 cursor-pointer ${
                      selectedVendor?.id === vendor.id ? "bg-gray-50" : ""
                    }`}
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    <td className="px-4 py-3">{vendor.name}</td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {vendor.key}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVendorActive(vendor);
                        }}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          vendor.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        <span
                          className={`mr-1 h-2 w-2 rounded-full ${
                            vendor.is_active ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        {vendor.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditVendor(vendor);
                        }}
                        className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                      >
                        Edit
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {vendor.question_library?.length !== 0 ? (
                        <p className="text-green-600 text-xs font-medium">
                          Already Fetched
                        </p>
                      ) : (
                        <Button
                          type="button"
                          disabled={!!fetchingQuestions[vendor.id]}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFetchQuestionsLibrary(vendor);
                          }}
                        >
                          {fetchingQuestions[vendor.id]
                            ? "Fetching..."
                            : "Fetch"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-4 text-center text-gray-500"
                      colSpan={4}
                    >
                      No vendors yet. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Right side: details + edit form */}
          <div className="space-y-4">
            {/* Selected vendor details + api-configs */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="text-lg font-semibold mb-2">
                Vendor Details & API Configs
              </h3>
              {!selectedVendor ? (
                <p className="text-sm text-gray-500">
                  Select a vendor to view details.
                </p>
              ) : (
                <>
                  <div className="mb-3 text-sm">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedVendor.name}
                    </p>
                    <p>
                      <span className="font-medium">Key:</span>{" "}
                      {selectedVendor.key}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      {selectedVendor.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>

                  <h4 className="text-sm font-semibold mb-1">
                    API Configurations
                  </h4>
                  {currentVendorConfigs.length === 0 ? (
                    <p className="text-xs text-red-600">
                      No API config set. Please configure API details while
                      creating the vendor.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {currentVendorConfigs.map((cfg) => (
                        <li
                          key={cfg.id}
                          className="rounded border border-gray-200 p-2"
                        >
                          <p>
                            <span className="font-medium">Version:</span>{" "}
                            {cfg.api_version}
                          </p>
                          <p>
                            <span className="font-medium">Base URL:</span>{" "}
                            {cfg.base_url}
                          </p>
                          <p>
                            <span className="font-medium">Auth:</span>{" "}
                            {cfg.auth_type}
                          </p>
                          <p>
                            <span className="font-medium">Default:</span>{" "}
                            {cfg.is_default ? "Yes" : "No"}
                          </p>
                          <p>
                            <span className="font-medium">Active:</span>{" "}
                            {cfg.is_active ? "Yes" : "No"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {/* Edit vendor (name + is_active) */}
            {updatingVendor && (
              <form
                onSubmit={handleUpdateVendor}
                className="bg-white rounded-xl shadow-md p-4"
              >
                <h3 className="text-sm font-semibold mb-3">
                  Edit Vendor (name & active)
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="block mb-1 font-medium">Name</label>
                    <input
                      type="text"
                      value={updatingVendor.name}
                      onChange={(e) =>
                        setUpdatingVendor((prev) =>
                          prev ? { ...prev, name: e.target.value } : prev
                        )
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="edit-active"
                      type="checkbox"
                      checked={updatingVendor.is_active}
                      onChange={(e) =>
                        setUpdatingVendor((prev) =>
                          prev ? { ...prev, is_active: e.target.checked } : prev
                        )
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="edit-active">Active</label>
                  </div>
                </div>
                <div className="mt-3 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setUpdatingVendor(null)}
                    className="px-3 py-1 text-xs rounded border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs rounded bg-blue-600 text-white"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create vendor + api-config modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Create Vendor & API Config
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateVendor} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vendor fields */}
                <div>
                  <label className="block mb-1 font-medium">Vendor Key</label>
                  <select
                    value={createVendorForm.key}
                    onChange={(e) =>
                      setCreateVendorForm((prev) => ({
                        ...prev,
                        key: e.target.value as VendorKey,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  >
                    <option value="">Select key</option>
                    {VENDOR_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Vendor Name</label>
                  <input
                    type="text"
                    value={createVendorForm.name}
                    onChange={(e) =>
                      setCreateVendorForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                    placeholder="Vendor name"
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-medium mb-2 text-sm">
                  API Configuration (required)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">API Version</label>
                    <input
                      type="text"
                      value={createConfigForm.api_version}
                      onChange={(e) =>
                        setCreateConfigForm((prev) => ({
                          ...prev,
                          api_version: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1"
                      placeholder="v1, v2, 2024-01"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Base URL</label>
                    <input
                      type="text"
                      value={createConfigForm.base_url}
                      onChange={(e) =>
                        setCreateConfigForm((prev) => ({
                          ...prev,
                          base_url: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1"
                      placeholder="https://api.vendor.com"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Auth Type</label>
                    <select
                      value={createConfigForm.auth_type}
                      onChange={(e) =>
                        setCreateConfigForm((prev) => ({
                          ...prev,
                          auth_type: e.target.value as VendorAuthType,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    >
                      <option value="">Select auth type</option>
                      {AUTH_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">Token (credentials)</label>
                    <input
                      type="text"
                      value={createConfigForm.token}
                      onChange={(e) =>
                        setCreateConfigForm((prev) => ({
                          ...prev,
                          token: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1"
                      placeholder="xyz"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="is_default"
                      type="checkbox"
                      checked={createConfigForm.is_default}
                      onChange={(e) =>
                        setCreateConfigForm((prev) => ({
                          ...prev,
                          is_default: e.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="is_default">Set as default config</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1 text-xs rounded border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 text-xs rounded bg-blue-600 text-white"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
