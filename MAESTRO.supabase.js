/**
 * ==============================================================================
 * MAESTRO.supabase.js - Cuenta y base de datos en Supabase
 * Proyecto: Finanzas (presupuesto mensual)
 * ==============================================================================
 * Expone window.FinanzasSupabase: cliente de Supabase, sesión con Google y lectura/guardado
 * del presupuesto y de los movimientos de tarjetas.
 * La clave "publishable" es pública por diseño: lo que protege los datos son las
 * políticas RLS de cada tabla (cada fila solo la ve su dueño, con sesión iniciada).
 * Depende de la librería supabase-js (index.html), cargada antes de este archivo.
 */

(function (window) {
  'use strict';

  const SUPABASE_URL = 'https://uuhnshezhvfqbtkxdiwc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_mvWKkM8bqV9_tuYByjPoUg_Waau9btY';

  if (!window.supabase || !window.supabase.createClient) {
    console.warn('supabase-js no cargó: la cuenta de Supabase no está disponible.');
    window.FinanzasSupabase = null;
    return;
  }

  // PKCE devuelve ?code=… en la URL; el flujo por defecto usa #access_token=…, que chocaría con las vistas (#overview)
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  async function getUser() {
    const { data } = await client.auth.getSession();
    return (data && data.session && data.session.user) || null;
  }

  function signInWithGoogle() {
    return client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname }
    });
  }

  function signOut() {
    return client.auth.signOut();
  }

  // callback(user | null); devuelve la función para dejar de escuchar
  function onAuthChange(callback) {
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      callback((session && session.user) || null);
    });
    return () => data.subscription.unsubscribe();
  }

  // --- Datos: funciones de la base (ver HISTORIAL.md §7). Cada una lee o escribe solo las filas del usuario ---
  async function rpc(name, args) {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(error.message);
    return data;
  }

  // { byMonth: { "YYYY-MM": { categories, extra } }, shared: { notes, cardPayments, lastSaved } | null }
  const loadBudget = () => rpc('load_budget');
  const saveBudget = (byMonth, shared) => rpc('save_budget', { p_months: byMonth, p_shared: shared || null });

  // Almacén de movimientos: { tx, paypal, seen, rules, cards, lastSync, updatedAt }
  const loadMovements = () => rpc('load_movements');
  const saveMovements = (store) => rpc('save_movements', { p_store: store });

  // Tasa de referencia del dólar del Banco Central (función "tasa" de Supabase)
  async function fetchTasa() {
    const { data, error } = await client.functions.invoke('tasa', { body: {} });
    if (error) throw new Error(error.message);
    return data;
  }

  window.FinanzasSupabase = {
    client, getUser, signInWithGoogle, signOut, onAuthChange,
    loadBudget, saveBudget, loadMovements, saveMovements, fetchTasa
  };
})(window);
