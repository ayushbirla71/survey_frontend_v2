// export default function AdminDashboard() {
//   return (
//     <div>
//       <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-white p-6 rounded-xl shadow-md">
//           <h3 className="text-xl font-semibold mb-2">Total Vendors</h3>
//           <p className="text-3xl font-bold text-blue-600">24</p>
//         </div>
//         {/* Add more dashboard cards */}
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { usersApi } from "@/lib/api";
import { Eye } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SYSTEM_ADMIN";
};

type Survey = {
  id: string;
  title: string;
  description: string;
  no_of_questions: number;
  userId: string;
  survey_send_by: string;
  flow_type: string;
  settings: {
    isResultPublic: boolean;
    autoReloadOnSubmit: boolean;
    requireTermsAndConditions: boolean;
  };
  status: string;
  scheduled_date: string | null;
  scheduled_type: string;
  is_deleted: boolean;
  surveyCategoryId: string;
  autoGenerateQuestions: boolean;
  created_at: string;
  updated_at: string;

  user: {
    id: string;
    name: string;
    email: string;
    role: "USER" | "SYSTEM_ADMIN";
  };

  surveyCategory: {
    id: string;
    name: string;
  };

  _count: {
    questions: number;
    responses: number;
  };
};

const PAGE_LIMIT = 10;

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [surveys, setSurveys] = useState<Survey[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  useEffect(() => {
    fetchUsers(1);
  }, []);

  const fetchUsers = async (pageNumber: number) => {
    try {
      setLoading(true);

      const res = await usersApi.getUsers(pageNumber, PAGE_LIMIT);

      const data = res.data?.data || [];

      setUsers(data);

      if (data.length > 0) {
        setSelectedUser(data[0]);

        fetchSurvey(data[0].id);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchSurvey = async (userId: string) => {
    try {
      setLoading(true);

      const res = await usersApi.getUserSurvey(userId);

      const data = res.data?.data || [];

      setSurveys(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load surveys");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h2>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-2">Total Users</h3>

          <p className="text-3xl font-bold text-blue-600">{users.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-2">Total Surveys</h3>

          <p className="text-3xl font-bold text-green-600">{surveys.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-2">Total Responses</h3>

          <p className="text-3xl font-bold text-purple-600">
            {surveys.reduce(
              (total, survey) => total + survey._count.responses,
              0,
            )}
          </p>
        </div>
      </div>

      {/* User Dropdown */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Select User</h3>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <select
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedUser?.id || ""}
            onChange={(e) => {
              const user = users.find((u) => u.id === e.target.value);

              if (user) {
                setSelectedUser(user);

                fetchSurvey(user.id);
              }
            }}
          >
            {users.map((user: User) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user?.role})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Selected User */}
      {selectedUser && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-gray-800">
              {selectedUser.name}
            </h3>

            <p className="text-gray-500">{selectedUser.email}</p>
          </div>

          {/* Survey Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Title</th>

                  <th className="border p-3 text-left">Description</th>

                  <th className="border p-3 text-left">Category</th>

                  <th className="border p-3 text-left">Status</th>

                  {/* <th className="border p-3 text-left">Flow Type</th> */}

                  <th className="border p-3 text-left">Send By</th>

                  <th className="border p-3 text-left">Questions</th>

                  <th className="border p-3 text-left">Responses</th>

                  {/* <th className="border p-3 text-left">Scheduled Type</th> */}

                  {/* <th className="border p-3 text-left">Auto Generate</th>

                  <th className="border p-3 text-left">Public Result</th>

                  <th className="border p-3 text-left">Auto Reload</th>

                  <th className="border p-3 text-left">Terms Required</th> */}

                  {/* <th className="border p-3 text-left">Created At</th>

                  <th className="border p-3 text-left">Last Updated</th> */}
                  <th className="border p-3 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {surveys.length > 0 ? (
                  surveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-gray-50">
                      <td className="border p-3">{survey.title}</td>

                      {/* <td className="border p-3">{survey.description}</td> */}
                      <td className="border p-3">
                        <div className="line-clamp-4">{survey.description}</div>
                      </td>

                      <td className="border p-3">
                        {survey.surveyCategory?.name}
                      </td>

                      <td className="border p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            survey.status === "PUBLISHED"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {survey.status}
                        </span>
                      </td>

                      {/* <td className="border p-3">{survey.flow_type}</td> */}

                      <td className="border p-3">
                        {survey.survey_send_by === "NONE"
                          ? "Public"
                          : survey.survey_send_by === "BOTH"
                            ? "Whatsapp & Email"
                            : survey.survey_send_by === "WHATSAPP"
                              ? "Whatsapp"
                              : survey.survey_send_by === "EMAIL"
                                ? "Email"
                                : survey.survey_send_by === "AGENT"
                                  ? "Agent"
                                  : survey.survey_send_by === "VENDOR"
                                    ? "Vendor"
                                    : survey.survey_send_by}
                      </td>

                      <td className="border p-3">{survey._count.questions}</td>

                      <td className="border p-3">{survey._count.responses}</td>

                      {/* <td className="border p-3">{survey.scheduled_type}</td> */}

                      {/* <td className="border p-3">
                        {survey.autoGenerateQuestions ? "Yes" : "No"}
                      </td>

                      <td className="border p-3">
                        {survey.settings.isResultPublic ? "Yes" : "No"}
                      </td>

                      <td className="border p-3">
                        {survey.settings.autoReloadOnSubmit ? "Yes" : "No"}
                      </td>

                      <td className="border p-3">
                        {survey.settings.requireTermsAndConditions
                          ? "Yes"
                          : "No"}
                      </td> */}

                      {/* <td className="border p-3">
                        {new Date(survey.created_at).toLocaleString()}
                      </td>

                      <td className="border p-3">
                        {new Date(survey.updated_at).toLocaleString()}
                      </td> */}
                      <td className="border p-3">
                        <button
                          onClick={() => setSelectedSurvey(survey)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={15} className="text-center p-6 text-gray-500">
                      No surveys found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Survey Details */}

      {selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-200">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b px-8 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Survey Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Complete survey information overview
                </p>
              </div>

              <button
                onClick={() => setSelectedSurvey(null)}
                className="h-10 w-10 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 transition flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[calc(92vh-90px)] p-8">
              {/* Top Card */}
              {/* Top Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-8 shadow-sm">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                  {/* Left */}
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-gray-900">
                      {selectedSurvey.title}
                    </h3>

                    {/* Description */}
                    <div className="mt-5">
                      <p className="text-sm font-semibold text-gray-500 mb-2">
                        Description
                      </p>

                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-gray-700 leading-7 whitespace-pre-line">
                          {selectedSurvey.description ||
                            "No description available"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Status Section */}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Status Card */}
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
                  <p className="text-sm text-green-600 font-medium">
                    Survey Status
                  </p>

                  <h4 className="mt-2 text-xl font-bold text-green-700">
                    {selectedSurvey.status}
                  </h4>
                </div>

                {/* Flow Type Card */}
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
                  <p className="text-sm text-purple-600 font-medium">
                    Flow Type
                  </p>

                  <h4 className="mt-2 text-xl font-bold text-purple-700">
                    {selectedSurvey.flow_type}
                  </h4>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="mt-2 text-lg font-semibold text-gray-800">
                    {selectedSurvey.surveyCategory?.name || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                  <p className="text-sm text-gray-500">Send By</p>
                  <p className="mt-2 text-lg font-semibold text-gray-800">
                    {selectedSurvey.survey_send_by === "NONE"
                      ? "Public"
                      : selectedSurvey.survey_send_by === "BOTH"
                        ? "Whatsapp & Email"
                        : selectedSurvey.survey_send_by === "WHATSAPP"
                          ? "Whatsapp"
                          : selectedSurvey.survey_send_by === "EMAIL"
                            ? "Email"
                            : selectedSurvey.survey_send_by === "AGENT"
                              ? "Agent"
                              : selectedSurvey.survey_send_by === "VENDOR"
                                ? "Vendor"
                                : selectedSurvey.survey_send_by}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                  <p className="text-sm text-gray-500">Scheduled Type</p>
                  <p className="mt-2 text-lg font-semibold text-gray-800">
                    {selectedSurvey.scheduled_type}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                  <p className="text-sm text-gray-500">Total Questions</p>
                  <p className="mt-2 text-3xl font-bold text-indigo-600">
                    {selectedSurvey._count.questions}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                  <p className="text-sm text-gray-500">Total Responses</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">
                    {selectedSurvey._count.responses}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="mt-2 text-lg font-semibold text-gray-800">
                    {selectedSurvey.user.name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedSurvey.user.email}
                  </p>
                </div>
              </div>

              {/* Settings */}
              <div className="mt-10">
                <h3 className="text-xl font-bold text-gray-800 mb-5">
                  Survey Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {[
                    {
                      label: "Auto Generate Questions",
                      value: selectedSurvey.autoGenerateQuestions,
                    },
                    {
                      label: "Public Result",
                      value: selectedSurvey.settings.isResultPublic,
                    },
                    {
                      label: "Auto Reload On Submit",
                      value: selectedSurvey.settings.autoReloadOnSubmit,
                    },
                    {
                      label: "Terms Required",
                      value: selectedSurvey.settings.requireTermsAndConditions,
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-gray-200 p-5 bg-gray-50"
                    >
                      <p className="text-sm text-gray-500">{item.label}</p>

                      <div
                        className={`mt-3 inline-flex px-4 py-1 rounded-full text-sm font-semibold ${
                          item.value
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.value ? "Enabled" : "Disabled"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <p className="text-sm text-gray-500">Created At</p>
                  <p className="mt-2 font-semibold text-gray-800">
                    {new Date(selectedSurvey.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <p className="text-sm text-gray-500">Updated At</p>
                  <p className="mt-2 font-semibold text-gray-800">
                    {new Date(selectedSurvey.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
