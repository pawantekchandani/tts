import React, { useEffect, useState } from 'react';
import { Pencil, Save, X, Loader } from 'lucide-react';
import axios from 'axios';

const PlanSettings = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({});
    const [error, setError] = useState(null);

    // Fetch Plans
    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const BASE_URL = import.meta.env.VITE_API_URL || "https://tts.testingprojects.online";
            const response = await axios.get(`${BASE_URL}/api/admin/plans`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch plans:", err);
            setError("Failed to load plans.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleEdit = (plan) => {
        setEditingPlan(plan.plan_name);
        setFormData({ ...plan });
    };

    const handleCancel = () => {
        setEditingPlan(null);
        setFormData({});
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: parseInt(e.target.value) });
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const BASE_URL = import.meta.env.VITE_API_URL || "https://tts.testingprojects.online";

            await axios.put(`${BASE_URL}/api/admin/plans/${formData.plan_name}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setEditingPlan(null);
            fetchPlans(); // Refresh data
        } catch (err) {
            console.error("Failed to update plan:", err);
            alert("Failed to update plan settings.");
        }
    };

    if (loading) return <div className="text-white flex items-center"><Loader className="animate-spin mr-2" /> Loading Plans...</div>;
    if (error) return <div className="text-red-400">{error}</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Plan Settings
            </h2>

            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-700/50 text-gray-300 uppercase text-sm font-bold">
                        <tr>
                            <th className="px-6 py-4">Plan Name</th>
                            <th className="px-6 py-4">Chats / Day</th>
                            <th className="px-6 py-4">Context Size (Chars)</th>
                            <th className="px-6 py-4">Download Limit</th>
                            <th className="px-6 py-4">History (Days)</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {plans.map((plan) => (
                            <tr key={plan.id} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-6 py-4 text-white font-medium">{plan.plan_name}</td>
                                <td className="px-6 py-4 text-gray-300 text-center">{plan.chats_per_day}</td>
                                <td className="px-6 py-4 text-gray-300 text-center">{plan.context_limit}</td>
                                <td className="px-6 py-4 text-gray-300 text-center">{plan.download_limit}</td>
                                <td className="px-6 py-4 text-gray-300 text-center">{plan.history_days}</td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleEdit(plan)}
                                        className="text-blue-400 hover:text-blue-300 transition-colors p-2 hover:bg-blue-500/10 rounded-lg"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal / Overlay */}
            {editingPlan && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg p-6 space-y-6 animate-fadeIn">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Edit {editingPlan} Plan</h3>
                            <button onClick={handleCancel} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Chats Per Day</label>
                                <input
                                    type="number"
                                    name="chats_per_day"
                                    value={formData.chats_per_day}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Context Limit</label>
                                <input
                                    type="number"
                                    name="context_limit"
                                    value={formData.context_limit}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Download Limit</label>
                                <input
                                    type="number"
                                    name="download_limit"
                                    value={formData.download_limit}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">History Days</label>
                                <input
                                    type="number"
                                    name="history_days"
                                    value={formData.history_days}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-gray-300 hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                <Save size={18} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanSettings;
