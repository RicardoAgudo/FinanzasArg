import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, CreditCard, DollarSign, RefreshCw, Smartphone, Laptop, 
  Copy, Check, ArrowUpRight, ArrowDownLeft, Wallet, Landmark, HelpCircle, 
  Calendar, Layers, Filter, Search, Shield, Wifi, Info, ListFilter, Users,
  CheckCircle, TrendingUp, AlertCircle, Sparkles, Database
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ================= ACCESO SEGURO A VARIABLES GLOBALES =================
// Previene fallas de compilación y ejecución en Vercel (ReferenceError) usando try/catch
const getGlobalConfig = () => {
  try {
    return typeof __firebase_config !== 'undefined' ? __firebase_config : null;
  } catch (e) {
    return null;
  }
};
const getGlobalAppId = () => {
  try {
    return typeof __app_id !== 'undefined' ? __app_id : 'finanzarg-default-app';
  } catch (e) {
    return 'finanzarg-default-app';
  }
};
const getGlobalAuthToken = () => {
  try {
    return typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
  } catch (e) {
    return null;
  }
};

const rawAppId = getGlobalAppId();
const appId = rawAppId.replace(/\//g, '-');

// Intentamos obtener una configuración personalizada de Firebase que el usuario haya guardado localmente
const getLocalFirebaseConfig = () => {
  try {
    const stored = localStorage.getItem('finanzarg_custom_firebase');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

// Determinar qué configuración usar (Prioriza la global de la plataforma, luego la del usuario en Vercel)
let firebaseConfig = null;
const globalConfigStr = getGlobalConfig();
if (globalConfigStr) {
  try {
    firebaseConfig = JSON.parse(globalConfigStr);
  } catch (e) {
    console.error("Error al leer la configuración global de Firebase:", e);
  }
} else {
  firebaseConfig = getLocalFirebaseConfig();
}

// Inicialización controlada de Firebase para evitar caídas si no hay config activa
let firebaseApp = null;
let auth = null;
let db = null;
const isFirebaseActive = !!firebaseConfig;

if (isFirebaseActive) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  } catch (e) {
    console.error("Error al inicializar servicios de Firebase:", e);
  }
}

export default function App() {
  // --- Estados de Autenticación y Carga ---
  const [user, setUser] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  
  // CORRECCIÓN: Inicialización robusta para evitar estados vacíos que oculten consumos nuevos
  const getInitialSyncCode = () => {
    try {
      return localStorage.getItem('finanzarg_local_synccode') || 'ARG-LOCAL';
    } catch (e) {
      return 'ARG-LOCAL';
    }
  };
  const [syncCode, setSyncCode] = useState(getInitialSyncCode());
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Ajustes de base de datos propia ---
  const [customDbInput, setCustomDbInput] = useState('');
  const [showDbSettings, setShowDbSettings] = useState(false);

  // --- Estados de Negocio ---
  const [transactions, setTransactions] = useState([]);
  const [dolarBlue, setDolarBlue] = useState(1380); // Cotización por defecto ARS/USD
  const [deleteId, setDeleteId] = useState(null); // Para modal de confirmación

  // --- Estados del Formulario de Registro ---
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS'); // ARS o USD
  const [paymentMethod, setPaymentMethod] = useState('efectivo'); // efectivo, debito, credito
  const [installments, setInstallments] = useState(1); // 1, 3, 6, 12, 18, 24 cuotas
  const [category, setCategory] = useState('Comida'); // Comida, Servicios, Transporte, Ocio, Otros

  // --- Estados de Filtrado ---
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-cargar campo de entrada de Firebase si ya existe localmente
  useEffect(() => {
    const custom = localStorage.getItem('finanzarg_custom_firebase');
    if (custom) setCustomDbInput(custom);
  }, []);

  // ================= 1. EFECTO DE AUTENTICACIÓN (HÍBRIDO) =================
  useEffect(() => {
    if (!isFirebaseActive || !auth) {
      setDbLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const token = getGlobalAuthToken();
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error de inicialización de autenticación:", error);
        triggerToast("Error de conexión con el servidor", "error");
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });
    return () => unsubscribe();
  }, []);

  // ================= 2. CONFIGURACIÓN DE GRUPO/SYNC CODE (HÍBRIDO) =================
  useEffect(() => {
    if (!isFirebaseActive) {
      const localCode = localStorage.getItem('finanzarg_local_synccode') || 'ARG-LOCAL';
      setSyncCode(localCode);
      setDbLoading(false);
      return;
    }

    if (!user || !db) return;

    const fetchUserSettings = async () => {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'user_config');
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSyncCode(docSnap.data().syncCode);
        } else {
          const randomCode = 'ARG-' + Math.floor(100000 + Math.random() * 900000);
          await setDoc(docRef, { syncCode: randomCode });
          setSyncCode(randomCode);
        }
      } catch (error) {
        console.error("Error leyendo ajustes del usuario:", error);
        setSyncCode('ARG-TEMPORAL');
      } finally {
        setDbLoading(false);
      }
    };

    fetchUserSettings();
  }, [user]);

  // ================= 3. ESCUCHA DE GASTOS EN TIEMPO REAL (HÍBRIDO) =================
  useEffect(() => {
    if (!isFirebaseActive) {
      const storedTransactions = localStorage.getItem('finanzarg_transactions');
      if (storedTransactions) {
        try {
          setTransactions(JSON.parse(storedTransactions));
        } catch (e) {
          console.error("Error cargando transacciones locales:", e);
        }
      }
      return;
    }

    if (!user || !syncCode || !db) return;

    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');

    const unsubscribe = onSnapshot(colRef, 
      (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setTransactions(list);
      },
      (error) => {
        console.error("Error al suscribirse a transacciones:", error);
        triggerToast("Error de lectura en base de datos", "error");
      }
    );

    return () => unsubscribe();
  }, [user, syncCode]);

  // ================= AUXILIARES Y TOASTS =================
  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleCopyCode = () => {
    const textField = document.createElement('textarea');
    textField.innerText = syncCode;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand('copy');
    textField.remove();
    triggerToast("¡Código copiado! Pegalo en tu otro dispositivo", "success");
  };

  // ================= CAMBIAR CÓDIGO DE SINCRONIZACIÓN =================
  const handleConnectSyncCode = async (e) => {
    e.preventDefault();
    if (!inputSyncCode.trim() || inputSyncCode.trim().length < 4) {
      triggerToast("Ingresá un código válido", "error");
      return;
    }

    const cleanCode = inputSyncCode.trim().toUpperCase();

    if (!isFirebaseActive) {
      setSyncCode(cleanCode);
      localStorage.setItem('finanzarg_local_synccode', cleanCode);
      setInputSyncCode('');
      setShowSyncModal(false);
      triggerToast(`¡Conectado localmente al grupo ${cleanCode}!`, "success");
      return;
    }

    setDbLoading(true);

    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'user_config');
      await setDoc(docRef, { syncCode: cleanCode });
      setSyncCode(cleanCode);
      setInputSyncCode('');
      setShowSyncModal(false);
      triggerToast(`¡Conectado exitosamente al grupo ${cleanCode}!`, "success");
    } catch (e) {
      console.error("Error al actualizar código de sincronización:", e);
      triggerToast("No se pudo conectar al grupo", "error");
    } finally {
      setDbLoading(false);
    }
  };

  // ================= REGISTRAR TRANSACCIÓN (HÍBRIDO) =================
  const handleSubmitTransaction = async (e) => {
    e.preventDefault();

    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      triggerToast("Completá descripción y monto válido", "error");
      return;
    }

    const activeCode = syncCode || 'ARG-LOCAL';
    const newTransaction = {
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      paymentMethod,
      installments: paymentMethod === 'credito' ? parseInt(installments) : 1,
      category,
      syncCode: activeCode,
      createdAt: Date.now(),
      author: user ? user.uid : 'local-user'
    };

    if (!isFirebaseActive) {
      const updated = [{ id: 'local-' + Date.now(), ...newTransaction }, ...transactions];
      setTransactions(updated);
      localStorage.setItem('finanzarg_transactions', JSON.stringify(updated));
      
      setDescription('');
      setAmount('');
      setPaymentMethod('efectivo');
      setInstallments(1);
      triggerToast("Gasto guardado en tu dispositivo", "success");
      return;
    }

    if (!user || !db) return;

    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
      await addDoc(colRef, newTransaction);
      
      setDescription('');
      setAmount('');
      setPaymentMethod('efectivo');
      setInstallments(1);
      triggerToast("Gasto registrado con éxito en la nube", "success");
    } catch (error) {
      console.error("Error al registrar transacción:", error);
      triggerToast("No se pudo guardar en la nube", "error");
    }
  };

  // ================= ELIMINAR TRANSACCIÓN (HÍBRIDO) =================
  const handleDeleteTransaction = async () => {
    if (!deleteId) return;

    if (!isFirebaseActive) {
      const updated = transactions.filter(t => t.id !== deleteId);
      setTransactions(updated);
      localStorage.setItem('finanzarg_transactions', JSON.stringify(updated));
      setDeleteId(null);
      triggerToast("Registro eliminado con éxito", "success");
      return;
    }

    if (!user || !db) return;

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'transactions', deleteId);
      await deleteDoc(docRef);
      triggerToast("Registro eliminado con éxito", "success");
    } catch (error) {
      console.error("Error al eliminar:", error);
      triggerToast("No se pudo borrar el registro", "error");
    } finally {
      setDeleteId(null);
    }
  };

  // ================= CONFIGURAR BASE DE DATOS PROPIA (JSON) =================
  const handleSaveCustomFirebase = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(customDbInput.trim());
      if (!parsed.apiKey || !parsed.projectId || !parsed.authDomain) {
        triggerToast("Formato inválido. Falta apiKey, authDomain o projectId", "error");
        return;
      }
      localStorage.setItem('finanzarg_custom_firebase', JSON.stringify(parsed));
      triggerToast("¡Configuración guardada! Reiniciando...", "success");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      triggerToast("Error: Estructura JSON inválida", "error");
    }
  };

  const handleClearCustomFirebase = () => {
    localStorage.removeItem('finanzarg_custom_firebase');
    triggerToast("Restablecido a Modo Local. Reiniciando...", "success");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // ================= FILTRADO Y ORDEN DE DATOS (EN MEMORIA) =================
  const filteredAndSortedTransactions = useMemo(() => {
    const activeCode = syncCode || 'ARG-LOCAL';
    let result = transactions.filter(t => (t.syncCode || 'ARG-LOCAL') === activeCode);

    if (filterMethod !== 'all') {
      result = result.filter(t => t.paymentMethod === filterMethod);
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

    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [transactions, syncCode, filterMethod, filterCurrency, searchQuery]);

  // ================= CÁLCULO DE TOTALES (EN MEMORIA) =================
  const financials = useMemo(() => {
    let cashDebitArs = 0;
    let cashDebitUsd = 0;
    let creditArs = 0; // Próximo vencimiento de cuotas en ARS
    let creditUsd = 0; // Próximo vencimiento de cuotas en USD
    let creditTotalAbsoluteArs = 0; // Deuda total absoluta (consumo sin dividir) ARS
    let creditTotalAbsoluteUsd = 0; // Deuda total absoluta (consumo sin dividir) USD

    const activeCode = syncCode || 'ARG-LOCAL';
    const myGroup = transactions.filter(t => (t.syncCode || 'ARG-LOCAL') === activeCode);

    myGroup.forEach(t => {
      const value = t.amount;
      if (t.paymentMethod === 'credito') {
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
  }, [transactions, syncCode, dolarBlue]);

  // ================= CATEGORÍAS GRÁFICOS (EN MEMORIA) =================
  const categoryStats = useMemo(() => {
    const counts = {};
    const activeCode = syncCode || 'ARG-LOCAL';
    const myGroup = transactions.filter(t => (t.syncCode || 'ARG-LOCAL') === activeCode);

    myGroup.forEach(t => {
      const amountInPesos = t.currency === 'ARS' ? t.amount : t.amount * dolarBlue;
      counts[t.category] = (counts[t.category] || 0) + amountInPesos;
    });

    const totalInPesos = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalInPesos) * 100)
    })).sort((a, b) => b.value - a.value);
  }, [transactions, syncCode, dolarBlue]);

  // Carga de ejemplo si el grupo está vacío (Híbrido)
  const handleLoadMockData = async () => {
    const activeCode = syncCode || 'ARG-LOCAL';
    const mocks = [
      { description: "Supermercado Coto", amount: 45000, currency: "ARS", paymentMethod: "debito", installments: 1, category: "Comida", syncCode: activeCode, createdAt: Date.now() - 86400000 * 2, author: user ? user.uid : 'local-user' },
      { description: "Cena familiar", amount: 28000, currency: "ARS", paymentMethod: "efectivo", installments: 1, category: "Comida", syncCode: activeCode, createdAt: Date.now() - 86400000, author: user ? user.uid : 'local-user' },
      { description: "Compra Amazon (Zapatillas)", amount: 120, currency: "USD", paymentMethod: "credito", installments: 3, category: "Otros", syncCode: activeCode, createdAt: Date.now(), author: user ? user.uid : 'local-user' },
      { description: "Suscripción Netflix", amount: 10, currency: "USD", paymentMethod: "credito", installments: 1, category: "Servicios", syncCode: activeCode, createdAt: Date.now() - 50000, author: user ? user.uid : 'local-user' },
      { description: "Carga Sube", amount: 5000, currency: "ARS", paymentMethod: "debito", installments: 1, category: "Transporte", syncCode: activeCode, createdAt: Date.now() - 120000, author: user ? user.uid : 'local-user' }
    ];

    if (!isFirebaseActive) {
      const updated = [...mocks, ...transactions];
      setTransactions(updated);
      localStorage.setItem('finanzarg_transactions', JSON.stringify(updated));
      triggerToast("Cargados datos de prueba localmente", "success");
      return;
    }

    if (!user || !db) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
      for (const m of mocks) {
        await addDoc(colRef, m);
      }
      triggerToast("Cargados datos de simulación en la nube", "success");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      
      {/* ALERTA FLOTANTE / TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-xl shadow-2xl border bg-slate-900 border-slate-800 animate-slide-in">
          <div className={`w-2.5 h-2.5 rounded-full mr-3 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-sm font-medium text-slate-200">{toast.message}</span>
        </div>
      )}

      {/* HEADER DE LA APP */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="bg-gradient-to-tr from-indigo-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">FinanzArg</h1>
              {isFirebaseActive ? (
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/20 flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5" /> Nube Sincronizada
                </span>
              ) : (
                <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-500/20 flex items-center gap-1">
                  <Info className="w-2.5 h-2.5" /> Modo Local
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">Billetera de Pesos & Dólares multi-dispositivo</p>
          </div>
        </div>

        {/* ESTADO DE CONEXIÓN Y ACCESO AL CÓDIGO */}
        <div className="flex items-center flex-wrap gap-3 justify-end w-full md:w-auto">
          {dbLoading ? (
            <div className="flex items-center space-x-2 text-slate-500 text-xs bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Cargando nube...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div 
                onClick={handleCopyCode}
                className="flex items-center space-x-2 cursor-pointer bg-slate-900 hover:bg-slate-850 active:scale-95 transition-all text-xs border border-slate-800 px-3 py-2 rounded-xl text-slate-300"
                title="Copiar código para vincular otro dispositivo"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Grupo: <strong>{syncCode}</strong></span>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              </div>

              <button 
                onClick={() => setShowSyncModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Vincular</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* MENSAJE EXPLICATIVO PARA MODO LOCAL */}
        {!isFirebaseActive && (
          <section className="bg-slate-900/80 border border-indigo-900/40 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                ¡Estás en Modo Local! (Offline)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                Tus gastos se guardan de forma segura en este navegador. Para sincronizarlos entre tu computadora y celular, haz clic en el botón de <strong>Vincular</strong> arriba a la derecha para conectar tu propia base de datos gratuita de Firebase.
              </p>
            </div>
            <button 
              onClick={() => { setShowSyncModal(true); setShowDbSettings(true); }}
              className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800/40 text-indigo-300 text-xs font-bold px-4 py-2 rounded-xl shrink-0 transition-colors"
            >
              Conectar Nube Gratis
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

        {/* INDICADORES DE CAPITAL - LÍQUIDO DISPONIBLE (EFECTIVO Y DÉBITO) */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 px-1">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Líquido Disponible (Efectivo & Débito)</h4>
          </div>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Tarjeta Efectivo/Débito en Pesos */}
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

            {/* Tarjeta Efectivo/Débito en Dólares */}
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

            {/* Balance Total Consolidado en Pesos */}
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

        {/* INDICADORES DE CAPITAL - TARJETAS DE CRÉDITO */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 px-1">
            <CreditCard className="w-4 h-4 text-rose-400" />
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarjetas de Crédito (Deuda Total & Financiación)</h4>
          </div>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Tarjeta Crédito Total en Pesos */}
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

            {/* Tarjeta Crédito Total en Dólares */}
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

            {/* Balance Total Consolidado Deuda Crédito */}
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

        {/* ADVERTENCIA DE TARJETAS DE CRÉDITO / CUOTAS */}
        <section className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="text-rose-400 w-5 h-5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-rose-300">Próximo Cierre de Tarjeta (Cuotas Activas)</p>
              <p className="text-[11px] text-slate-400">Total de cuotas que vencen este próximo período de facturación.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-rose-300">
              ${financials.creditArs.toLocaleString('es-AR', { minimumFractionDigits: 0 })} ARS
            </div>
            {financials.creditUsd > 0 && (
              <div className="text-xs text-rose-400">
                + u$s {financials.creditUsd.toLocaleString('es-AR', { minimumFractionDigits: 0 })} USD (≈ ${(financials.creditUsd * dolarBlue).toLocaleString('es-AR', { minimumFractionDigits: 0 })} ARS)
              </div>
            )}
          </div>
        </section>

        {/* ESTRUCTURA DE FORMULARIO Y LISTADOS */}
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

                {/* Selección de cuotas (Solo si es tarjeta de crédito) */}
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
            
            {/* Filtros rápidos */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Buscador de texto */}
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

              {/* Selectores de Filtro */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                
                {/* Filtro por Método */}
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

                {/* Filtro por Moneda */}
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

            {/* Listado de Transacciones */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-3xl flex-1 flex flex-col overflow-hidden min-h-[400px]">
              
              {/* Encabezado Lista */}
              <div className="px-6 py-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/30">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial del Grupo Sincronizado</h4>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-md font-bold">
                  {filteredAndSortedTransactions.length} registros
                </span>
              </div>

              {/* Lista Scrolleable */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
                {filteredAndSortedTransactions.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                    <Landmark className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-bold text-slate-400">Sin consumos cargados</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">No encontramos gastos que coincidan con los filtros activos.</p>
                    
                    {transactions.filter(t => (t.syncCode || 'ARG-LOCAL') === (syncCode || 'ARG-LOCAL')).length === 0 && (
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
                        {/* Icono de Método de Pago */}
                        <div className={`p-2 rounded-xl shrink-0 ${t.paymentMethod === 'credito' ? 'bg-rose-500/10 text-rose-400' : t.paymentMethod === 'debito' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {t.paymentMethod === 'credito' ? (
                            <CreditCard className="w-4.5 h-4.5" />
                          ) : t.paymentMethod === 'debito' ? (
                            <Landmark className="w-4.5 h-4.5" />
                          ) : (
                            <Wallet className="w-4.5 h-4.5" />
                          )}
                        </div>

                        {/* Detalles de la compra */}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{t.description}</p>
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="text-[9px] bg-slate-850 text-slate-400 px-1.5 rounded-md font-medium border border-slate-800">
                              {t.category}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              vía <strong className="text-slate-400 capitalize">{t.paymentMethod}</strong>
                            </span>
                            {t.installments > 1 && (
                              <span className="text-[9px] text-rose-400 font-bold bg-rose-500/5 px-1.5 rounded">
                                {t.installments} cuotas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Montos y Acciones */}
                      <div className="flex items-center space-x-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-black text-white">
                            {t.currency === 'ARS' ? '$' : 'u$s'} {t.amount.toLocaleString('es-AR')}
                          </p>
                          {t.paymentMethod === 'credito' && t.installments > 1 && (
                            <p className="text-[9px] text-rose-400">
                              Cuotas de: {t.currency === 'ARS' ? '$' : 'u$s'} {(t.amount / t.installments).toFixed(2)}
                            </p>
                          )}
                        </div>

                        {/* Botón de Borrado */}
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
        <p>FinanzArg Cloud Wallet — Desarrollado para sincronización en tiempo real.</p>
        <p className="text-[10px] text-slate-600 mt-0.5">Utiliza infraestructura de base de datos híbrida local y en la nube.</p>
      </footer>

      {/* ================= MODAL: VINCULAR OTRO DISPOSITIVO / AJUSTES NUBE ================= */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="text-indigo-400 w-4 h-4" />
                Vincular Dispositivos
              </h4>
              <button 
                onClick={() => { setShowSyncModal(false); setShowDbSettings(false); }}
                className="text-xs text-slate-500 hover:text-white font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
              
              {/* Sincronización general */}
              <div className="space-y-2">
                <p>
                  Para poder ingresar gastos en tu celular y verlos en tiempo real en tu computadora, ambos deben estar usando el mismo <strong>Código de Sincronización</strong>.
                </p>
                
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Código de este dispositivo:</span>
                    <span className="text-sm font-mono font-bold text-white tracking-widest">{syncCode}</span>
                  </div>
                  <button 
                    onClick={handleCopyCode}
                    className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-lg font-bold"
                  >
                    Copiar
                  </button>
                </div>

                <div className="pt-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5">¿Querés unirte a otro grupo?</label>
                  <form onSubmit={handleConnectSyncCode} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ej. ARG-123456"
                      value={inputSyncCode}
                      onChange={(e) => setInputSyncCode(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                    <button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg"
                    >
                      Unirse
                    </button>
                  </form>
                  <span className="text-[9px] text-slate-500 italic mt-1 block">
                    Cuidado: Al cambiar de grupo verás únicamente los datos correspondientes al nuevo código.
                  </span>
                </div>
              </div>

              {/* Ajustes avanzados de base de datos para despliegue independiente */}
              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowDbSettings(!showDbSettings)}
                  className="flex items-center justify-between w-full text-[10px] uppercase font-black text-slate-400 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    Base de Datos Propia (Avanzado Vercel)
                  </span>
                  <span>{showDbSettings ? 'Ocultar' : 'Mostrar'}</span>
                </button>

                {showDbSettings && (
                  <div className="space-y-3 pt-2 animate-fade-in bg-slate-950/40 p-3 rounded-2xl border border-slate-850">
                    <p className="text-[11px] text-slate-400">
                      Si hiciste el despliegue en tu propia cuenta de Vercel y deseas sincronización en tiempo real, puedes vincular una base de datos de Firebase Firestore de forma 100% gratuita.
                    </p>
                    <form onSubmit={handleSaveCustomFirebase} className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 block">Firebase Config (JSON format):</label>
                      <textarea
                        rows="5"
                        placeholder='{ "apiKey": "AIza...", "authDomain": "...", "projectId": "..." }'
                        value={customDbInput}
                        onChange={(e) => setCustomDbInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-200 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors flex-1"
                        >
                          Guardar y Conectar
                        </button>
                        {localStorage.getItem('finanzarg_custom_firebase') && (
                          <button
                            type="button"
                            onClick={handleClearCustomFirebase}
                            className="bg-rose-950 hover:bg-rose-900 border border-rose-900/40 text-rose-300 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Desconectar Nube
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMACIÓN DE BORRADO ================= */}
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
