/**
 * Plantilla lista para copiar en cualquiera de tus apps Web (HTML/JS)
 * cuando estÃ©n listas para producciÃ³n.
 *
 * Uso:
 *   const lic = new LicenseClient({
 *     supabaseUrl: 'https://TU-PROYECTO.supabase.co',
 *     supabaseAnonKey: 'TU_ANON_KEY',
 *     appSlug: 'tradingbot'
 *   });
 *   const status = await lic.verify();
 *   if (!status.active) { // Mostrar pantalla de activaciÃ³n }
 */
export class LicenseClient {
  constructor({ supabaseUrl, supabaseAnonKey, appSlug }) {
    this.supabaseUrl = supabaseUrl.replace(/\/$/, '');
    this.supabaseAnonKey = supabaseAnonKey;
    this.appSlug = appSlug;
    this.deviceKey = `lic_device_id_${appSlug}`;
    this.cacheKey = `lic_cache_${appSlug}`;
  }

  getDeviceId() {
    let id = localStorage.getItem(this.deviceKey);
    if (!id) {
      id = `web-${crypto.randomUUID()}`;
      localStorage.setItem(this.deviceKey, id);
    }
    return id;
  }

  async _rpc(fnName, body) {
    const res = await fetch(`${this.supabaseUrl}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.supabaseAnonKey,
        Authorization: `Bearer ${this.supabaseAnonKey}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async redeem(code) {
    const data = await this._rpc('redeem_license', {
      p_code: code.trim().toUpperCase(),
      p_app_slug: this.appSlug,
      p_device_id: this.getDeviceId()
    });
    if (data.ok && data.expires_at) {
      localStorage.setItem(
        this.cacheKey,
        JSON.stringify({ expires_at: data.expires_at, checked_at: Date.now() })
      );
    }
    return data;
  }

  async verify(offlineGraceDays = 3) {
    try {
      const data = await this._rpc('verify_license', {
        p_app_slug: this.appSlug,
        p_device_id: this.getDeviceId()
      });
      if (data.active) {
        localStorage.setItem(
          this.cacheKey,
          JSON.stringify({ expires_at: data.expires_at, checked_at: Date.now() })
        );
      } else {
        localStorage.removeItem(this.cacheKey);
      }
      return data;
    } catch {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return { active: false, offlineGrace: false };
      const cached = JSON.parse(raw);
      const withinGrace = Date.now() - cached.checked_at < offlineGraceDays * 86400000;
      return { active: withinGrace, expires_at: cached.expires_at, offlineGrace: withinGrace };
    }
  }
}

