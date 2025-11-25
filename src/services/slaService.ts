import { supabase } from '../lib/supabaseClient'

export interface SLAConfig {
  ticket_type: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  hours: number
}

export const fetchSLAConfig = async (): Promise<SLAConfig[]> => {
  const { data, error } = await supabase
    .from('sla_config')
    .select('*')

  if (error) {
    throw new Error(error.message)
  }

  return data as SLAConfig[]
}
