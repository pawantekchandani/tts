import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, Users, Activity, Loader } from 'lucide-react';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A259FF'];

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('access_token');
                // Use environment variable for API URL (same pattern as auth.js)
                const BASE_URL = import.meta.env.VITE_API_URL || "https://tts.testingprojects.online";
                const response = await axios.get(`${BASE_URL}/api/admin/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (err) {
                console.error("Failed to fetch admin stats:", err);
                setError("Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-white">
                <Loader className="animate-spin mr-2" /> Loading dashboard...
            </div>
        );
    }

    if (error) {
        return <div className="text-red-400 p-4">{error}</div>;
    }

    // Transform breakdown object to array for Recharts
    const pieData = Object.entries(stats.userPlanBreakdown || {}).map(([name, value]) => ({
        name,
        value
    }));

    // If no data, show placeholder
    if (pieData.length === 0) {
        pieData.push({ name: 'No Data', value: 1 });
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Dashboard Overview
            </h2>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Users */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                        <Users size={32} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Total Users</p>
                        <h3 className="text-3xl font-bold text-white">{stats.totalUsers}</h3>
                    </div>
                </div>

                {/* Total Earnings */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 text-green-400 rounded-xl">
                        <DollarSign size={32} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Total Revenue</p>
                        <h3 className="text-3xl font-bold text-white">
                            ${stats.totalEarnings.toFixed(2)}
                        </h3>
                    </div>
                </div>

                {/* Active Sessions (Placeholder) */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                        <Activity size={32} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm font-medium">System Status</p>
                        <h3 className="text-xl font-bold text-white">Operational</h3>
                    </div>
                </div>
            </div>

            {/* Charts & Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* User Plan Distribution Chart */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-4">User Plan Distribution</h3>
                    <div className="h-64 w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg overflow-hidden">
                    <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-700/50 text-gray-400 text-sm uppercase">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">User</th>
                                    <th className="px-4 py-3">Action</th>
                                    <th className="px-4 py-3 rounded-r-lg">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {stats.recentActivity && stats.recentActivity.length > 0 ? (
                                    stats.recentActivity.map((activity) => (
                                        <tr key={activity.id} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-white font-medium">
                                                {activity.user}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-300">
                                                {activity.action}
                                                <span className="block text-xs text-gray-500 truncate max-w-[150px]">
                                                    {activity.details}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                                                {new Date(activity.date).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                                            No recent activity found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
