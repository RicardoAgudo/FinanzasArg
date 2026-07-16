import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Coins, 
  Plus, 
  Trash2, 
  Search, 
  SlidersHorizontal, 
  TrendingDown, 
  Calendar, 
  Tag, 
  Info, 
  Check, 
  Sparkles, 
  X, 
  ArrowDownRight, 
  PieChart, 
  Percent,
  TrendingUp,
  FileText
} from 'lucide-react';

const INITIAL_EXPENSES = [
  {
    id: 'exp-1',
    title: 'Supermercado Coto',
    amount: 48500,
    currency: 'ARS',
    paymentMethod: 'debit',
    category: 'Comida/Super',
    date: '2026-07-15',
    installments: 1,
    cardName: 'Visa Galicia Débito',
    notes: 'Compra mensual de mercadería básica'
  },
  {
    id: 'exp-2',
    title: 'Suscripción Netflix & Spotify',
    amount: 14.99,
    currency: 'USD',
    paymentMethod: 'credit',
    category: 'Entretenimiento',
    date: '2026-07-10',
    installments: 1,
    cardName: 'Mastercard Santander',
    notes: 'Suscripción mensual en dólares'
  },
  {
    id: 'exp-3',
    title: 'Carga de Nafta YPF',
    amount: 32000,
    currency: 'ARS',
    paymentMethod: 'debit',
    category: 'Transporte',
    date: '2026-07-14',
    installments: 1,
    cardName: 'Visa Galicia Débito',
    notes: 'Llenado de tanque parcial'
  },
  {
    id: 'exp-4',
    title: 'Zapatillas en 6 cuotas',
    amount: 120000,
    currency: 'ARS',
    paymentMethod: 'credit',
    category: 'Ropa/Calzado',
    date: '2026-07-05',
    installments: 6,
    cardName: 'Visa Macro',
    notes: '6 cuotas fijas de $20.000'
  },
  {
    id: 'exp-5',
    title: 'Verdulería del barrio',
    amount: 8500,
    currency: 'ARS',
    paymentMethod: 'cash',
    category: 'Comida/Super',
    date: '2026-07-16',
    installments: 1,
    cardName: '',
    notes: 'Efectivo con descuento'
  },
  {
    id: 'exp-6',
    title: 'Cena Bodegón',
    amount: 35000,
    currency: 'ARS',
    paymentMethod: 'cash',
    category: 'Salidas/Restaurantes',
    date: '2026-07-12',
    installments: 1,
    cardName: '',
    notes: 'Dividimos con amigos, pagué mi parte'
  },
  {
    id: 'exp-7',
    title: 'Compra de Termo Stanley',
    amount: 85,
    currency: 'USD',
    paymentMethod: 'credit',
    category: 'Hogar',
    date: '2026-07-02',
    installments: 1,
    cardName: 'Amex Directa',
    notes: 'Traído por importador'
  }
];

const CATEGORIES = [
  'Comida/Super',
  'Salidas/Restaurantes',
  'Servicios/Impuestos',
  'Transporte',
  'Entretenimiento',
  'Tecnología',
  'Ropa/Calzado',
  'Hogar',
  'Salud',
  'Otros'
];

const PAYMENT_METHODS = {
  cash: { name: 'Efectivo', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Coins },
  debit: { name: 'Tarjeta de Débito', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: DollarSign },
  credit: { name: 'Tarjeta de Crédito', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: CreditCard }
};

export default function App() {
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [exchangeRate, setExchangeRate] = useState(1350); // Cotización por defecto del Dólar Blue
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Estado del Formulario de carga
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCurrency, setNewCurrency] = useState('ARS');
  const [newMethod, setNewMethod] = useState('debit');
  const [newCategory, setNewCategory] = useState('Comida/Super');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newInstallments, setNewInstallments] = useState(1);
  const [newCardName, setNewCardName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    
    if (!newTitle.trim()) {
      triggerToast('Por favor, ingresá una descripción o comercio.', 'error');
      return;
    }
    if (!newAmount || parseFloat(newAmount) <= 0) {
      triggerToast('Por favor, ingresá un monto mayor a cero.', 'error');
      return;
    }

    const newExpense = {
      id: `exp-${Date.now()}`,
      title: newTitle,
      amount: parseFloat(newAmount),
      currency: newCurrency,
      paymentMethod: newMethod,
      category: newCategory,
      date: newDate,
      installments: newMethod === 'credit' ? parseInt(newInstallments) : 1,
      cardName: newMethod !== 'cash' ? newCardName : '',
      notes: newNotes
    };

    setExpenses([newExpense, ...expenses]);
    triggerToast('¡Gasto registrado con éxito!');
    
    // Resetear formulario
    setNewTitle('');
    setNewAmount('');
    setNewInstallments(1);
    setNewCardName('');
    setNewNotes('');
    setShowAddForm(false);
  };

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
    triggerToast('Gasto eliminado', 'info');
  };

  // Totales puros
  const totalARS = expenses
    .filter(e => e.currency === 'ARS')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalUSD = expenses
    .filter(e => e.currency === 'USD')
    .reduce((sum, e) => sum + e.amount, 0);

  // Consolidado total en pesos usando cotización
  const totalConsolidatedARS = totalARS + (totalUSD * exchangeRate);

  // Desglose por método de pago
  const methodTotals = expenses.reduce((acc, e) => {
    const amt = e.currency === 'USD' ? e.amount * exchangeRate : e.amount;
    if (!acc[e.paymentMethod]) acc[e.paymentMethod] = 0;
    acc[e.paymentMethod] += amt;
    return acc;
  }, { cash: 0, debit: 0, credit: 0 });

  // Desglose por categoría (Consolidado en ARS)
  const categoryTotals = expenses.reduce((acc, e) => {
    const amt = e.currency === 'USD' ? e.amount * exchangeRate : e.amount;
    if (!acc[e.category]) acc[e.category] = 0;
    acc[e.category] += amt;
    return acc;
  }, {});

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (e.cardName && e.cardName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCurrency = currencyFilter === 'all' || e.currency === currencyFilter;
    const matchesMethod = methodFilter === 'all' || e.paymentMethod === methodFilter;
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

    return matchesSearch && matchesCurrency && matchesMethod && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
      
      {/* HEADER DE LA APP */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-emerald-500 via-teal-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/10">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-indigo-300 bg-clip-text text-transparent">
                FinanzArg
              </h1>
              <p className="text-xs text-slate-400 font-medium">Billetera Multimoneda & Control de Cuotas</p>
            </div>
          </div>

          {/* Dólar Blue Rate Selector */}
          <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Cotización Dólar Blue:
            </span>
            <div className="flex items-center">
              <span className="text-xs font-bold text-emerald-400 mr-1">$</span>
              <input 
                type="number" 
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
              />
            </div>
          </div>

          {/* Botón de Cargar Gasto */}
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full md:w-auto flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-95 duration-150 text-sm"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </header>

      {/* TOAST SYSTEM */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-xl shadow-2xl max-w-sm transition-all border animate-fade-in ${
          toast.type === 'error' ? 'bg-red-950/90 border-red-800 text-red-200' : 
          toast.type === 'info' ? 'bg-blue-950/90 border-blue-800 text-blue-200' : 
          'bg-slate-900/95 border-emerald-500/50 text-slate-100'
        }`}>
          <div className="mr-3">
            {toast.type === 'error' ? <X className="w-5 h-5 text-red-400" /> : <Check className="w-5 h-5 text-emerald-400" />}
          </div>
          <div className="text-xs font-medium">{toast.message}</div>
        </div>
      )}

      {}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* DASHBOARD METRICS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card Pesos */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Gastado Pesos</p>
                <h3 className="text-3xl font-black text-emerald-400 mt-1">${totalARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <span className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 text-xs font-bold">ARS</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Gastos registrados directamente en $
            </p>
          </div>

          {/* Card Dólares */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Gastado Dólares</p>
                <h3 className="text-3xl font-black text-blue-400 mt-1">u$s {totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
              </div>
              <span className="p-2 bg-blue-500/10 rounded-lg text-blue-400 text-xs font-bold">USD</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Representa aprox. ${(totalUSD * exchangeRate).toLocaleString('es-AR')} ARS
            </p>
          </div>

          {/* Card Consolidado */}
          <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 border border-indigo-900/40 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-3xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Consolidado Total (ARS)</p>
                <h3 className="text-3xl font-black text-white mt-1">${totalConsolidatedARS.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</h3>
              </div>
              <span className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300 text-xs font-bold">Mix</span>
            </div>
            <p className="text-[11px] text-indigo-200/60 mt-4 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Valuado al tipo de cambio de $ {exchangeRate}
            </p>
          </div>

        </section>

        {/* MODAL / FORMULARIO REGISTRO GASTO */}
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
              
              {/* Header Modal */}
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-400" />
                  Nuevo Gasto / Compra
                </h2>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                
                {/* Título y Monto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">¿Qué compraste / dónde?</label>
                    <input 
                      type="text" 
                      placeholder="Coto, Farmacity, YPF..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Monto</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="any"
                        placeholder="0.00"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-16 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100"
                      />
                      <div className="absolute left-1.5 top-1.5 flex bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                        <button 
                          type="button"
                          onClick={() => setNewCurrency('ARS')}
                          className={`px-2 py-0.5 text-[11px] font-black ${newCurrency === 'ARS' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                        >
                          $
                        </button>
                        <button 
                          type="button"
                          onClick={() => setNewCurrency('USD')}
                          className={`px-2 py-0.5 text-[11px] font-black ${newCurrency === 'USD' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
                        >
                          u$s
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Método de pago y Categoría */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Método de Pago</label>
                    <select 
                      value={newMethod}
                      onChange={(e) => setNewMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="debit">Tarjeta de Débito</option>
                      <option value="credit">Tarjeta de Crédito</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Categoría</label>
                    <select 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {}
                {/* Cuotas y Nombre de Tarjeta (Solo Crédito/Débito) */}
                {newMethod !== 'cash' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Nombre de la Tarjeta / Banco</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Visa Galicia, Mastercard BBVA..."
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100"
                      />
                    </div>

                    {newMethod === 'credit' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Cantidad de Cuotas</label>
                        <select 
                          value={newInstallments}
                          onChange={(e) => setNewInstallments(parseInt(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100"
                        >
                          <option value={1}>1 Pago (Sin cuotas)</option>
                          <option value={3}>3 Cuotas</option>
                          <option value={6}>6 Cuotas</option>
                          <option value={9}>9 Cuotas</option>
                          <option value={12}>12 Cuotas</option>
                          <option value={18}>18 Cuotas</option>
                          <option value={24}>24 Cuotas</option>
                        </select>
                        {newInstallments > 1 && newAmount && (
                          <p className="text-[10px] text-amber-400 font-semibold mt-1">
                            Aprox. {newInstallments} cuotas de {newCurrency === 'ARS' ? '$' : 'u$s'} {(parseFloat(newAmount) / newInstallments).toFixed(2)} por mes.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Fecha y Notas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Fecha del Gasto</label>
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Detalles / Notas (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="Alguna aclaración corta..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100"
                    />
                  </div>
                </div>

                {/* Botón Guardar */}
                <div className="pt-4 flex justify-end space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                  >
                    Guardar Gasto
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* CONTENIDO INTERACTIVO (LISTADO Y ANÁLISIS) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {}
          <div className="lg:col-span-2 space-y-4">
            
            {/* BARRA DE FILTROS */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
              <div className="flex flex-col md:flex-row gap-3">
                
                {/* Input Buscador */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar por comercio, notas, tarjeta..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-200 placeholder-slate-500 transition-all"
                  />
                </div>

                {/* Filtro de Moneda */}
                <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
                  <button 
                    onClick={() => setCurrencyFilter('all')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${currencyFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Ambas
                  </button>
                  <button 
                    onClick={() => setCurrencyFilter('ARS')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${currencyFilter === 'ARS' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    ARS ($)
                  </button>
                  <button 
                    onClick={() => setCurrencyFilter('USD')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${currencyFilter === 'USD' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    USD (u$s)
                  </button>
                </div>
              </div>

              {/* Filtros Secundarios */}
              <div className="flex flex-wrap gap-2 pt-1">
                
                {/* Filtro por Método */}
                <select 
                  value={methodFilter} 
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Todos los Métodos</option>
                  <option value="cash">Solo Efectivo</option>
                  <option value="debit">Solo Débito</option>
                  <option value="credit">Solo Tarjeta de Crédito</option>
                </select>

                {/* Filtro por Categoría */}
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Todas las Categorías</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Reset Filters */}
                {(searchQuery || currencyFilter !== 'all' || methodFilter !== 'all' || categoryFilter !== 'all') && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setCurrencyFilter('all');
                      setMethodFilter('all');
                      setCategoryFilter('all');
                    }}
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors ml-auto flex items-center gap-1"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>
            </div>

            {/* LISTA DE TRANSACCIONES */}
            <div className="bg-slate-900/20 border border-slate-800/60 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
              
              {/* Header Listado */}
              <div className="p-4 bg-slate-900/40 flex justify-between items-center border-b border-slate-800/60">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Movimientos registrados
                </span>
                <span className="bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                  {filteredExpenses.length} items
                </span>
              </div>

              {/* Items */}
              <div className="divide-y divide-slate-800/40">
                {filteredExpenses.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center">
                    <Info className="w-10 h-10 text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">No hay gastos que coincidan con la búsqueda.</p>
                    <p className="text-xs text-slate-500 mt-1">Intentá cambiar los filtros o agregá un gasto nuevo.</p>
                  </div>
                ) : (
                  filteredExpenses.map(item => {
                    const MethodIcon = PAYMENT_METHODS[item.paymentMethod]?.icon || Coins;
                    const methodConfig = PAYMENT_METHODS[item.paymentMethod];
                    
                    return (
                      <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/30 transition-all">
                        
                        {/* Info Principal */}
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl border shrink-0 ${methodConfig?.color || 'text-slate-400 bg-slate-800/50'}`}>
                            <MethodIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-200">{item.title}</h4>
                              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold">
                                {item.category}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-1 text-[11px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {item.date}
                              </span>
                              {item.cardName && (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <CreditCard className="w-3 h-3" />
                                  {item.cardName}
                                </span>
                              )}
                              {item.paymentMethod === 'credit' && item.installments > 1 && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded text-[9px] font-black uppercase">
                                  {item.installments} cuotas
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-xs text-slate-400 mt-1 italic">"{item.notes}"</p>
                            )}
                          </div>
                        </div>

                        {/* Monto & Eliminación */}
                        <div className="flex items-center justify-between md:justify-end gap-4 border-t border-slate-800/30 md:border-t-0 pt-2 md:pt-0">
                          <div className="text-right">
                            <span className={`text-base font-black ${item.currency === 'ARS' ? 'text-emerald-400' : 'text-blue-400'}`}>
                              {item.currency === 'ARS' ? '$' : 'u$s'} {item.amount.toLocaleString(item.currency === 'ARS' ? 'es-AR' : 'en-US', { minimumFractionDigits: 2 })}
                            </span>
                            {item.paymentMethod === 'credit' && item.installments > 1 && (
                              <p className="text-[10px] text-slate-500 font-medium">
                                Cuota aprox: {item.currency === 'ARS' ? '$' : 'u$s'} {(item.amount / item.installments).toFixed(2)}
                              </p>
                            )}
                          </div>

                          <button 
                            onClick={() => handleDeleteExpense(item.id)}
                            className="p-2 hover:bg-rose-950/30 text-slate-600 hover:text-rose-400 rounded-xl transition-all border border-transparent hover:border-rose-950/40"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>

          {}
          <div className="space-y-6">
            
            {/* DISTRIBUCIÓN POR MÉTODO DE PAGO */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-emerald-400" />
                Gastos por Método de Pago
              </h3>
              
              <div className="space-y-3">
                {Object.entries(PAYMENT_METHODS).map(([key, config]) => {
                  const amt = methodTotals[key] || 0;
                  const pct = totalConsolidatedARS > 0 ? Math.round((amt / totalConsolidatedARS) * 100) : 0;
                  const MethodIcon = config.icon || Coins;

                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-2 text-slate-300">
                          <span className={`p-1 rounded-md border ${config.color}`}>
                            <MethodIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-semibold">{config.name}</span>
                        </div>
                        <div className="text-right font-bold text-slate-200">
                          <span>${amt.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${key === 'cash' ? 'bg-emerald-400' : key === 'debit' ? 'bg-blue-400' : 'bg-amber-400'}`} 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  💡 <strong>Nota sobre Consolidación:</strong> Para armar este gráfico calculamos tus consumos en dólares a la cotización asignada arriba (${exchangeRate} ARS).
                </p>
              </div>
            </div>

            {/* DISTRIBUCIÓN POR CATEGORÍA */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-400" />
                Gastos por Categoría
              </h3>

              <div className="space-y-3.5">
                {Object.keys(categoryTotals).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No hay suficientes registros para graficar.</p>
                ) : (
                  Object.entries(categoryTotals)
                    .sort((a, b) => b[1] - a[1]) // ordenar de mayor a menor gasto
                    .slice(0, 5) // mostrar top 5
                    .map(([cat, amt]) => {
                      const pct = totalConsolidatedARS > 0 ? Math.round((amt / totalConsolidatedARS) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-300">{cat}</span>
                            <span className="font-bold text-slate-200">${amt.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* ALERTAS / CONTROL DE DEUDA TARJETA */}
            <div className="bg-gradient-to-br from-amber-500/5 to-slate-900 border border-amber-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-2">
                <Percent className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Control de Cuotas y Crédito</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aquí podés monitorear los consumos que vencen a mediano plazo o compras de montos grandes financiados.
              </p>

              {/* Deuda total aproximada en tarjetas de crédito */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-400">Total en Crédito (Consolidado)</span>
                  <span className="text-xs font-bold text-amber-400">
                    ${(expenses
                      .filter(e => e.paymentMethod === 'credit')
                      .reduce((sum, e) => sum + (e.currency === 'USD' ? e.amount * exchangeRate : e.amount), 0)
                    ).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-400">Compras en Cuotas Activas</span>
                  <span className="text-xs font-bold text-slate-300">
                    {expenses.filter(e => e.paymentMethod === 'credit' && e.installments > 1).length} compras
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 px-6 py-4 text-center flex justify-between items-center text-xs text-slate-500">
        <span>FinanzArg - Diseñado para Finanzas Argentinas</span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Multi-Moneda & Control de Cuotas
        </span>
      </footer>

    </div>
  );
}