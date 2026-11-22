import { Store } from './store.js';

export const Screens = {
  selectedClienteId: null,
  ultimaCuentaId: null,

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
          <input type="text" id="inputBuscarCuenta" class="input-box" placeholder="Buscar cliente..." oninput="window.Screens.filterCuentas(this.value)">
          <div class="search-actions">
            <button class="icon-btn" onclick="document.getElementById('inputBuscarCuenta').value=''; window.Screens.filterCuentas('')">✕</button>
          </div>
        </div>
      </div>

      <div id="cuentasList">
        ${this.renderCuentasList(activas)}
      </div>
    `;
    return html;
  },

  renderCuentasList(activas, filtro = '') {
    const norm = Store.normalize(filtro);
    const filtradas = activas.filter(c => {
      const cl = Store.getCliente(c.clienteId);
      return cl && (!norm || Store.normalize(cl.nombre).includes(norm));
    });

    if (filtradas.length === 0) {
      return `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          ${activas.length === 0 ? 'No hay cuentas pendientes.<br>Toca <strong>“＋ Nuevo pedido”</strong> para empezar.' : 'Ningún cliente coincide con la búsqueda.'}
        </div>
      `;
    }

    return filtradas.map(cuenta => {
      const cliente = Store.getCliente(cuenta.clienteId);
      const t = Store.calcularTotales(cuenta);
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
          <div style="margin-top: 12px;">
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
        </div>

        <div>
          <span class="form-label">3. Cantidad y Costo</span>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <button class="btn btn-outlined" style="width: 48px; height: 48px;" onclick="window.Screens.modCantidad(-1)">−</button>
            <input type="number" id="nuevoCantidad" class="input-box" value="1" min="1" style="text-align: center; font-weight: bold; width: 90px;" oninput="window.Screens.calcResumenNuevo()">
            <button class="btn btn-outlined" style="width: 48px; height: 48px;" onclick="window.Screens.modCantidad(1)">+</button>
          </div>

          <div class="form-group">
            <input type="number" id="nuevoPrecio" class="input-box" placeholder="Costo por pieza ($)" step="any" oninput="window.Screens.calcResumenNuevo()">
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
            <strong>Resta por liquidar</strong>
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

  selectNuevoCliente(nombre) {
    const modal = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-title">Nuevo Cliente</div>
          <div class="form-group">
            <span class="form-label">Nombre</span>
            <input type="text" id="dlgNomCli" class="input-box" value="${nombre}">
          </div>
          <div class="form-group">
            <span class="form-label">WhatsApp (10 dígitos)</span>
            <input type="tel" id="dlgTelCli" class="input-box" placeholder="Ej. 5512345678">
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
    if (!nom) return;
    const nuevo = Store.addCliente(nom, tel);
    this.closeModal();
    this.selectCliente(nuevo.id);
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

    if (document.getElementById('resEstaPrenda')) {
      document.getElementById('resEstaPrenda').textContent = Store.formatMoney(subtotal);
      document.getElementById('resTotalCuenta').textContent = Store.formatMoney(tot);
      document.getElementById('resAbonado').textContent = Store.formatMoney(abo);
      document.getElementById('resResta').textContent = Store.formatMoney(res);
    }
  },

  guardarArticulo(seguirAgregando) {
    const inputCli = document.getElementById('nuevoCliente').value.trim();
    const inputProd = document.getElementById('nuevoProducto').value.trim();
    const cant = parseInt(document.getElementById('nuevoCantidad').value) || 0;
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

    const cuentaId = Store.addArticulo(this.selectedClienteId, inputProd, cant, precio, abono);
    this.ultimaCuentaId = cuentaId;

    if (seguirAgregando) {
      document.getElementById('nuevoProducto').value = '';
      document.getElementById('nuevoCantidad').value = '1';
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
                ${cliente.telefono ? 'WhatsApp: ' + cliente.telefono : 'Sin WhatsApp registrado'}
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

          <div class="totales-row" style="margin-top: 14px;">
            <div class="totales-col"><span class="totales-label">Total</span><span class="totales-val grande">${Store.formatMoney(t.total)}</span></div>
            <div class="totales-col"><span class="totales-label">Abonado</span><span class="totales-val grande" style="color: var(--green);">${Store.formatMoney(t.abonado)}</span></div>
            <div class="totales-col"><span class="totales-label">Resta</span><span class="totales-val grande" style="color: ${t.resta > 0 ? 'var(--red)' : 'var(--green)'};">${Store.formatMoney(t.resta)}</span></div>
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
              <div style="display: flex; align-items: center; gap: 10px;">
                <strong style="font-size: 1rem;">${Store.formatMoney(a.cantidad * a.precioUnitario)}</strong>
                ${!cuenta.fechaLiquidacion ? `<button class="icon-btn" style="color: var(--red);" onclick="window.Screens.eliminarArticulo('${cuenta.id}', '${a.id}')">✕</button>` : ''}
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
    const cuenta = Store.getCuenta(cuentaId);
    const t = Store.calcularTotales(cuenta);
    if (monto > t.resta + 0.01) {
      alert(`El monto no puede ser mayor a la resta (${Store.formatMoney(t.resta)})`);
      return;
    }
    const liquidada = Store.addAbono(cuentaId, monto, nota);
    this.closeModal();
    window.App.render();
    if (liquidada) {
      alert("🎉 ¡Cuenta liquidada y guardada en el registro del mes!");
    }
  },

  enviarWhatsApp(cuentaId) {
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
    if (cuenta.fechaLiquidacion || t.resta <= 0) {
      msg += `Resta por pagar: *${cleanMoney(0)}*\n\n`;
      msg += `✅ *¡Tu cuenta está LIQUIDADA! Muchas gracias por tu compra* 🙌`;
    } else {
      msg += `Resta por pagar: *${cleanMoney(t.resta)}*\n\n`;
      msg += `¡Gracias por tu preferencia! 🙌`;
    }

    let digitos = (cliente.telefono || '').replace(/\D/g, '');
    if (digitos.length === 10) digitos = '52' + digitos;

    const url = digitos ? 
      `https://wa.me/${digitos}?text=${encodeURIComponent(msg)}` : 
      `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
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

  reabrirCuenta(cuentaId) {
    if (!confirm("¿Deseas reabrir esta cuenta para que regrese a pendientes?")) return;
    if (!Store.reopenCuenta(cuentaId)) {
      alert("El cliente ya tiene otra cuenta abierta.");
      return;
    }
    window.App.render();
  },

  modalEditarCliente(clienteId) {
    const cl = Store.getCliente(clienteId);
    const modal = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-title">Editar Cliente</div>
          <div class="form-group">
            <span class="form-label">Nombre</span>
            <input type="text" id="dlgEditNom" class="input-box" value="${cl.nombre}">
          </div>
          <div class="form-group">
            <span class="form-label">WhatsApp (10 dígitos)</span>
            <input type="tel" id="dlgEditTel" class="input-box" value="${cl.telefono}">
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
    if (!nom) return;
    Store.updateCliente(clienteId, nom, tel);
    this.closeModal();
    window.App.render();
  }
});

Object.assign(Screens, {
  renderRegistro(year, month) {
    const liquidadas = Store.getLiquidadasEnMes(year, month);
    const totalMes = liquidadas.reduce((acc, c) => acc + Store.calcularTotales(c).total, 0);
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
          <div style="font-size: 0.85rem; color: var(--secondary); margin-top: 4px;">
            ${liquidadas.length} cuenta(s) • ${totalPiezas} prenda(s)
          </div>
        </div>

        <button class="btn btn-primary" style="margin-bottom: 14px;" onclick="window.Screens.descargarPDF('${nomMesCap}', ${year}, ${month})">
          📄 Descargar PDF para contaduría
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

  descargarPDF(titulo, year, month) {
    if (!window.jspdf) {
      alert("Cargando motor PDF...");
      return;
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
    let totalPzas = 0;

    liquidadas.forEach(c => {
      const cl = Store.getCliente(c.clienteId);
      const t = Store.calcularTotales(c);
      grandTotal += t.total;
      totalPzas += t.piezas;

      const detalleArts = c.articulos.map(a => `${a.cantidad}x ${a.producto} (${Store.formatMoney(a.precioUnitario)})`).join('\n');

      rows.push([
        Store.formatDate(c.fechaLiquidacion),
        (cl ? cl.nombre : '(eliminado)') + '\n' + detalleArts,
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
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Liquidado: ${Store.formatMoney(grandTotal)}   •   Total Piezas: ${totalPzas}`, 14, finalY + 12);

    doc.save(`Registro_${year}_${String(month + 1).padStart(2, '0')}.pdf`);
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
                <strong>${cl.nombre}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${cl.telefono || 'Sin WhatsApp'}</div>
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
    this.selectNuevoCliente('');
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
