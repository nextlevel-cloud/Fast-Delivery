const PRODUCTOS_INICIALES = ["Playeras", "Camisas", "Cinturón", "Zapatos", "Zapatillas", "Perfumes"];
const DIAS_RECORDATORIO = 7;
const SUPABASE_URL = 'https://dtkucbaomomsvnjxatfc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iYLTm8CdcQKj8qgPyuk4gg_bPvE7Lcm';

export const Store = {
  data: {
    clientes: [],
    productos: PRODUCTOS_INICIALES,
    cuentas: [],
    ultimoRespaldo: null,
    ultimoAutoRespaldo: null
  },

  cloud: {
    clave: '',
    pin: '',
    autoActivo: false,
    ultimoNube: null,
    estado: ''
  },

  _cloudTimer: null,

  init() {
    this.loadCloudConfig();
    const local = localStorage.getItem('pedidos_data');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        this.data.clientes = parsed.clientes || [];
        this.data.productos = parsed.productos || PRODUCTOS_INICIALES;
        this.data.cuentas = parsed.cuentas || [];
        this.data.ultimoRespaldo = parsed.ultimoRespaldo || null;
        this.data.ultimoAutoRespaldo = parsed.ultimoAutoRespaldo || null;
        if (this.asignarFoliosFaltantes()) this.save(false);
      } catch(e) {
        console.error("Error cargando datos:", e);
      }
    } else {
      this.save(false);
    }
  },

  loadCloudConfig() {
    try {
      const raw = localStorage.getItem('pedidos_cloud_cfg');
      if (raw) {
        const c = JSON.parse(raw);
        this.cloud.clave = c.clave || '';
        this.cloud.pin = c.pin || '';
        this.cloud.autoActivo = !!c.autoActivo;
        this.cloud.ultimoNube = c.ultimoNube || null;
      }
    } catch (_) {}
  },

  saveCloudConfig(clave, pin, autoActivo) {
    this.cloud.clave = (clave || '').trim().toLowerCase();
    this.cloud.pin = (pin || '').trim();
    this.cloud.autoActivo = !!autoActivo && this.cloud.clave.length >= 3 && this.cloud.pin.length >= 4;
    localStorage.setItem('pedidos_cloud_cfg', JSON.stringify({
      clave: this.cloud.clave,
      pin: this.cloud.pin,
      autoActivo: this.cloud.autoActivo,
      ultimoNube: this.cloud.ultimoNube
    }));
  },

  async _cloudRpc(fnName, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  },

  async subirRespaldoNube() {
    if (this.cloud.clave.length < 3 || this.cloud.pin.length < 4) {
      return { ok: false, message: 'Configura tu clave (mín. 3 letras) y PIN (mín. 4 dígitos).' };
    }
    this.cloud.estado = 'Sincronizando...';
    try {
      const payload = {
        app: 'Pedidos',
        version: 1,
        fechaRespaldo: Date.now(),
        clientes: this.data.clientes,
        productos: this.data.productos,
        cuentas: this.data.cuentas
      };
      const res = await this._cloudRpc('save_tickets_backup', {
        p_backup_key: this.cloud.clave,
        p_pin: this.cloud.pin,
        p_payload: payload
      });
      if (res.ok) {
        this.cloud.ultimoNube = Date.now();
        this.cloud.estado = 'Sincronizado';
        this.saveCloudConfig(this.cloud.clave, this.cloud.pin, this.cloud.autoActivo);
        return { ok: true, message: 'Respaldo subido a la nube ✔' };
      }
      this.cloud.estado = 'Error: ' + (res.message || 'No se pudo subir');
      return { ok: false, message: res.message || 'No se pudo subir el respaldo' };
    } catch (e) {
      this.cloud.estado = 'Error: ' + e.message;
      return { ok: false, message: e.message };
    }
  },

  async descargarRespaldoNube(clave, pin) {
    try {
      const res = await this._cloudRpc('load_tickets_backup', {
        p_backup_key: (clave || '').trim().toLowerCase(),
        p_pin: (pin || '').trim()
      });
      if (res.ok && res.payload) {
        return { ok: true, payload: res.payload };
      }
      return { ok: false, message: res.message || 'No se encontró respaldo en la nube' };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  },

  asignarFoliosFaltantes() {
    let maxFolio = this.data.clientes.reduce((m, c) => Math.max(m, parseInt(c.folio) || 0), 0);
    let cambio = false;
    this.data.clientes.forEach(c => {
      if (!c.folio || c.folio <= 0) {
        maxFolio++;
        c.folio = maxFolio;
        cambio = true;
      }
    });
    return cambio;
  },

  siguienteFolio() {
    return this.data.clientes.reduce((m, c) => Math.max(m, parseInt(c.folio) || 0), 0) + 1;
  },

  formatFolio(cliente) {
    if (!cliente || !cliente.folio || cliente.folio <= 0) return '';
    return '#' + String(cliente.folio).padStart(3, '0');
  },

  save(syncCloud = true) {
    const ahora = Date.now();
    this.data.ultimoAutoRespaldo = ahora;
    const payload = JSON.stringify(this.data);
    localStorage.setItem('pedidos_data', payload);
    try {
      const autoSnapshot = JSON.stringify({
        app: 'Pedidos',
        version: 1,
        fechaRespaldo: ahora,
        clientes: this.data.clientes,
        productos: this.data.productos,
        cuentas: this.data.cuentas
      });
      localStorage.setItem('pedidos_auto_backup_latest', autoSnapshot);
    } catch (_) {}

    if (syncCloud && this.cloud.autoActivo && this.cloud.clave.length >= 3 && this.cloud.pin.length >= 4) {
      clearTimeout(this._cloudTimer);
      this._cloudTimer = setTimeout(() => {
        this.subirRespaldoNube().catch(() => {});
      }, 1500);
    }
  },

  getAutoRespaldo() {
    const raw = localStorage.getItem('pedidos_auto_backup_latest');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  },

  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  normalize(text) {
    return (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  },

  formatMoney(val) {
    const num = parseFloat(val) || 0;
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  },

  formatDateTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hrs = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()} ${hrs}:${min}`;
  },

  getCliente(id) {
    return this.data.clientes.find(c => c.id === id);
  },

  getClientePorNombre(nombre) {
    const n = this.normalize(nombre);
    return this.data.clientes.find(c => this.normalize(c.nombre) === n);
  },

  addCliente(nombre, telefono = '', localidad = '', tipo = '') {
    const limpio = (nombre || '').trim();
    const exist = this.getClientePorNombre(limpio);
    if (exist) {
      let cambio = false;
      if (telefono && !exist.telefono) { exist.telefono = telefono.trim(); cambio = true; }
      if (localidad && !exist.localidad) { exist.localidad = localidad.trim(); cambio = true; }
      if (tipo && !exist.tipo) { exist.tipo = tipo.trim(); cambio = true; }
      if (cambio) this.save();
      return exist;
    }
    const nuevo = {
      id: this.uuid(),
      nombre: limpio,
      telefono: (telefono || '').trim(),
      localidad: (localidad || '').trim(),
      tipo: (tipo || '').trim(),
      folio: this.siguienteFolio()
    };
    this.data.clientes.push(nuevo);
    this.data.clientes.sort((a,b) => a.nombre.localeCompare(b.nombre));
    this.save();
    return nuevo;
  },

  updateCliente(id, nombre, telefono, localidad = '', tipo = '') {
    const cl = this.getCliente(id);
    if (cl) {
      cl.nombre = (nombre || '').trim();
      cl.telefono = (telefono || '').trim();
      cl.localidad = (localidad || '').trim();
      cl.tipo = (tipo || '').trim();
      this.data.clientes.sort((a,b) => a.nombre.localeCompare(b.nombre));
      this.save();
    }
  },

  deleteCliente(id) {
    if (this.data.cuentas.some(c => c.clienteId === id && !c.fechaLiquidacion && ((c.articulos || []).length > 0 || (c.abonos || []).length > 0))) {
      return false;
    }
    this.data.clientes = this.data.clientes.filter(c => c.id !== id);
    this.save();
    return true;
  },

  addProducto(nombre) {
    const limpio = (nombre || '').trim();
    const cap = limpio.charAt(0).toUpperCase() + limpio.slice(1);
    const exist = this.data.productos.find(p => this.normalize(p) === this.normalize(cap));
    if (exist) return exist;
    this.data.productos.push(cap);
    this.data.productos.sort((a,b) => a.localeCompare(b));
    this.save();
    return cap;
  },

  updateProducto(oldName, newName) {
    const limpio = (newName || '').trim();
    if (!limpio) return;
    this.data.productos = this.data.productos.map(p => p === oldName ? limpio : p);
    this.data.productos.sort((a,b) => a.localeCompare(b));
    this.save();
  },

  deleteProducto(nombre) {
    this.data.productos = this.data.productos.filter(p => p !== nombre);
    this.save();
  },

  getCuentasActivas() {
    return this.data.cuentas.filter(c => !c.fechaLiquidacion && ((c.articulos || []).length > 0 || (c.abonos || []).length > 0));
  },

  getCuentaActiva(clienteId) {
    return this.data.cuentas.find(c => c.clienteId === clienteId && !c.fechaLiquidacion && ((c.articulos || []).length > 0 || (c.abonos || []).length > 0));
  },

  getCuenta(id) {
    return this.data.cuentas.find(c => c.id === id);
  },

  calcularTotales(cuenta) {
    const subtotalArticulos = (cuenta.articulos || []).reduce((acc, a) => acc + (a.cantidad * a.precioUnitario), 0);
    const financiamientoPct = Math.max(0, parseFloat(cuenta.financiamientoPct) || 0);
    const montoFinanciamiento = subtotalArticulos * (financiamientoPct / 100);
    const total = subtotalArticulos + montoFinanciamiento;
    const costoRealTotal = (cuenta.articulos || []).reduce((acc, a) => acc + (a.cantidad * (a.precioReal || 0)), 0);
    const utilidad = total - costoRealTotal;
    const abonado = (cuenta.abonos || []).reduce((acc, ab) => acc + ab.monto, 0);
    const resta = Math.max(0, total - abonado);
    const saldoAFavor = Math.max(0, abonado - total);
    const piezas = (cuenta.articulos || []).reduce((acc, a) => acc + a.cantidad, 0);
    const progreso = total <= 0 ? 0 : Math.min(1, abonado / total);
    const pagadaCompleta = total > 0 && (abonado + 0.005 >= total);
    const liquidada = !!cuenta.fechaLiquidacion && (cuenta.estadoPedido || 'comprando') === 'entregado';
    return { subtotalArticulos, financiamientoPct, montoFinanciamiento, total, costoRealTotal, utilidad, abonado, resta, saldoAFavor, piezas, progreso, pagadaCompleta, liquidada };
  },

  checkLiquidacion(cuenta) {
    const { total, abonado } = this.calcularTotales(cuenta);
    const listaParaRegistro = total > 0 && (abonado + 0.005 >= total) && (cuenta.estadoPedido || 'comprando') === 'entregado';
    if (listaParaRegistro && !cuenta.fechaLiquidacion) {
      cuenta.fechaLiquidacion = Date.now();
    } else if (!listaParaRegistro && cuenta.fechaLiquidacion) {
      cuenta.fechaLiquidacion = null;
    }
  },

  addArticulo(clienteId, producto, cantidad, precioUnitario, precioReal = 0, abonoInicial = 0) {
    const prod = this.addProducto(producto);
    const ahora = Date.now();
    const art = { id: this.uuid(), producto: prod, cantidad: parseInt(cantidad), precioUnitario: parseFloat(precioUnitario), precioReal: parseFloat(precioReal) || 0, fecha: ahora };
    let cuenta = this.getCuentaActiva(clienteId);
    if (!cuenta) {
      cuenta = { id: this.uuid(), clienteId, articulos: [art], abonos: [], fechaCreacion: ahora, fechaLiquidacion: null, estadoPedido: 'comprando', financiamientoPct: 0 };
      this.data.cuentas.push(cuenta);
    } else {
      cuenta.articulos.push(art);
    }

    if (abonoInicial > 0) {
      cuenta.abonos.push({ id: this.uuid(), monto: parseFloat(abonoInicial), fecha: ahora, nota: 'Abono inicial' });
    }
    this.checkLiquidacion(cuenta);
    this.save();
    return cuenta.id;
  },

  updateArticulo(cuentaId, articuloId, producto, cantidad, precioUnitario, precioReal = 0) {
    const cuenta = this.getCuenta(cuentaId);
    if (!cuenta) return false;
    const eraLiquidada = !!cuenta.fechaLiquidacion;
    const prod = this.addProducto(producto);
    cuenta.articulos = cuenta.articulos.map(a => {
      if (a.id === articuloId) {
        return {
          ...a,
          producto: prod,
          cantidad: parseInt(cantidad),
          precioUnitario: parseFloat(precioUnitario),
          precioReal: parseFloat(precioReal) || 0
        };
      }
      return a;
    });
    this.checkLiquidacion(cuenta);
    this.save();
    return !eraLiquidada && !!cuenta.fechaLiquidacion;
  },

  deleteArticulo(cuentaId, articuloId) {
    const cuenta = this.getCuenta(cuentaId);
    if (!cuenta) return;
    cuenta.articulos = cuenta.articulos.filter(a => a.id !== articuloId);
    if (cuenta.articulos.length === 0 && cuenta.abonos.length === 0) {
      this.data.cuentas = this.data.cuentas.filter(c => c.id !== cuentaId);
    } else {
      this.checkLiquidacion(cuenta);
    }
    this.save();
  },

  addAbono(cuentaId, monto, nota = '') {
    const cuenta = this.getCuenta(cuentaId);
    if (!cuenta) return false;
    const eraLiquidada = !!cuenta.fechaLiquidacion;
    cuenta.abonos.push({ id: this.uuid(), monto: parseFloat(monto), fecha: Date.now(), nota: (nota || '').trim() });
    this.checkLiquidacion(cuenta);
    this.save();
    return !eraLiquidada && !!cuenta.fechaLiquidacion;
  },

  deleteAbono(cuentaId, abonoId) {
    const cuenta = this.getCuenta(cuentaId);
    if (!cuenta) return;
    cuenta.abonos = cuenta.abonos.filter(ab => ab.id !== abonoId);
    this.checkLiquidacion(cuenta);
    this.save();
  },

  setEstadoPedido(cuentaId, estado) {
    const cuenta = this.getCuenta(cuentaId);
    if (!cuenta) return false;
    const eraLiquidada = !!cuenta.fechaLiquidacion;
    cuenta.estadoPedido = estado;
    this.checkLiquidacion(cuenta);
    this.save();
    return !eraLiquidada && !!cuenta.fechaLiquidacion;
  },

  setFinanciamiento(cuentaId, porcentaje) {
    const cuenta = this.getCuenta(cuentaId);
    if (!cuenta) return false;
    const eraLiquidada = !!cuenta.fechaLiquidacion;
    cuenta.financiamientoPct = Math.max(0, parseFloat(porcentaje) || 0);
    this.checkLiquidacion(cuenta);
    this.save();
    return !eraLiquidada && !!cuenta.fechaLiquidacion;
  },

  reopenCuenta(cuentaId) {
    const cuenta = this.getCuenta(cuentaId);
    if (!cuenta) return false;
    if (this.getCuentaActiva(cuenta.clienteId)) return false;
    cuenta.fechaLiquidacion = null;
    cuenta.estadoPedido = 'comprando';
    this.save();
    return true;
  },

  getLiquidadasEnMes(year, month) {
    return this.data.cuentas.filter(c => {
      if (!c.fechaLiquidacion || (c.estadoPedido || 'comprando') !== 'entregado') return false;
      const d = new Date(c.fechaLiquidacion);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }
};

