export default function AdminDashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-2">Total Vendors</h3>
          <p className="text-3xl font-bold text-blue-600">24</p>
        </div>
        {/* Add more dashboard cards */}
      </div>
    </div>
  );
}
