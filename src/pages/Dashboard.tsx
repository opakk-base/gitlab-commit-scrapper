export default function Dashboard() {
  const stats = [
    { label: "Total Users", value: "1,234", change: "+12%" },
    { label: "Active Sessions", value: "567", change: "+5%" },
    { label: "Revenue", value: "$12,345", change: "+8%" },
    { label: "Orders", value: "89", change: "-2%" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <span
                className={`text-sm ${
                  stat.change.startsWith("+")
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        <div className="p-4">
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-600">New user registered</span>
              <span className="ml-auto text-gray-400">2 min ago</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-gray-600">Order #1234 completed</span>
              <span className="ml-auto text-gray-400">15 min ago</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span className="text-gray-600">Server warning detected</span>
              <span className="ml-auto text-gray-400">1 hour ago</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-gray-600">New feature deployed</span>
              <span className="ml-auto text-gray-400">3 hours ago</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}