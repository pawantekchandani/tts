import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Star, Zap, Crown } from 'lucide-react';
import axios from 'axios';

const Plans = ({ onNavigate }) => {
    const [limits, setLimits] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLimits = async () => {
            try {
                // Public endpoint to get plan details (we might need to create this if it's admin-only)
                // For now, attempting to fetch from the same source as PlanSettings or improved endpoint
                // If the user is not logged in, this might fail if it requires auth.
                // Assuming we make a public endpoint or use a default fallback.
                const BASE_URL = import.meta.env.VITE_API_URL || "https://tts.testingprojects.online";
                // Using a hypothetically public available endpoint or reusing the authenticated one if user is logged in
                // Since this component is likely for logged-in users or public, we need a strategy.
                // For now, let's assume we can fetch it publicly or user is logged in. 
                // If this fails, we fall back to defaults.

                const response = await axios.get(`${BASE_URL}/api/plans/public`); // We might need to implement this backend route
                // If the above doesn't exist, we will use hardcoded defaults but try to update from DB if possible in future.
                // For this implementation, I will simulate the fetch or use the admin one if token exists

                // BACKUP STRATEGY: Hardcoded defaults if API fails or isn't built yet
                // Ideally this data comes from the DB table 'plan_limits'
                const defaultLimits = {
                    'Basic': { credit_limit: 3000, history_days: 7 },
                    'Pro': { credit_limit: 10000, history_days: 30 },
                    'Plus': { credit_limit: 30000, history_days: 9999 }
                };

                if (response.data && Array.isArray(response.data)) {
                    const limitsMap = {};
                    response.data.forEach(plan => {
                        limitsMap[plan.plan_name] = plan;
                    });
                    setLimits(limitsMap);
                } else {
                    setLimits(defaultLimits);
                }

            } catch (err) {
                console.warn("Could not fetch plan limits, using defaults.", err);
                setLimits({
                    'Basic': { credit_limit: 3000, history_days: 7 },
                    'Pro': { credit_limit: 10000, history_days: 30 },
                    'Plus': { credit_limit: 30000, history_days: 9999 }
                });
            } finally {
                setLoading(false);
            }
        };

        fetchLimits();
    }, []);

    const plans = [
        {
            name: 'Basic',
            price: '$0',
            period: '/mo',
            icon: <Star className="w-8 h-8 text-gray-400" />,
            color: 'from-gray-500 to-gray-700',
            glow: 'gray-500',
            features: limits['Basic'] || {}
        },
        {
            name: 'Pro',
            price: '$2',
            period: '/mo',
            icon: <Zap className="w-8 h-8 text-yellow-400" />,
            color: 'from-yellow-400 to-orange-500',
            glow: 'yellow-400',
            popular: true,
            features: limits['Pro'] || {}
        },
        {
            name: 'Plus',
            price: '$5',
            period: '/mo',
            icon: <Crown className="w-8 h-8 text-purple-400" />,
            color: 'from-purple-400 to-pink-500',
            glow: 'purple-500',
            features: limits['Plus'] || {}
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans py-20 px-4 relative overflow-hidden flex flex-col items-center">
            {/* Back Button */}
            <button
                onClick={() => onNavigate && onNavigate('home')}
                className="absolute top-6 left-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-50 text-gray-400 hover:text-white"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="text-center mb-16 z-10">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                    Choose Your Power
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Unlock higher limits, faster processing, and exclusive features.
                </p>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full z-10"
            >
                {plans.map((plan) => (
                    <motion.div
                        key={plan.name}
                        variants={cardVariants}
                        whileHover={{ scale: 1.05 }}
                        className={`relative bg-[#1e293b]/40 backdrop-blur-xl border rounded-3xl p-8 flex flex-col
                            ${plan.popular ? 'border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.15)]' : 'border-white/10 shadow-xl'}
                        `}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-xs uppercase px-4 py-1 rounded-full shadow-lg">
                                Most Popular
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-6">
                            <div className={`p-3 rounded-2xl bg-gradient-to-br ${plan.color} bg-opacity-10`}>
                                {plan.icon}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-extrabold">{plan.price}</span>
                                    <span className="text-gray-400 text-sm">{plan.period}</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-px bg-white/10 mb-6"></div>

                        <ul className="space-y-4 flex-1 mb-8">
                            <li className="flex items-center gap-3 text-gray-300">
                                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span><strong className="text-white">{plan.features.credit_limit || '-'}</strong> credits</span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-300">
                                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span><strong className="text-white">{plan.features.history_days || '-'}</strong> days history</span>
                            </li>
                        </ul>

                        <button className={`w-full py-4 rounded-xl font-bold transition-all
                            ${plan.popular
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:shadow-lg hover:shadow-orange-500/25'
                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}
                        `}>
                            {plan.name === 'Basic' ? 'Current Plan' : 'Upgrade Now'}
                        </button>

                    </motion.div >
                ))}
            </motion.div >
        </div >
    );
};

export default Plans;
