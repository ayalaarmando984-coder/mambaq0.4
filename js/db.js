// ═══════════════════════════════════════════════════════════════════════════
//  MAMBAQ DB — Capa de persistencia sobre Supabase
//  ─────────────────────────────────────────────────────────────────────────
//  API pública (todas async excepto db.session):
//    db.users.create({ name, avatar })   db.users.list()
//    db.users.get(id)                    db.users.touch(id)
//    db.artworks.create({...})           db.artworks.list()
//    db.artworks.byChild(childId)
//    db.likes.has(childId, artworkId)    db.likes.toggle(childId, artworkId)
//    db.session.set(userId)              db.session.get()
//    db.session.clear()                  db.session.currentUser()  (async)
// ═══════════════════════════════════════════════════════════════════════════

// ── Cliente Supabase ────────────────────────────────────────────────────────
const _cfg = window.MAMBAQ_CONFIG || {};
const _sbReady = (typeof supabase !== "undefined") &&
                 _cfg.supabaseUrl && _cfg.supabaseAnonKey &&
                 !_cfg.supabaseUrl.startsWith("PEGA_");

const sb = _sbReady
  ? supabase.createClient(_cfg.supabaseUrl, _cfg.supabaseAnonKey)
  : null;

if (!sb) {
  console.warn("⚠️  Supabase no configurado. Edita js/config.js con tu URL y anon key.");
}

// ── Sesión local (qué niño está en el dispositivo ahora) ───────────────────
const SESSION_KEY = "mambaq.session.v2";

const sessionAPI = {
  get() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  },
  set(userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, startedAt: new Date().toISOString() }));
    usersAPI.touch(userId).catch(() => {});
  },
  clear() { localStorage.removeItem(SESSION_KEY); },
  async currentUser() {
    const s = this.get();
    if (!s) return null;
    return await usersAPI.get(s.userId);
  },
};

// ── Users / Children ───────────────────────────────────────────────────────
const usersAPI = {
  async list() {
    if (!sb) return [];
    const { data, error } = await sb.from("children")
      .select("*").order("last_seen_at", { ascending: false });
    if (error) { console.warn(error); return []; }
    return data.map(_mapUser);
  },
  async get(id) {
    if (!sb || !id) return null;
    const { data, error } = await sb.from("children")
      .select("*").eq("id", id).maybeSingle();
    if (error) { console.warn(error); return null; }
    return data ? _mapUser(data) : null;
  },
  async create({ name, avatar }) {
    if (!sb) throw new Error("Supabase no configurado");
    const { data, error } = await sb.from("children")
      .insert({ name: (name || "").trim(), avatar: avatar || "🦄" })
      .select().single();
    if (error) throw error;
    return _mapUser(data);
  },
  async touch(id) {
    if (!sb || !id) return null;
    const { data } = await sb.from("children")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", id).select().maybeSingle();
    return data ? _mapUser(data) : null;
  },
};

// ── Artworks ───────────────────────────────────────────────────────────────
const artworksAPI = {
  async list() {
    if (!sb) return [];
    const { data, error } = await sb.from("artworks_with_likes")
      .select("*").order("created_at", { ascending: false });
    if (error) { console.warn(error); return []; }
    return data.map(_mapArtwork);
  },
  async byChild(childId) {
    if (!sb || !childId) return [];
    const { data, error } = await sb.from("artworks_with_likes")
      .select("*").eq("child_id", childId).order("created_at", { ascending: false });
    if (error) { console.warn(error); return []; }
    return data.map(_mapArtwork);
  },
  async create(input) {
    if (!sb) throw new Error("Supabase no configurado");

    const row = {
      child_id:    input.childId,
      name:        input.name,
      author:      input.author,
      age:         input.age,
      style_key:   input.styleKey,
      style_label: input.style,
      color:       input.color,
      filter:      input.filter,
      emoji:       input.emoji || "✨",
    };

    // 1) Insert sin imagen
    const { data: inserted, error: insErr } = await sb.from("artworks")
      .insert(row).select().single();
    if (insErr) throw insErr;

    // 2) Subir imagen a Storage si vino dataURL
    let imageUrl = null, imagePath = null;
    if (input.imgSrc && input.imgSrc.startsWith("data:")) {
      try {
        const blob = await (await fetch(input.imgSrc)).blob();
        imagePath  = `${input.childId}/${inserted.id}.png`;
        const { error: upErr } = await sb.storage.from("artworks")
          .upload(imagePath, blob, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;
        imageUrl = sb.storage.from("artworks").getPublicUrl(imagePath).data.publicUrl;

        // 3) Update con la URL
        await sb.from("artworks")
          .update({ image_url: imageUrl, image_path: imagePath })
          .eq("id", inserted.id);
      } catch (e) {
        console.warn("No se pudo subir la imagen a Storage:", e);
      }
    }

    return _mapArtwork({ ...inserted, image_url: imageUrl, image_path: imagePath, likes: 0 });
  },
};

// ── Likes ──────────────────────────────────────────────────────────────────
const likesAPI = {
  async has(childId, artworkId) {
    if (!sb || !childId || !artworkId) return false;
    const { data } = await sb.from("likes")
      .select("id").eq("child_id", childId).eq("artwork_id", artworkId).maybeSingle();
    return !!data;
  },
  async toggle(childId, artworkId) {
    if (!sb) throw new Error("Supabase no configurado");
    const { data: existing } = await sb.from("likes")
      .select("id").eq("child_id", childId).eq("artwork_id", artworkId).maybeSingle();

    if (existing) {
      await sb.from("likes").delete().eq("id", existing.id);
      return false;
    }
    await sb.from("likes").insert({ child_id: childId, artwork_id: artworkId });
    return true;
  },
};

// ── Mapeadores DB → forma usada por la UI (mantiene API previa) ────────────
function _mapUser(row) {
  return {
    id:         row.id,
    name:       row.name,
    avatar:     row.avatar,
    createdAt:  row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}
function _mapArtwork(row) {
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

// ── API pública ────────────────────────────────────────────────────────────
window.db = {
  users:    usersAPI,
  artworks: artworksAPI,
  likes:    likesAPI,
  session:  sessionAPI,
  isReady:  _sbReady,
};
