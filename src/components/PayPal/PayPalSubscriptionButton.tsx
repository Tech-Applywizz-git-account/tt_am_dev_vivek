import { useEffect, useRef, useState } from "react";
import { loadPayPalSdk } from "../../utils/loadPayPalSdk";

// PAYPAL CLIENT IDS (Production - Matched from Main Page)
const PAYPAL_CLIENT_IDS: Record<string, string> = {
    dubai: "AZ9SPBXMnFUMkdIW9ph9RGBbfyezWXhKaX7ggWOm1Taj1s7SkxrRQMvgmRPvmG7JO0dphNfDgKedxN0r",
    india: "ATQH7x4E3fDXELMn7NsileSDBX6ErAtb7Ih2LfZsDw7z8ztJD5386J5-2v6ovIiJFlxC-ypicZTpZMn1"
};

interface PayPalSubscriptionButtonProps {
    planId: string;
    jbId: string;
    account?: string;
    onSuccess: (subscriptionId: string) => void;
    onError: (error: any) => void;
}

const PayPalSubscriptionButton: React.FC<PayPalSubscriptionButtonProps> = ({
    planId,
    jbId,
    account = 'india',
    onSuccess,
    onError
}) => {
    const paypalRef = useRef<HTMLDivElement>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const namespace = `paypal_${account}`;

    // 1️⃣ Load PayPal SDK dynamically
    useEffect(() => {
        let mounted = true;
        setSdkReady(false); // Reset when account changes
        setError(null);

        const clientId = PAYPAL_CLIENT_IDS[account] || PAYPAL_CLIENT_IDS.india;
        console.log(`📡 [PayPalButton] Account: ${account}, ClientID: ${clientId.substring(0, 15)}...`);

        loadPayPalSdk(clientId, account)
            .then(() => {
                if (mounted) {
                    console.log(`🎯 [PayPalButton] SDK Loaded for ${account}. Global: window.${namespace}`);
                    if ((window as any)[namespace]) {
                        setSdkReady(true);
                    } else {
                        throw new Error(`PayPal namespace ${namespace} not found after load`);
                    }
                }
            })
            .catch((err) => {
                console.error(`❌ [PayPalButton] Load failed for ${account}:`, err);
                if (mounted) setError("Failed to load PayPal. Please try again.");
                onError(err);
            });

        return () => {
            mounted = false;
        };
    }, [account, namespace, onError]);

    // 2️⃣ Render PayPal Subscription Button
    useEffect(() => {
        const paypalInstance = (window as any)[namespace];
        if (!sdkReady || !paypalInstance || !paypalRef.current) return;

        console.log(`🎨 [PayPalButton] RENDER triggered for ${account}`);

        // Clear previous renders
        paypalRef.current.innerHTML = "";

        try {
            paypalInstance.Buttons({
                style: {
                    shape: "rect",
                    color: "gold",
                    layout: "vertical",
                    label: "subscribe"
                },

                createSubscription: (_data: any, actions: any) => {
                    return actions.subscription.create({
                        plan_id: planId,
                        custom_id: jbId // 🔥 CRITICAL: links PayPal → your DB
                    });
                },

                onApprove: (data: any) => {
                    console.log("✅ Subscription approved:", data.subscriptionID);
                    onSuccess(data.subscriptionID);
                },

                onError: (err: any) => {
                    console.error("❌ PayPal error:", err);
                    onError(err);
                }

            }).render(paypalRef.current);
        } catch (renderError) {
            console.error("❌ PayPal render failed:", renderError);
            setError("Failed to display payment buttons.");
        }

    }, [sdkReady, planId, jbId, account, namespace, onSuccess, onError]);

    return (
        <div>
            {!sdkReady && !error && (
                <p className="text-center text-gray-400 text-sm py-4">
                    Loading PayPal Secure Checkout...
                </p>
            )}
            {error && (
                <p className="text-center text-red-500 text-sm py-4">
                    {error}
                </p>
            )}
            <div ref={paypalRef} />
        </div>
    );
};

export default PayPalSubscriptionButton;
