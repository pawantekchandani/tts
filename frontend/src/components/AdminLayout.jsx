import React, { useState } from 'react';
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react';

const AdminLayout = ({ children, activeTab, onTabChange }) => {
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col md:flex-row">

            {/* Mobile Navigation Container */}
            <div className="md:hidden fixed top-0 left-0 w-full z-50 bg-gray-900 shadow-xl">
                {/* Top Bar: Title & Logout */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 bg-gray-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Admin Panel
                    </h1>
                    <button
                        onClick={() => {
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('user_email');
                            localStorage.removeItem('conversionHistory');
                            window.location.reload();
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>

                {/* Bottom Bar: Scrollable Tabs */}
                <nav className="overflow-x-auto flex whitespace-nowrap p-2 gap-2 bg-gray-800/80 border-b border-gray-700 no-scrollbar">
                    <button
                        onClick={() => onTabChange('dashboard')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 flex-shrink-0 text-sm ${activeTab === 'dashboard'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <LayoutDashboard size={16} />
                        <span className="font-medium">Dashboard</span>
                    </button>

                    <button
                        onClick={() => onTabChange('users')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 flex-shrink-0 text-sm ${activeTab === 'users'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <Users size={16} />
                        <span className="font-medium">Users</span>
                    </button>

                    <button
                        onClick={() => onTabChange('settings')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 flex-shrink-0 text-sm ${activeTab === 'settings'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <Settings size={16} />
                        <span className="font-medium">Settings</span>
                    </button>
                </nav>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 fixed left-0 top-0 h-screen z-40">
                <div className="p-6 border-b border-gray-700">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Admin Panel
                    </h1>
                </div>

                <nav className="mt-6 px-4 space-y-2">
                    <button
                        onClick={() => onTabChange('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'dashboard'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <LayoutDashboard size={20} />
                        <span className="font-medium">Dashboard</span>
                    </button>

                    <button
                        onClick={() => onTabChange('users')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'users'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <Users size={20} />
                        <span className="font-medium">Users</span>
                    </button>

                    <button
                        onClick={() => onTabChange('settings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'settings'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <Settings size={20} />
                        <span className="font-medium">Settings</span>
                    </button>
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
                    <button
                        onClick={() => {
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('user_email');
                            localStorage.removeItem('conversionHistory');
                            window.location.reload();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 bg-gray-900 text-white min-h-screen overflow-y-auto mt-28 md:mt-0">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
