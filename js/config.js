// ═══════════════════════════════════════════════════════════════════════════
//  Configuración Supabase
//  ─────────────────────────────────────────────────────────────────────────
//  1. Crea un proyecto en https://supabase.com
//  2. Ve a Project Settings → API
//  3. Pega el Project URL y el "anon public" key abajo.
//
//  El anon key es público por diseño (RLS protege los datos).
// ═══════════════════════════════════════════════════════════════════════════

window.MAMBAQ_CONFIG = {
  supabaseUrl:     "PEGA_AQUI_TU_PROJECT_URL",
  supabaseAnonKey: "PEGA_AQUI_TU_ANON_KEY",
};
