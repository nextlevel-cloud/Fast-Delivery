import { Store } from './store.js';

const ESTADOS_PEDIDO = [
  { codigo: 'comprando', etiqueta: 'Pedido comprando', icono: '🛍️', badge: 'badge-orange' },
  { codigo: 'en_camino', etiqueta: 'Pedido en camino', icono: '🚚', badge: 'badge-blue' },
  { codigo: 'entregado', etiqueta: 'Pedido entregado', icono: '✅', badge: 'badge-green' }
];

export const Screens = {
  selectedClienteId: null,
  ultimaCuentaId: null,
  filtroEstado: null,
  filtroBusqueda: '',

  getEstadoInfo(cuenta) {
    const code = cuenta.estadoPedido || 'comprando';
    return ESTADOS_PEDIDO.find(e => e.codigo === code) || ESTADOS_PEDIDO[0];
  },

  renderCuentas() {
    const activas = Store.getCuentasActivas();
    const totalPorCobrar = activas.reduce((acc, c) => acc + Store.calcularTotales(c).resta, 0);
    const ultimoRespaldo = Store.data.ultimoRespaldo;
    const diasSinRespaldo = ultimoRespaldo ? Math.floor((Date.now() - ultimoRespaldo) / 86400000) : 999;
    const alertar = Store.data.cuentas.length > 0 && (!ultimoRespaldo || diasSinRespaldo >= 7);

    let html = '';
    if (alertar) {
      html += `
        <div class="card card-alert" onclick="window.App.openBackup()">
          <strong>💾 ${!ultimoRespaldo ? 'Aún no has respaldado tu información' : 'Hace más de 7 días que no respaldas'}</strong>
          <div style="font-size: 0.85rem; margin-top: 4px;">Toca aquí para crear un respaldo seguro de tus pedidos.</div>
        </div>
      `;
    }

    const chipsHtml = `
      <div class="chips-row">
        <button class="chip-btn ${this.filtroEstado === null ? 'active' : ''}" onclick="window.Screens.setFiltroEstado(null)">
          ${this.filtroEstado === null ? '✓ ' : ''}Todos (${activas.length})
        </button>
        ${ESTADOS_PEDIDO.map(est => {
          const count = activas.filter(c => (c.estadoPedido || 'comprando') === est.codigo).length;
          const active = this.filtroEstado === est.codigo;
          return `
            <button class="chip-btn ${active ? 'active' : ''}" onclick="window.Screens.setFiltroEstado('${est.codigo}')">
              ${active ? '✓ ' : ''}${est.etiqueta} (${count})
            </button>
          `;
        }).join('')}
      </div>
    `;

    html += `
      <div class="card card-primary">
        <div class="totales-label">Por cobrar</div>
        <div class="totales-val grande" style="color: var(--primary-dark);">${Store.formatMoney(totalPorCobrar)}</div>
        <div style="font-size: 0.8rem; color: var(--secondary); margin-top: 4px;">
          ${activas.length} cuenta(s) pendiente(s) • ${Store.data.clientes.length} cliente(s)
        </div>
      </div>

      <div class="form-group search-container">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="inputBuscarCuenta" class="input-box" placeholder="Buscar cliente..." value="${this.filtroBusqueda}" oninput="window.Screens.filterCuentas(this.value)">
          <div class="search-actions">
            <button class="icon-btn" onclick="document.getElementById('inputBuscarCuenta').value=''; window.Screens.filterCuentas('')">✕</button>
          </div>
        </div>
      </div>

      ${chipsHtml}

      <div id="cuentasList">
        ${this.renderCuentasList(activas, this.filtroBusqueda)}
      </div>
    `;
    return html;
  },

  setFiltroEstado(estado) {
    this.filtroEstado = this.filtroEstado === estado ? null : estado;
    window.App.render();
  },

  renderCuentasList(activas, filtro = '') {
    const norm = Store.normalize(filtro);
    const filtradas = activas.filter(c => {
      const cl = Store.getCliente(c.clienteId);
      const matchNombre = cl && (!norm || Store.normalize(cl.nombre).includes(norm));
      const matchEstado = !this.filtroEstado || (c.estadoPedido || 'comprando') === this.filtroEstado;
      return matchNombre && matchEstado;
    });

    if (filtradas.length === 0) {
      return `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          ${activas.length === 0 ? 'No hay cuentas pendientes.<br>Toca <strong>“＋ Nuevo pedido”</strong> para empezar.' : 'Ningún pedido coincide con el filtro.'}
        </div>
      `;
    }

    return filtradas.map(cuenta => {
      const cliente = Store.getCliente(cuenta.clienteId);
      const t = Store.calcularTotales(cuenta);
      const est = this.getEstadoInfo(cuenta);
      return `
        <div class="card clickable" onclick="window.App.openDetalle('${cuenta.id}')">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <strong style="font-size: 1.05rem;">${cliente.nombre}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                ${t.piezas} pieza(s) • desde ${Store.formatDate(cuenta.fechaCreacion)}
              </div>
            </div>
            <button class="btn btn-outlined btn-sm" onclick="event.stopPropagation(); window.App.openNewOrder('${cliente.id}')">＋ Prenda</button>
          </div>
          <div style="margin-top: 8px;">
            <span class="badge ${est.badge}">${est.icono} ${est.etiqueta}</span>
          </div>
          <div style="margin-top: 10px;">
            <div class="totales-row">
              <div class="totales-col"><span class="totales-label">Total</span><span class="totales-val">${Store.formatMoney(t.total)}</span></div>
              <div class="totales-col"><span class="totales-label">Abonado</span><span class="totales-val" style="color: var(--green);">${Store.formatMoney(t.abonado)}</span></div>
              <div class="totales-col"><span class="totales-label">Resta</span><span class="totales-val" style="color: var(--red);">${Store.formatMoney(t.resta)}</span></div>
            </div>
            <div class="progreso-bar">
              <div class="progreso-val" style="width: ${(t.progreso * 100)}%;"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  filterCuentas(val) {
    this.filtroBusqueda = val;
    const activas = Store.getCuentasActivas();
    document.getElementById('cuentasList').innerHTML = this.renderCuentasList(activas, val);
  }
};

Object.assign(Screens, {
  renderNuevo(clienteInicialId) {
    const cl = clienteInicialId ? Store.getCliente(clienteInicialId) : null;
    const nombreCliente = cl ? cl.nombre : '';
    this.selectedClienteId = cl ? cl.id : null;

    return `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <span class="form-label">1. Cliente</span>
          <div class="search-container">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input type="text" id="nuevoCliente" class="input-box" placeholder="Nombre del cliente" value="${nombreCliente}" oninput="window.Screens.onInputCliente(this.value)" autocomplete="off">
              <div class="search-actions">
                <button class="icon-btn" onclick="window.Screens.toggleDropdown('dropClientes')">▼</button>
              </div>
            </div>
            <div id="dropClientes" class="dropdown-list" style="display: none;"></div>
          </div>
          <div id="infoClienteActual" style="margin-top: 6px;"></div>
        </div>

        <div>
          <span class="form-label">2. Prenda / Producto</span>
          <div class="search-container">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input type="text" id="nuevoProducto" class="input-box" placeholder="Playeras, camisas, perfumes..." oninput="window.Screens.onInputProducto(this.value)" autocomplete="off">
              <div class="search-actions">
                <button class="icon-btn" onclick="window.Screens.toggleDropdown('dropProductos')">▼</button>
              </div>
            </div>
            <div id="dropProductos" class="dropdown-list" style="display: none;"></div>
          </div>
          <button class="btn btn-outlined" style="margin-top: 8px; height: 42px; font-size: 0.9rem;" onclick="window.Screens.modalNuevaPrendaEnPedido()">
            ＋ Agregar prenda nueva al catálogo
          </button>
        </div>

        <div>
          <span class="form-label">3. Cantidad y Costo</span>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <button class="btn btn-outlined" style="width: 48px; height: 48px;" onclick="window.Screens.modCantidad(-1)">−</button>
            <input type="number" id="nuevoCantidad" class="input-box" value="1" min="1" style="text-align: center; font-weight: bold; width: 90px;" oninput="window.Screens.calcResumenNuevo()">
            <button class="btn btn-outlined" style="width: 48px; height: 48px;" onclick="window.Screens.modCantidad(1)">+</button>
          </div>

          <div class="form-group">
            <input type="number" id="nuevoPrecioReal" class="input-box" placeholder="Precio real (lo que te costó a ti - $)" step="any" oninput="window.Screens.calcResumenNuevo()">
          </div>

          <div class="form-group">
            <input type="number" id="nuevoPrecio" class="input-box" placeholder="Costo por pieza (al cliente - $)" step="any" oninput="window.Screens.calcResumenNuevo()">
          </div>

          <div class="form-group">
            <input type="number" id="nuevoAbono" class="input-box" placeholder="Abono en este momento ($ opcional)" step="any" oninput="window.Screens.calcResumenNuevo()">
          </div>
        </div>

        <div class="card" id="resumenNuevoBox">
          <div class="totales-row"><span>Esta prenda</span><span id="resEstaPrenda">$0.00</span></div>
          <div class="totales-row"><span>Total cuenta</span><span id="resTotalCuenta" style="font-weight: bold;">$0.00</span></div>
          <div class="totales-row"><span>Abonado</span><span id="resAbonado">$0.00</span></div>
          <div class="totales-row" style="margin-top: 6px; border-top: 1px dashed var(--border); padding-top: 6px;">
            <strong id="resRestaLabel">Resta por liquidar</strong>
            <strong id="resResta" style="color: var(--red); font-size: 1.15rem;">$0.00</strong>
          </div>
        </div>

        <button class="btn btn-primary" onclick="window.Screens.guardarArticulo(false)">Guardar</button>
        <button class="btn btn-outlined" onclick="window.Screens.guardarArticulo(true)">Guardar y agregar otra prenda</button>
      </div>
    `;
  },

  toggleDropdown(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
    if (id === 'dropClientes') this.onInputCliente(document.getElementById('nuevoCliente').value);
    if (id === 'dropProductos') this.onInputProducto(document.getElementById('nuevoProducto').value);
  },

  onInputCliente(val) {
    const drop = document.getElementById('dropClientes');
    const norm = Store.normalize(val);
    const options = Store.data.clientes.filter(c => !norm || Store.normalize(c.nombre).includes(norm));
    const exact = Store.data.clientes.find(c => Store.normalize(c.nombre) === norm);

    let html = '';
    if (norm && !exact) {
      html += `<div class="dropdown-add" onclick="window.Screens.selectNuevoCliente('${val.trim()}')">＋ Agregar cliente “${val.trim()}”</div>`;
    }
    options.forEach(c => {
      const cuenta = Store.getCuentaActiva(c.id);
      const sub = cuenta ? `Debe ${Store.formatMoney(Store.calcularTotales(cuenta).resta)}` : (c.telefono || '');
      html += `
        <div class="dropdown-item" onclick="window.Screens.selectCliente('${c.id}')">
          <strong>${c.nombre}</strong>
          ${sub ? `<span style="font-size: 0.75rem; color: var(--text-muted);">${sub}</span>` : ''}
        </div>
      `;
    });
    drop.innerHTML = html || '<div style="padding: 12px; color: var(--text-muted);">Sin resultados</div>';
    drop.style.display = 'block';

    if (this.selectedClienteId) {
      const current = Store.getCliente(this.selectedClienteId);
      if (current && current.nombre !== val) {
        this.selectedClienteId = null;
      }
    }
    this.updateInfoCliente();
    this.calcResumenNuevo();
  },

  selectCliente(id) {
    const cl = Store.getCliente(id);
    this.selectedClienteId = cl.id;
    document.getElementById('nuevoCliente').value = cl.nombre;
    document.getElementById('dropClientes').style.display = 'none';
    this.updateInfoCliente();
    this.calcResumenNuevo();
  },

  dlgTipoCliente: '',

  toggleTipoCliente(val) {
    this.dlgTipoCliente = this.dlgTipoCliente === val ? '' : val;
    const btnM = document.getElementById('btnTipoM');
    const btnB = document.getElementById('btnTipoB');
    if (btnM) {
      btnM.className = this.dlgTipoCliente === 'M' ? 'btn btn-primary' : 'btn btn-outlined';
      btnM.style.height = '42px';
      btnM.textContent = this.dlgTipoCliente === 'M' ? '✓ M • Mayoreo' : 'M • Mayoreo';
    }
    if (btnB) {
      btnB.className = this.dlgTipoCliente === 'B' ? 'btn btn-primary' : 'btn btn-outlined';
      btnB.style.height = '42px';
      btnB.textContent = this.dlgTipoCliente === 'B' ? '✓ B • Boutique' : 'B • Boutique';
    }
  },

  selectNuevoCliente(nombre, desdeCatalogo = false) {
    this.dlgTipoCliente = '';
    this.nuevoClienteDesdeCatalogo = desdeCatalogo;
    const modal = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-title">Nuevo Cliente</div>
          <div class="form-group">
            <span class="form-label">Nombre del cliente</span>
            <input type="text" id="dlgNomCli" class="input-box" value="${nombre}">
          </div>
          <div class="form-group">
            <span class="form-label">Número (WhatsApp 10 dígitos)</span>
            <input type="tel" id="dlgTelCli" class="input-box" placeholder="Ej. 5512345678">
          </div>
          <div class="form-group">
            <span class="form-label">Localidad</span>
            <input type="text" id="dlgLocCli" class="input-box" placeholder="Ej. Puebla, CDMX...">
          </div>
          <div class="form-group">
            <span class="form-label">Tipo de cliente (uso interno)</span>
            <div style="display: flex; gap: 8px;">
              <button type="button" id="btnTipoM" class="btn btn-outlined" style="flex: 1; height: 42px; font-size: 0.9rem;" onclick="window.Screens.toggleTipoCliente('M')">M • Mayoreo</button>
              <button type="button" id="btnTipoB" class="btn btn-outlined" style="flex: 1; height: 42px; font-size: 0.9rem;" onclick="window.Screens.toggleTipoCliente('B')">B • Boutique</button>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">
              Solo para control interno; no aparece en el ticket de WhatsApp.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outlined btn-sm" onclick="window.Screens.closeModal()">Cancelar</button>
            <button class="btn btn-primary btn-sm" onclick="window.Screens.confirmNuevoCliente()">Guardar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
  },

  confirmNuevoCliente() {
    const nom = document.getElementById('dlgNomCli').value.trim();
    const tel = document.getElementById('dlgTelCli').value.trim();
    const loc = (document.getElementById('dlgLocCli')?.value || '').trim();
    if (!nom) return;
    const nuevo = Store.addCliente(nom, tel, loc, this.dlgTipoCliente);
    this.closeModal();
    if (this.nuevoClienteDesdeCatalogo) {
      window.App.render();
    } else {
      this.selectCliente(nuevo.id);
    }
  },

  updateInfoCliente() {
    const info = document.getElementById('infoClienteActual');
    if (!info) return;
    if (!this.selectedClienteId) {
      info.innerHTML = '';
      return;
    }
    const cl = Store.getCliente(this.selectedClienteId);
    const cuenta = Store.getCuentaActiva(cl.id);
    if (cuenta) {
      const t = Store.calcularTotales(cuenta);
      info.innerHTML = `
        <div class="badge badge-green" style="font-size: 0.8rem; display: block; border-radius: 8px;">
          ✔ ${cl.nombre} tiene cuenta abierta (${t.piezas} piezas, resta ${Store.formatMoney(t.resta)}). La prenda se sumará a esta cuenta.
        </div>
      `;
    } else {
      info.innerHTML = `
        <div class="badge badge-green" style="font-size: 0.8rem; display: block; border-radius: 8px;">
          ✔ Se abrirá una cuenta nueva para ${cl.nombre}.
        </div>
      `;
    }
  },

  onInputProducto(val) {
    const drop = document.getElementById('dropProductos');
    const norm = Store.normalize(val);
    const options = Store.data.productos.filter(p => !norm || Store.normalize(p).includes(norm));
    const exact = Store.data.productos.find(p => Store.normalize(p) === norm);

    let html = '';
    if (norm && !exact) {
      html += `<div class="dropdown-add" onclick="window.Screens.selectNuevoProducto('${val.trim()}')">＋ Guardar prenda nueva “${val.trim()}”</div>`;
    }
    options.forEach(p => {
      html += `<div class="dropdown-item" onclick="window.Screens.selectProducto('${p}')"><strong>${p}</strong></div>`;
    });
    drop.innerHTML = html || '<div style="padding: 12px; color: var(--text-muted);">Sin resultados</div>';
    drop.style.display = 'block';
  },

  selectProducto(p) {
    document.getElementById('nuevoProducto').value = p;
    document.getElementById('dropProductos').style.display = 'none';
    this.calcResumenNuevo();
  },

  selectNuevoProducto(p) {
    const clean = Store.addProducto(p);
    this.selectProducto(clean);
  },

  modalNuevaPrendaEnPedido() {
    const actual = (document.getElementById('nuevoProducto')?.value || '').trim();
    const modal = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-title">Nueva prenda</div>
          <div class="form-group">
            <span class="form-label">Nombre de la prenda</span>
            <input type="text" id="dlgNomPrendaPedido" class="input-box" placeholder="Ej. Chamarra, gorra, bolso..." value="${actual}">
          </div>
          <div class="modal-footer">
            <button class="btn btn-outlined btn-sm" onclick="window.Screens.closeModal()">Cancelar</button>
            <button class="btn btn-primary btn-sm" onclick="window.Screens.confirmNuevaPrendaEnPedido()">Guardar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
    setTimeout(() => document.getElementById('dlgNomPrendaPedido')?.focus(), 50);
  },

  confirmNuevaPrendaEnPedido() {
    const nom = (document.getElementById('dlgNomPrendaPedido')?.value || '').trim();
    if (!nom) return;
    const clean = Store.addProducto(nom);
    this.closeModal();
    this.selectProducto(clean);
  },

  modCantidad(delta) {
    const el = document.getElementById('nuevoCantidad');
    let cur = parseInt(el.value) || 1;
    cur = Math.max(1, cur + delta);
    el.value = cur;
    this.calcResumenNuevo();
  },

  calcResumenNuevo() {
    const cant = parseInt(document.getElementById('nuevoCantidad')?.value) || 0;
    const precio = parseFloat(document.getElementById('nuevoPrecio')?.value) || 0;
    const abono = parseFloat(document.getElementById('nuevoAbono')?.value) || 0;

    const subtotal = cant * precio;
    let prevTotal = 0, prevAbono = 0;
    if (this.selectedClienteId) {
      const c = Store.getCuentaActiva(this.selectedClienteId);
      if (c) {
        const t = Store.calcularTotales(c);
        prevTotal = t.total;
        prevAbono = t.abonado;
      }
    }
    const tot = prevTotal + subtotal;
    const abo = prevAbono + abono;
    const res = Math.max(0, tot - abo);
    const favor = Math.max(0, abo - tot);

    if (document.getElementById('resEstaPrenda')) {
      document.getElementById('resEstaPrenda').textContent = Store.formatMoney(subtotal);
      document.getElementById('resTotalCuenta').textContent = Store.formatMoney(tot);
      document.getElementById('resAbonado').textContent = Store.formatMoney(abo);
      const lbl = document.getElementById('resRestaLabel');
      const valEl = document.getElementById('resResta');
      if (favor > 0.005) {
        if (lbl) lbl.textContent = 'Saldo a favor del cliente';
        valEl.textContent = Store.formatMoney(favor);
        valEl.style.color = '#1565C0';
      } else {
        if (lbl) lbl.textContent = 'Resta por liquidar';
        valEl.textContent = Store.formatMoney(res);
        valEl.style.color = 'var(--red)';
      }
    }
  },

  guardarArticulo(seguirAgregando) {
    const inputCli = document.getElementById('nuevoCliente').value.trim();
    const inputProd = document.getElementById('nuevoProducto').value.trim();
    const cant = parseInt(document.getElementById('nuevoCantidad').value) || 0;
    const precioReal = parseFloat(document.getElementById('nuevoPrecioReal')?.value) || 0;
    const precio = parseFloat(document.getElementById('nuevoPrecio').value) || 0;
    const abono = parseFloat(document.getElementById('nuevoAbono').value) || 0;

    if (!this.selectedClienteId && inputCli) {
      const match = Store.getClientePorNombre(inputCli);
      if (match) this.selectedClienteId = match.id;
    }

    const camposVacios = !inputProd && !precio;
    const idCuentaExistente = this.selectedClienteId ? (Store.getCuentaActiva(this.selectedClienteId)?.id || this.ultimaCuentaId) : this.ultimaCuentaId;

    if (!seguirAgregando && camposVacios && idCuentaExistente) {
      if (abono > 0) {
        Store.addAbono(idCuentaExistente, abono, 'Abono inicial');
      }
      window.App.openDetalle(idCuentaExistente);
      return;
    }

    if (!this.selectedClienteId) {
      alert("Por favor selecciona un cliente o agrégalo.");
      return;
    }
    if (!inputProd) {
      alert("Por favor escribe o selecciona la prenda.");
      return;
    }
    if (cant <= 0 || precio <= 0) {
      alert("Por favor indica una cantidad y costo válidos.");
      return;
    }

    const cuentaId = Store.addArticulo(this.selectedClienteId, inputProd, cant, precio, precioReal, abono);
    this.ultimaCuentaId = cuentaId;

    if (seguirAgregando) {
      document.getElementById('nuevoProducto').value = '';
      document.getElementById('nuevoCantidad').value = '1';
      if (document.getElementById('nuevoPrecioReal')) document.getElementById('nuevoPrecioReal').value = '';
      document.getElementById('nuevoPrecio').value = '';
      document.getElementById('nuevoAbono').value = '';
      this.calcResumenNuevo();
    } else {
      window.App.openDetalle(cuentaId);
    }
  }
});

Object.assign(Screens, {
  renderDetalle(cuentaId) {
    const cuenta = Store.getCuenta(cuentaId);
    if (!cuenta) {
      return `<div style="padding: 20px;">Esta cuenta no existe. <button class="btn btn-outlined" onclick="window.App.goBack()">Regresar</button></div>`;
    }
    const cliente = Store.getCliente(cuenta.clienteId);
    const t = Store.calcularTotales(cuenta);

    return `
      <div>
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="font-size: 1.25rem;">${cliente.nombre}</h2>
              <div style="font-size: 0.85rem; color: var(--text-muted);">
                ${cliente.telefono ? 'WhatsApp: ' + cliente.telefono : 'Sin WhatsApp registrado'}${cliente.localidad ? ' • ' + cliente.localidad : ''}${cliente.tipo === 'M' ? ' • M (Mayoreo)' : cliente.tipo === 'B' ? ' • B (Boutique)' : ''}
              </div>
            </div>
            <button class="btn btn-outlined btn-sm" onclick="window.Screens.modalEditarCliente('${cliente.id}')">Editar</button>
          </div>

          <div style="margin: 10px 0;">
            ${cuenta.fechaLiquidacion ? 
              `<span class="badge badge-green">✔ LIQUIDADA el ${Store.formatDate(cuenta.fechaLiquidacion)}</span>` : 
              `<span class="badge badge-red">PENDIENTE • desde ${Store.formatDate(cuenta.fechaCreacion)}</span>`
            }
          </div>

          <div style="margin-top: 10px;">
            <div class="totales-label" style="margin-bottom: 6px;">Estado del pedido</div>
            <div class="chips-row" style="margin-bottom: 4px;">
              ${ESTADOS_PEDIDO.map(est => {
                const activo = (cuenta.estadoPedido || 'comprando') === est.codigo;
                return `
                  <button class="chip-btn ${activo ? 'active' : ''}" onclick="window.Screens.cambiarEstadoPedido('${cuenta.id}', '${est.codigo}')">
                    ${activo ? '✓ ' : ''}${est.icono} ${est.etiqueta}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="totales-row" style="margin-top: 14px;">
            <div class="totales-col"><span class="totales-label">Total</span><span class="totales-val grande">${Store.formatMoney(t.total)}</span></div>
            <div class="totales-col"><span class="totales-label">Abonado</span><span class="totales-val grande" style="color: var(--green);">${Store.formatMoney(t.abonado)}</span></div>
            ${t.saldoAFavor > 0.005 ?
              `<div class="totales-col"><span class="totales-label">Saldo a favor</span><span class="totales-val grande" style="color: #1565C0;">${Store.formatMoney(t.saldoAFavor)}</span></div>` :
              `<div class="totales-col"><span class="totales-label">Resta</span><span class="totales-val grande" style="color: ${t.resta > 0 ? 'var(--red)' : 'var(--green)'};">${Store.formatMoney(t.resta)}</span></div>`
            }
          </div>
          <div class="progreso-bar" style="height: 10px;">
            <div class="progreso-val" style="width: ${(t.progreso * 100)}%;"></div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          <button class="btn btn-whatsapp" onclick="window.Screens.enviarWhatsApp('${cuenta.id}')">
            🖨️ Imprimir / Enviar por WhatsApp
          </button>
          ${!cuenta.fechaLiquidacion ? `
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outlined" onclick="window.App.openNewOrder('${cliente.id}')">＋ Agregar prenda</button>
              <button class="btn btn-primary" onclick="window.Screens.modalAbonar('${cuenta.id}')">💵 Abonar</button>
            </div>
            <button class="btn btn-outlined" style="color: var(--red); border-color: var(--red);" onclick="window.Screens.eliminarCuentaTotal('${cuenta.id}')">
              🗑️ Eliminar cuenta
            </button>
          ` : `
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outlined" onclick="window.App.openNewOrder('${cliente.id}')">＋ Nuevo pedido</button>
              <button class="btn btn-outlined" onclick="window.Screens.reabrirCuenta('${cuenta.id}')">Reabrir cuenta</button>
            </div>
          `}
        </div>

        <div style="margin-bottom: 16px;">
          <strong style="display: block; margin-bottom: 8px; font-size: 1rem;">Prendas (${t.piezas} pieza(s))</strong>
          ${cuenta.articulos.map(a => `
            <div class="card" style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <strong style="font-size: 0.95rem;">${a.cantidad} × ${a.producto}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${Store.formatMoney(a.precioUnitario)} c/u • ${Store.formatDate(a.fecha)}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="font-size: 1rem;">${Store.formatMoney(a.cantidad * a.precioUnitario)}</strong>
                ${!cuenta.fechaLiquidacion ? `
                  <button class="icon-btn" onclick="window.Screens.modalEditarArticulo('${cuenta.id}', '${a.id}')">✏️</button>
                  <button class="icon-btn" style="color: var(--red);" onclick="window.Screens.eliminarArticulo('${cuenta.id}', '${a.id}')">✕</button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <div>
          <strong style="display: block; margin-bottom: 8px; font-size: 1rem;">Abonos (${cuenta.abonos.length})</strong>
          ${cuenta.abonos.length === 0 ? '<div style="color: var(--text-muted); font-size: 0.9rem;">Aún no hay abonos registrados.</div>' : ''}
          ${cuenta.abonos.map(ab => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
              <div>
                <div>${Store.formatDateTime(ab.fecha)}</div>
                ${ab.nota ? `<div style="font-size: 0.8rem; color: var(--text-muted);">${ab.nota}</div>` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <strong style="color: var(--green); font-size: 1rem;">${Store.formatMoney(ab.monto)}</strong>
                <button class="icon-btn" style="color: var(--red);" onclick="window.Screens.eliminarAbono('${cuenta.id}', '${ab.id}')">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  modalAbonar(cuentaId) {
    const cuenta = Store.getCuenta(cuentaId);
    const t = Store.calcularTotales(cuenta);
    const modal = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-title">Registrar Abono</div>
          <div style="margin-bottom: 10px;">Resta por pagar: <strong>${Store.formatMoney(t.resta)}</strong></div>
          <div class="form-group">
            <input type="number" id="dlgMontoAbono" class="input-box" placeholder="Monto del abono ($)" step="any">
          </div>
          <button class="btn btn-outlined btn-sm" style="margin-bottom: 12px;" onclick="document.getElementById('dlgMontoAbono').value = ${t.resta}">
            Pagar todo (${Store.formatMoney(t.resta)})
          </button>
          <div class="form-group">
            <input type="text" id="dlgNotaAbono" class="input-box" placeholder="Nota (opcional: transferencia, efectivo...)">
          </div>
          <div class="modal-footer">
            <button class="btn btn-outlined btn-sm" onclick="window.Screens.closeModal()">Cancelar</button>
            <button class="btn btn-primary btn-sm" onclick="window.Screens.confirmAbonar('${cuentaId}')">Guardar abono</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
  },

  confirmAbonar(cuentaId) {
    const monto = parseFloat(document.getElementById('dlgMontoAbono').value) || 0;
    const nota = document.getElementById('dlgNotaAbono').value.trim();
    if (monto <= 0) return;
    const liquidada = Store.addAbono(cuentaId, monto, nota);
    this.closeModal();
    window.App.render();
    if (liquidada) {
      const c = Store.getCuenta(cuentaId);
      const t = Store.calcularTotales(c);
      if (t.saldoAFavor > 0.005) {
        alert(`🎉 ¡Cuenta liquidada! El cliente queda con un saldo a favor de ${Store.formatMoney(t.saldoAFavor)}.`);
      } else {
        alert("🎉 ¡Cuenta liquidada y guardada en el registro del mes!");
      }
    }
  },

  armarMensajeWhatsApp(cuentaId) {
    const cuenta = Store.getCuenta(cuentaId);
    const cliente = Store.getCliente(cuenta.clienteId);
    const t = Store.calcularTotales(cuenta);

    const cleanMoney = (val) => Store.formatMoney(val).replace(".", ".\u2060");

    let msg = `🧾 *ESTADO DE CUENTA*\n`;
    msg += `Cliente: *${cliente.nombre}*\n`;
    msg += `Fecha: *${Store.formatDate(Date.now())}*\n\n`;

    msg += `🛍️ *Artículos (${t.piezas} pieza(s)):*\n`;
    cuenta.articulos.forEach(a => {
      msg += `• *${a.cantidad} x ${a.producto}* (${cleanMoney(a.precioUnitario)} c/u) = *${cleanMoney(a.cantidad * a.precioUnitario)}*\n`;
    });
    msg += `\n`;

    if (cuenta.abonos.length > 0) {
      msg += `💵 *Abonos:*\n`;
      cuenta.abonos.forEach(ab => {
        msg += `• ${Store.formatDate(ab.fecha)}: *${cleanMoney(ab.monto)}*\n`;
      });
      msg += `\n`;
    }

    msg += `Total: *${cleanMoney(t.total)}*\n`;
    msg += `Abonado: *${cleanMoney(t.abonado)}*\n`;
    if (t.saldoAFavor > 0.005) {
      msg += `Saldo a favor: *${cleanMoney(t.saldoAFavor)}*\n\n`;
      msg += `✅ *¡Tu cuenta está LIQUIDADA y tienes saldo a favor!* Muchas gracias por tu compra 🙌`;
    } else if (cuenta.fechaLiquidacion || t.resta <= 0) {
      msg += `Resta por pagar: *${cleanMoney(0)}*\n\n`;
      msg += `✅ *¡Tu cuenta está LIQUIDADA! Muchas gracias por tu compra* 🙌`;
    } else {
      msg += `Resta por pagar: *${cleanMoney(t.resta)}*\n\n`;
      msg += `¡Gracias por tu preferencia! 🙌`;
    }

    return { msg, cliente };
  },

  enviarWhatsApp(cuentaId) {
    const cuenta = Store.getCuenta(cuentaId);
    const cliente = Store.getCliente(cuenta.clienteId);
    const modal = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-title">Enviar por WhatsApp</div>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 14px;">
            ¿Cómo deseas enviar el estado de cuenta a <strong>${cliente.nombre}</strong>?
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-whatsapp" onclick="window.Screens.closeModal(); window.Screens.enviarSoloTextoWhatsApp('${cuentaId}')">
              💬 Solo texto
            </button>
            <input type="file" id="inputFotosWhatsApp" accept="image/*" multiple style="display: none;" onchange="window.Screens.enviarConFotosWhatsApp('${cuentaId}', this)">
            <button class="btn btn-outlined" onclick="document.getElementById('inputFotosWhatsApp').click()">
              🖼️ Texto + seleccionar fotos
            </button>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outlined btn-sm" onclick="window.Screens.closeModal()">Cancelar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
  },

  enviarSoloTextoWhatsApp(cuentaId) {
    const { msg, cliente } = this.armarMensajeWhatsApp(cuentaId);
    let digitos = (cliente.telefono || '').replace(/\D/g, '');
    if (digitos.length === 10) digitos = '52' + digitos;

    const url = digitos ? 
      `https://wa.me/${digitos}?text=${encodeURIComponent(msg)}` : 
      `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  },

  async enviarConFotosWhatsApp(cuentaId, input) {
    const files = Array.from(input.files || []);
    this.closeModal();
    if (files.length === 0) return;

    const { msg } = this.armarMensajeWhatsApp(cuentaId);
    try {
      if (navigator.canShare && navigator.canShare({ files })) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(msg).catch(() => {});
        }
        await navigator.share({
          text: msg,
          files: files
        });
      } else {
        alert("Tu navegador no permite compartir fotos junto al texto directamente. Se abrirá WhatsApp con el texto para que adjuntes las fotos desde ahí.");
        this.enviarSoloTextoWhatsApp(cuentaId);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        alert("No se pudieron compartir las fotos: " + e.message);
      }
    }
  },

  modalEditarArticulo(cuentaId, articuloId) {
    const cuenta = Store.getCuenta(cuentaId);
    if (!cuenta) return;
    const a = cuenta.articulos.find(x => x.id === articuloId);
    if (!a) return;
    const opciones = Store.data.productos.map(p => `<option value="${p}"></option>`).join('');
    const modal = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-title">Editar prenda</div>
          <div class="form-group">
            <span class="form-label">Prenda / Producto</span>
            <input type="text" id="dlgEditArtProd" list="listaPrendasEdit" class="input-box" value="${a.producto}">
            <datalist id="listaPrendasEdit">${opciones}</datalist>
          </div>
          <div class="form-group">
            <span class="form-label">Piezas</span>
            <input type="number" id="dlgEditArtCant" class="input-box" min="1" value="${a.cantidad}">
          </div>
          <div class="form-group">
            <span class="form-label">Precio real (lo que te costó - $)</span>
            <input type="number" id="dlgEditArtReal" class="input-box" step="any" value="${a.precioReal > 0 ? a.precioReal : ''}">
          </div>
          <div class="form-group">
            <span class="form-label">Costo por pieza (al cliente - $)</span>
            <input type="number" id="dlgEditArtPrecio" class="input-box" step="any" value="${a.precioUnitario}">
          </div>
          <div class="modal-footer">
            <button class="btn btn-outlined btn-sm" onclick="window.Screens.closeModal()">Cancelar</button>
            <button class="btn btn-primary btn-sm" onclick="window.Screens.confirmEditarArticulo('${cuentaId}', '${articuloId}')">Guardar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
  },

  confirmEditarArticulo(cuentaId, articuloId) {
    const prod = document.getElementById('dlgEditArtProd').value.trim();
    const cant = parseInt(document.getElementById('dlgEditArtCant').value) || 0;
    const precioReal = parseFloat(document.getElementById('dlgEditArtReal').value) || 0;
    const precio = parseFloat(document.getElementById('dlgEditArtPrecio').value) || 0;
    if (!prod || cant <= 0 || precio <= 0) {
      alert("Por favor verifica la prenda, la cantidad y el costo.");
      return;
    }
    const liquidada = Store.updateArticulo(cuentaId, articuloId, prod, cant, precio, precioReal);
    this.closeModal();
    window.App.render();
    if (liquidada) {
      alert("🎉 ¡Cuenta liquidada y guardada en el registro del mes!");
    }
  },

  eliminarArticulo(cuentaId, articuloId) {
    if (!confirm("¿Deseas quitar esta prenda de la cuenta?")) return;
    Store.deleteArticulo(cuentaId, articuloId);
    if (!Store.getCuenta(cuentaId)) {
      window.App.goBack();
    } else {
      window.App.render();
    }
  },

  eliminarAbono(cuentaId, abonoId) {
    if (!confirm("¿Deseas eliminar este abono?")) return;
    Store.deleteAbono(cuentaId, abonoId);
    window.App.render();
  },

  cambiarEstadoPedido(cuentaId, estado) {
    Store.setEstadoPedido(cuentaId, estado);
    window.App.render();
  },

  reabrirCuenta(cuentaId) {
    if (!confirm("¿Deseas reabrir esta cuenta para que regrese a pendientes?")) return;
    if (!Store.reopenCuenta(cuentaId)) {
      alert("El cliente ya tiene otra cuenta abierta.");
      return;
    }
    window.App.render();
  },

  eliminarCuentaTotal(cuentaId) {
    if (!confirm("¿Deseas eliminar por completo esta cuenta y todo su registro?")) return;
    Store.data.cuentas = Store.data.cuentas.filter(c => c.id !== cuentaId);
    Store.save();
    window.App.goBack();
  },

  modalEditarCliente(clienteId) {
    const cl = Store.getCliente(clienteId);
    this.dlgTipoCliente = cl.tipo || '';
    const modal = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-title">Editar Cliente</div>
          <div class="form-group">
            <span class="form-label">Nombre del cliente</span>
            <input type="text" id="dlgEditNom" class="input-box" value="${cl.nombre}">
          </div>
          <div class="form-group">
            <span class="form-label">Número (WhatsApp 10 dígitos)</span>
            <input type="tel" id="dlgEditTel" class="input-box" value="${cl.telefono || ''}">
          </div>
          <div class="form-group">
            <span class="form-label">Localidad</span>
            <input type="text" id="dlgEditLoc" class="input-box" placeholder="Ej. Puebla, CDMX..." value="${cl.localidad || ''}">
          </div>
          <div class="form-group">
            <span class="form-label">Tipo de cliente (uso interno)</span>
            <div style="display: flex; gap: 8px;">
              <button type="button" id="btnTipoM" class="btn ${this.dlgTipoCliente === 'M' ? 'btn-primary' : 'btn-outlined'}" style="flex: 1; height: 42px; font-size: 0.9rem;" onclick="window.Screens.toggleTipoCliente('M')">${this.dlgTipoCliente === 'M' ? '✓ ' : ''}M • Mayoreo</button>
              <button type="button" id="btnTipoB" class="btn ${this.dlgTipoCliente === 'B' ? 'btn-primary' : 'btn-outlined'}" style="flex: 1; height: 42px; font-size: 0.9rem;" onclick="window.Screens.toggleTipoCliente('B')">${this.dlgTipoCliente === 'B' ? '✓ ' : ''}B • Boutique</button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outlined btn-sm" onclick="window.Screens.closeModal()">Cancelar</button>
            <button class="btn btn-primary btn-sm" onclick="window.Screens.confirmEditarCliente('${clienteId}')">Guardar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
  },

  confirmEditarCliente(clienteId) {
    const nom = document.getElementById('dlgEditNom').value.trim();
    const tel = document.getElementById('dlgEditTel').value.trim();
    const loc = (document.getElementById('dlgEditLoc')?.value || '').trim();
    if (!nom) return;
    Store.updateCliente(clienteId, nom, tel, loc, this.dlgTipoCliente);
    this.closeModal();
    window.App.render();
  }
});

Object.assign(Screens, {
  renderRegistro(year, month) {
    const liquidadas = Store.getLiquidadasEnMes(year, month);
    const totalMes = liquidadas.reduce((acc, c) => acc + Store.calcularTotales(c).total, 0);
    const costoRealMes = liquidadas.reduce((acc, c) => acc + Store.calcularTotales(c).costoRealTotal, 0);
    const utilidadMes = totalMes - costoRealMes;
    const saldoAFavorMes = liquidadas.reduce((acc, c) => acc + Store.calcularTotales(c).saldoAFavor, 0);
    const totalPiezas = liquidadas.reduce((acc, c) => acc + Store.calcularTotales(c).piezas, 0);

    const fechaD = new Date(year, month, 1);
    const nomMes = fechaD.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    const nomMesCap = nomMes.charAt(0).toUpperCase() + nomMes.slice(1);

    return `
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <button class="icon-btn" style="font-size: 1.2rem;" onclick="window.Screens.cambiarMes(-1)">◀</button>
          <h2 style="font-size: 1.2rem; text-align: center;">${nomMesCap}</h2>
          <button class="icon-btn" style="font-size: 1.2rem;" onclick="window.Screens.cambiarMes(1)">▶</button>
        </div>

        <div class="card card-primary">
          <div class="totales-label">Total vendido y liquidado</div>
          <div class="totales-val grande" style="color: var(--primary-dark);">${Store.formatMoney(totalMes)}</div>
          
          <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(0,105,92,0.3);">
            <div>
              <div class="totales-label">Inversión (Costo Real)</div>
              <div style="font-weight: 700; font-size: 1rem;">${Store.formatMoney(costoRealMes)}</div>
            </div>
            <div style="text-align: right;">
              <div class="totales-label">Ganancia / Utilidad</div>
              <div style="font-weight: 700; font-size: 1.05rem; color: var(--green);">${Store.formatMoney(utilidadMes)}</div>
            </div>
          </div>

          ${saldoAFavorMes > 0.005 ? `
            <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(0,105,92,0.2); color: #1565C0;">
              <span style="font-size: 0.85rem; font-weight: 600;">Saldo a favor de clientes</span>
              <strong style="font-size: 0.95rem;">${Store.formatMoney(saldoAFavorMes)}</strong>
            </div>
          ` : ''}

          <div style="font-size: 0.85rem; color: var(--secondary); margin-top: 8px;">
            ${liquidadas.length} cuenta(s) • ${totalPiezas} prenda(s)
          </div>
        </div>

        <button class="btn btn-primary" style="margin-bottom: 14px;" onclick="window.Screens.modalOpcionesPDF('${nomMesCap}', ${year}, ${month})">
          📄 PDF para contaduría
        </button>

        <div>
          ${liquidadas.length === 0 ? `<div style="text-align: center; padding: 30px; color: var(--text-muted);">No hay cuentas liquidadas en ${nomMesCap}.</div>` : ''}
          ${liquidadas.map(c => {
            const cl = Store.getCliente(c.clienteId);
            const t = Store.calcularTotales(c);
            return `
              <div class="card clickable" onclick="window.App.openDetalle('${c.id}')">
                <div style="display: flex; justify-content: space-between;">
                  <strong>${cl ? cl.nombre : '(cliente eliminado)'}</strong>
                  <strong style="color: var(--green);">${Store.formatMoney(t.total)}</strong>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                  Liquidada el ${Store.formatDate(c.fechaLiquidacion)} • ${t.piezas} pieza(s)
                </div>
                ${t.saldoAFavor > 0.005 ? `<div style="font-size: 0.8rem; color: #1565C0; font-weight: 700; margin-top: 2px;">Saldo a favor del cliente: ${Store.formatMoney(t.saldoAFavor)}</div>` : ''}
                <div style="font-size: 0.8rem; margin-top: 2px;">
                  ${c.articulos.map(a => `${a.cantidad} ${a.producto}`).join(', ')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  cambiarMes(delta) {
    const d = new Date(window.App.regYear, window.App.regMonth + delta, 1);
    window.App.regYear = d.getFullYear();
    window.App.regMonth = d.getMonth();
    window.App.render();
  },

  modalOpcionesPDF(titulo, year, month) {
    const modal = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-title">PDF para contaduría</div>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 14px;">
            ¿Qué deseas hacer con el registro de <strong>${titulo}</strong>?
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-primary" onclick="window.Screens.closeModal(); window.Screens.descargarPDF('${titulo}', ${year}, ${month})">
              ⬇️ Descargar PDF
            </button>
            <button class="btn btn-outlined" onclick="window.Screens.closeModal(); window.Screens.compartirPDF('${titulo}', ${year}, ${month})">
              📤 Compartir PDF
            </button>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outlined btn-sm" onclick="window.Screens.closeModal()">Cancelar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
  },

  generarDocPDF(titulo, year, month) {
    if (!window.jspdf) {
      alert("Cargando motor PDF...");
      return null;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const liquidadas = Store.getLiquidadasEnMes(year, month);

    doc.setFontSize(18);
    doc.setTextColor(0, 105, 92);
    doc.text("Registro de ventas liquidadas", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`${titulo}  •  Generado: ${Store.formatDateTime(Date.now())}`, 14, 28);

    const rows = [];
    let grandTotal = 0;
    let grandCostoReal = 0;
    let grandSaldoFavor = 0;
    let totalPzas = 0;

    liquidadas.forEach(c => {
      const cl = Store.getCliente(c.clienteId);
      const t = Store.calcularTotales(c);
      grandTotal += t.total;
      grandCostoReal += t.costoRealTotal;
      grandSaldoFavor += t.saldoAFavor;
      totalPzas += t.piezas;

      const detalleArts = c.articulos.map(a => `${a.cantidad}x ${a.producto} (${Store.formatMoney(a.precioUnitario)})`).join('\n');
      const notaFavor = t.saldoAFavor > 0.005 ? `\n[Saldo a favor cliente: ${Store.formatMoney(t.saldoAFavor)}]` : '';

      rows.push([
        Store.formatDate(c.fechaLiquidacion),
        (cl ? cl.nombre : '(eliminado)') + '\n' + detalleArts + notaFavor,
        t.piezas,
        c.abonos.length,
        Store.formatMoney(t.total)
      ]);
    });

    doc.autoTable({
      startY: 34,
      head: [['Liquidado', 'Cliente / Detalle', 'Piezas', 'Abonos', 'Total']],
      body: rows,
      headStyles: { fillColor: [0, 105, 92] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 24 },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'center', cellWidth: 16 },
        4: { halign: 'right', fontStyle: 'bold' }
      }
    });

    const finalY = doc.lastAutoTable.finalY || 40;
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Liquidado: ${Store.formatMoney(grandTotal)}   •   Total Piezas: ${totalPzas}`, 14, finalY + 10);
    doc.text(`Costo Real (Inversión): ${Store.formatMoney(grandCostoReal)}   •   Utilidad Neta: ${Store.formatMoney(grandTotal - grandCostoReal)}`, 14, finalY + 17);
    if (grandSaldoFavor > 0.005) {
      doc.setTextColor(21, 101, 192);
      doc.text(`Saldo a favor de clientes (no es utilidad): ${Store.formatMoney(grandSaldoFavor)}`, 14, finalY + 24);
    }

    return doc;
  },

  descargarPDF(titulo, year, month) {
    const doc = this.generarDocPDF(titulo, year, month);
    if (!doc) return;
    doc.save(`Registro_${year}_${String(month + 1).padStart(2, '0')}.pdf`);
  },

  async compartirPDF(titulo, year, month) {
    const doc = this.generarDocPDF(titulo, year, month);
    if (!doc) return;
    const nombre = `Registro_${year}_${String(month + 1).padStart(2, '0')}.pdf`;
    try {
      const blob = doc.output('blob');
      const file = new File([blob], nombre, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Registro ${titulo}`,
          text: `Registro de ventas liquidadas - ${titulo}`,
          files: [file]
        });
      } else {
        doc.save(nombre);
        alert("Tu navegador no soporta compartir archivos directamente. El PDF se descargó para que puedas enviarlo.");
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        alert("No se pudo compartir el PDF: " + e.message);
      }
    }
  },

  renderCatalogo() {
    return `
      <div>
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button id="catTab0" class="btn btn-primary" style="flex: 1; height: 42px; font-size: 0.9rem;" onclick="window.Screens.switchCatTab(0)">
            👤 Clientes (${Store.data.clientes.length})
          </button>
          <button id="catTab1" class="btn btn-outlined" style="flex: 1; height: 42px; font-size: 0.9rem;" onclick="window.Screens.switchCatTab(1)">
            👕 Prendas (${Store.data.productos.length})
          </button>
        </div>

        <div id="catContent">
          ${this.renderCatClientes()}
        </div>
      </div>
    `;
  },

  catCurrentTab: 0,

  switchCatTab(idx) {
    this.catCurrentTab = idx;
    document.getElementById('catTab0').className = idx === 0 ? 'btn btn-primary' : 'btn btn-outlined';
    document.getElementById('catTab1').className = idx === 1 ? 'btn btn-primary' : 'btn btn-outlined';
    document.getElementById('catTab0').style.height = '42px';
    document.getElementById('catTab1').style.height = '42px';
    document.getElementById('catContent').innerHTML = idx === 0 ? this.renderCatClientes() : this.renderCatPrendas();
  },

  renderCatClientes() {
    return `
      <button class="btn btn-primary" style="margin-bottom: 12px;" onclick="window.Screens.modalNuevoClienteCat()">＋ Nuevo cliente</button>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${Store.data.clientes.map(cl => {
          const cuenta = Store.getCuentaActiva(cl.id);
          return `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0;">
              <div onclick="window.App.openNewOrder('${cl.id}')" style="cursor: pointer; flex: 1;">
                <strong>${cl.nombre}${cl.tipo === 'M' ? ' [M • Mayoreo]' : cl.tipo === 'B' ? ' [B • Boutique]' : ''}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${cl.telefono || 'Sin WhatsApp'}${cl.localidad ? ' • ' + cl.localidad : ''}</div>
                ${cuenta ? `<div style="color: var(--red); font-size: 0.8rem; font-weight: bold;">Debe ${Store.formatMoney(Store.calcularTotales(cuenta).resta)}</div>` : ''}
              </div>
              <div style="display: flex; gap: 4px;">
                <button class="icon-btn" onclick="window.Screens.modalEditarCliente('${cl.id}')">✏️</button>
                <button class="icon-btn" style="color: var(--red);" onclick="window.Screens.eliminarClienteCat('${cl.id}')">✕</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  modalNuevoClienteCat() {
    this.selectNuevoCliente('', true);
  },

  eliminarClienteCat(id) {
    const cl = Store.getCliente(id);
    if (!confirm(`¿Deseas eliminar a ${cl.nombre}?`)) return;
    if (!Store.deleteCliente(id)) {
      alert("No se puede eliminar: tiene una cuenta pendiente.");
      return;
    }
    this.switchCatTab(0);
  },

  renderCatPrendas() {
    return `
      <button class="btn btn-primary" style="margin-bottom: 12px;" onclick="window.Screens.modalNuevaPrenda()">＋ Nueva prenda</button>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${Store.data.productos.map(p => `
          <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0;">
            <strong>${p}</strong>
            <div style="display: flex; gap: 4px;">
              <button class="icon-btn" onclick="window.Screens.modalEditarPrenda('${p}')">✏️</button>
              <button class="icon-btn" style="color: var(--red);" onclick="window.Screens.eliminarPrendaCat('${p}')">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  modalNuevaPrenda() {
    const p = prompt("Nombre de la nueva prenda:");
    if (p && p.trim()) {
      Store.addProducto(p);
      this.switchCatTab(1);
    }
  },

  modalEditarPrenda(oldP) {
    const nuevo = prompt("Modificar nombre de la prenda:", oldP);
    if (nuevo && nuevo.trim()) {
      Store.updateProducto(oldP, nuevo);
      this.switchCatTab(1);
    }
  },

  eliminarPrendaCat(p) {
    if (!confirm(`¿Quitar “${p}” del catálogo?`)) return;
    Store.deleteProducto(p);
    this.switchCatTab(1);
  },

  renderRespaldo() {
    const ultimo = Store.data.ultimoRespaldo;
    const diasSinRespaldo = ultimo ? Math.floor((Date.now() - ultimo) / 86400000) : 999;
    const atrasado = !ultimo || diasSinRespaldo >= 7;

    return `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="card" style="background: ${atrasado ? 'var(--red-light)' : 'var(--green-light)'}; border-color: ${atrasado ? '#FFCDD2' : '#C8E6C9'};">
          <div class="totales-label">Último respaldo</div>
          <div class="totales-val" style="color: ${atrasado ? 'var(--red)' : 'var(--green)'}; font-size: 1.1rem; margin-top: 4px;">
            ${!ultimo ? 'Nunca se ha respaldado' : Store.formatDateTime(ultimo) + ' (hace ' + diasSinRespaldo + ' días)'}
          </div>
          <div style="font-size: 0.8rem; margin-top: 4px; color: var(--text);">
            ${Store.data.clientes.length} cliente(s) • ${Store.data.productos.length} prenda(s) • ${Store.data.cuentas.length} cuenta(s)
          </div>
        </div>

        <div>
          <strong style="font-size: 1rem; display: block; margin-bottom: 6px;">Respaldar</strong>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
            Guarda un archivo seguro con todos tus clientes, prendas, cuentas, abonos y registros. Puedes guardarlo en iCloud, Archivos, Google Drive o enviártelo por WhatsApp/correo.
          </p>
          <button class="btn btn-primary" onclick="window.Screens.descargarRespaldo()">💾 Crear respaldo</button>
        </div>

        <div>
          <strong style="font-size: 1rem; display: block; margin-bottom: 6px;">Restaurar</strong>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
            Elige un archivo de respaldo para recuperar tu información (por ejemplo, al cambiar de iPhone o Mac).
          </p>
          <input type="file" id="inputFileRespaldo" accept=".json,application/json" style="display: none;" onchange="window.Screens.cargarArchivoRespaldo(this)">
          <button class="btn btn-outlined" onclick="document.getElementById('inputFileRespaldo').click()">📂 Restaurar desde archivo</button>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">
          💡 Consejo: Realiza un respaldo al menos una vez por semana y guárdalo en iCloud o tu correo.
        </div>
      </div>
    `;
  },

  descargarRespaldo() {
    const jsonStr = JSON.stringify({
      app: "Pedidos",
      version: 1,
      fechaRespaldo: Date.now(),
      clientes: Store.data.clientes,
      productos: Store.data.productos,
      cuentas: Store.data.cuentas
    }, null, 2);

    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    a.href = url;
    a.download = `Pedidos_respaldo_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Store.data.ultimoRespaldo = Date.now();
    Store.save();
    alert("Respaldo descargado ✔");
    window.App.render();
  },

  cargarArchivoRespaldo(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.clientes || !parsed.cuentas) {
          throw new Error("El archivo no es un respaldo válido de Pedidos.");
        }
        window.tempRespaldoParsed = parsed;
        const modal = `
          <div class="modal-backdrop">
            <div class="modal-box">
              <div class="modal-title">¿Restaurar este respaldo?</div>
              <div style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 12px;">
                ${parsed.fechaRespaldo ? '<strong>Creado:</strong> ' + Store.formatDateTime(parsed.fechaRespaldo) + '<br>' : ''}
                • ${parsed.clientes.length} cliente(s)<br>
                • ${(parsed.productos || []).length} prenda(s)<br>
                • ${parsed.cuentas.length} cuenta(s)
              </div>
              <div style="color: var(--red); font-size: 0.85rem; font-weight: bold; margin-bottom: 16px;">
                ⚠️ La información actual será reemplazada por la del respaldo.
              </div>
              <div class="modal-footer">
                <button class="btn btn-outlined btn-sm" onclick="window.Screens.closeModal()">Cancelar</button>
                <button class="btn btn-danger btn-sm" onclick="window.Screens.confirmRestaurar()">Restaurar</button>
              </div>
            </div>
          </div>
        `;
        document.getElementById('modalContainer').innerHTML = modal;
      } catch(err) {
        alert("No se pudo leer el archivo: " + err.message);
      }
    };
    reader.readAsText(file);
  },

  confirmRestaurar() {
    try {
      const parsed = window.tempRespaldoParsed;
      Store.data.clientes = parsed.clientes;
      Store.data.productos = parsed.productos || ["Playeras", "Camisas", "Cinturón", "Zapatos", "Zapatillas", "Perfumes"];
      Store.data.cuentas = parsed.cuentas;
      Store.data.ultimoRespaldo = parsed.fechaRespaldo || Date.now();
      Store.save();
      this.closeModal();
      alert("Información restaurada con éxito ✔");
      window.App.switchTab('cuentas');
    } catch(e) {
      alert("Error al restaurar: " + e.message);
    }
  },

  closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
  }
});
