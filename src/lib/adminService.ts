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
