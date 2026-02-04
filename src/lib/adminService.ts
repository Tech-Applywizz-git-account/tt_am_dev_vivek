import { supabase2 as supabase } from './supabaseClient';

/**
 * Admin service for managing payment gateway settings
 */

export const getPaymentSettings = async () => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*')
            .in('setting_key', ['payment_method', 'payment_account']);

        if (error) throw error;

        const settings: any = {};
        data?.forEach(item => {
            settings[item.setting_key] = item.setting_value;
        });

        return {
            method: (settings.payment_method || 'paypal').toLowerCase(),
            account: (settings.payment_account || 'dubai').toLowerCase()
        };
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        return { method: 'paypal', account: 'dubai' };
    }
};

export const getPricingSettings = async () => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*')
            .in('setting_key', ['price_monthly', 'price_3_months', 'price_6_months']);

        if (error) throw error;

        const prices: any = {};
        data?.forEach(item => {
            prices[item.setting_key] = item.setting_value;
        });

        return {
            monthly: prices.price_monthly || '45',
            threeMonth: prices.price_3_months || '119.99',
            sixMonth: prices.price_6_months || '224'
        };
    } catch (error) {
        console.error('Error fetching pricing settings:', error);
        return { monthly: '45', threeMonth: '119.99', sixMonth: '224' };
    }
};

export const getPayPalPlanIds = async () => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*')
            .in('setting_key', [
                'paypal_india_monthly',
                'paypal_india_3_months',
                'paypal_india_6_months',
                'paypal_dubai_monthly',
                'paypal_dubai_3_months',
                'paypal_dubai_6_months'
            ]);

        if (error) throw error;

        console.log('📊 Fetched PayPal Plan IDs from database:', data);

        const planIds: any = {};
        data?.forEach(item => {
            planIds[item.setting_key] = item.setting_value;
        });

        const result = {
            india: {
                monthly: planIds.paypal_india_monthly || 'P-4VW53857BD588000YNGACGIY',
                '3-months': planIds.paypal_india_3_months || 'P-0W497970HN288661MNGAC2IA',
                '6-months': planIds.paypal_india_6_months || 'P-5BV82030WF868805GNGAC2WA'
            },
            dubai: {
                monthly: planIds.paypal_dubai_monthly || 'P-6LG69448ER983061VNGAC5YQ',
                '3-months': planIds.paypal_dubai_3_months || 'P-5KY99446JK6188514NGACYUA',
                '6-months': planIds.paypal_dubai_6_months || 'P-74B19855BS8555159NGACZTQ'
            }
        };

        console.log('✅ Structured PayPal Plan IDs:', result);
        return result;
    } catch (error) {
        console.error('❌ Error fetching PayPal plan IDs:', error);
        // Return hardcoded fallback values
        return {
            india: {
                monthly: 'P-4VW53857BD588000YNGACGIY',
                '3-months': 'P-0W497970HN288661MNGAC2IA',
                '6-months': 'P-5BV82030WF868805GNGAC2WA'
            },
            dubai: {
                monthly: 'P-6LG69448ER983061VNGAC5YQ',
                '3-months': 'P-5KY99446JK6188514NGACYUA',
                '6-months': 'P-74B19855BS8555159NGACZTQ'
            }
        };
    }
};
