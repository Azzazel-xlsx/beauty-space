import React, { useState, useMemo, useEffect } from 'react';
import { FinancialMovement, Client } from '../types';
import { Plus, Minus, Search, Filter, Trash2, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Wallet, Calendar, AlertCircle, Sparkles, Download, Calculator, Percent, Info, HelpCircle, ChevronDown } from 'lucide-react';
import { buildCsvString } from '../utils/csv';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../utils/formatters';

interface DashboardProps {
  movements: FinancialMovement[];
  clients: Client[];
  onAddMovement: (movement: Omit<FinancialMovement, 'id'>) => void;
  onDeleteMovement: (id: string) => void;
  expenseCategories: string[];
  paymentMethods: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  movements,
  clients,
  onAddMovement,
  onDeleteMovement,
  expenseCategories,
  paymentMethods
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'movimientos' | 'nuevo-ingreso' | 'nuevo-egreso'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const debouncedSearch = useDebounce(searchTerm, 250);
  const [visibleMovementsLimit, setVisibleMovementsLimit] = useState(30);

  useEffect(() => {
    setVisibleMovementsLimit(30);
  }, [debouncedSearch, filterType, filterCategory]);

  // Form states for New Income with Margin Estimator
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeDesc, setIncomeDesc] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Manicura Rusa');
  const [incomeMethod, setIncomeMethod] = useState('TRANSFERENCIA');
  const [incomeClient, setIncomeClient] = useState('');
  const [incomeCostOfSupplies, setIncomeCostOfSupplies] = useState('0');
  const [incomeStaffCommissionPercent, setIncomeStaffCommissionPercent] = useState('15'); // 15% standard
  const [incomeNotes, setIncomeNotes] = useState('');
  const [incomeError, setIncomeError] = useState('');

  // Form states for New Expense
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategoryInput, setExpenseCategoryInput] = useState('Suministros & Esmaltes');
  const [expenseError, setExpenseError] = useState('');

  // ==================== STATISTICS CALCULATOR ====================
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let totalSuppliesCost = 0;
    let totalCommissions = 0;
    let completedServices = 0;

    const distinctClientsSet = new Set<string>();

    movements.forEach((m) => {
      if (m.type === 'income') {
        income += m.amount;
        totalSuppliesCost += m.costOfSupplies || 0;
        totalCommissions += m.staffCommission || 0;
        completedServices += 1;
        if (m.clientName) {
          distinctClientsSet.add(m.clientName);
        }
      } else {
        expense += m.amount;
      }
    });

    const netProfit = income - expense;
    const netMargin = income > 0 ? Math.round((netProfit / income) * 100) : 0;
    const ticketAverage = completedServices > 0 ? Math.round(income / completedServices) : 0;

    return {
      income,
      expense,
      netProfit,
      netMargin,
      ticketAverage,
      activeClientsCount: distinctClientsSet.size,
      completedServices,
      totalSuppliesCost,
      totalCommissions
    };
  }, [movements]);

  // Unique categories gathered from actual movements for ledger filters
  const filterCategoriesList = useMemo(() => {
    const list = new Set<string>();
    movements.forEach(m => list.add(m.category));
    return Array.from(list);
  }, [movements]);

  // Ledger Filter Application
  const filteredMovements = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase().trim();
    return movements.filter((m) => {
      const matchesSearch =
        m.description.toLowerCase().includes(searchLower) ||
        m.category.toLowerCase().includes(searchLower) ||
        (m.clientName && m.clientName.toLowerCase().includes(searchLower));

      const matchesType = filterType === 'all' || m.type === filterType;
      const matchesCat = filterCategory === 'all' || m.category === filterCategory;

      return matchesSearch && matchesType && matchesCat;
    });
  }, [movements, debouncedSearch, filterType, filterCategory]);

  // ==================== TOP PROFITABLE SERVICES ====================
  // Generates analytics by service category/name from incomes database
  const topServicesData = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; cost: number; commission: number }> = {};
    
    movements.forEach(m => {
      if (m.type === 'income') {
        const cat = m.category;
        if (!map[cat]) {
          map[cat] = { count: 0, revenue: 0, cost: 0, commission: 0 };
        }
        map[cat].count += 1;
        map[cat].revenue += m.amount;
        map[cat].cost += m.costOfSupplies || 0;
        map[cat].commission += m.staffCommission || 0;
      }
    });

    return Object.entries(map).map(([name, data]) => {
      const net = data.revenue - data.cost - data.commission;
      const marginPercent = data.revenue > 0 ? Math.round((net / data.revenue) * 100) : 0;
      return {
        name,
        count: data.count,
        revenue: data.revenue,
        net,
        marginPercent
      };
    }).sort((a, b) => b.marginPercent - a.marginPercent); // Order by profitability margin
  }, [movements]);

  // ==================== DYNAMIC ALERT BANNERS ====================
  const healthAlerts = useMemo(() => {
    const alerts: { type: 'danger' | 'warning' | 'info'; title: string; desc: string }[] = [];

    // Alert 1: Over-expense alarm
    if (stats.income > 0 && (stats.expense / stats.income) > 0.40) {
      alerts.push({
        type: 'danger',
        title: 'Alerta de Gasto Crítico (>40%)',
        desc: `Tus egresos operativos representan el ${Math.round((stats.expense / stats.income) * 100)}% de tus ingresos totales. Se recomienda limitar compras de insumos superfluos.`
      });
    }

    // Alert 2: Low-margin service alarm
    topServicesData.forEach(srv => {
      if (srv.marginPercent < 50) {
        alerts.push({
          type: 'warning',
          title: `Baja Rentabilidad en ${srv.name}`,
          desc: `El margen de ganancia para ${srv.name} está en ${srv.marginPercent}%. Revisa el consumo de insumos o ajusta el precio base en el catálogo.`
        });
      }
    });

    // Alert 3: Deficit Alarm
    if (stats.netProfit < 0) {
      alerts.push({
        type: 'danger',
        title: 'Deficit Financiero Registrado',
        desc: 'Actualmente registras pérdidas netas acumuladas en este periodo de caja.'
      });
    }

    return alerts;
  }, [stats, topServicesData]);

  // ==================== MARGIN ESTIMATION FORMULA ====================
  const estimatorValues = useMemo(() => {
    const price = parseFloat(incomeAmount) || 0;
    const cost = parseFloat(incomeCostOfSupplies) || 0;
    const commissionPercent = parseFloat(incomeStaffCommissionPercent) || 0;
    const commissionAmount = price * (commissionPercent / 100);

    const netMargin = price - cost - commissionAmount;
    const marginPercent = price > 0 ? Math.round((netMargin / price) * 100) : 0;
    const roiPercent = cost > 0 ? Math.round((netMargin / cost) * 100) : 100;

    return {
      commissionAmount,
      netMargin,
      marginPercent,
      roiPercent
    };
  }, [incomeAmount, incomeCostOfSupplies, incomeStaffCommissionPercent]);

  // ==================== SUBMISSIONS ====================
  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeAmount || parseFloat(incomeAmount) <= 0) {
      setIncomeError('El precio de venta debe ser mayor a 0');
      return;
    }
    if (!incomeDesc) {
      setIncomeError('Completa una breve descripción para auditoría de caja');
      return;
    }

    const selectedClient = clients.find(c => c.id === incomeClient);

    onAddMovement({
      type: 'income',
      amount: parseFloat(incomeAmount),
      date: incomeDate,
      category: incomeCategory,
      description: incomeDesc,
      paymentMethod: incomeMethod as any,
      clientName: selectedClient ? selectedClient.name : undefined,
      costOfSupplies: parseFloat(incomeCostOfSupplies) || 0,
      staffCommission: estimatorValues.commissionAmount,
      notes: incomeNotes || 'Sin anotaciones adicionales.'
    });

    // Reset Form
    setIncomeAmount('');
    setIncomeDesc('');
    setIncomeClient('');
    setIncomeCostOfSupplies('0');
    setIncomeNotes('');
    setIncomeError('');
    setActiveSubTab('movimientos');
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      setExpenseError('El monto debe ser un valor positivo');
      return;
    }
    if (!expenseDesc) {
      setExpenseError('Introduce el concepto del gasto operativo');
      return;
    }

    onAddMovement({
      type: 'expense',
      amount: parseFloat(expenseAmount),
      date: expenseDate,
      category: expenseCategoryInput,
      description: expenseDesc
    });

    // Reset Form
    setExpenseAmount('');
    setExpenseDesc('');
    setExpenseError('');
    setActiveSubTab('movimientos');
  };

  // ==================== EXPORT SYSTEM (CSV GENERATOR - OWASP SANITIZED) ====================
  const handleCSVExport = () => {
    if (movements.length === 0) {
      alert('No hay movimientos de caja para exportar.');
      return;
    }

    const headers = [
      'ID',
      'Fecha',
      'Tipo',
      'Concepto',
      'Categoria',
      'MetodoPago',
      'Clienta',
      'Monto',
      'CostoInsumos',
      'ComisionStaff',
      'Notas'
    ];

    const dataRows = movements.map((m) => [
      m.id,
      m.date,
      m.type === 'income' ? 'INGRESO' : 'EGRESO',
      m.description,
      m.category,
      m.paymentMethod || '',
      m.clientName || '',
      m.amount,
      m.costOfSupplies || 0,
      m.staffCommission || 0,
      m.notes || ''
    ]);

    const csvContent = buildCsvString(headers, dataRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BeautySpace_Finanzas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ==================== VISUAL COMPONENT RENDER ====================
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Sub-Tabs Row */}
      <div className="flex border-b border-outline-variant/30 overflow-x-auto pb-0.5 gap-2 scrollbar-none justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-5 py-2.5 font-serif text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
              activeSubTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant/70 hover:text-primary'
            }`}
          >
            Resumen General
          </button>
          <button
            onClick={() => setActiveSubTab('movimientos')}
            className={`px-5 py-2.5 font-serif text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
              activeSubTab === 'movimientos'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant/70 hover:text-primary'
            }`}
          >
            Historial de Caja (Ledger)
          </button>
        </div>

        <div className="flex gap-2 items-center shrink-0">
          <button
            onClick={handleCSVExport}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/40 text-[10px] font-bold text-on-surface hover:bg-surface-container transition-all"
            title="Exportar a Excel o CSV para Valentina"
          >
            <Download size={12} /> Exportar Excel
          </button>
          <button
            onClick={() => setActiveSubTab('nuevo-ingreso')}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sage text-white hover:bg-sage/95 flex items-center gap-1 transition-all shadow-xs ${
              activeSubTab === 'nuevo-ingreso' ? 'ring-2 ring-sage/40 scale-105' : ''
            }`}
          >
            <Plus size={12} /> + Ingreso
          </button>
          <button
            onClick={() => setActiveSubTab('nuevo-egreso')}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-terracotta text-white hover:bg-terracotta/95 flex items-center gap-1 transition-all shadow-xs ${
              activeSubTab === 'nuevo-egreso' ? 'ring-2 ring-terracotta/40 scale-105' : ''
            }`}
          >
            <Plus size={12} /> - Gasto
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Main 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. Total Incomes */}
            <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-3xl p-6 relative overflow-hidden hard-shadow space-y-2">
              <div className="absolute top-5 right-5 w-9 h-9 bg-sage/10 text-sage rounded-full flex items-center justify-center">
                <ArrowUpRight size={18} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Ingresos Totales</span>
              <h3 className="font-serif text-3xl font-black text-on-surface">{formatMoney(stats.income)}</h3>
              <div className="pt-2 wavy-divider opacity-10"></div>
              <p className="text-[10px] text-on-surface-variant/60 font-semibold pt-1">
                {stats.completedServices} servicios cobrados
              </p>
            </div>

            {/* 2. Total Expenses */}
            <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-3xl p-6 relative overflow-hidden hard-shadow space-y-2">
              <div className="absolute top-5 right-5 w-9 h-9 bg-terracotta/10 text-terracotta rounded-full flex items-center justify-center">
                <ArrowDownRight size={18} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Egresos Totales</span>
              <h3 className="font-serif text-3xl font-black text-on-surface">{formatMoney(stats.expense)}</h3>
              <div className="pt-2 wavy-divider opacity-10"></div>
              <p className="text-[10px] text-on-surface-variant/60 font-semibold pt-1">
                Insumos, publicidad y fijos
              </p>
            </div>

            {/* 3. Net Profit (Ganancia Neta) */}
            <div className="bg-surface-container border border-outline-variant/70 rounded-3xl p-6 relative overflow-hidden hard-shadow space-y-2">
              <div className="absolute top-5 right-5 w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary/80">Ganancia Neta (Analista)</span>
              <h3 className="font-serif text-3xl font-black text-primary">{formatMoney(stats.netProfit)}</h3>
              <div className="pt-2 wavy-divider opacity-20"></div>
              <p className="text-[10px] font-black text-primary/80 pt-1 flex items-center gap-1">
                <Percent size={11} /> {stats.netMargin}% de margen real de retorno
              </p>
            </div>

            {/* 4. Ticket Average & Active Clients */}
            <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-3xl p-6 relative overflow-hidden hard-shadow space-y-2">
              <div className="absolute top-5 right-5 w-9 h-9 bg-primary/10 text-primary/70 rounded-full flex items-center justify-center">
                <Wallet size={18} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Ticket Promedio</span>
              <h3 className="font-serif text-3xl font-black text-on-surface">{formatMoney(stats.ticketAverage)}</h3>
              <div className="pt-2 wavy-divider opacity-10"></div>
              <p className="text-[10px] text-on-surface-variant/60 font-semibold pt-1">
                {stats.activeClientsCount} clientas únicas recurrentes
              </p>
            </div>

          </div>

          {/* FINANCIAL HEALTH ALERT CORNER */}
          {healthAlerts.length > 0 && (
            <div className="bg-surface-container p-6 rounded-3xl border border-outline-variant/35 hard-shadow space-y-3.5">
              <h4 className="font-serif text-sm font-black text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <AlertCircle size={16} className="text-terracotta" /> Alertas de Salud Financiera & Márgenes
              </h4>
              <div className="wavy-divider opacity-25"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthAlerts.map((alert, idx) => (
                  <div key={idx} className="flex gap-3 bg-white/75 border border-outline-variant/15 p-4 rounded-2xl items-start">
                    <span className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                      alert.type === 'danger' ? 'bg-terracotta/10 text-terracotta' : 'bg-gold/10 text-gold-dark'
                    }`}>
                      <AlertCircle size={14} />
                    </span>
                    <div className="space-y-0.5 text-xs">
                      <h5 className="font-bold text-on-surface">{alert.title}</h5>
                      <p className="text-[11px] text-on-surface-variant/80 font-medium leading-relaxed">{alert.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADVANCED CHARTS PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Top Profitable Services (Valentina's Favorite Table) - 7 Cols */}
            <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
              <div>
                <h4 className="font-serif text-base font-black text-primary">Análisis de Rentabilidad por Servicio</h4>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/65 font-bold mt-0.5">Servicios ordenados por su margen neto (%) real</p>
              </div>

              <div className="wavy-divider opacity-30"></div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-wider font-bold text-on-surface-variant/70 border-b border-outline-variant/20">
                      <th className="py-2.5">Servicio</th>
                      <th className="py-2.5 text-center">Cant.</th>
                      <th className="py-2.5 text-right">Facturado</th>
                      <th className="py-2.5 text-right">Margen %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-xs">
                    {topServicesData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-on-surface-variant/50 font-medium italic">
                          No hay servicios cobrados registrados en la caja.
                        </td>
                      </tr>
                    ) : (
                      topServicesData.map((srv, idx) => (
                        <tr key={idx} className="hover:bg-surface-container/10 transition-all font-semibold">
                          <td className="py-3 text-on-surface font-bold">{srv.name}</td>
                          <td className="py-3 text-center text-on-surface-variant">{srv.count}</td>
                          <td className="py-3 text-right text-primary">{formatMoney(srv.revenue)}</td>
                          <td className="py-3 text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black ${
                              srv.marginPercent >= 70 ? 'bg-sage/15 text-sage' :
                              srv.marginPercent >= 50 ? 'bg-primary/10 text-primary' :
                              'bg-terracotta/15 text-terracotta'
                            }`}>
                              {srv.marginPercent}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operating Expense Breakdown chart - 5 Cols */}
            <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
              <div>
                <h4 className="font-serif text-base font-black text-primary">Análisis de Distribución de Egresos</h4>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/65 font-bold mt-0.5">Concentración porcentual de gastos</p>
              </div>

              <div className="wavy-divider opacity-30"></div>

              {/* Graphical Bar distribution */}
              <div className="space-y-3 pt-1">
                {expenseCategories.map((cat, idx) => {
                  const val = movements
                    .filter(m => m.type === 'expense' && m.category === cat)
                    .reduce((sum, m) => sum + m.amount, 0);

                  const totalExpense = stats.expense || 1;
                  const percent = Math.round((val / totalExpense) * 100);

                  if (val === 0) return null;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-baseline text-xs font-semibold text-on-surface-variant">
                        <span>{cat}</span>
                        <span className="font-mono text-on-surface font-bold">{formatMoney(val)} <span className="text-[9px] text-on-surface-variant/50 font-normal">({percent}%)</span></span>
                      </div>
                      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}

                {stats.expense === 0 && (
                  <div className="py-12 border border-dashed border-outline-variant/30 text-center rounded-2xl text-xs text-on-surface-variant/50 font-semibold italic">
                    No se registran egresos u operaciones de gasto en el periodo.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* BOX MOVEMENTS LEDGER TABLE */}
      {activeSubTab === 'movimientos' && (
        <div className="space-y-6">
          
          {/* Filters card */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-surface-container border border-outline-variant/30 p-4 rounded-2xl hard-shadow">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
              <input
                type="text"
                placeholder="Buscar por descripción, categoría, clienta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-lowest text-xs py-2.5 pl-10 pr-4 rounded-full border border-outline-variant/40 focus:outline-none focus:border-primary font-semibold"
              />
            </div>

            {/* Type Filter dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-outline-variant/30 bg-surface-container-lowest text-xs font-bold text-on-surface-variant">
                <Filter size={12} />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="all">Flujo Completo</option>
                  <option value="income">Ingresos (+)</option>
                  <option value="expense">Egresos (-)</option>
                </select>
              </div>

              {/* Category Filter dropdown */}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-outline-variant/30 bg-surface-container-lowest text-xs font-bold text-on-surface-variant">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="all">Todas las Categorías</option>
                  {filterCategoriesList.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Table ledger */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-3xl overflow-hidden hard-shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-[10px] uppercase tracking-widest font-black text-on-surface-variant/80 border-b border-outline-variant/35">
                    <th className="px-6 py-4">Concepto / Turno</th>
                    <th className="px-6 py-4 text-center">Tipo</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4">Método de Pago</th>
                    <th className="px-6 py-4 text-center">Márgenes (Ver 2.0)</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                    <th className="px-6 py-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-xs font-semibold">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-on-surface-variant/50 font-semibold italic">
                        No se registran movimientos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.slice(0, visibleMovementsLimit).map((m) => {
                      // Calculate margin specifically for this income
                      const isInc = m.type === 'income';
                      const cost = m.costOfSupplies || 0;
                      const staff = m.staffCommission || 0;
                      const profit = isInc ? (m.amount - cost - staff) : 0;
                      const profitPercent = isInc && m.amount > 0 ? Math.round((profit / m.amount) * 100) : 0;

                      return (
                        <tr key={m.id} className="hover:bg-surface-container/10 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-on-surface">{m.description}</p>
                              {m.clientName && (
                                <p className="text-[10px] text-primary font-bold mt-0.5">Asociado a: {m.clientName}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isInc ? 'bg-sage/10 text-sage' : 'bg-terracotta/10 text-terracotta'
                            }`}>
                              {isInc ? 'Ingreso' : 'Egreso'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">{m.category}</td>
                          <td className="px-6 py-4 text-on-surface/80">
                            {m.paymentMethod ? (
                              <span className="text-[10px] font-bold bg-surface-container px-2 py-0.5 rounded border border-outline-variant/15 text-on-surface-variant">
                                {m.paymentMethod}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isInc ? (
                              <div className="space-y-0.5">
                                <p className="font-bold text-primary">{formatMoney(profit)}</p>
                                <p className="text-[9px] text-on-surface-variant/60">({profitPercent}% margen)</p>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant font-medium">{m.date}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-mono font-black text-sm ${isInc ? 'text-sage' : 'text-terracotta'}`}>
                              {isInc ? '+' : '-'}{formatMoney(m.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                if (confirm('¿Estás segura de que deseas eliminar este movimiento contable? Esta acción modificará tus reportes financieros de forma inmediata.')) {
                                  onDeleteMovement(m.id);
                                }
                              }}
                              className="text-on-surface-variant/40 hover:text-terracotta p-1.5 hover:bg-terracotta/10 rounded-full transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Load More for Movements */}
            {filteredMovements.length > visibleMovementsLimit && (
              <div className="flex justify-center py-4 bg-surface-container-lowest border-t border-outline-variant/15">
                <button
                  onClick={() => setVisibleMovementsLimit((prev) => prev + 30)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-surface-container border border-outline-variant/25 text-xs font-bold text-primary hover:bg-primary/5 transition-all shadow-xs"
                >
                  <ChevronDown size={14} />
                  Cargar más movimientos ({filteredMovements.length - visibleMovementsLimit} restantes)
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* FORM: NEW INCOME WITH MARGIN ESTIMATOR PANEL */}
      {activeSubTab === 'nuevo-ingreso' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
          
          {/* Left Form: Form Details - 7 Cols */}
          <form onSubmit={handleIncomeSubmit} className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="text-center pb-2">
              <h3 className="font-serif text-lg font-black text-primary">Registrar Turno Cobrado o Venta</h3>
              <p className="text-[11px] text-on-surface-variant/70 mt-0.5">Completa los datos de facturación para auditoría neta de caja</p>
            </div>

            <div className="wavy-divider opacity-30"></div>

            {incomeError && (
              <p className="bg-terracotta/5 border border-terracotta/20 text-terracotta p-2.5 rounded-lg text-xs font-semibold">{incomeError}</p>
            )}

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Precio de Venta Cobrado ($)</label>
              <input
                type="number"
                placeholder="Ej. 1200"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Concepto / Glosa</label>
              <input
                type="text"
                placeholder="Ej. Manicura Rusa con Nail Art - Lucía Méndez"
                value={incomeDesc}
                onChange={(e) => setIncomeDesc(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Fecha</label>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Categoría</label>
                <select
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                >
                  <option value="Manicura Rusa">Manicura Rusa</option>
                  <option value="Soft Gel Extensión">Soft Gel Extensión</option>
                  <option value="Gel X Extensiones">Gel X Extensiones</option>
                  <option value="Nail Art Editorial">Nail Art Editorial</option>
                  <option value="Pedicura Luxury">Pedicura Luxury</option>
                  <option value="Capacitación">Capacitaciones</option>
                  <option value="Venta de Productos">Venta de Productos</option>
                  <option value="Otros Ingresos">Otros Ingresos</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Método de Pago</label>
                <select
                  value={incomeMethod}
                  onChange={(e) => setIncomeMethod(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold uppercase tracking-wider"
                >
                  {paymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Asociar Clienta</label>
                <select
                  value={incomeClient}
                  onChange={(e) => setIncomeClient(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                >
                  <option value="">No asociar clienta</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Notas Internas</label>
              <input
                type="text"
                placeholder="Escribe observaciones adicionales..."
                value={incomeNotes}
                onChange={(e) => setIncomeNotes(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
              />
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className="flex-1 bg-surface-container-high py-3 rounded-xl text-xs text-on-surface font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-sage text-white py-3 rounded-xl text-xs font-bold shadow-xs hover:bg-sage/95 transition-all"
              >
                Registrar Cobro
              </button>
            </div>
          </form>

          {/* Right Panel: Margin Estimator Simulator - 5 Cols */}
          <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-3xl hard-shadow space-y-4">
            <h4 className="font-serif text-sm font-black text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator size={16} /> Simulador de Margen Neto
            </h4>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Define los costos variables estimados de insumos aplicados y comisiones para ver el rendimiento neto de este cobro en tiempo real.
            </p>

            <div className="wavy-divider opacity-30"></div>

            <div className="space-y-4">
              {/* Cost of Supplies input */}
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Costo de Insumos / Desechables ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={incomeCostOfSupplies}
                  onChange={(e) => setIncomeCostOfSupplies(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>

              {/* Staff Commission input */}
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Comisión del Staff (%)</label>
                <div className="relative">
                  <Percent className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={12} />
                  <input
                    type="number"
                    placeholder="15"
                    value={incomeStaffCommissionPercent}
                    onChange={(e) => setIncomeStaffCommissionPercent(e.target.value)}
                    className="w-full bg-surface-container-low text-xs py-2 pl-3 pr-10 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Simulated Outputs Cards */}
            <div className="space-y-2.5 pt-2">
              <div className="bg-surface-container-low/60 p-3.5 rounded-2xl border border-outline-variant/15 flex justify-between items-center text-xs">
                <span className="font-bold text-on-surface-variant">Comisión Proporcional</span>
                <span className="font-mono text-on-surface font-black">{formatMoney(estimatorValues.commissionAmount)}</span>
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-primary">Margen de Retorno Estimado</p>
                  <p className="text-[9px] text-on-surface-variant/60 font-semibold mt-0.5">Monto de ganancia pura después de deducir costos</p>
                </div>
                <div className="text-right">
                  <h4 className="font-serif text-lg font-black text-primary">{formatMoney(estimatorValues.netMargin)}</h4>
                  <span className="text-[10px] font-mono text-primary font-black">({estimatorValues.marginPercent}%)</span>
                </div>
              </div>
            </div>

            {/* Dynamic analytical advice */}
            <div className="bg-gold/5 p-4 rounded-2xl border border-gold/15 text-[11px] text-on-surface-variant/85 leading-relaxed">
              <p className="font-bold text-gold-dark flex items-center gap-1 mb-1">
                <Info size={13} /> Consejo Económico de Valentina:
              </p>
              "Mantener un margen superior al <strong>40%</strong> asegura la reinversión y el crecimiento sostenible de tu salón."
            </div>
          </div>

        </div>
      )}

      {/* FORM: NEW EXPENSE */}
      {activeSubTab === 'nuevo-egreso' && (
        <div className="max-w-xl mx-auto bg-surface-container-lowest border border-outline-variant/40 p-6 md:p-8 rounded-3xl hard-shadow space-y-4">
          <div className="text-center pb-2">
            <h3 className="font-serif text-lg font-black text-terracotta">Registrar Gasto Operativo</h3>
            <p className="text-[11px] text-on-surface-variant/70 mt-0.5">Controla las compras de insumos, publicidad y expensas fijos</p>
          </div>

          <div className="wavy-divider opacity-30"></div>

          {expenseError && (
            <p className="bg-terracotta/5 border border-terracotta/20 text-terracotta p-2.5 rounded-lg text-xs font-semibold">{expenseError}</p>
          )}

          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Monto del Egreso ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Concepto o Detalle del Gasto</label>
              <input
                type="text"
                placeholder="Ej. Colección de esmaltes OPI otoño"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Fecha</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Categoría de Egreso</label>
                <select
                  value={expenseCategoryInput}
                  onChange={(e) => setExpenseCategoryInput(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                >
                  {expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className="flex-1 bg-surface-container-high py-3 rounded-xl text-xs text-on-surface font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-terracotta text-white py-3 rounded-xl text-xs font-bold shadow-xs hover:bg-terracotta/95 transition-all"
              >
                Registrar Egreso
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
