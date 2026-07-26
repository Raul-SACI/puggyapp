import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. ' +
      'Revisá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env.local (o en Vercel).',
  )
}

// Único uso de almacenamiento local permitido: la sesión de login (la maneja Supabase).
// Ningún dato financiero se guarda en el navegador: todo se lee en vivo desde Supabase.
export const supabase = createClient(supabaseUrl, supabaseKey)
