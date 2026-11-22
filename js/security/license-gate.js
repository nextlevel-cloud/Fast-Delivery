import { LicenseClient } from './license-client.js';

export const LICENSE_CONFIG = {
  supabaseUrl: 'https://dtkucbaomomsvnjxatfc.supabase.co',
  supabaseAnonKey: 'sb_publishable_iYLTm8CdcQKj8qgPyuk4gg_bPvE7Lcm',
  appSlug: 'pedidosweb'
};

export const licenseClient = new LicenseClient(LICENSE_CONFIG);

export async function requireActiveLicense() {
  const status = await licenseClient.verify();
  return status;
}

export async function callProtectedAction(action, payload = {}) {
  const res = await fetch(`${LICENSE_CONFIG.supabaseUrl.replace(/\/$/, '')}/functions/v1/protected-action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: LICENSE_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${LICENSE_CONFIG.supabaseAnonKey}`
    },
    body: JSON.stringify({
      app_slug: LICENSE_CONFIG.appSlug,
      device_id: licenseClient.getDeviceId(),
      action,
      payload
    })
  });
  return res.json();
}
