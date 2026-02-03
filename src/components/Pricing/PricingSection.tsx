import React, { useRef, useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

// Animation variants matching Home page
const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.16, 0.77, 0.47, 0.97],
            when: "beforeChildren",
            staggerChildren: 0.3
        }
    }
};

const childVariants = {
    hidden: {
        opacity: 0,
        y: 40,
        scale: 0.95
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: "backOut"
        }
    }
};

const PricingSection = () => {
    const pricingRef = useRef(null);
    const pricingControls = useAnimation();

    // Pricing state
    const [prices] = useState({ monthly: '45', threeMonth: '119.99', sixMonth: '224' });

    // Scroll animation effect
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    pricingControls.start("visible");
                } else {
                    pricingControls.start("hidden");
                }
            },
            {
                root: null,
                rootMargin: "10%",
                threshold: 0.01,
            }
        );

        if (pricingRef.current) {
            observer.observe(pricingRef.current);
        }

        return () => {
            if (pricingRef.current) {
                observer.unobserve(pricingRef.current);
            }
        };
    }, [pricingControls]);

    const pricingPlans = [
        {
            id: 'monthly',
            name: "Monthly",
            title: "Monthly",
            price: "$" + prices.monthly,
            period: "/mo",
            subtitle: "Perfect for getting started",
            billingInfo: "Billed monthly • No commitment",
            features: [
                "Unlimited job links daily",
                "AI-powered job matching",
                "Resume optimization tools",
                "Priority customer support"
            ],
            isRecommended: false,
            badge: null,
            ctaText: "Start 1 Month Trial",
            ctaStyle: "primary"
        },
        {
            id: '3-months',
            name: "3 Months",
            title: "3 Months",
            price: "$" + prices.threeMonth,
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
            ctaStyle: "warning"
        },
        {
            id: '6-months',
            name: "6 Months",
            title: "6 Months",
            price: "$" + prices.sixMonth,
            period: " total",
            subtitle: "Best for serious job hunters",
            billingInfo: "Billed upfront • Save 17%",
            badge: null,
            features: [
                "Unlimited job links daily",
                "AI-powered job matching",
                "Resume optimization tools",
                "Priority customer support",
                "Early access to new features",
                "Priority job alerts (24h)",
                "Dedicated account manager"
            ],
            isRecommended: false,
            ctaText: "Get Best Value (17% OFF)",
            ctaStyle: "primary"
        }
    ];

    return (
        <motion.section
            ref={pricingRef}
            className="w-full bg-gray-50 py-16 sm:py-20 lg:py-24"
            id="pricing"
        >
            <motion.div
                className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
            >
                {/* Pricing Header */}
                <div className="text-center mb-12 sm:mb-16">
                    <div className="inline-block mb-4 sm:mb-6 border-green-900 text-green-900 border-2 bg-green-50 px-6 py-2 rounded-full opacity-70">
                        <span className="text-sm font-semibold">PRICING</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight text-gray-900 mb-6">
                        Pricing Plans
                    </h2>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
                    {pricingPlans.map((plan, index) => (
                        <div key={index} className="relative h-full">
                            {plan.badge && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                                    <span className="inline-block bg-yellow-500 text-gray-900 text-xs font-semibold py-2 px-4 rounded-full uppercase tracking-wider text-center">
                                        {plan.badge}
                                    </span>
                                </div>
                            )}

                            <div
                                className={[
                                    "flex h-full flex-col bg-white rounded-xl shadow-lg p-8 sm:p-10 lg:p-12 transition-all hover:shadow-xl",
                                    plan.isRecommended ? "border-4 border-blue-600 scale-105" : "border border-gray-200",
                                ].join(" ")}
                            >
                                {/* Header / Price */}
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-semibold text-green-700 mb-2">
                                        {plan.name}
                                    </h3>
                                    {plan.subtitle && (
                                        <p className="text-sm text-gray-500 mb-4">
                                            {plan.subtitle}
                                        </p>
                                    )}
                                    <div className="mb-2 flex items-baseline">
                                        <span className="text-4xl sm:text-5xl font-bold text-gray-900">
                                            {plan.price}
                                        </span>
                                        <span className="text-base text-gray-600 ml-1">
                                            {plan.period}
                                        </span>
                                    </div>
                                    {plan.billingInfo && (
                                        <p className="text-sm text-gray-500">
                                            {plan.billingInfo}
                                        </p>
                                    )}
                                </div>

                                {/* Features — take remaining space */}
                                <div className="space-y-4 mt-8 flex-1">
                                    {plan.features.map((feature, featureIndex) => (
                                        <div key={featureIndex} className="flex items-center gap-3">
                                            <div className="bg-green-100 rounded-lg p-1">
                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <span className="text-base text-gray-700">
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA pinned to bottom */}
                                <div className='mt-8'>
                                    <button
                                        className={[
                                            "w-full py-3 px-6 rounded-lg font-semibold text-base transition-all transform hover:scale-105",
                                            plan.ctaStyle === "warning"
                                                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                                : "bg-blue-600 hover:bg-blue-700 text-white"
                                        ].join(" ")}
                                        onClick={() => alert(`Selected ${plan.name} plan`)}
                                    >
                                        {plan.ctaText}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.section>
    );
};

export default PricingSection;
