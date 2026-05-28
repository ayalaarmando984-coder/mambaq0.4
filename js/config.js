// ═══════════════════════════════════════════════════════════════════════════
//  Configuración MAMBAQ
//  ─────────────────────────────────────────────────────────────────────────
//  SUPABASE:
//  1. Crea un proyecto en https://supabase.com
//  2. Ve a Project Settings → API
//  3. Pega el Project URL y el "anon public" key abajo.
//
//  HUGGING FACE (IA de estilos artísticos):
//  1. Crea cuenta gratis en https://huggingface.co
//  2. Ve a Settings → Access Tokens → New token (tipo "read")
//  3. Pega el token abajo (empieza con hf_...)
//  Sin token la app usa filtros de canvas como respaldo.
// ═══════════════════════════════════════════════════════════════════════════

window.MAMBAQ_CONFIG = {
  supabaseUrl:     "https://vgkabsimrpfwlerovitq.supabase.co",
  supabaseAnonKey: "sb_publishable_N3II1A1g-UkP1DgUpWNeKw_8uISgJzU",
  hfToken:         "PEGA_AQUI_TU_HF_TOKEN",
};
