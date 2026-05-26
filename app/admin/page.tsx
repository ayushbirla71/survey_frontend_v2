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

                  <th className="border p-3 text-left">Created At</th>

                  <th className="border p-3 text-left">Last Updated</th>
                  <th className="border p-3 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {surveys.length > 0 ? (
                  surveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-gray-50">
                      <td className="border p-3">{survey.title}</td>

                      <td className="border p-3">{survey.description}</td>

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

                      <td className="border p-3">
                        {new Date(survey.created_at).toLocaleString()}
                      </td>

                      <td className="border p-3">
                        {new Date(survey.updated_at).toLocaleString()}
                      </td>
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
      {/* Survey Details Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Survey Details
              </h3>

              <button
                onClick={() => setSelectedSurvey(null)}
                className="text-gray-500 hover:text-red-500 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Survey Title</p>
                  <p className="font-semibold">{selectedSurvey.title}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-semibold">
                    {selectedSurvey.surveyCategory?.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-semibold">{selectedSurvey.description}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-semibold">{selectedSurvey.status}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Flow Type</p>
                  <p className="font-semibold">{selectedSurvey.flow_type}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Send By</p>
                  <p className="font-semibold">
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

                <div>
                  <p className="text-sm text-gray-500">Total Questions</p>
                  <p className="font-semibold">
                    {selectedSurvey._count.questions}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Total Responses</p>
                  <p className="font-semibold">
                    {selectedSurvey._count.responses}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Auto Generate Questions
                  </p>
                  <p className="font-semibold">
                    {selectedSurvey.autoGenerateQuestions ? "Yes" : "No"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Public Result</p>
                  <p className="font-semibold">
                    {selectedSurvey.settings.isResultPublic ? "Yes" : "No"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Auto Reload On Submit</p>
                  <p className="font-semibold">
                    {selectedSurvey.settings.autoReloadOnSubmit ? "Yes" : "No"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Terms Required</p>
                  <p className="font-semibold">
                    {selectedSurvey.settings.requireTermsAndConditions
                      ? "Yes"
                      : "No"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Scheduled Type</p>
                  <p className="font-semibold">
                    {selectedSurvey.scheduled_type}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Created At</p>
                  <p className="font-semibold">
                    {new Date(selectedSurvey.created_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Updated At</p>
                  <p className="font-semibold">
                    {new Date(selectedSurvey.updated_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="font-semibold">
                    {selectedSurvey.user.name} ({selectedSurvey.user.email})
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
