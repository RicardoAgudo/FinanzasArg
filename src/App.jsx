import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Trash2, CreditCard, DollarSign, RefreshCw, Smartphone, Laptop, 
  Copy, Check, ArrowUpRight, ArrowDownLeft, Wallet, Landmark, HelpCircle, 
  Calendar, Layers, Filter, Search, Shield, Wifi, Info, ListFilter, Users,
  CheckCircle, TrendingUp, AlertCircle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ================= CONFIGURACIÓN DE FIREBASE =================
// Las variables globales son provistas por el entorno de ejecución de la aplicación
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sanitizamos el appId para reemplazar barras diagonales "/" por guiones "-" 
// Esto evita que Firestore interprete la barra como un separador de rutas de subcolecciones
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'finanzarg-default-app';
const appId = rawAppId.replace(/\//g, '-');

export default function App() {
  // --- Estados de Autenticación y Carga ---
  const [user, setUser] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [syncCode, setSyncCode] = useState('');
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [toast, setToast] = useState(null);

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

  // ================= 1. EFECTO DE AUTENTICACIÓN (REGLA 3) =================
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
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

  // ================= 2. EFECTO PARA CONFIGURACIÓN DEL USUARIO (REGLA 1 & 3) =================
  useEffect(() => {
    if (!user) return;

    const fetchUserSettings = async () => {
      // Ruta privada para ajustes (Regla 1) con appId sanitizado
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'user_config');
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSyncCode(docSnap.data().syncCode);
        } else {
          // Si el usuario es nuevo, generamos un código aleatorio único y lo guardamos
          const randomCode = 'ARG-' + Math.floor(100000 + Math.random() * 900000);
          await setDoc(docRef, { syncCode: randomCode });
          setSyncCode(randomCode);
        }
      } catch (error) {
        console.error("Error leyendo ajustes del usuario:", error);
        // Fallback local en memoria
        setSyncCode('ARG-TEMPORAL');
      } finally {
        setDbLoading(false);
      }
    };

    fetchUserSettings();
  }, [user]);

  // ================= 3. EFECTO PARA CARGAR GASTOS EN TIEMPO REAL (REGLA 1, 2 & 3) =================
  useEffect(() => {
    if (!user || !syncCode) return;

    // Ruta de datos públicos con código de sincronización compartido (Regla 1)
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');

    // Escuchamos en tiempo real para sincronizar instantáneamente entre dispositivos
    // Nota: Traemos la colección simple y filtramos en memoria por regla de no queries complejas (Regla 2)
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
    setDbLoading(true);

    try {
      // Guardamos la configuración en su perfil privado de Firebase
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

  // ================= REGISTRAR TRANSACCIÓN (WRITE) =================
  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      triggerToast("Completá descripción y monto válido", "error");
      return;
    }

    const newTransaction = {
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      paymentMethod,
      installments: paymentMethod === 'credito' ? parseInt(installments) : 1,
      category,
      syncCode, // Guardamos bajo este grupo
      createdAt: Date.now(),
      author: user.uid
    };

    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
      await addDoc(colRef, newTransaction);
      
      // Reset formulario
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

  // ================= ELIMINAR TRANSACCIÓN (DELETE) =================
  const handleDeleteTransaction = async () => {
    if (!user || !deleteId) return;

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

  // ================= PREPARACIÓN DE DATOS (REGLA 2: EN MEMORIA) =================
  const filteredAndSortedTransactions = useMemo(() => {
    // Filtro 1: Código de sincronización activo
    let result = transactions.filter(t => t.syncCode === syncCode);

    // Filtro 2: Tipo de Pago
    if (filterMethod !== 'all') {
      result = result.filter(t => t.paymentMethod === filterMethod);
    }

    // Filtro 3: Moneda
    if (filterCurrency !== 'all') {
      result = result.filter(t => t.currency === filterCurrency);
    }

    // Filtro 4: Buscador
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(q) || 
        t.category.toLowerCase().includes(q)
      );
    }

    // Ordenar por fecha descendiente (más nuevos primero)
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [transactions, syncCode, filterMethod, filterCurrency, searchQuery]);

  // ================= CÁLCULO DE TOTALES (EN MEMORIA) =================
  const financials = useMemo(() => {
    let cashDebitArs = 0;
    let cashDebitUsd = 0;
    let creditArs = 0;
    let creditUsd = 0;

    // Filtramos solo las de nuestro grupo activo
    const myGroup = transactions.filter(t => t.syncCode === syncCode);

    myGroup.forEach(t => {
      const value = t.amount;
      if (t.paymentMethod === 'credito') {
        // En tarjetas de crédito sumamos la cuota mensual para el control de deuda de este mes
        // O el monto completo dividido el número de cuotas
        const monthlyInstallment = value / (t.installments || 1);
        if (t.currency === 'ARS') {
          creditArs += monthlyInstallment;
        } else {
          creditUsd += monthlyInstallment;
        }
      } else {
        // Efectivo y Débito
        if (t.currency === 'ARS') {
          cashDebitArs += value;
        } else {
          cashDebitUsd += value;
        }
      }
    });

    const consolidatedArs = cashDebitArs + (cashDebitUsd * dolarBlue);
    const consolidatedCreditArs = creditArs + (creditUsd * dolarBlue);

    return {
      cashDebitArs,
      cashDebitUsd,
      creditArs,
      creditUsd,
      consolidatedArs,
      consolidatedCreditArs
    };
  }, [transactions, syncCode, dolarBlue]);

  // ================= CATEGORÍAS GRÁFICOS (EN MEMORIA) =================
  const categoryStats = useMemo(() => {
    const counts = {};
    const myGroup = transactions.filter(t => t.syncCode === syncCode);

    myGroup.forEach(t => {
      // Convertimos a pesos para consolidar el gráfico de torta/barras
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

  // Carga de ejemplo si el grupo está vacío
  const handleLoadMockData = async () => {
    if (!user || !syncCode) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
    
    const mocks = [
      { description: "Supermercado Coto", amount: 45000, currency: "ARS", paymentMethod: "debito", installments: 1, category: "Comida", syncCode, createdAt: Date.now() - 86400000 * 2 },
      { description: "Cena familiar", amount: 28000, currency: "ARS", paymentMethod: "efectivo", installments: 1, category: "Comida", syncCode, createdAt: Date.now() - 86400000 },
      { description: "Compra Amazon (Zapatillas)", amount: 120, currency: "USD", paymentMethod: "credito", installments: 3, category: "Otros", syncCode, createdAt: Date.now() },
      { description: "Suscripción Netflix", amount: 10, currency: "USD", paymentMethod: "credito", installments: 1, category: "Servicios", syncCode, createdAt: Date.now() - 50000 },
      { description: "Carga Sube", amount: 5000, currency: "ARS", paymentMethod: "debito", installments: 1, category: "Transporte", syncCode, createdAt: Date.now() - 120000 }
    ];

    try {
      for (const m of mocks) {
        await addDoc(colRef, m);
      }
      triggerToast("Cargados datos de simulación", "success");
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
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-indigo-500/20">Cloud Sync</span>
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

        {/* CONTENEDOR DE INDICADORES DE CAPITAL */}
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
                    
                    {transactions.filter(t => t.syncCode === syncCode).length === 0 && (
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
                            <CreditCard className="w-4 h-4" />
                          ) : t.paymentMethod === 'debito' ? (
                            <Landmark className="w-4 h-4" />
                          ) : (
                            <Wallet className="w-4 h-4" />
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
        <p className="text-[10px] text-slate-600 mt-0.5">Utiliza infraestructura Firestore sin almacenamiento en disco local.</p>
      </footer>

      {/* ================= MODAL: VINCULAR OTRO DISPOSITIVO ================= */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="text-indigo-400 w-4 h-4" />
                Vincular Dispositivos
              </h4>
              <button 
                onClick={() => setShowSyncModal(false)}
                className="text-xs text-slate-500 hover:text-white font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
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

              <div className="border-t border-slate-800/60 my-4 pt-4 space-y-2">
                <label className="text-[10px] uppercase font-black text-slate-400 block">¿Querés unirte a otro grupo?</label>
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
                <span className="text-[9px] text-slate-500 italic block">
                  Cuidado: Al cambiar de grupo dejarás de ver los gastos actuales para conectarte a la nueva base.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMACIÓN DE BORRADO (REGLA MODAL) ================= */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="text-rose-500 w-4 h-4" />
              ¿Eliminar Gasto?
            </h4>
            <p className="text-xs text-slate-400">
              Esta acción eliminará de forma permanente el registro en la nube para todos los dispositivos vinculados. Esta operación no puede deshacerse.
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
