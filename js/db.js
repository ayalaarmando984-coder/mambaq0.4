// ═══════════════════════════════════════════════════════════════════════════
//  MAMBAQ DB — Supabase backend
//  Misma API async que antes; app.js y museo.js no necesitan cambios.
// ═══════════════════════════════════════════════════════════════════════════

// ── Rate limiter por dispositivo ──────────────────────────────────────────
// Guarda timestamps en localStorage y rechaza si supera el límite en 1 hora.
// No detiene bots avanzados, pero evita spam accidental y abuso casual.
const _rl = {
  _key: k => "mambaq.rl." + k,
  check(key, maxPerHour) {
    const now    = Date.now();
    const window = 60 * 60 * 1000;
    const hits   = JSON.parse(localStorage.getItem(this._key(key)) || "[]")
                     .filter(t => now - t < window);
    if (hits.length >= maxPerHour) return false;
    hits.push(now);
    localStorage.setItem(this._key(key), JSON.stringify(hits));
    return true;
  },
};

function _client() {
  if (window._sbClient) return window._sbClient;
  const cfg = window.MAMBAQ_CONFIG;
  window._sbClient = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  return window._sbClient;
}

function _dataUrlToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function _toUser(row) {
  return {
    id:         row.id,
    name:       row.name,
    avatar:     row.avatar,
    createdAt:  row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

function _toArtwork(row) {
  return {
    id:        row.id,
    childId:   row.child_id,
    name:      row.name,
    author:    row.author,
    age:       row.age,
    styleKey:  row.style_key,
    style:     row.style_label,
    color:     row.color,
    filter:    row.filter,
    emoji:     row.emoji || "✨",
    imgSrc:    row.image_url || null,
    imagePath: row.image_path || null,
    likes:     row.likes || 0,
    createdAt: row.created_at,
  };
}

// ── Users (tabla: children) ───────────────────────────────────────────────
const usersAPI = {
  async list() {
    const { data, error } = await _client()
      .from("children")
      .select("*")
      .order("last_seen_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(_toUser);
  },

  async get(id) {
    const { data, error } = await _client()
      .from("children")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data ? _toUser(data) : null;
  },

  async create({ name, avatar }) {
    if (!_rl.check("users", 3))
      throw new Error("RATE_LIMIT: Espera un momento antes de crear otro perfil.");
    const { data, error } = await _client()
      .from("children")
      .insert({ name: (name || "").trim(), avatar: avatar || "🦄" })
      .select()
      .single();
    if (error) throw error;
    return _toUser(data);
  },

  async touch(id) {
    const { data, error } = await _client()
      .from("children")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return null;
    return data ? _toUser(data) : null;
  },
};

// ── Artworks (vista: artworks_with_likes) ────────────────────────────────
const artworksAPI = {
  async list() {
    const { data, error } = await _client()
      .from("artworks_with_likes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(_toArtwork);
  },

  async byChild(childId) {
    const { data, error } = await _client()
      .from("artworks_with_likes")
      .select("*")
      .eq("child_id", childId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(_toArtwork);
  },

  async create(input) {
    if (!_rl.check("artworks", 15))
      throw new Error("RATE_LIMIT: Registraste muchas obras seguidas. Intenta en un momento.");
    const sb = _client();
    let image_url = null;
    let image_path = null;

    if (input.imgSrc?.startsWith("data:")) {
      const blob = _dataUrlToBlob(input.imgSrc);
      const ext  = blob.type === "image/jpeg" ? "jpg" : "png";
      const path = `${input.childId}/${Date.now()}.${ext}`;

      const { error: upErr } = await sb.storage
        .from("artworks")
        .upload(path, blob, { contentType: blob.type, upsert: false });

      if (!upErr) {
        image_path = path;
        const { data: urlData } = sb.storage.from("artworks").getPublicUrl(path);
        image_url = urlData?.publicUrl || null;
      }
    }

    const { data, error } = await sb
      .from("artworks")
      .insert({
        child_id:    input.childId,
        name:        input.name,
        author:      input.author,
        age:         input.age,
        style_key:   input.styleKey,
        style_label: input.style,
        color:       input.color,
        filter:      input.filter,
        emoji:       input.emoji || "✨",
        image_url,
        image_path,
      })
      .select()
      .single();
    if (error) throw error;
    return { ..._toArtwork(data), likes: 0 };
  },

  async delete(id, imagePath) {
    if (imagePath) {
      await _client().storage.from("artworks").remove([imagePath]);
    }
    const { error } = await _client().from("artworks").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Likes ─────────────────────────────────────────────────────────────────
const likesAPI = {
  async has(childId, artworkId) {
    const { data } = await _client()
      .from("likes")
      .select("id")
      .eq("child_id", childId)
      .eq("artwork_id", artworkId)
      .maybeSingle();
    return !!data;
  },

  async toggle(childId, artworkId) {
    const already = await this.has(childId, artworkId);
    if (already) {
      const { error } = await _client()
        .from("likes")
        .delete()
        .eq("child_id", childId)
        .eq("artwork_id", artworkId);
      if (error) throw error;
      return false;
    }
    const { error } = await _client()
      .from("likes")
      .insert({ child_id: childId, artwork_id: artworkId });
    if (error) throw error;
    return true;
  },
};

// ── Sesión (localStorage es suficiente — no necesita ir a Supabase) ───────
const SESSION_KEY    = "mambaq.session.v2";
const DEVICE_USERS_KEY = "mambaq.device.v1";

const sessionAPI = {
  get() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  },
  set(userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, startedAt: new Date().toISOString() }));
    usersAPI.touch(userId).catch(() => {});
  },
  clear() { localStorage.removeItem(SESSION_KEY); },
  async currentUser() {
    const s = this.get();
    return s ? await usersAPI.get(s.userId) : null;
  },

  // IDs de usuarios creados en ESTE dispositivo
  deviceUsers: {
    list() {
      try { return JSON.parse(localStorage.getItem(DEVICE_USERS_KEY) || "[]"); } catch { return []; }
    },
    add(userId) {
      const ids = this.list();
      if (!ids.includes(userId)) {
        ids.push(userId);
        localStorage.setItem(DEVICE_USERS_KEY, JSON.stringify(ids));
      }
    },
  },
};

// ── Verificar configuración ───────────────────────────────────────────────
const _cfg = window.MAMBAQ_CONFIG;
const _isReady = !!(
  _cfg?.supabaseUrl     && !_cfg.supabaseUrl.startsWith("PEGA") &&
  _cfg?.supabaseAnonKey && !_cfg.supabaseAnonKey.startsWith("PEGA")
);

window.db = {
  users:    usersAPI,
  artworks: artworksAPI,
  likes:    likesAPI,
  session:  sessionAPI,
  isReady:  _isReady,
};
