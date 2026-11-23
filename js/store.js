const PRODUCTOS_INICIALES = ["Playeras", "Camisas", "Cinturón", "Zapatos", "Zapatillas", "Perfumes"];
const DIAS_RECORDATORIO = 7;

export const Store = {
  data: {
    clientes: [],
    productos: PRODUCTOS_INICIALES,
    cuentas: [],
    ultimoRespaldo: null
  },

  init() {
    const local = localStorage.getItem('pedidos_data');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        this.data.clientes = parsed.clientes || [];
        this.data.productos = parsed.productos || PRODUCTOS_INICIALES;
        this.data.cuentas = parsed.cuentas || [];
        this.data.ultimoRespaldo = parsed.ultimoRespaldo || null;
      } catch(e) {
        console.error("Error cargando datos:", e);
      }
    } else {
      this.save();
    }
  },

  save() {
    localStorage.setItem('pedidos_data', JSON.stringify(this.data));
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

  addCliente(nombre, telefono = '') {
    const limpio = (nombre || '').trim();
    const exist = this.getClientePorNombre(limpio);
    if (exist) {
      if (telefono && !exist.telefono) {
        exist.telefono = telefono.trim();
        this.save();
      }
      return exist;
    }
    const nuevo = { id: this.uuid(), nombre: limpio, telefono: (telefono || '').trim() };
    this.data.clientes.push(nuevo);
    this.data.clientes.sort((a,b) => a.nombre.localeCompare(b.nombre));
    this.save();
    return nuevo;
  },

  updateCliente(id, nombre, telefono) {
    const cl = this.getCliente(id);
    if (cl) {
      cl.nombre = (nombre || '').trim();
      cl.telefono = (telefono || '').trim();
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
    const total = (cuenta.articulos || []).reduce((acc, a) => acc + (a.cantidad * a.precioUnitario), 0);
    const costoRealTotal = (cuenta.articulos || []).reduce((acc, a) => acc + (a.cantidad * (a.precioReal || 0)), 0);
    const utilidad = total - costoRealTotal;
    const abonado = (cuenta.abonos || []).reduce((acc, ab) => acc + ab.monto, 0);
    const resta = Math.max(0, total - abonado);
    const saldoAFavor = Math.max(0, abonado - total);
    const piezas = (cuenta.articulos || []).reduce((acc, a) => acc + a.cantidad, 0);
    const progreso = total <= 0 ? 0 : Math.min(1, abonado / total);
    const liquidada = !!cuenta.fechaLiquidacion;
    return { total, costoRealTotal, utilidad, abonado, resta, saldoAFavor, piezas, progreso, liquidada };
  },

  checkLiquidacion(cuenta) {
    const { total, abonado } = this.calcularTotales(cuenta);
    const pagada = total > 0 && (abonado + 0.005 >= total);
    if (pagada && !cuenta.fechaLiquidacion) {
      cuenta.fechaLiquidacion = Date.now();
    } else if (!pagada && cuenta.fechaLiquidacion) {
      cuenta.fechaLiquidacion = null;
    }
  },

  addArticulo(clienteId, producto, cantidad, precioUnitario, precioReal = 0, abonoInicial = 0) {
    const prod = this.addProducto(producto);
    const ahora = Date.now();
    const art = { id: this.uuid(), producto: prod, cantidad: parseInt(cantidad), precioUnitario: parseFloat(precioUnitario), precioReal: parseFloat(precioReal) || 0, fecha: ahora };
    let cuenta = this.getCuentaActiva(clienteId);
    if (!cuenta) {
      cuenta = { id: this.uuid(), clienteId, articulos: [art], abonos: [], fechaCreacion: ahora, fechaLiquidacion: null };
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

  reopenCuenta(cuentaId) {
    const cuenta = this.getCuenta(cuentaId);
    if (!cuenta) return false;
    if (this.getCuentaActiva(cuenta.clienteId)) return false;
    cuenta.fechaLiquidacion = null;
    this.save();
    return true;
  },

  getLiquidadasEnMes(year, month) {
    return this.data.cuentas.filter(c => {
      if (!c.fechaLiquidacion) return false;
      const d = new Date(c.fechaLiquidacion);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }
};

