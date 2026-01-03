"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
        </div>
        <nav className="p-4">
          <ul>
            <li>
              <Link
                href="/admin"
                className={`block py-2 px-4 rounded-lg transition-colors ${
                  pathname === "/admin"
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/admin/vendors"
                className={`block py-2 px-4 rounded-lg transition-colors ${
                  pathname === "/admin/vendors"
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                Manage Vendors
              </Link>
            </li>
            <li>
              <Link
                href="/admin/screening-questions"
                className={`block py-2 px-4 rounded-lg transition-colors ${
                  pathname === "/admin/screening-questions"
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                Manage Screening Questions
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
