import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader, UserCheck, AlertCircle } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(null);

    const PLANS = ['Basic', 'Pro', 'Plus'];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const BASE_URL = import.meta.env.VITE_API_URL || "https://tts.testingprojects.online";
            const response = await axios.get(`${BASE_URL}/api/admin/user-details`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch users:", err);
            setError("Failed to load user data.");
            setLoading(false);
        }
    };

    const handlePlanChange = async (userId, newPlan) => {
        setUpdating(userId);
        try {
            const token = localStorage.getItem('access_token');
            const BASE_URL = import.meta.env.VITE_API_URL || "https://tts.testingprojects.online";

            await axios.put(
                `${BASE_URL}/api/admin/update-user-plan`,
                { user_id: userId, plan_type: newPlan },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Optimistic update
            setUsers(users.map(user =>
                user.user_id === userId ? { ...user, current_plan: newPlan } : user
            ));

        } catch (err) {
            console.error("Failed to update plan:", err);
            alert("Failed to update user plan.");
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-white">
                <Loader className="animate-spin mr-2" /> Loading users...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex items-center text-red-200">
                <AlertCircle className="mr-2" /> {error}
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <UserCheck className="mr-2 text-blue-400" /> User Management
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-700/50 text-gray-400 text-sm uppercase">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg">Email</th>
                            <th className="px-4 py-3">Current Plan</th>
                            <th className="px-4 py-3">Usage (Today)</th>
                            <th className="px-4 py-3 rounded-r-lg">Plan Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {users.map((user) => (
                            <tr key={user.user_id} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3 text-sm text-white font-medium">
                                    {user.email}
                                    <span className="block text-xs text-gray-500 font-mono">ID: {user.user_id}</span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                        ${user.current_plan === 'Basic' ? 'bg-gray-600 text-gray-200' : ''}
                                        ${user.current_plan === 'Pro' ? 'bg-blue-500/20 text-blue-300' : ''}
                                        ${user.current_plan === 'Plus' ? 'bg-purple-500/20 text-purple-300' : ''}
                                    `}>
                                        {user.current_plan}
                                    </span>
                                    {user.is_default_plan && (
                                        <span className="ml-2 text-xs text-yellow-500/80" title="Initial Plan">(Default)</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-300">
                                    <div className="flex flex-col gap-1">
                                        <span title="Chats">
                                            💬 {user.usage.chats_today} / {user.usage.chats_limit}
                                        </span>
                                        <span title="Downloads">
                                            📥 {user.usage.downloads_today || 0} / {user.usage.download_limit || 0}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="relative">
                                        {updating === user.user_id && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 z-10">
                                                <Loader size={16} className="animate-spin text-blue-400" />
                                            </div>
                                        )}
                                        <select
                                            value={user.current_plan}
                                            onChange={(e) => handlePlanChange(user.user_id, e.target.value)}
                                            disabled={updating === user.user_id}
                                            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:opacity-50"
                                        >
                                            {PLANS.map(plan => (
                                                <option key={plan} value={plan}>{plan}</option>
                                            ))}
                                        </select>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No users found.
                </div>
            )}
        </div>
    );
};

export default UserManagement;
