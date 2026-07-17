import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, CreditCard, DollarSign, RefreshCw, Smartphone, Laptop, 
  Copy, Check, ArrowUpRight, ArrowDownLeft, Wallet, Landmark, HelpCircle, 
  Calendar, Layers, Filter, Search, Shield, Wifi, Info, ListFilter, Users,
  CheckCircle, TrendingUp, AlertCircle, Sparkles, Database, LogOut, Mail, Lock
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ================= CONFIGURACIÓN SEGURA DE SUPABASE =================
// Intentamos obtener las credenciales de Supabase del almacenamiento local (localStorage)
// Esto permite que el Canvas y tu propia web en Vercel funcionen sin caídas y de manera híbrida
const getStoredSupabaseConfig = () => {
  try {
    const stored = localStorage.getItem('finanzarg_supabase_config');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

const supabaseConfig = getStoredSupabaseConfig();
const isSupabaseActive = !!(supabaseConfig?.url && supabaseConfig?.anonKey);

// Inicializamos el cliente de Supabase condicionalmente para no romper la app si no está configurado
const supabase = isSupabaseActive 
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey) 
  : null;

export default function App() {
  // --- Estados de Autenticación y Conexión ---
  const [user, setUser] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Alternar entre Login y Registro
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Estados del Formulario de Credenciales de Base de Datos ---
  const [customUrl, setCustomUrl] = useState(supabaseConfig?.url || '');
  const [customAnonKey, setCustomAnonKey] = useState(supabaseConfig?.anonKey || '');

  // --- Estados de Negocio ---
  const [transactions, setTransactions] = useState([]);
  const [dolarBlue, setDolarBlue] = useState(1380); // Cotización por defecto ARS/USD
  const [deleteId, setDeleteId] = useState(null); // Para modal de confirmación

  // --- Estados del Formulario de Registro de Gasto ---
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS'); // ARS o USD
  const [paymentMethod, setPaymentMethod] = useState('efectivo'); // efectivo, debito, credito
  const [installments, setInstallments] = useState(1); // 1, 3, 6, 12, 18, 24 cuotas
  const [category, setCategory] = useState('Comida'); // Comida, Servicios, etc.

  // --- Estados de Filtrado ---
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ================= 1. CONTROL DE SESIÓN EN TIEMPO REAL (SUPABASE) =================
  useEffect(() => {
    if (!isSupabaseActive || !supabase) {
      setDbLoading(false);
      return;
    }

    // Comprobar sesión actual
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (e) {
        console.error("Error comprobando sesión de Supabase:", e);
      } finally {
        setDbLoading(false);
      }
    };
    checkSession();

    // Escuchar cambios de sesión (Login, Logout, Token renovado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ================= 2. ESCUCHA DE GASTOS EN TIEMPO REAL (SUPABASE O LOCAL) =================
  useEffect(() => {
    if (!isSupabaseActive || !user || !supabase) {
      // Modo Local: Cargar de localStorage
      const stored = localStorage.getItem('finanzarg_supabase_transactions_local');
      if (stored) {
        try {
          setTransactions(JSON.parse(stored));
        } catch (e) {
          console.error("Error cargando transacciones locales:", e);
        }
      }
      setDbLoading(false);
      return;
    }

    // Modo Sincronizado: Obtener transacciones del usuario actual
    const fetchTransactions = async () => {
      setDbLoading(true);
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTransactions(data || []);
      } catch (e) {
        console.error("Error obteniendo transacciones:", e);
        triggerToast("Error al sincronizar con la nube", "error");
      } finally {
        setDbLoading(false);
      }
    };
    fetchTransactions();

    // Configurar canal en tiempo real para refrescar automáticamente
    const channel = supabase
      .channel('realtime_transactions')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchTransactions(); // Refrescar en cualquier cambio (inserción, actualización, borrado)
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ================= AUXILIARES Y TOASTS =================
  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // ================= AUTENTICACIÓN (LOGIN / REGISTRO) =================
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      triggerToast("Ingresá correo y contraseña", "error");
      return;
    }

    if (!isSupabaseActive || !supabase) {
      // Mock Auth en modo local
      triggerToast("¡Simulación Exitosa! Conecta Supabase en Vincular para guardar de verdad.", "success");
      setUser({ id: 'local-user', email: authEmail.trim() });
      return;
    }

    setDbLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        triggerToast("¡Registro exitoso! Revisa tu email para confirmar", "success");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        triggerToast("Sesión iniciada con éxito", "success");
      }
    } catch (e) {
      console.error(e);
      triggerToast(e.message || "Error de autenticación", "error");
    } finally {
      setDbLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseActive && supabase) {
      await supabase.auth.signOut();
    } else {
      setUser(null);
    }
    triggerToast("Sesión cerrada", "info");
  };

  // ================= CONFIGURAR CREDENCIALES SUPABASE PROPIAS =================
  const handleSaveSupabaseConfig = (e) => {
    e.preventDefault();
    if (!customUrl.trim() || !customAnonKey.trim()) {
      triggerToast("Ingresá parámetros válidos", "error");
      return;
    }

    const config = {
      url: customUrl.trim(),
      anonKey: customAnonKey.trim()
    };

    localStorage.setItem('finanzarg_supabase_config', JSON.stringify(config));
    triggerToast("Configuración guardada. Reiniciando...", "success");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleClearSupabaseConfig = () => {
    localStorage.removeItem('finanzarg_supabase_config');
    localStorage.removeItem('finanzarg_supabase_transactions_local');
    triggerToast("Restablecido a Modo Local. Reiniciando...", "success");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // ================= REGISTRAR GASTO (SUPABASE O LOCAL) =================
  const handleSubmitTransaction = async (e) => {
    e.preventDefault();

    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      triggerToast("Completá descripción y monto válido", "error");
      return;
    }

    const newTransaction = {
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      payment_method: paymentMethod,
      installments: paymentMethod === 'credito' ? parseInt(installments) : 1,
      category,
    };

    if (!isSupabaseActive || !user || !supabase) {
      // Modo Local: guardar en localStorage
      const updatedItem = {
        id: 'local-' + Date.now(),
        created_at: new Date().toISOString(),
        user_id: 'local-user',
        ...newTransaction
      };
      const updatedList = [updatedItem, ...transactions];
      setTransactions(updatedList);
      localStorage.setItem('finanzarg_supabase_transactions_local', JSON.stringify(updatedList));
      
      setDescription('');
      setAmount('');
      setPaymentMethod('efectivo');
      setInstallments(1);
      triggerToast("Gasto guardado en tu dispositivo", "success");
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          ...newTransaction
        }]);

      if (error) throw error;

      setDescription('');
      setAmount('');
      setPaymentMethod('efectivo');
      setInstallments(1);
      triggerToast("Gasto guardado en Supabase", "success");
    } catch (error) {
      console.error("Error guardando transacción:", error);
      triggerToast("No se pudo guardar el gasto", "error");
    }
  };

  // ================= ELIMINAR GASTO (SUPABASE O LOCAL) =================
  const handleDeleteTransaction = async () => {
    if (!deleteId) return;

    if (!isSupabaseActive || !user || !supabase) {
      const updated = transactions.filter(t => t.id !== deleteId);
      setTransactions(updated);
      localStorage.setItem('finanzarg_supabase_transactions_local', JSON.stringify(updated));
      setDeleteId(null);
      triggerToast("Registro eliminado con éxito", "success");
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      triggerToast("Registro eliminado con éxito", "success");
    } catch (error) {
      console.error("Error al eliminar gasto:", error);
      triggerToast("No se pudo borrar el registro", "error");
    } finally {
      setDeleteId(null);
    }
  };

  // ================= FILTRADO Y ORDEN DE DATOS (EN MEMORIA) =================
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    if (filterMethod !== 'all') {
      result = result.filter(t => t.payment_method === filterMethod);
    }

    if (filterCurrency !== 'all') {
      result = result.filter(t => t.currency === filterCurrency);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(q) || 
        t.category.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [transactions, filterMethod, filterCurrency, searchQuery]);

  // ================= CÁLCULO DE TOTALES (EN MEMORIA) =================
  const financials = useMemo(() => {
    let cashDebitArs = 0;
    let cashDebitUsd = 0;
    let creditArs = 0; // Próxima cuota ARS
    let creditUsd = 0; // Próxima cuota USD
    let creditTotalAbsoluteArs = 0; // Deuda total absoluta ARS
    let creditTotalAbsoluteUsd = 0; // Deuda total absoluta USD

    transactions.forEach(t => {
      const value = t.amount;
      if (t.payment_method === 'credito') {
        const monthlyInstallment = value / (t.installments || 1);
        if (t.currency === 'ARS') {
          creditArs += monthlyInstallment;
          creditTotalAbsoluteArs += value;
        } else {
          creditUsd += monthlyInstallment;
          creditTotalAbsoluteUsd += value;
        }
      } else {
        if (t.currency === 'ARS') {
          cashDebitArs += value;
        } else {
          cashDebitUsd += value;
        }
      }
    });

    const consolidatedArs = cashDebitArs + (cashDebitUsd * dolarBlue);
    const consolidatedCreditArs = creditArs + (creditUsd * dolarBlue);
    const consolidatedCreditTotalAbsoluteArs = creditTotalAbsoluteArs + (creditTotalAbsoluteUsd * dolarBlue);

    return {
      cashDebitArs,
      cashDebitUsd,
      creditArs,
      creditUsd,
      consolidatedArs,
      consolidatedCreditArs,
      creditTotalAbsoluteArs,
      creditTotalAbsoluteUsd,
      consolidatedCreditTotalAbsoluteArs
    };
  }, [transactions, dolarBlue]);

  // ================= CATEGORÍAS GRÁFICOS (EN MEMORIA) =================
  const categoryStats = useMemo(() => {
    const counts = {};

    transactions.forEach(t => {
      const amountInPesos = t.currency === 'ARS' ? t.amount : t.amount * dolarBlue;
      counts[t.category] = (counts[t.category] || 0) + amountInPesos;
    });

    const totalInPesos = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalInPesos) * 100)
    })).sort((a, b) => b.value - a.value);
  }, [transactions, dolarBlue]);

  // Carga de ejemplo si la cuenta está nueva
  const handleLoadMockData = async () => {
    const mocks = [
      { description: "Supermercado Coto", amount: 45000, currency: "ARS", payment_method: "debito", installments: 1, category: "Comida" },
      { description: "Cena familiar", amount: 28000, currency: "ARS", payment_method: "efectivo", installments: 1, category: "Comida" },
      { description: "Compra Amazon (Zapatillas)", amount: 120, currency: "USD", payment_method: "credito", installments: 3, category: "Otros" },
      { description: "Suscripción Netflix", amount: 10, currency: "USD", payment_method: "credito", installments: 1, category: "Servicios" },
      { description: "Carga Sube", amount: 5000, currency: "ARS", payment_method: "debito", installments: 1, category: "Transporte" }
    ];

    if (!isSupabaseActive || !user || !supabase) {
      const formattedMocks = mocks.map((m, idx) => ({
        id: `mock-${idx}-${Date.now()}`,
        created_at: new Date(Date.now() - idx * 60000).toISOString(),
        user_id: 'local-user',
        ...m
      }));
      const updated = [...formattedMocks, ...transactions];
      setTransactions(updated);
      localStorage.setItem('finanzarg_supabase_transactions_local', JSON.stringify(updated));
      triggerToast("Cargados datos de prueba localmente", "success");
      return;
    }

    try {
      const insertList = mocks.map(m => ({ user_id: user.id, ...m }));
      const { error } = await supabase.from('transactions').insert(insertList);
      if (error) throw error;
      triggerToast("Cargados datos de prueba en la nube", "success");
    } catch (e) {
      console.error(e);
      triggerToast("No se pudieron cargar los datos de prueba", "error");
    }
  };

  // ================= VISTA DE AUTENTICACIÓN =================
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans antialiased">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
          
          <div className="text-center space-y-2">
            <div className="inline-flex bg-gradient-to-tr from-indigo-500 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20 mb-2">
              <Landmark className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">FinanzArg</h1>
            <p className="text-xs text-slate-400">Control de tus cuentas unificado con Supabase</p>
          </div>

          {!isSupabaseActive && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Modo Offline Activo:</strong> Tu propia base de datos de Supabase no está configurada aún. Puedes continuar registrando de forma local o vincular tu base gratis abajo.
              </span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  placeholder="tu@correo.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
            >
              {dbLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isSignUp ? (
                'Crear Cuenta Nueva'
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              {isSignUp ? '¿Ya tenés una cuenta? Inicia Sesión' : '¿No tenés una cuenta? Regístrate gratis'}
            </button>
          </div>

          <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
            {!isSupabaseActive && (
              <button
                onClick={() => setUser({ id: 'local-user', email: 'Invitado Local' })}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-all text-center"
              >
                Probar en Modo Local (Sin Cuenta)
              </button>
            )}

            <button
              onClick={() => setShowSyncModal(true)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              Configurar Credenciales de Supabase
            </button>
          </div>
        </div>

        {/* MODAL CONFIGURACIÓN SUPABASE */}
        {showSyncModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-scale-in">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Database className="text-indigo-400 w-4 h-4" />
                  Credenciales Supabase
                </h4>
                <button 
                  onClick={() => setShowSyncModal(false)}
                  className="text-xs text-slate-500 hover:text-white font-bold"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 text-xs text-slate-400">
                <p>Ingresa los parámetros de tu proyecto gratuito de Supabase para activar las cuentas y sincronización en tiempo real.</p>
                
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">SUPABASE_URL</label>
                  <input 
                    type="text" 
                    placeholder="https://your-project.supabase.co"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">SUPABASE_ANON_KEY</label>
                  <input 
                    type="text" 
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={customAnonKey}
                    onChange={(e) => setCustomAnonKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl transition-all flex-1"
                  >
                    Conectar Base
                  </button>
                  {localStorage.getItem('finanzarg_supabase_config') && (
                    <button
                      type="button"
                      onClick={handleClearSupabaseConfig}
                      className="bg-rose-950 hover:bg-rose-900 border border-rose-900/40 text-rose-300 font-bold px-4 py-2 rounded-xl transition-all"
                    >
                      Desconectar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= VISTA PRINCIPAL (DASHBOARD) =================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      
      {/* TOAST SYSTEM */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-xl shadow-2xl border bg-slate-900 border-slate-800 animate-slide-in">
          <div className={`w-2.5 h-2.5 rounded-full mr-3 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-sm font-medium text-slate-200">{toast.message}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="bg-gradient-to-tr from-indigo-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">FinanzArg</h1>
              {isSupabaseActive ? (
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/20 flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5" /> Nube Supabase
                </span>
              ) : (
                <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-500/20 flex items-center gap-1">
                  <Info className="w-2.5 h-2.5" /> Modo Local (Offline)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">Billetera de Pesos & Dólares multi-dispositivo</p>
          </div>
        </div>

        {/* USUARIO CONECTADO */}
        <div className="flex items-center flex-wrap gap-3 justify-end w-full md:w-auto">
          <div className="flex items-center bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl gap-2 text-xs text-slate-300">
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate max-w-[150px]">Cuenta: <strong>{user.email}</strong></span>
          </div>

          <button 
            onClick={handleLogout}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CUERPO CENTRAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* NOTIFICACIÓN MODO LOCAL */}
        {!isSupabaseActive && (
          <section className="bg-slate-900/85 border border-indigo-900/40 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                ¡Estás en Modo Local! (Offline)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                Los consumos se almacenan en este navegador. Para habilitar la sincronización privada por internet entre tu computadora y tu celular, conecta tu base gratuita de Supabase.
              </p>
            </div>
            <button 
              onClick={() => setShowSyncModal(true)}
              className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800/40 text-indigo-300 text-xs font-bold px-4 py-2 rounded-xl shrink-0 transition-colors"
            >
              Configurar Supabase Gratis
            </button>
          </section>
        )}

        {/* CONTROL DE COTIZACIÓN BLUE */}
        <section className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-emerald-400 w-5 h-5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-400">Conversor Consolidado (Moneda Única)</p>
              <p className="text-[11px] text-slate-500">Utilizado para calcular tu balance consolidado y gráficos en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">1 USD =</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">$</span>
              <input 
                type="number" 
                value={dolarBlue}
                onChange={(e) => setDolarBlue(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-3 py-1 w-28 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">ARS (Dólar Blue)</span>
          </div>
        </section>

        {/* SECCIÓN 1: EFECTIVO Y DÉBITO */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 px-1">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Líquido Disponible (Efectivo & Débito)</h4>
          </div>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/10">ARS Liquidez</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400">Total en Pesos ARS</span>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  ${financials.cashDebitArs.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Suma de Efectivo y cuentas de Débito</p>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/10">USD Líquido</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400">Total en Dólares USD</span>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  u$s {financials.cashDebitUsd.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                ≈ ${(financials.cashDebitUsd * dolarBlue).toLocaleString('es-AR', { minimumFractionDigits: 0 })} ARS
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-950/40 via-indigo-900/10 to-slate-950 border border-indigo-900/30 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between h-40">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
              <div className="flex justify-between items-start">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">Líquido Neto</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-indigo-300 font-medium">Consolidado Total ARS</span>
                <h3 className="text-2xl font-black tracking-tight text-indigo-100">
                  ${financials.consolidatedArs.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </h3>
              </div>
              <p className="text-[10px] text-indigo-400">Conversión de dólares calculada al Blue</p>
            </div>

          </section>
        </div>

        {/* SECCIÓN 2: TARJETAS DE CRÉDITO */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 px-1">
            <CreditCard className="w-4 h-4 text-rose-400" />
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarjetas de Crédito (Deuda Total & Financiación)</h4>
          </div>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/10">ARS Deuda Total</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400">Monto Total de Consumos</span>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  ${financials.creditTotalAbsoluteArs.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </h3>
              </div>
              <p className="text-[10px] text-rose-400/90 font-medium mt-1">
                Próximo Vencimiento: ${financials.creditArs.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/10">USD Deuda Total</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400">Monto Total en USD</span>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  u$s {financials.creditTotalAbsoluteUsd.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </h3>
              </div>
              <p className="text-[10px] text-rose-400/90 font-medium mt-1">
                Próximo Vencimiento: u$s {financials.creditUsd.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-rose-950/40 via-rose-900/10 to-slate-950 border border-rose-900/30 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between h-40">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl"></div>
              <div className="flex justify-between items-start">
                <div className="p-2 bg-rose-500/20 rounded-xl text-rose-300">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-500/30">Deuda Consolidada</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-rose-300 font-medium">Deuda Consolidada ARS</span>
                <h3 className="text-2xl font-black tracking-tight text-rose-100">
                  ${financials.consolidatedCreditTotalAbsoluteArs.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </h3>
              </div>
              <p className="text-[10px] text-rose-400">Próxima cuota total: ${financials.consolidatedCreditArs.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</p>
            </div>

          </section>
        </div>

        {/* ESTRUCTURA DEL FORMULARIO Y HISTORIAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* FORMULARIO DE CARGA */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 space-y-5">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-900">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Cargar un Gasto</h3>
              </div>

              <form onSubmit={handleSubmitTransaction} className="space-y-4">
                
                {/* Categoría */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Categoría</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Comida">🍔 Comida</option>
                    <option value="Servicios">💡 Servicios</option>
                    <option value="Transporte">🚌 Transporte</option>
                    <option value="Ocio">🍿 Ocio y Salidas</option>
                    <option value="Entretenimiento">🎬 Entretenimiento</option>
                    <option value="Salud">🩺 Salud</option>
                    <option value="Compras">🛍️ Compras</option>
                    <option value="Otros">📦 Otros consumos</option>
                  </select>
                </div>

                {/* Descripción */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Descripción / Establecimiento</label>
                  <input 
                    type="text" 
                    placeholder="Ej. ChangoMas, Nafta, Netflix..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                  />
                </div>

                {/* Importe y Moneda */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Importe del Gasto</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500">
                        {currency === 'ARS' ? '$' : 'u$s'}
                      </span>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ARS">ARS ($)</option>
                      <option value="USD">USD (u$s)</option>
                    </select>
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Método de Pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'efectivo', label: 'Efectivo', icon: Wallet },
                      { id: 'debito', label: 'Débito', icon: Landmark },
                      { id: 'credito', label: 'Crédito', icon: CreditCard }
                    ].map(method => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 text-center transition-all ${isSelected ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-bold' : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'}`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px]">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selección de cuotas (Crédito) */}
                {paymentMethod === 'credito' && (
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-400">Cantidad de Cuotas</span>
                      <span className="font-bold text-indigo-400">
                        {installments} {installments === 1 ? 'cuota' : 'cuotas'}
                      </span>
                    </div>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value={1}>1 Pago sin cuotas</option>
                      <option value={3}>3 Cuotas fijas</option>
                      <option value={6}>6 Cuotas fijas</option>
                      <option value={9}>9 Cuotas fijas</option>
                      <option value={12}>12 Cuotas fijas</option>
                      <option value={18}>18 Cuotas fijas</option>
                      <option value={24}>24 Cuotas fijas</option>
                    </select>
                    {amount && parseFloat(amount) > 0 && (
                      <p className="text-[10px] text-slate-500 pt-1">
                        Pagarás un aproximado de <strong>{currency === 'ARS' ? '$' : 'u$s'} {(parseFloat(amount) / installments).toFixed(2)}</strong> por mes.
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4.5 h-4.5" />
                  <span>Cargar Gasto</span>
                </button>

              </form>
            </div>

            {/* GRÁFICOS DE CATEGORÍA */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Distribución de Gastos</h3>
              
              {categoryStats.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Registra gastos para ver el análisis de consumos.</p>
              ) : (
                <div className="space-y-3">
                  {categoryStats.map(cat => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">{cat.name}</span>
                        <span className="text-slate-400 font-medium">
                          ${cat.value.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                        <div 
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* HISTORIAL Y FILTROS */}
          <div className="lg:col-span-2 space-y-4 flex flex-col h-full">
            
            {/* FILTROS RÁPIDOS */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Buscar gastos..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none placeholder-slate-600"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                
                <div className="flex items-center space-x-1">
                  <ListFilter className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">Cualquier Pago</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Tarjeta Crédito</option>
                  </select>
                </div>

                <select
                  value={filterCurrency}
                  onChange={(e) => setFilterCurrency(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="all">Cualquier Moneda</option>
                  <option value="ARS">Solo Pesos ($)</option>
                  <option value="USD">Solo Dólares (u$s)</option>
                </select>

              </div>
            </div>

            {/* LISTADO DE TRANSACCIONES */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-3xl flex-1 flex flex-col overflow-hidden min-h-[400px]">
              
              <div className="px-6 py-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/30">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial Sincronizado</h4>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-md font-bold">
                  {filteredAndSortedTransactions.length} registros
                </span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
                {filteredAndSortedTransactions.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                    <Landmark className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-bold text-slate-400">Sin consumos cargados</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">No encontramos gastos que coincidan con los filtros activos.</p>
                    
                    {transactions.length === 0 && (
                      <button 
                        onClick={handleLoadMockData}
                        className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-800 rounded-xl text-xs font-bold transition-all"
                      >
                        Cargar gastos de prueba
                      </button>
                    )}
                  </div>
                ) : (
                  filteredAndSortedTransactions.map((t) => (
                    <div key={t.id} className="px-6 py-4 flex justify-between items-center gap-4 hover:bg-slate-900/20 transition-colors">
                      <div className="flex items-start space-x-3.5 min-w-0">
                        
                        <div className={`p-2 rounded-xl shrink-0 ${t.payment_method === 'credito' ? 'bg-rose-500/10 text-rose-400' : t.payment_method === 'debito' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {t.payment_method === 'credito' ? (
                            <CreditCard className="w-4.5 h-4.5" />
                          ) : t.payment_method === 'debito' ? (
                            <Landmark className="w-4.5 h-4.5" />
                          ) : (
                            <Wallet className="w-4.5 h-4.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{t.description}</p>
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="text-[9px] bg-slate-850 text-slate-400 px-1.5 rounded-md font-medium border border-slate-800">
                              {t.category}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              vía <strong className="text-slate-400 capitalize">{t.payment_method}</strong>
                            </span>
                            {t.installments > 1 && (
                              <span className="text-[9px] text-rose-400 font-bold bg-rose-500/5 px-1.5 rounded">
                                {t.installments} cuotas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-black text-white">
                            {t.currency === 'ARS' ? '$' : 'u$s'} {t.amount.toLocaleString('es-AR')}
                          </p>
                          {t.payment_method === 'credito' && t.installments > 1 && (
                            <p className="text-[9px] text-rose-400">
                              Cuotas de: {t.currency === 'ARS' ? '$' : 'u$s'} {(t.amount / t.installments).toFixed(2)}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => setDeleteId(t.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <p>FinanzArg Supabase Cloud Wallet — Conexión cifrada de datos en tiempo real.</p>
        <p className="text-[10px] text-slate-600 mt-0.5">Utiliza infraestructura de base de datos híbrida local y Postgres en la nube.</p>
      </footer>

      {/* MODAL CONFIGURACIÓN SUPABASE EN DASHBOARD */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Database className="text-indigo-400 w-4 h-4" />
                Credenciales Supabase
              </h4>
              <button 
                onClick={() => setShowSyncModal(false)}
                className="text-xs text-slate-500 hover:text-white font-bold"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 text-xs text-slate-400">
              <p>Ingresa los parámetros de tu proyecto gratuito de Supabase para activar las cuentas y sincronización en tiempo real.</p>
              
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">SUPABASE_URL</label>
                <input 
                  type="text" 
                  placeholder="https://your-project.supabase.co"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">SUPABASE_ANON_KEY</label>
                <input 
                  type="text" 
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={customAnonKey}
                  onChange={(e) => setCustomAnonKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl transition-all flex-1"
                >
                  Conectar Base
                </button>
                {localStorage.getItem('finanzarg_supabase_config') && (
                  <button
                    type="button"
                    onClick={handleClearSupabaseConfig}
                    className="bg-rose-950 hover:bg-rose-900 border border-rose-900/40 text-rose-300 font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    Desconectar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE BORRADO */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="text-rose-500 w-4 h-4" />
              ¿Eliminar Gasto?
            </h4>
            <p className="text-xs text-slate-400">
              Esta acción eliminará de forma permanente el registro seleccionado. Esta operación no se puede deshacer.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button 
                onClick={() => setDeleteId(null)}
                className="bg-slate-950 hover:bg-slate-850 text-slate-400 border border-slate-800 text-xs px-3 py-2 rounded-lg font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteTransaction}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-4 py-2 rounded-lg font-bold"
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
