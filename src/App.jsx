import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, CreditCard, DollarSign, Wallet, Landmark, 
  Search, Sun, Globe, Sparkles, PieChart, BarChart3,
  Mail, Lock, Database, LogOut, Info, RefreshCw, Wifi
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const frutigerStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
  }
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
    50% { transform: translateY(-30px) rotate(-5deg) scale(1.05); }
  }
  @keyframes shine {
    0% { left: -100%; }
    20% { left: 100%; }
    100% { left: 100%; }
  }
  @keyframes bar-grow {
    from { width: 0%; }
  }
  
  /* Panel de Cristal Principal */
  .glass-panel {
    position: relative;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.25) 30%, rgba(255, 255, 255, 0.1) 70%, rgba(255, 255, 255, 0.4) 100%);
    backdrop-filter: blur(16px) saturate(130%);
    -webkit-backdrop-filter: blur(16px) saturate(130%);
    
    border-top: 1px solid rgba(255, 255, 255, 0.95);
    border-left: 1px solid rgba(255, 255, 255, 0.85);
    border-right: 1px solid rgba(255, 255, 255, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    
    box-shadow: 
      0 12px 35px rgba(0, 50, 150, 0.2), 
      inset 0 2px 4px rgba(255, 255, 255, 1), 
      inset 0 -4px 15px rgba(0, 100, 200, 0.15);
  }

  .glass-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 35%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 100%);
    border-radius: inherit;
    pointer-events: none;
  }

  /* Botones Brillantes */
  .glossy-button-green {
    position: relative;
    background: linear-gradient(180deg, #88ff66 0%, #22cc00 100%);
    border-top: 2px solid rgba(255, 255, 255, 0.9);
    border-bottom: 1px solid #004400;
    box-shadow: 0 5px 15px rgba(0, 150, 0, 0.5), inset 0 -4px 10px rgba(0, 0, 0, 0.15);
    color: #004400;
    text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
  }
  .glossy-button-green::before, .glossy-button-blue::before {
    content: '';
    position: absolute;
    top: 0; left: 5%; right: 5%; height: 40%;
    background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%);
    border-radius: 20px 20px 0 0;
    pointer-events: none;
  }
  .glossy-button-blue {
    position: relative;
    background: linear-gradient(180deg, #66ccff 0%, #0066ff 100%);
    border-top: 2px solid rgba(255, 255, 255, 0.9);
    border-bottom: 1px solid #002266;
    box-shadow: 0 5px 15px rgba(0, 100, 255, 0.4), inset 0 -4px 10px rgba(0, 0, 0, 0.2);
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .bubble {
    border: 2px solid rgba(255, 255, 255, 0.8);
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 60%);
    box-shadow: inset -5px -5px 15px rgba(0, 100, 200, 0.3), inset 5px 5px 15px rgba(255, 255, 255, 1);
    border-radius: 50%;
  }

  /* Barras de Progreso Estilo Windows Vista/7 */
  .glossy-bar-container {
    background: rgba(255,255,255,0.4);
    border: 1px solid rgba(255,255,255,0.8);
    box-shadow: inset 0 3px 6px rgba(0,50,150,0.2), 0 1px 2px rgba(255,255,255,0.8);
    border-radius: 12px;
    height: 18px;
    width: 100%;
    position: relative;
    overflow: hidden;
  }
  .glossy-bar-fill {
    height: 100%;
    border-radius: 12px;
    position: relative;
    border-top: 1px solid rgba(255,255,255,0.9);
    border-right: 1px solid rgba(255,255,255,0.7);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2), inset 0 -3px 6px rgba(0,0,0,0.25);
    animation: bar-grow 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
  }
  .glossy-bar-fill::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 45%;
    background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%);
    border-radius: 12px 12px 0 0;
  }
  
  .fill-blue { background: linear-gradient(180deg, #66ccff 0%, #0055ff 100%); }
  .fill-green { background: linear-gradient(180deg, #77ff33 0%, #009900 100%); }
  .fill-orange { background: linear-gradient(180deg, #ffcc33 0%, #dd5500 100%); }
  .fill-cyan { background: linear-gradient(180deg, #33ffff 0%, #0088aa 100%); }
  .fill-purple { background: linear-gradient(180deg, #dd66ff 0%, #6600cc 100%); }
  .fill-pink { background: linear-gradient(180deg, #ff99cc 0%, #cc0055 100%); }

  .text-frutiger {
    color: #003388;
    text-shadow: 0 2px 5px rgba(255, 255, 255, 0.9), 0 0 2px rgba(255, 255, 255, 1);
  }
`;

const COLORS = ['fill-blue', 'fill-green', 'fill-orange', 'fill-cyan', 'fill-purple', 'fill-pink'];

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
const supabase = isSupabaseActive ? createClient(supabaseConfig.url, supabaseConfig.anonKey) : null;

export default function App() {
  // --- Estados de Autenticación y Conexión ---
  const [user, setUser] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [customUrl, setCustomUrl] = useState(supabaseConfig?.url || '');
  const [customAnonKey, setCustomAnonKey] = useState(supabaseConfig?.anonKey || '');

  // --- Estados de la App ---
  const [transactions, setTransactions] = useState([]);
  const [dolarBlue, setDolarBlue] = useState(1380);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [paymentMethod, setPaymentMethod] = useState('credito');
  const [installments, setInstallments] = useState(1);
  const [category, setCategory] = useState('Compras');
  const [entityName, setEntityName] = useState(''); // Tarjeta / Banco
  const [filterMethod, setFilterMethod] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isSupabaseActive || !supabase) {
      setDbLoading(false);
      return;
    }
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseActive || !user || !supabase) {
      const stored = localStorage.getItem('finanzarg_supabase_transactions_local');
      if (stored) {
        try { setTransactions(JSON.parse(stored)); } catch (e) { console.error(e); }
      }
      setDbLoading(false);
      return;
    }

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
      } finally {
        setDbLoading(false);
      }
    };
    fetchTransactions();

    const channel = supabase
      .channel('realtime_transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => {
        fetchTransactions();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const triggerToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      triggerToast("Ingresá correo y contraseña");
      return;
    }
    if (!isSupabaseActive || !supabase) {
      triggerToast("Simulación Local Exitosa");
      setUser({ id: 'local-user', email: authEmail.trim() });
      return;
    }
    setDbLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        triggerToast("¡Registro exitoso! Revisa tu email (si aplica)");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        triggerToast("Sesión iniciada con éxito");
      }
    } catch (e) {
      triggerToast(e.message || "Error de autenticación");
    } finally {
      setDbLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseActive && supabase) await supabase.auth.signOut();
    else setUser(null);
  };

  const handleSaveSupabaseConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('finanzarg_supabase_config', JSON.stringify({ url: customUrl.trim(), anonKey: customAnonKey.trim() }));
    window.location.reload();
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const newTransaction = {
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      payment_method: paymentMethod,
      entity: paymentMethod === 'efectivo' ? 'Efectivo' : (entityName.trim() || 'Tarjeta Desconocida'),
      installments: paymentMethod === 'credito' ? parseInt(installments) : 1,
      category
    };

    if (!isSupabaseActive || !user || !supabase) {
      const updatedItem = { id: 'local-' + Date.now(), created_at: new Date().toISOString(), user_id: 'local-user', ...newTransaction };
      const updatedList = [updatedItem, ...transactions];
      setTransactions(updatedList);
      localStorage.setItem('finanzarg_supabase_transactions_local', JSON.stringify(updatedList));
      resetForm();
      triggerToast("Gasto guardado localmente");
      return;
    }

    try {
      const { data, error } = await supabase.from('transactions').insert([{ user_id: user.id, ...newTransaction }]).select();
      if (error) throw error;
      setTransactions([data[0], ...transactions]); // Actualización Optimista
      resetForm();
      triggerToast("Gasto añadido a la nube");
    } catch (error) {
      console.error(error);
      triggerToast("Error al guardar");
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!isSupabaseActive || !user || !supabase) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem('finanzarg_supabase_transactions_local', JSON.stringify(updated));
      triggerToast("Registro eliminado");
      return;
    }
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter(t => t.id !== id)); // Actualización Optimista
      triggerToast("Registro eliminado de la nube");
    } catch (error) {
      console.error(error);
      triggerToast("Error al eliminar");
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setEntityName('');
  };

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (filterMethod !== 'all') result = result.filter(t => t.payment_method === filterMethod);
    if (searchQuery) result = result.filter(t => t.description.toLowerCase().includes(searchQuery.toLowerCase()) || (t.entity && t.entity.toLowerCase().includes(searchQuery.toLowerCase())));
    return result;
  }, [transactions, filterMethod, searchQuery]);

  const financials = useMemo(() => {
    let cashDebitArs = 0, cashDebitUsd = 0;
    let creditTotalArs = 0, creditTotalUsd = 0; 
    transactions.forEach(t => {
      const val = t.amount;
      if (t.payment_method === 'credito') {
        if (t.currency === 'ARS') { creditTotalArs += val; } else { creditTotalUsd += val; }
      } else {
        if (t.currency === 'ARS') { cashDebitArs += val; } else { cashDebitUsd += val; }
      }
    });
    const totalArsLiquid = cashDebitArs + (cashDebitUsd * dolarBlue);
    const totalArsCredit = creditTotalArs + (creditTotalUsd * dolarBlue);
    return { cashDebitArs, cashDebitUsd, creditTotalArs, creditTotalUsd, unifiedTotalArs: totalArsLiquid + totalArsCredit };
  }, [transactions, dolarBlue]);

  const categoryStats = useMemo(() => {
    const counts = {};
    transactions.forEach(t => {
      const amountInArs = t.currency === 'ARS' ? t.amount : t.amount * dolarBlue;
      counts[t.category] = (counts[t.category] || 0) + amountInArs;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value, percentage: financials.unifiedTotalArs > 0 ? ((value / financials.unifiedTotalArs) * 100) : 0 })).sort((a, b) => b.value - a.value);
  }, [transactions, dolarBlue, financials.unifiedTotalArs]);

  const entityStats = useMemo(() => {
    const counts = {};
    transactions.forEach(t => {
      const amountInArs = t.currency === 'ARS' ? t.amount : t.amount * dolarBlue;
      const eName = t.entity || (t.payment_method === 'efectivo' ? 'Efectivo' : 'Otra Tarjeta');
      counts[eName] = (counts[eName] || 0) + amountInArs;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value, percentage: financials.unifiedTotalArs > 0 ? ((value / financials.unifiedTotalArs) * 100) : 0 })).sort((a, b) => b.value - a.value);
  }, [transactions, dolarBlue, financials.unifiedTotalArs]);

  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden font-sans flex items-center justify-center p-4 bg-gradient-to-b from-[#87CEEB] via-[#4682B4] to-[#1E90FF]">
        <style dangerouslySetInnerHTML={{ __html: frutigerStyles }} />
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] bg-white rounded-full blur-[80px] opacity-80"></div>
          <div className="absolute bottom-[-10vh] left-[-10vw] w-[120vw] h-[50vh] bg-gradient-to-t from-[#005500] via-[#22aa22] to-[#77ff33] rounded-[100%] border-t-[4px] border-white/60 opacity-90"></div>
          <div className="bubble absolute top-[25%] right-[20%] w-20 h-20" style={{ animation: 'float-slow 6s ease-in-out infinite' }}></div>
          <div className="bubble absolute bottom-[35%] left-[25%] w-12 h-12" style={{ animation: 'float 5s ease-in-out infinite 1s' }}></div>
        </div>

        <div className="glass-panel w-full max-w-md rounded-[2.5rem] p-8 z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex bubble bg-white/40 p-4 rounded-full shadow-lg mb-2">
              <Globe className="w-10 h-10 text-blue-600 drop-shadow-md" />
            </div>
            <h1 className="text-3xl font-black text-frutiger tracking-tight">FinanzArg</h1>
            <p className="text-xs font-bold text-blue-900/70 uppercase tracking-widest">Aero Glass Edition</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-blue-900/70 uppercase tracking-wider">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-blue-600" />
                <input type="email" placeholder="tu@correo.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required
                  className="w-full bg-white/50 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-2xl pl-9 pr-4 py-2.5 text-sm font-bold text-blue-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-900/40" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-blue-900/70 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-blue-600" />
                <input type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required
                  className="w-full bg-white/50 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-2xl pl-9 pr-4 py-2.5 text-sm font-bold text-blue-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-900/40" />
              </div>
            </div>
            <button type="submit" className="w-full py-3 glossy-button-blue text-white rounded-2xl font-black text-sm transition-transform active:scale-95 flex items-center justify-center gap-2">
              {dbLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-[11px] font-black text-blue-800 hover:text-blue-600">
              {isSignUp ? '¿Ya tenés cuenta? Entrar' : '¿No tenés cuenta? Registrarse'}
            </button>
          </div>

          <div className="border-t border-white/40 pt-4 flex flex-col gap-3">
            <button onClick={() => setShowSyncModal(true)} className="text-xs font-bold text-blue-900/80 hover:text-blue-900 flex items-center justify-center gap-1.5 bg-white/30 p-2 rounded-xl">
              <Database className="w-4 h-4" /> Configurar Base de Datos
            </button>
          </div>
        </div>

        {/* Modal DB (Login) */}
        {showSyncModal && (
          <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-[2rem] w-full max-w-md space-y-4">
               <h4 className="text-sm font-black text-frutiger">Credenciales Supabase</h4>
               <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
                  <input type="text" placeholder="SUPABASE_URL" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} required className="w-full bg-white/50 border-t-2 border-l-2 border-white/90 border-b border-r border-white/30 rounded-xl p-2.5 text-sm font-bold text-blue-900 shadow-inner focus:outline-none" />
                  <input type="text" placeholder="SUPABASE_ANON_KEY" value={customAnonKey} onChange={(e) => setCustomAnonKey(e.target.value)} required className="w-full bg-white/50 border-t-2 border-l-2 border-white/90 border-b border-r border-white/30 rounded-xl p-2.5 text-sm font-bold text-blue-900 shadow-inner focus:outline-none" />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 glossy-button-green rounded-xl font-bold">Guardar</button>
                    <button type="button" onClick={() => setShowSyncModal(false)} className="px-4 py-2 bg-white/50 rounded-xl font-bold text-blue-900 border border-white">Cerrar</button>
                  </div>
               </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-blue-950 bg-gradient-to-b from-[#87CEEB] via-[#4682B4] to-[#1E90FF] selection:bg-lime-300 selection:text-blue-900 pb-10">
      <style dangerouslySetInnerHTML={{ __html: frutigerStyles }} />

      {/* FONDOS FRUTIGER AERO */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[5%] right-[10%] w-[30rem] h-[30rem] bg-white rounded-full blur-[80px] opacity-90"></div>
        <div className="absolute top-[20%] left-[10%] w-[40rem] h-[40rem] bg-cyan-300/40 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[20%] right-[15%] w-[35rem] h-[35rem] bg-blue-400/40 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[20vh] -left-[10vw] w-[120vw] h-[50vh] bg-gradient-to-t from-[#005500] via-[#22aa22] to-[#77ff33] rounded-[100%] border-t-[4px] border-white/60 shadow-[0_-15px_50px_rgba(0,255,0,0.5)] opacity-95"></div>
        <div className="absolute -bottom-[35vh] -right-[5vw] w-[90vw] h-[60vh] bg-gradient-to-t from-[#003300] via-[#008800] to-[#55ee00] rounded-[100%] border-t-[3px] border-white/50 opacity-90"></div>
        <div className="bubble absolute top-[15%] left-[8%] w-20 h-20" style={{ animation: 'float-slow 6s ease-in-out infinite' }}></div>
        <div className="bubble absolute top-[45%] right-[12%] w-32 h-32" style={{ animation: 'float 5s ease-in-out infinite 1s' }}></div>
        <div className="bubble absolute bottom-[25%] left-[20%] w-16 h-16" style={{ animation: 'float-slow 7s ease-in-out infinite 2s' }}></div>
        <div className="bubble absolute top-[70%] right-[25%] w-10 h-10" style={{ animation: 'float 4s ease-in-out infinite 0.5s' }}></div>
      </div>

      {/* TOAST FLOTANTE */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel px-6 py-3 rounded-3xl flex items-center gap-3 animate-bounce shadow-2xl border-white/90">
          <div className="w-3 h-3 bg-lime-400 rounded-full shadow-[0_0_10px_rgba(100,255,100,1)]"></div>
          <span className="font-bold text-blue-900 drop-shadow-[0_1px_1px_rgba(255,255,255,1)]">{toast}</span>
        </div>
      )}

      {/* ENCABEZADO */}
      <header className="relative z-40 glass-panel mx-4 mt-4 rounded-3xl px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3 z-10 w-full md:w-auto">
          <div className="w-14 h-14 rounded-full bubble flex items-center justify-center bg-white/40">
            <Globe className="w-8 h-8 text-blue-600 drop-shadow-md" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-frutiger tracking-tight">FinanzArg</h1>
              {isSupabaseActive ? (
                <span className="bg-lime-200/50 text-green-900 text-[9px] px-2 py-0.5 rounded-full font-bold border border-white/60 flex items-center gap-1">
                  <Wifi className="w-2 h-2" /> Supabase
                </span>
              ) : (
                <span className="bg-amber-200/50 text-amber-900 text-[9px] px-2 py-0.5 rounded-full font-bold border border-white/60 flex items-center gap-1">
                  <Info className="w-2 h-2" /> Local
                </span>
              )}
            </div>
            <p className="text-[10px] font-black text-blue-800/80 uppercase tracking-[0.2em]">Aero Glass Edition</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto z-10 flex-wrap justify-end">
          <div className="flex items-center gap-2 bg-white/50 border-t-2 border-l-2 border-white/90 border-r border-b border-white/40 px-4 py-2 rounded-2xl shadow-[inset_0_2px_5px_rgba(255,255,255,1)]">
            <Sun className="w-5 h-5 text-yellow-500 drop-shadow-md" />
            <span className="text-xs font-black text-blue-900">1 USD = $</span>
            <input type="number" value={dolarBlue} onChange={(e) => setDolarBlue(parseFloat(e.target.value) || 0)}
              className="bg-transparent border-b-2 border-blue-400/50 w-16 text-sm font-black text-blue-900 focus:outline-none focus:border-blue-500" />
          </div>
          
          <button onClick={handleLogout} className="bg-white/40 border border-white/60 p-2 rounded-2xl text-blue-900 hover:bg-white/60 transition-colors shadow-sm">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* TARJETAS DE BALANCE */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-[2rem] p-6 flex flex-col relative overflow-hidden transition-transform hover:scale-[1.01]">
            <div className="flex items-center gap-3 z-10 border-b border-white/50 pb-3 mb-4">
               <div className="w-10 h-10 rounded-full bubble flex items-center justify-center bg-blue-100/50">
                <Landmark className="w-5 h-5 text-blue-700" />
              </div>
              <h2 className="text-xl font-black text-frutiger">Pesos ARS ($)</h2>
            </div>
            <div className="z-10 space-y-3 flex-1">
              <div className="flex justify-between items-center bg-white/30 p-3 rounded-2xl border border-white/50 shadow-inner">
                <span className="text-xs font-bold text-blue-900/70 uppercase">Líquido (Ef/Deb)</span>
                <span className="text-lg font-black text-blue-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">${financials.cashDebitArs.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between items-center bg-white/30 p-3 rounded-2xl border border-white/50 shadow-inner">
                <span className="text-xs font-bold text-blue-900/70 uppercase">Crédito (Deuda)</span>
                <span className="text-lg font-black text-rose-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">${financials.creditTotalArs.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6 flex flex-col relative overflow-hidden transition-transform hover:scale-[1.01]">
            <div className="flex items-center gap-3 z-10 border-b border-white/50 pb-3 mb-4">
               <div className="w-10 h-10 rounded-full bubble flex items-center justify-center bg-cyan-100/50">
                <DollarSign className="w-5 h-5 text-cyan-700" />
              </div>
              <h2 className="text-xl font-black text-frutiger">Dólares USD (u$s)</h2>
            </div>
            <div className="z-10 space-y-3 flex-1">
              <div className="flex justify-between items-center bg-white/30 p-3 rounded-2xl border border-white/50 shadow-inner">
                <span className="text-xs font-bold text-blue-900/70 uppercase">Líquido (Ef/Deb)</span>
                <span className="text-lg font-black text-cyan-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">u$s {financials.cashDebitUsd.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between items-center bg-white/30 p-3 rounded-2xl border border-white/50 shadow-inner">
                <span className="text-xs font-bold text-blue-900/70 uppercase">Crédito (Deuda)</span>
                <span className="text-lg font-black text-rose-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">u$s {financials.creditTotalUsd.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6 flex flex-col relative overflow-hidden shadow-[0_20px_40px_rgba(0,150,50,0.3)] !bg-gradient-to-br !from-white/70 !to-lime-200/40">
            <div className="absolute top-[-50%] right-[-50%] w-full h-full bg-lime-300/40 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-3 z-10 border-b border-white/60 pb-3 mb-4">
               <div className="w-12 h-12 rounded-full bubble flex items-center justify-center bg-white/70 shadow-lg">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-green-900 drop-shadow-[0_2px_2px_rgba(255,255,255,1)]">Gasto Total Absoluto</h2>
                <span className="text-[10px] font-bold text-green-800/70 uppercase tracking-widest">Unificado en ARS</span>
              </div>
            </div>
            <div className="z-10 mt-auto bg-white/40 p-4 rounded-2xl border border-white/80 shadow-inner flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold text-green-900/80 uppercase mb-1">Débito + Crédito (Ambas Monedas)</span>
              <h3 className="text-4xl font-black text-green-900 drop-shadow-[0_2px_5px_rgba(255,255,255,1)]">
                ${financials.unifiedTotalArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </h3>
            </div>
          </div>
        </section>

        {/* MEDIDORES (GRÁFICOS) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-[2rem] p-6 flex flex-col">
            <div className="flex items-center gap-2 border-b-2 border-white/50 pb-3 mb-5">
              <PieChart className="w-5 h-5 text-blue-800 drop-shadow-sm" />
              <h3 className="text-base font-black text-frutiger uppercase">Distribución de Gastos</h3>
            </div>
            <div className="space-y-4">
              {categoryStats.length === 0 ? (
                <p className="text-sm font-bold text-blue-900/60 text-center py-4">No hay datos</p>
              ) : (
                categoryStats.map((cat, idx) => (
                  <div key={cat.name} className="space-y-1.5 relative z-10">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-black text-blue-950">{cat.name}</span>
                      <div className="text-right">
                        <span className="text-xs font-black text-blue-900">${cat.value.toLocaleString('es-AR', {maximumFractionDigits:0})}</span>
                        <span className="text-[10px] font-black text-blue-700/80 ml-2 bg-white/50 px-1.5 rounded-md">{cat.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="glossy-bar-container">
                      <div className={`glossy-bar-fill ${COLORS[idx % COLORS.length]}`} style={{ width: `${cat.percentage}%` }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6 flex flex-col">
            <div className="flex items-center gap-2 border-b-2 border-white/50 pb-3 mb-5">
              <BarChart3 className="w-5 h-5 text-blue-800 drop-shadow-sm" />
              <h3 className="text-base font-black text-frutiger uppercase">Medios de Pago Usados</h3>
            </div>
            <div className="space-y-4">
              {entityStats.length === 0 ? (
                <p className="text-sm font-bold text-blue-900/60 text-center py-4">No hay datos</p>
              ) : (
                entityStats.map((ent, idx) => (
                  <div key={ent.name} className="space-y-1.5 relative z-10">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-black text-blue-950">{ent.name}</span>
                      <div className="text-right">
                        <span className="text-xs font-black text-blue-900">${ent.value.toLocaleString('es-AR', {maximumFractionDigits:0})}</span>
                        <span className="text-[10px] font-black text-blue-700/80 ml-2 bg-white/50 px-1.5 rounded-md">{ent.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="glossy-bar-container">
                      <div className={`glossy-bar-fill ${COLORS[(COLORS.length - 1 - idx) % COLORS.length]}`} style={{ width: `${ent.percentage}%` }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* FORMULARIO E HISTORIAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-[2.5rem] p-7 space-y-5">
              <h3 className="text-base font-black text-frutiger uppercase flex items-center gap-2 border-b-2 border-white/50 pb-3">
                <Plus className="w-5 h-5" /> Cargar Nuevo Gasto
              </h3>
              <form onSubmit={handleSubmitTransaction} className="space-y-4 z-10 relative">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-blue-900/70 uppercase tracking-wider">Categoría</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/50 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-2xl px-4 py-3 text-sm font-bold text-blue-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none">
                    <option value="Comida">🍔 Comida / Super</option>
                    <option value="Servicios">💡 Servicios</option>
                    <option value="Transporte">🚌 Transporte</option>
                    <option value="Entretenimiento">🎬 Entretenimiento</option>
                    <option value="Salud">🩺 Salud</option>
                    <option value="Compras">🛍️ Compras Extras</option>
                    <option value="Otros">📦 Otros</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-blue-900/70 uppercase tracking-wider">Descripción</label>
                  <input type="text" placeholder="Ej. Coto, Nafta..." value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white/50 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-2xl px-4 py-3 text-sm font-bold text-blue-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-900/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-blue-900/70 uppercase tracking-wider">Monto y Moneda</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-3 text-sm font-black text-blue-600">{currency === 'ARS' ? '$' : 'u$s'}</span>
                      <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-white/50 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-2xl pl-8 pr-3 py-3 text-sm font-black text-blue-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                    </div>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                      className="bg-white/50 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-2xl px-4 text-sm font-black text-blue-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none">
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-blue-900/70 uppercase tracking-wider">Método</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ id: 'efectivo', label: 'Efectivo', icon: Wallet }, { id: 'debito', label: 'Débito', icon: Landmark }, { id: 'credito', label: 'Crédito', icon: CreditCard }].map(m => (
                      <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all ${paymentMethod === m.id ? 'glossy-button-blue scale-[1.02]' : 'bg-white/40 border-t-2 border-l-2 border-white/80 border-r border-b border-white/30 text-blue-800 shadow-inner hover:bg-white/60'}`}>
                        <m.icon className="w-5 h-5 drop-shadow-sm" />
                        <span className="text-[10px] font-bold">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {paymentMethod !== 'efectivo' && (
                  <div className="p-4 bg-white/30 rounded-2xl shadow-[inset_0_2px_5px_rgba(0,0,0,0.1)] border border-white/60 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-blue-900/70 uppercase tracking-wider block">Tarjeta / Entidad</label>
                      <input type="text" placeholder="Ej. Visa Santander..." value={entityName} onChange={(e) => setEntityName(e.target.value)}
                        className="w-full bg-white/60 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-xl px-4 py-2 text-sm font-bold text-blue-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-900/40" />
                    </div>
                    {paymentMethod === 'credito' && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-blue-900/70 uppercase tracking-wider block">Cuotas</label>
                        <select value={installments} onChange={(e) => setInstallments(parseInt(e.target.value))}
                          className="w-full bg-white/60 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-xl px-4 py-2 text-sm font-bold text-blue-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none">
                          <option value={1}>1 Pago</option><option value={3}>3 Cuotas</option><option value={6}>6 Cuotas</option><option value={12}>12 Cuotas</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
                <button type="submit" className="w-full mt-6 py-4 glossy-button-green text-base flex items-center justify-center gap-2 rounded-2xl cursor-pointer overflow-hidden transition-transform active:scale-95">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full h-full skew-x-12 animate-[shine_4s_infinite]"></div>
                  <Plus className="w-6 h-6 drop-shadow-md relative z-10" />
                  <span className="drop-shadow-md font-black relative z-10">Cargar a la Billetera</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4 flex flex-col">
            <div className="glass-panel rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-72 z-10">
                <Search className="absolute left-4 top-3 w-5 h-5 text-blue-600/70" />
                <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/50 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-blue-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-900/40" />
              </div>
              <div className="flex gap-3 w-full md:w-auto z-10">
                <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
                  className="bg-white/50 border-t-2 border-l-2 border-white/90 border-r border-b border-white/30 rounded-2xl px-4 py-3 text-xs font-bold text-blue-900 shadow-inner focus:outline-none appearance-none">
                  <option value="all">Todos los Pagos</option><option value="efectivo">Efectivo</option><option value="debito">Débito</option><option value="credito">Crédito</option>
                </select>
              </div>
            </div>

            <div className="glass-panel rounded-[2.5rem] flex flex-col overflow-hidden h-[500px]">
              <div className="px-7 py-5 border-b border-white/60 bg-white/30 flex justify-between items-center z-10 relative">
                <h4 className="text-sm font-black text-frutiger uppercase tracking-wider">Historial en la Nube</h4>
                <span className="bg-blue-600/10 border text-blue-900 px-3 py-1 rounded-xl text-xs font-black shadow-sm border-white/80">
                  {filteredTransactions.length} registros
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 z-10 relative">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="bg-white/40 border-t-2 border-l-2 border-white/90 border-r border-b border-white/40 p-5 rounded-[2rem] flex justify-between items-center shadow-[0_4px_10px_rgba(0,50,150,0.1)] hover:bg-white/60 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full bubble flex items-center justify-center shadow-md ${t.payment_method === 'credito' ? 'bg-blue-200/60' : t.payment_method === 'debito' ? 'bg-lime-200/60' : 'bg-cyan-200/60'}`}>
                         {t.payment_method === 'credito' ? <CreditCard className="w-6 h-6 text-blue-700" /> : <Wallet className="w-6 h-6 text-green-700" />}
                      </div>
                      <div>
                        <h5 className="font-black text-blue-950 text-base drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">{t.description}</h5>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[10px] bg-white/80 border text-blue-800 font-bold px-2.5 py-0.5 rounded-lg border-white">{t.category}</span>
                          <span className="text-[10px] text-blue-900/80 font-black uppercase py-0.5 border-l border-blue-900/20 pl-2">{t.entity || t.payment_method}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="block text-xl font-black text-blue-950 drop-shadow-[0_1px_2px_rgba(255,255,255,1)]">
                          {t.currency === 'ARS' ? '$' : 'u$s'} {t.amount.toLocaleString('es-AR')}
                        </span>
                        {t.payment_method === 'credito' && t.installments > 1 && (
                          <span className="text-[10px] glossy-button-blue px-2 py-0.5 rounded-md inline-block mt-1 border-none font-bold">{t.installments} cuotas</span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteTransaction(t.id)} className="w-12 h-12 rounded-2xl bg-white/50 border-t-2 border-white/90 text-blue-500 hover:bg-red-400 hover:text-white transition-all shadow-md active:scale-95">
                        <Trash2 className="w-6 h-6 m-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
