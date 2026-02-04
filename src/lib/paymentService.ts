import { supabase2 as supabase } from './supabaseClient';
import { getPricingSettings } from './adminService';

/**
 * Payment service for handling ticketing transactions (using the same global tables)
 */

export const PLAN_CONFIGS: any = {
    'monthly': { duration: 1, unit: 'month', price: 29.99 },
    '3-months': { duration: 3, unit: 'month', price: 79.99 },
    '6-months': { duration: 6, unit: 'month', price: 159.99 }
};

const getDynamicPlanPrice = async (planId: string) => {
    try {
        const prices = await getPricingSettings();
        const priceMap: any = {
            'monthly': prices.monthly,
            '3-months': prices.threeMonth,
            '6-months': prices.sixMonth
        };
        const priceStr = priceMap[planId];
        if (priceStr) return parseFloat(priceStr);
        return PLAN_CONFIGS[planId]?.price || 0;
    } catch {
        return PLAN_CONFIGS[planId]?.price || 0;
    }
};

const generateJBId = async () => {
    try {
        const { data, error } = await supabase
            .from('jobboard_transactions')
            .select('jb_id')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        let maxNumber = 0;
        if (data && data.length > 0) {
            data.forEach(row => {
                const match = row.jb_id.match(/JB-(\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNumber) maxNumber = num;
                }
            });
        }
        return `JB-${maxNumber + 1}`;
    } catch (error) {
        console.error('Error generating JB ID:', error);
        return `JB-T-${Date.now().toString().slice(-6)}`;
    }
};

export const createTransaction = async (formData: any, planId: string, paymentAccount = 'india') => {
    try {
        const dynamicPrice = await getDynamicPlanPrice(planId);
        const now = new Date().toISOString();

        // 1. Check if user already exists in jobboard_transactions (Main Platform)
        const { data: existingTxn } = await supabase
            .from('jobboard_transactions')
            .select('jb_id')
            .eq('email', formData.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingTxn) {
            console.log(`Found existing JB-ID ${existingTxn.jb_id} for renewal.`);
            const updateData = {
                plan_id: planId,
                amount: dynamicPrice,
                payment_status: 'pending',
                payment_account: paymentAccount,
                updated_at: now
            };

            const { data, error } = await supabase
                .from('jobboard_transactions')
                .update(updateData)
                .eq('jb_id', existingTxn.jb_id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        }

        // 2. New user - Generate new JB-ID
        const jbId = await generateJBId();
        const transactionData = {
            jb_id: jbId,
            full_name: formData.fullName,
            email: formData.email,
            mobile_number: formData.mobileNumber || '',
            plan_id: planId,
            amount: dynamicPrice,
            payment_status: 'pending',
            payment_account: paymentAccount,
            created_at: now,
            updated_at: now,
            currency: 'USD'
        };

        const { data, error } = await supabase
            .from('jobboard_transactions')
            .insert([transactionData])
            .select()
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating/updating transaction:', error);
        throw error;
    }
};

export const getTransaction = async (jbId: string) => {
    const { data, error } = await supabase
        .from('jobboard_transactions')
        .select('*')
        .eq('jb_id', jbId)
        .maybeSingle();
    if (error) throw error;
    return data;
};
