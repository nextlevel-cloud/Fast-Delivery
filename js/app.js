import { Store } from './store.js';
import { Screens } from './screens.js';
import { licenseClient, requireActiveLicense } from './security/license-gate.js';

export const App = {
  currentTab: 'cuentas',
  historyStack: [],
  regYear: new Date().getFullYear(),
  regMonth: new Date().getMonth(),

  async init() {
    Store.init();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // Comprobación de suscripción / licencia
    await this.checkLicense();
    this.render();
  },

  async checkLicense() {
    const gateEl = document.getElementById('licenseGateOverlay');
    try {
      const status = await requireActiveLicense();
      if (!status || !status.active) {
        if (gateEl) gateEl.style.display = 'flex';
        return false;
      } else {
        if (gateEl) gateEl.style.display = 'none';
        return true;
      }
    } catch (e) {
      console.warn("Verificando licencia offline:", e);
      return true;
    }
  },

  async redeemLicense() {
    const codeInput = document.getElementById('inputLicenseCode');
    const errEl = document.getElementById('licenseError');
    const btn = document.getElementById('btnRedeemLicense');
    const code = codeInput.value.trim().toUpperCase();

    if (!code) {
      errEl.textContent = 'Por favor ingresa un código.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Verificando...';
    errEl.style.display = 'none';

    try {
      const res = await licenseClient.redeem(code);
      if (res.ok) {
        document.getElementById('licenseGateOverlay').style.display = 'none';
        alert("🎉 ¡Licencia activada con éxito!");
        this.render();
      } else {
        errEl.textContent = res.error || 'Código inválido o ya utilizado.';
        errEl.style.display = 'block';
      }
    } catch (err) {
      errEl.textContent = 'Error de conexión con el servidor de licencias.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Activar Aplicación';
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.historyStack = [];
    this.render();
  },

  navigate(screen, params = {}) {
    this.historyStack.push({ screen, params });
    this.render();
  },

  goBack() {
    if (this.historyStack.length > 0) {
      this.historyStack.pop();
      this.render();
    }
  },

  openBackup() {
    this.navigate('respaldo');
  },

  openNewOrder(clienteId = null) {
    this.navigate('nuevo', { clienteId });
  },

  openDetalle(cuentaId) {
    this.navigate('detalle', { cuentaId });
  },

  render() {
    const currentScreen = this.historyStack[this.historyStack.length - 1];
    const isSecondary = !!currentScreen;

    document.getElementById('btnBack').style.display = isSecondary ? 'flex' : 'none';
    document.getElementById('bottomNav').style.display = isSecondary ? 'none' : 'flex';
    document.getElementById('btnFab').style.display = (!isSecondary && this.currentTab === 'cuentas') ? 'flex' : 'none';
    document.getElementById('btnBackup').style.display = isSecondary ? 'none' : 'flex';

    document.querySelectorAll('.nav-tab').forEach((el, idx) => {
      const tabs = ['cuentas', 'registro', 'catalogo'];
      if (tabs[idx] === this.currentTab) el.classList.add('active');
      else el.classList.remove('active');
    });

    const main = document.getElementById('appContent');
    const title = document.getElementById('appTitle');

    if (isSecondary) {
      if (currentScreen.screen === 'detalle') {
        title.textContent = 'Cuenta';
        main.innerHTML = Screens.renderDetalle(currentScreen.params.cuentaId);
      } else if (currentScreen.screen === 'nuevo') {
        title.textContent = 'Agregar prenda';
        main.innerHTML = Screens.renderNuevo(currentScreen.params.clienteId);
      } else if (currentScreen.screen === 'respaldo') {
        title.textContent = 'Respaldo';
        main.innerHTML = Screens.renderRespaldo();
      }
    } else {
      if (this.currentTab === 'cuentas') {
        title.textContent = 'Pedidos pendientes';
        main.innerHTML = Screens.renderCuentas();
      } else if (this.currentTab === 'registro') {
        title.textContent = 'Registro mensual';
        main.innerHTML = Screens.renderRegistro(this.regYear, this.regMonth);
      } else if (this.currentTab === 'catalogo') {
        title.textContent = 'Clientes y prendas';
        main.innerHTML = Screens.renderCatalogo();
      }
    }
  }
};

window.Store = Store;
window.Screens = Screens;
window.App = App;

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
