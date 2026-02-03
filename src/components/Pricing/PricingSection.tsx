import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPaymentSettings, getPricingSettings } from "../../lib/adminService";
import { createTransaction } from "../../lib/paymentService";
import PayPalSubscriptionButton from "../PayPal/PayPalSubscriptionButton";
import { X, Check } from "lucide-react";

interface PricingSectionProps {
    user?: any;
}

const PricingSection = ({ user }: PricingSectionProps) => {
    const pricingRef = useRef(null);
    const [activeGateway, setActiveGateway] = useState({ method: 'paypal', account: 'dubai' });

    // Payment Flow States
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transactionId, setTransactionId] = useState("");
    const [showPayPalModal, setShowPayPalModal] = useState(false);

    const [pricingPlans, setPricingPlans] = useState([
        {
            id: 'monthly',
            name: "Monthly",
            price: "29.99",
            period: "/mo",
            subtitle: "Perfect for getting started",
            billingInfo: "Billed monthly • No commitment",
            features: [
                "Unlimited job links daily",
                "AI-powered job matching",
                "Resume optimization tools",
                "Priority customer support"
            ],
            ctaText: "Start 1 Month Trial",
            ctaStyle: "outline"
        },
        {
            id: '3-months',
            name: "3 Months",
            price: "79.99",
            period: " total",
            subtitle: "Best for testing commitment",
            billingInfo: "Billed upfront • Save 10%",
            badge: "MOST POPULAR",
            features: [
                "Unlimited job links daily",
                "AI-powered job matching",
                "Resume optimization tools",
                "Priority customer support",
                "Early access to new features"
            ],
            isRecommended: true,
            ctaText: "Save 10% Now",
            ctaStyle: "orange"
        },
        {
            id: '6-months',
            name: "6 Months",
            price: "159.99",
            period: " total",
            subtitle: "Best for serious job hunters",
            billingInfo: "Billed upfront • Save 17%",
            features: [
                "Unlimited job links daily",
                "AI-powered job matching",
                "Resume optimization tools",
                "Priority customer support",
                "Early access to new features",
                "Priority job alerts (24h)",
                "Dedicated account manager"
            ],
            ctaText: "Get Best Value (17% OFF)",
            ctaStyle: "outline"
        }
    ]);

    // Fetch dynamic gateway and prices from shared admin settings
    useEffect(() => {
        const loadSettings = async () => {
            const [gatewayData, prices] = await Promise.all([
                getPaymentSettings(),
                getPricingSettings()
            ]);

            setActiveGateway(gatewayData);

            // Update plan prices dynamically if they exist in DB
            setPricingPlans(prev => prev.map(plan => {
                if (plan.id === 'monthly' && prices.monthly) return { ...plan, price: prices.monthly };
                if (plan.id === '3-months' && prices.threeMonth) return { ...plan, price: prices.threeMonth };
                if (plan.id === '6-months' && prices.sixMonth) return { ...plan, price: prices.sixMonth };
                return plan;
            }));
        };
        loadSettings();
    }, []);

    const handlePlanSelect = async (plan: any) => {
        if (!user) {
            alert("Please login to proceed with payment.");
            return;
        }

        setSelectedPlan(plan);
        setIsProcessing(true);
        try {
            // Direct transaction creation using logged-in user data & dynamic gateway
            const txn = await createTransaction({
                fullName: user.name || 'User',
                email: user.email,
                mobileNumber: '' // Optional
            }, plan.id, activeGateway.account);

            setTransactionId(txn.jb_id);
            setShowPayPalModal(true);
        } catch (error) {
            alert("Failed to initiate checkout. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <section ref={pricingRef} className="w-full bg-[#fdfcf6] py-20 min-h-screen" id="pricing">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-5xl font-bold text-[#1a1a1a] mb-4">Pricing Plans</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {pricingPlans.map((plan) => (
                        <div key={plan.id} className={`bg-white p-10 rounded-xl shadow-sm border-2 transition-all relative flex flex-col h-full ${plan.isRecommended ? 'border-blue-600' : 'border-gray-100'}`}>
                            {plan.badge && (
                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#f7941d] text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                                    {plan.badge}
                                </span>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-[#4caf50] mb-2">{plan.name}</h3>
                                <p className="text-gray-500 text-sm mb-6">{plan.subtitle}</p>

                                <div className="flex items-baseline mb-1">
                                    <span className="text-5xl font-bold text-[#1a1a1a]">${plan.price}</span>
                                    <span className="text-gray-500 ml-1 text-lg">{plan.period}</span>
                                </div>
                                <p className="text-gray-400 text-sm">{plan.billingInfo}</p>
                            </div>

                            <ul className="space-y-4 mb-12 flex-grow">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-center text-[#333] text-sm font-medium">
                                        <div className="mr-3 flex-shrink-0">
                                            <Check size={18} strokeWidth={3} className="text-[#1a1a1a]" />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button
                                disabled={isProcessing}
                                onClick={() => handlePlanSelect(plan)}
                                className={`w-full py-4 rounded-full font-bold transition-all border-2 text-sm ${plan.ctaStyle === 'orange'
                                    ? 'bg-[#f7941d] border-[#f7941d] text-white hover:bg-[#e68a1a]'
                                    : 'bg-white border-gray-200 text-[#333] hover:border-blue-600'
                                    }`}
                            >
                                {isProcessing && selectedPlan?.id === plan.id ? "Processing..." : plan.ctaText}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* PayPal Modal */}
            <AnimatePresence>
                {showPayPalModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative"
                        >
                            <button onClick={() => setShowPayPalModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-2">Complete Payment</h3>
                                <p className="text-gray-500">Secure subscription via PayPal</p>
                                <p className="mt-2 text-sm font-medium text-blue-600">Plan: {selectedPlan?.name} (${selectedPlan?.price})</p>
                            </div>

                            <PayPalSubscriptionButton
                                key={`${activeGateway.account}_${selectedPlan?.id}`}
                                planId={getPayPalPlanId(activeGateway.account, selectedPlan?.id)}
                                jbId={transactionId}
                                account={activeGateway.account as any}
                                onSuccess={() => window.location.href = '/success'}
                                onError={(err) => console.error(err)}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
};

// Helper to map UI plans to PayPal Plan IDs (Production IDs)
const getPayPalPlanId = (account: string, uiPlanId: string) => {
    const plans: any = {
        india: {
            'monthly': 'P-4VW53857BD588000YNGACGIY',
            '3-months': 'P-0W497970HN288661MNGAC2IA',
            '6-months': 'P-5BV82030WF868805GNGAC2WA',
        },
        dubai: {
            'monthly': 'P-6LG69448ER983061VNGAC5YQ',
            '3-months': 'P-5KY99446JK6188514NGACYUA',
            '6-months': 'P-74B19855BS8555159NGACZTQ',
        }
    };
    return plans[account]?.[uiPlanId] || plans[account]?.['monthly'];
};

export default PricingSection;
