import React, { useState, useMemo, useEffect } from 'react';
import { FinancialMovement, Client } from '../types';
import { Plus, Minus, Search, Filter, Trash2, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Wallet, Calendar, AlertCircle, Sparkles, Calculator, Percent, Info, HelpCircle, ChevronDown } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../utils/formatters';
import { Modal } from './Modal';
import { SelectField } from './ui/SelectField';

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
  const [movementToDelete, setMovementToDelete] = useState<FinancialMovement | null>(null);
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

  // ==================== VISUAL COMPONENT RENDER ====================
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Sub-Tabs Row */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-outline-variant/30">
        {/* Navigation Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none p-0.5 bg-surface-container/60 sm:bg-transparent rounded-xl sm:rounded-none">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 font-serif text-[11px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest rounded-lg sm:rounded-none sm:border-b-2 transition-all shrink-0 cursor-pointer active:scale-95 motion-reduce:transform-none ${
              activeSubTab === 'overview'
                ? 'bg-white sm:bg-transparent text-primary shadow-xs sm:shadow-none sm:border-primary'
                : 'text-on-surface-variant/70 hover:text-primary sm:border-transparent'
            }`}
          >
            <span className="sm:hidden">Resumen</span>
            <span className="hidden sm:inline">Resumen General</span>
          </button>
          <button
            onClick={() => setActiveSubTab('movimientos')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 font-serif text-[11px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest rounded-lg sm:rounded-none sm:border-b-2 transition-all shrink-0 cursor-pointer active:scale-95 motion-reduce:transform-none ${
              activeSubTab === 'movimientos'
                ? 'bg-white sm:bg-transparent text-primary shadow-xs sm:shadow-none sm:border-primary'
                : 'text-on-surface-variant/70 hover:text-primary sm:border-transparent'
            }`}
          >
            Historial de Caja
          </button>
        </div>

        {/* Minimalist, Discreet Action Controls for Ingreso / Egreso */}
        <div className="flex items-center shrink-0 bg-surface-container/60 p-0.5 rounded-xl border border-outline-variant/25">
          <button
            onClick={() => setActiveSubTab('nuevo-ingreso')}
            title="Registrar Ingreso (+)"
            aria-label="Registrar Ingreso"
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer active:scale-95 motion-reduce:transform-none ${
              activeSubTab === 'nuevo-ingreso'
                ? 'bg-white text-primary shadow-xs ring-1 ring-outline-variant/30'
                : 'text-on-surface-variant/75 hover:text-primary hover:bg-white/50'
            }`}
          >
            <Plus size={12} strokeWidth={2.5} className="text-sage shrink-0" />
            <span className="tracking-wide">Ingreso</span>
          </button>

          <div className="w-[1px] h-3 bg-outline-variant/30 mx-0.5"></div>

          <button
            onClick={() => setActiveSubTab('nuevo-egreso')}
            title="Registrar Egreso (−)"
            aria-label="Registrar Egreso"
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer active:scale-95 motion-reduce:transform-none ${
              activeSubTab === 'nuevo-egreso'
                ? 'bg-white text-primary shadow-xs ring-1 ring-outline-variant/30'
                : 'text-on-surface-variant/75 hover:text-primary hover:bg-white/50'
            }`}
          >
            <Minus size={12} strokeWidth={2.5} className="text-terracotta shrink-0" />
            <span className="tracking-wide">Egreso</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          
          {/* Main 4 Cards Grid - 2 cols on mobile for compact viewing, 4 cols on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
            
            {/* 1. Total Incomes */}
            <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6 relative overflow-hidden hard-shadow space-y-1 sm:space-y-2 active:scale-[0.99] transition-transform motion-reduce:transform-none">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 truncate">Ingresos Totales</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-sage/10 text-sage rounded-full flex items-center justify-center shrink-0">
                  <ArrowUpRight size={14} className="sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
                </div>
              </div>
              <h3 className="font-serif text-lg sm:text-2xl lg:text-3xl font-black text-on-surface tracking-tight truncate">{formatMoney(stats.income)}</h3>
              <div className="pt-1 wavy-divider opacity-10 hidden sm:block"></div>
              <p className="text-[10px] text-on-surface-variant/70 font-semibold truncate pt-0.5">
                {stats.completedServices} servicios cobrados
              </p>
            </div>

            {/* 2. Total Expenses */}
            <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6 relative overflow-hidden hard-shadow space-y-1 sm:space-y-2 active:scale-[0.99] transition-transform motion-reduce:transform-none">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 truncate">Egresos Totales</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-terracotta/10 text-terracotta rounded-full flex items-center justify-center shrink-0">
                  <ArrowDownRight size={14} className="sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
                </div>
              </div>
              <h3 className="font-serif text-lg sm:text-2xl lg:text-3xl font-black text-on-surface tracking-tight truncate">{formatMoney(stats.expense)}</h3>
              <div className="pt-1 wavy-divider opacity-10 hidden sm:block"></div>
              <p className="text-[10px] text-on-surface-variant/70 font-semibold truncate pt-0.5">
                Insumos, publicidad y fijos
              </p>
            </div>

            {/* 3. Net Profit (Ganancia Neta) */}
            <div className="bg-surface-container/70 border border-primary/25 rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6 relative overflow-hidden hard-shadow space-y-1 sm:space-y-2 active:scale-[0.99] transition-transform motion-reduce:transform-none">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary/80 truncate">Ganancia Neta</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                  <DollarSign size={14} className="sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
                </div>
              </div>
              <h3 className="font-serif text-lg sm:text-2xl lg:text-3xl font-black text-primary tracking-tight truncate">{formatMoney(stats.netProfit)}</h3>
              <div className="pt-1 wavy-divider opacity-20 hidden sm:block"></div>
              <p className="text-[10px] font-black text-primary/80 truncate pt-0.5 flex items-center gap-0.5">
                <Percent size={10} /> {stats.netMargin}% de margen real
              </p>
            </div>

            {/* 4. Ticket Average & Active Clients */}
            <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6 relative overflow-hidden hard-shadow space-y-1 sm:space-y-2 active:scale-[0.99] transition-transform motion-reduce:transform-none">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 truncate">Ticket Promedio</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-primary/10 text-primary/70 rounded-full flex items-center justify-center shrink-0">
                  <Wallet size={14} className="sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
                </div>
              </div>
              <h3 className="font-serif text-lg sm:text-2xl lg:text-3xl font-black text-on-surface tracking-tight truncate">{formatMoney(stats.ticketAverage)}</h3>
              <div className="pt-1 wavy-divider opacity-10 hidden sm:block"></div>
              <p className="text-[10px] text-on-surface-variant/70 font-semibold truncate pt-0.5">
                {stats.activeClientsCount} clientas únicas
              </p>
            </div>

          </div>

          {/* FINANCIAL HEALTH ALERT CORNER */}
          {healthAlerts.length > 0 && (
            <div className="bg-surface-container p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-outline-variant/35 hard-shadow space-y-2 sm:space-y-3.5">
              <h4 className="font-serif text-xs sm:text-sm font-black text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <AlertCircle size={15} className="text-terracotta shrink-0" /> Alertas de Salud Financiera & Márgenes
              </h4>
              <div className="wavy-divider opacity-25"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                {healthAlerts.map((alert, idx) => (
                  <div key={idx} className="flex gap-2.5 bg-white/80 border border-outline-variant/15 p-2.5 sm:p-3.5 rounded-xl items-start transition-all">
                    <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                      alert.type === 'danger' ? 'bg-terracotta/10 text-terracotta' : 'bg-gold/10 text-gold-dark'
                    }`}>
                      <AlertCircle size={13} />
                    </span>
                    <div className="space-y-0.5 text-xs min-w-0">
                      <h5 className="font-bold text-on-surface truncate">{alert.title}</h5>
                      <p className="text-[10px] sm:text-[11px] text-on-surface-variant/80 font-medium leading-relaxed">{alert.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADVANCED CHARTS PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 lg:gap-8 items-start">
            
            {/* Top Profitable Services (Valentina's Favorite Table) - 7 Cols */}
            <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/35 p-3.5 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl hard-shadow space-y-3 sm:space-y-4">
              <div>
                <h4 className="font-serif text-sm sm:text-base font-black text-primary">Análisis de Rentabilidad por Servicio</h4>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-on-surface-variant/65 font-bold mt-0.5">Servicios ordenados por su margen neto (%) real</p>
              </div>

              <div className="wavy-divider opacity-30"></div>

              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-wider font-bold text-on-surface-variant/70 border-b border-outline-variant/20">
                      <th className="py-2 px-1.5 sm:px-2">Servicio</th>
                      <th className="py-2 px-1 text-center">Cant.</th>
                      <th className="py-2 px-1.5 sm:px-2 text-right">Facturado</th>
                      <th className="py-2 px-1.5 sm:px-2 text-right">Margen %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-xs">
                    {topServicesData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 sm:py-8 text-center text-on-surface-variant/50 font-medium italic text-xs">
                          No hay servicios cobrados registrados en la caja.
                        </td>
                      </tr>
                    ) : (
                      topServicesData.map((srv, idx) => (
                        <tr key={idx} className="hover:bg-surface-container/10 active:bg-surface-container/20 transition-colors font-semibold">
                          <td className="py-2 sm:py-3 px-1.5 sm:px-2 text-on-surface font-bold text-xs truncate max-w-[130px] sm:max-w-none">{srv.name}</td>
                          <td className="py-2 sm:py-3 px-1 text-center text-on-surface-variant text-xs">{srv.count}</td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-2 text-right text-primary font-mono text-xs font-bold">{formatMoney(srv.revenue)}</td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-2 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-mono text-[10px] font-black ${
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
            <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/35 p-3.5 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl hard-shadow space-y-3 sm:space-y-4">
              <div>
                <h4 className="font-serif text-sm sm:text-base font-black text-primary">Análisis de Distribución de Egresos</h4>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-on-surface-variant/65 font-bold mt-0.5">Concentración porcentual de gastos</p>
              </div>

              <div className="wavy-divider opacity-30"></div>

              {/* Graphical Bar distribution */}
              <div className="space-y-2.5 pt-0.5">
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
                        <span className="truncate pr-2">{cat}</span>
                        <span className="font-mono text-on-surface font-bold shrink-0">{formatMoney(val)} <span className="text-[9px] text-on-surface-variant/50 font-normal">({percent}%)</span></span>
                      </div>
                      <div className="w-full bg-surface-container h-1.5 sm:h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-500 rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}

                {stats.expense === 0 && (
                  <div className="py-8 sm:py-12 border border-dashed border-outline-variant/30 text-center rounded-2xl text-xs text-on-surface-variant/50 font-semibold italic">
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
        <div className="space-y-3.5 sm:space-y-6">
          
          {/* Filters card */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 justify-between items-stretch sm:items-center bg-surface-container border border-outline-variant/30 p-2.5 sm:p-4 rounded-2xl hard-shadow">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={14} />
              <input
                type="text"
                placeholder="Buscar descripción, categoría, clienta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-lowest text-xs py-2 sm:py-2.5 pl-8 sm:pl-10 pr-3 sm:pr-4 rounded-full border border-outline-variant/40 focus:outline-none focus:border-primary font-semibold"
              />
            </div>

            {/* Type & Category Filter dropdowns */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex-1 sm:flex-initial">
                <SelectField
                  value={filterType}
                  onChange={(val) => setFilterType(val as any)}
                  options={[
                    { value: 'all', label: 'Flujo Completo' },
                    { value: 'income', label: 'Ingresos (+)' },
                    { value: 'expense', label: 'Egresos (-)' },
                  ]}
                  variant="dropdown"
                  triggerClassName="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/30 bg-surface-container-lowest text-[11px] sm:text-xs font-bold text-on-surface-variant cursor-pointer hover:border-primary/40 transition-colors w-full sm:w-auto min-h-0"
                />
              </div>

              {/* Category Filter dropdown */}
              <div className="flex-1 sm:flex-initial">
                <SelectField
                  value={filterCategory}
                  onChange={(val) => setFilterCategory(val)}
                  options={[
                    { value: 'all', label: 'Categorías (Todas)' },
                    ...filterCategoriesList.map((cat) => ({ value: cat, label: cat }))
                  ]}
                  variant="dropdown"
                  triggerClassName="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/30 bg-surface-container-lowest text-[11px] sm:text-xs font-bold text-on-surface-variant cursor-pointer hover:border-primary/40 transition-colors w-full sm:w-auto min-h-0 truncate"
                />
              </div>
            </div>

          </div>

          {/* MOBILE VIEW (High-density stream tailored for iPhone 14 Plus) */}
          <div className="md:hidden space-y-2">
            {filteredMovements.length === 0 ? (
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl py-10 text-center text-on-surface-variant/50 font-semibold italic text-xs">
                No se registran movimientos con los filtros seleccionados.
              </div>
            ) : (
              filteredMovements.slice(0, visibleMovementsLimit).map((m) => {
                const isInc = m.type === 'income';
                const cost = m.costOfSupplies || 0;
                const staff = m.staffCommission || 0;
                const profit = isInc ? (m.amount - cost - staff) : 0;
                const profitPercent = isInc && m.amount > 0 ? Math.round((profit / m.amount) * 100) : 0;

                return (
                  <div
                    key={m.id}
                    className="bg-surface-container-lowest border border-outline-variant/25 rounded-2xl p-3 space-y-1.5 hard-shadow active:scale-[0.99] transition-transform motion-reduce:transform-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isInc ? 'bg-sage/10 text-sage' : 'bg-terracotta/10 text-terracotta'
                          }`}>
                            {isInc ? 'Ingreso' : 'Egreso'}
                          </span>
                          <span className="text-[10px] font-bold text-on-surface-variant/80 bg-surface-container px-1.5 py-0.5 rounded truncate max-w-[130px]">
                            {m.category}
                          </span>
                          {m.paymentMethod && (
                            <span className="text-[9px] font-bold bg-surface-container-low px-1.5 py-0.5 rounded text-on-surface-variant/70">
                              {m.paymentMethod}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-xs text-on-surface mt-1 truncate">{m.description}</p>
                        {m.clientName && (
                          <p className="text-[10px] text-primary font-bold mt-0.5 truncate">Clienta: {m.clientName}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-mono font-black text-sm block ${isInc ? 'text-sage' : 'text-terracotta'}`}>
                          {isInc ? '+' : '-'}{formatMoney(m.amount)}
                        </span>
                        <span className="text-[9px] text-on-surface-variant/50 font-medium block">{m.date}</span>
                      </div>
                    </div>

                    {/* Margin & Action bottom row */}
                    <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10 text-[10px]">
                      {isInc ? (
                        <div className="text-primary font-bold truncate">
                          Margen: <span className="font-mono">{formatMoney(profit)}</span> <span className="text-on-surface-variant/60 font-normal">({profitPercent}%)</span>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/50 font-medium italic text-[10px]">Gasto operativo registrado</span>
                      )}

                      <button
                        onClick={() => setMovementToDelete(m)}
                        className="text-on-surface-variant/40 hover:text-terracotta p-1 hover:bg-terracotta/10 rounded-full transition-all cursor-pointer active:scale-90"
                        title="Eliminar movimiento"
                        aria-label="Eliminar movimiento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP VIEW (Full 8-Column Ledger Table) */}
          <div className="hidden md:block bg-surface-container-lowest border border-outline-variant/35 rounded-3xl overflow-hidden hard-shadow">
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
                              onClick={() => setMovementToDelete(m)}
                              className="text-on-surface-variant/40 hover:text-terracotta p-1.5 hover:bg-terracotta/10 rounded-full transition-all cursor-pointer active:scale-90"
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
          </div>

          {/* Pagination Load More for Movements (Shared) */}
          {filteredMovements.length > visibleMovementsLimit && (
            <div className="flex justify-center py-2 sm:py-4">
              <button
                onClick={() => setVisibleMovementsLimit((prev) => prev + 30)}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-surface-container border border-outline-variant/25 text-[11px] sm:text-xs font-bold text-primary hover:bg-primary/5 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <ChevronDown size={13} />
                Cargar más movimientos ({filteredMovements.length - visibleMovementsLimit} restantes)
              </button>
            </div>
          )}

        </div>
      )}

      {/* FORM: NEW INCOME WITH MARGIN ESTIMATOR PANEL */}
      {activeSubTab === 'nuevo-ingreso' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start max-w-5xl mx-auto">
          
          {/* Left Form: Form Details - 7 Cols */}
          <form onSubmit={handleIncomeSubmit} className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl hard-shadow space-y-3.5 sm:space-y-4">
            <div className="text-center pb-1">
              <h3 className="font-serif text-base sm:text-lg font-black text-primary">Registrar Turno Cobrado o Venta</h3>
              <p className="text-[10px] sm:text-[11px] text-on-surface-variant/70 mt-0.5">Completa los datos de facturación para auditoría neta de caja</p>
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
                className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
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
                className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Fecha</label>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold"
                  required
                />
              </div>

              <SelectField
                label="Categoría"
                value={incomeCategory}
                onChange={(val) => setIncomeCategory(val)}
                options={[
                  { value: 'Manicura Rusa', label: 'Manicura Rusa' },
                  { value: 'Soft Gel Extensión', label: 'Soft Gel Extensión' },
                  { value: 'Gel X Extensiones', label: 'Gel X Extensiones' },
                  { value: 'Nail Art Editorial', label: 'Nail Art Editorial' },
                  { value: 'Pedicura Luxury', label: 'Pedicura Luxury' },
                  { value: 'Capacitación', label: 'Capacitaciones' },
                  { value: 'Venta de Productos', label: 'Venta de Productos' },
                  { value: 'Otros Ingresos', label: 'Otros Ingresos' },
                ]}
                variant="sheet"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <SelectField
                label="Método de Pago"
                value={incomeMethod}
                onChange={(val) => setIncomeMethod(val)}
                options={paymentMethods.map((m) => ({ value: m, label: m }))}
                variant="sheet"
              />

              <SelectField
                label="Asociar Clienta"
                value={incomeClient}
                onChange={(val) => setIncomeClient(val)}
                options={[
                  { value: '', label: 'No asociar clienta' },
                  ...clients.map((c) => ({ value: c.id, label: c.name }))
                ]}
                variant="sheet"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Notas Internas</label>
              <input
                type="text"
                placeholder="Escribe observaciones adicionales..."
                value={incomeNotes}
                onChange={(e) => setIncomeNotes(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
              />
            </div>

            <div className="pt-2 flex gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className="flex-1 bg-surface-container-high py-2.5 sm:py-3 rounded-xl text-xs text-on-surface font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-sage text-white py-2.5 sm:py-3 rounded-xl text-xs font-bold shadow-xs hover:bg-sage/95 active:scale-95 transition-transform cursor-pointer"
              >
                Registrar Cobro
              </button>
            </div>
          </form>

          {/* Right Panel: Margin Estimator Simulator - 5 Cols */}
          <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl hard-shadow space-y-3 sm:space-y-4">
            <h4 className="font-serif text-xs sm:text-sm font-black text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator size={15} /> Simulador de Margen Neto
            </h4>
            <p className="text-[10px] sm:text-[11px] text-on-surface-variant/70 leading-relaxed">
              Define los costos variables estimados de insumos aplicados y comisiones para ver el rendimiento neto en tiempo real.
            </p>

            <div className="wavy-divider opacity-30"></div>

            <div className="space-y-3">
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
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={12} />
                  <input
                    type="number"
                    placeholder="15"
                    value={incomeStaffCommissionPercent}
                    onChange={(e) => setIncomeStaffCommissionPercent(e.target.value)}
                    className="w-full bg-surface-container-low text-xs py-2 pl-3 pr-9 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Simulated Outputs Cards */}
            <div className="space-y-2 pt-1">
              <div className="bg-surface-container-low/60 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-outline-variant/15 flex justify-between items-center text-xs">
                <span className="font-bold text-on-surface-variant text-[11px] sm:text-xs">Comisión Proporcional</span>
                <span className="font-mono text-on-surface font-black text-xs sm:text-sm">{formatMoney(estimatorValues.commissionAmount)}</span>
              </div>

              <div className="bg-primary/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-primary/10 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-primary text-[11px] sm:text-xs">Margen de Retorno Estimado</p>
                  <p className="text-[9px] text-on-surface-variant/60 font-semibold mt-0.5">Ganancia pura tras deducir costos</p>
                </div>
                <div className="text-right">
                  <h4 className="font-serif text-base sm:text-lg font-black text-primary">{formatMoney(estimatorValues.netMargin)}</h4>
                  <span className="text-[10px] font-mono text-primary font-black">({estimatorValues.marginPercent}%)</span>
                </div>
              </div>
            </div>

            {/* Dynamic analytical advice */}
            <div className="bg-gold/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gold/15 text-[10px] sm:text-[11px] text-on-surface-variant/85 leading-relaxed">
              <p className="font-bold text-gold-dark flex items-center gap-1 mb-0.5">
                <Info size={12} /> Consejo Económico de Valentina:
              </p>
              "Mantener un margen superior al <strong>40%</strong> asegura la reinversión y el crecimiento sostenible de tu salón."
            </div>
          </div>

        </div>
      )}

      {/* FORM: NEW EXPENSE */}
      {activeSubTab === 'nuevo-egreso' && (
        <div className="max-w-xl mx-auto bg-surface-container-lowest border border-outline-variant/40 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl hard-shadow space-y-3.5 sm:space-y-4">
          <div className="text-center pb-1">
            <h3 className="font-serif text-base sm:text-lg font-black text-terracotta">Registrar Gasto Operativo</h3>
            <p className="text-[10px] sm:text-[11px] text-on-surface-variant/70 mt-0.5">Controla las compras de insumos, publicidad y expensas fijos</p>
          </div>

          <div className="wavy-divider opacity-30"></div>

          {expenseError && (
            <p className="bg-terracotta/5 border border-terracotta/20 text-terracotta p-2.5 rounded-lg text-xs font-semibold">{expenseError}</p>
          )}

          <form onSubmit={handleExpenseSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Monto del Egreso ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
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
                className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Fecha</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold"
                  required
                />
              </div>

              <SelectField
                label="Categoría de Egreso"
                value={expenseCategoryInput}
                onChange={(val) => setExpenseCategoryInput(val)}
                options={expenseCategories.map((cat) => ({ value: cat, label: cat }))}
                variant="sheet"
              />
            </div>

            <div className="pt-2 flex gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className="flex-1 bg-surface-container-high py-2.5 sm:py-3 rounded-xl text-xs text-on-surface font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-terracotta text-white py-2.5 sm:py-3 rounded-xl text-xs font-bold shadow-xs hover:bg-terracotta/95 active:scale-95 transition-transform cursor-pointer"
              >
                Registrar Egreso
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMATION MODAL: ELIMINAR MOVIMIENTO */}
      <Modal
        isOpen={!!movementToDelete}
        onClose={() => setMovementToDelete(null)}
        icon={<AlertCircle size={18} className="text-terracotta" />}
        title="¿Eliminar movimiento contable?"
        subtitle={movementToDelete ? `${movementToDelete.type === 'income' ? 'Ingreso' : 'Egreso'}: ${formatMoney(movementToDelete.amount)}` : undefined}
        maxWidth="sm"
      >
        {movementToDelete && (
          <div className="space-y-4">
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/20 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-on-surface text-sm truncate pr-2">{movementToDelete.description}</span>
                <span className={`font-mono font-black ${movementToDelete.type === 'income' ? 'text-sage' : 'text-terracotta'}`}>
                  {movementToDelete.type === 'income' ? '+' : '-'}{formatMoney(movementToDelete.amount)}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant/70">
                Categoría: {movementToDelete.category} • Fecha: {movementToDelete.date}
              </p>
            </div>

            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Esta acción modificará tus reportes financieros de forma inmediata.
            </p>

            <div className="flex gap-2.5 justify-end pt-1">
              <button
                type="button"
                onClick={() => setMovementToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high/80 active:scale-95 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMovement(movementToDelete.id);
                  setMovementToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 bg-terracotta text-white rounded-xl text-xs font-bold shadow-xs hover:bg-terracotta/95 active:scale-95 transition-all cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
