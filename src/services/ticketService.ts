import { supabase } from '../lib/supabaseClient'

export async function fetchTickets() {
  const { data, error } = await supabase.from('tickets').select('*')
  if (error) throw error
  return data
}

export async function createTicket(ticket: any) {
  const { data, error } = await supabase.from('tickets').insert([ticket])
  if (error) throw error
  return data
}
