import React, { useState, useMemo } from 'react';
import { useRhAppData } from '../../hooks/useFirestore';
import { DailyRecord, Quote, Expense, Income } from '../../types/restaurant';
import { useAuth } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  Users, Calendar, Coins, ArrowUpRight, BarChart3, 
  TrendingUp, TrendingDown, ArrowRightLeft, ShoppingBag, Eye, CalendarDays, Search,
  Printer, Trash2, LayoutDashboard, Receipt, Clock, AlertCircle, CheckCircle2,
  ArrowDownRight, ArrowRight, Wallet, Layers, CreditCard
} from 'lucide-react';
import { SITES, MONTHS } from '../../config/constants';
import { showToast } from '../ui/Toast';
import { getItemYearAndMonth } from '../../utils/exportHelpers';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardRHProps {
  onNavigateToTransactions?: () => void;
}

export const DashboardRH: React.FC<DashboardRHProps> = ({ onNavigateToTransactions }) => {
  const { hasAccess } = useAuth();

  // Firestore Queries - RH
  const rhData = useRhAppData();
  const employees = rhData?.employees || [];
  const attendance = rhData?.attendance || {};
  const payrollExtras = rhData?.payrollExtras || {};

  // Synchronisation avec les données réelles et unifiées du restaurant
  const { orders, expenses, cashMovements, reservations } = useRestaurant();

  const dailyRecords: DailyRecord[] = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'annulee')
      .map((o) => ({
        id: o.id,
        date: o.createdAt ? o.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        total: o.total || 0,
        totalCost: Math.round((o.total || 0) * 0.45),
        items: (o.items || []).map((it) => ({
          id: it.id,
          name: it.productName,
          qty: it.quantity || 1,
          price: it.unitPrice || 0,
        })),
        clientName: o.tableName || (o.type === 'a_emporter' ? 'À emporter' : 'Client POS'),
        paymentMethod: o.paymentMethod || 'especes',
      }));
  }, [orders]);

  const quotes: Quote[] = useMemo(() => {
    return reservations
      .filter((r) => r.status === 'confirmee')
      .map((r) => ({
        id: r.id,
        date: r.date,
        total: (r.guestCount || 2) * 15000,
        clientName: r.customerName,
        status: r.status,
      }));
  }, [reservations]);

  const incomes: Income[] = useMemo(() => {
    return cashMovements
      .filter((cm) => cm.type === 'entree' || cm.type === 'encaissement_vente')
      .map((cm) => ({
        id: cm.id,
        date: cm.timestamp ? cm.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
        amount: cm.amount || 0,
        description: cm.reason || 'Entrée de caisse',
        source: 'Caisse',
        receivedBy: cm.user,
        paymentMethod: 'especes',
      }));
  }, [cashMovements]);

  // Local States for Period Filter
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);

  const handleNavigateToTransactions = () => {
    if (onNavigateToTransactions) {
      onNavigateToTransactions();
    } else {
      window.dispatchEvent(new CustomEvent('ai-action', { detail: { action: 'navigateToTab', args: { tabId: 'transactions' } } }));
    }
  };

  // --- RH METRICS & CALCULATIONS ---
  const activeEmployees = employees.filter(e => e.statut !== 'renvoye');
  const totalEmployees = activeEmployees.length;
  const activeCount = activeEmployees.length;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentDay = new Date().getDate();

  // Calculate Payroll expenses for this month
  const keyMonth = `${currentYear}-${currentMonth}`;
  const joursOuvrables = 22;
  
  const payrollDetails = activeEmployees.map(emp => {
    const extrasKey = `${emp.id}_${keyMonth}`;
    const extras = payrollExtras[extrasKey] || { prime: 0, dette: 0, retenue: 0 };
    
    // Count unpaid absences
    let absentCount = 0;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const isSunday = dateObj.getDay() === 0;

      if (emp.statut === 'renvoye' && emp.dateRenvoi) {
        const dismissalDate = new Date(emp.dateRenvoi);
        dismissalDate.setHours(0, 0, 0, 0);
        dateObj.setHours(0, 0, 0, 0);
        if (dateObj > dismissalDate) continue;
      }
      
      if (emp.dateEmbauche) {
        const startDate = new Date(emp.dateEmbauche);
        startDate.setHours(0, 0, 0, 0);
        dateObj.setHours(0, 0, 0, 0);
        if (dateObj < startDate) continue;
      }

      const key = `${emp.id}_${currentYear}-${currentMonth}-${d}`;
      const status = attendance[key];
      
      if (status === 2 && !isSunday) {
        absentCount += 1;
      } else if (status === 4 && !isSunday) {
        absentCount += 0.5;
      }
    }

    const baseSalary = emp.salaireBase;
    const retenueAbsence = Math.round((baseSalary / joursOuvrables) * absentCount);
    const net = Math.max(0, Math.round(baseSalary + extras.prime - extras.dette - extras.retenue - retenueAbsence));
    
    return { baseSalary, net };
  });

  const totalPayrollCost = payrollDetails.reduce((acc, curr) => acc + curr.net, 0);

  // Attendance rate today
  let presentCount = 0;
  activeEmployees.forEach(emp => {
    const key = `${emp.id}_${currentYear}-${currentMonth}-${currentDay}`;
    let status = attendance[key];
    
    if (status === undefined) {
      status = emp.type === 'temporaire' ? 3 : 1; 
    }

    if (status === 1 || status === 3) {
      presentCount += 1;
    } else if (status === 4) {
      presentCount += 0.5;
    }
  });

  const attendanceRateToday = activeCount > 0 ? Math.round((presentCount / activeCount) * 100) : 0;

  // Distribution configurations
  const siteDistribution = SITES.reduce((acc, site) => {
    acc[site] = activeEmployees.filter(e => e.site === site).length;
    return acc;
  }, {} as Record<string, number>);

  const typeDistribution = {
    permanent: activeEmployees.filter(e => e.type === 'permanent').length,
    temporaire: activeEmployees.filter(e => e.type === 'temporaire').length
  };

  // --- COMMERCE & STATS CALCULATIONS ---
  const stats = useMemo(() => {
    const filterByDate = (dateStr: string) => {
      const parsed = getItemYearAndMonth(dateStr);
      if (!parsed) return false;
      const yearMatch = parsed.year === selectedYear;
      const monthMatch = selectedMonth === -1 ? true : parsed.month === selectedMonth;
      return yearMatch && monthMatch;
    };

    const periodSales = dailyRecords.filter(r => filterByDate(r.date));
    const periodDeliveries = quotes.filter(q => filterByDate(q.date));
    const periodExpenses = expenses.filter(e => filterByDate(e.date));
    const periodIncomes = incomes.filter(i => filterByDate(i.date));

    const totalSales = periodSales.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalInc = periodIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalExp = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalRentrees = totalSales + totalInc;
    const soldeNet = totalRentrees - totalExp;

    const totalCost = periodSales.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const totalMargin = totalSales - totalCost;
    const salesCount = periodSales.length;

    const monthlyCA = Array(12).fill(0);
    dailyRecords
      .filter(r => {
        const parsed = getItemYearAndMonth(r.date);
        return parsed ? parsed.year === selectedYear : false;
      })
      .forEach(r => {
        const parsed = getItemYearAndMonth(r.date);
        if (parsed) {
          monthlyCA[parsed.month] += r.total || 0;
        }
      });

    return {
      periodSales,
      periodDeliveries,
      totalCA: totalSales,
      totalRentrees,
      totalExpenses: totalExp,
      soldeNet,
      totalMargin,
      salesCount,
      monthlyCA
    };
  }, [dailyRecords, quotes, expenses, incomes, selectedYear, selectedMonth]);

  // Helper to calculate unpaid remaining debt on expenses
  const getExpenseRemaining = (e: Expense): number => {
    if (e.remainingAmount !== undefined && e.remainingAmount !== null && Number(e.remainingAmount) > 0) {
      return Number(e.remainingAmount);
    }
    if (e.paymentType === 'partial') {
      const paid = Number(e.paidAmount) || 0;
      return Math.max(0, (Number(e.amount) || 0) - paid);
    }
    return 0;
  };

  // --- STATISTIQUES AVANCÉES DES TRANSACTIONS ---
  const transactionsStats = useMemo(() => {
    const filterByDate = (dateStr: string) => {
      const parsed = getItemYearAndMonth(dateStr);
      if (!parsed) return false;
      const yearMatch = parsed.year === selectedYear;
      const monthMatch = selectedMonth === -1 ? true : parsed.month === selectedMonth;
      return yearMatch && monthMatch;
    };

    const periodSales = dailyRecords.filter(r => filterByDate(r.date));
    const periodExpenses = expenses.filter(e => filterByDate(e.date));
    const periodIncomes = incomes.filter(i => filterByDate(i.date));

    const totalSales = periodSales.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalIncomes = periodIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalRentrees = totalSales + totalIncomes;
    const soldeNet = totalRentrees - totalExpenses;

    const totalUnitsSold = periodSales.reduce((sum, s) => sum + (s.items || []).reduce((q, i) => q + i.qty, 0), 0);
    const avgSale = periodSales.length > 0 ? Math.round(totalSales / periodSales.length) : 0;
    const avgExpense = periodExpenses.length > 0 ? Math.round(totalExpenses / periodExpenses.length) : 0;

    const totalDebts = periodExpenses.reduce((sum, e) => sum + getExpenseRemaining(e), 0);
    const unpaidCount = periodExpenses.filter(e => getExpenseRemaining(e) > 0).length;
    const paidFullCount = periodExpenses.filter(e => getExpenseRemaining(e) === 0).length;
    const settlementRate = periodExpenses.length > 0 ? Math.round((paidFullCount / periodExpenses.length) * 100) : 100;

    // Categories Breakdown
    const catMap = new Map<string, number>();
    periodExpenses.forEach(e => {
      const cat = e.category?.trim() || 'Autres charges';
      catMap.set(cat, (catMap.get(cat) || 0) + (Number(e.amount) || 0));
    });

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Mixed Recent Transactions List
    type TxItem = {
      id: string;
      type: 'sale' | 'expense' | 'income';
      title: string;
      subtitle: string;
      date: string;
      amount: number;
      debt?: number;
      timestamp: number;
    };

    const recentList: TxItem[] = [];

    periodSales.forEach(s => {
      const ts = new Date(s.date).getTime() || 0;
      recentList.push({
        id: `sale-${s.id}`,
        type: 'sale',
        title: `Vente POS FAC-${s.id.toString().slice(-6)}`,
        subtitle: `${(s.items || []).length} art. • ${(s.items || []).reduce((sum, i) => sum + i.qty, 0)} u.`,
        date: s.date,
        amount: s.total || 0,
        timestamp: ts
      });
    });

    periodExpenses.forEach(e => {
      const ts = new Date(e.date).getTime() || 0;
      const debt = getExpenseRemaining(e);
      recentList.push({
        id: `exp-${e.id}`,
        type: 'expense',
        title: e.description || e.category || 'Dépense diverse',
        subtitle: `${e.category || 'Charge'}${e.supplier ? ` • ${e.supplier}` : ''}`,
        date: e.date,
        amount: -(e.amount || 0),
        debt,
        timestamp: ts
      });
    });

    periodIncomes.forEach(i => {
      const ts = new Date(i.date).getTime() || 0;
      recentList.push({
        id: `inc-${i.id}`,
        type: 'income',
        title: i.description || i.source || 'Revenu additionnel',
        subtitle: `${i.source || 'Revenu'}${i.receivedBy ? ` • Par: ${i.receivedBy}` : ''}`,
        date: i.date,
        amount: i.amount || 0,
        timestamp: ts
      });
    });

    recentList.sort((a, b) => b.timestamp - a.timestamp);

    return {
      periodSales,
      periodExpenses,
      periodIncomes,
      totalSales,
      totalExpenses,
      totalIncomes,
      totalRentrees,
      soldeNet,
      totalUnitsSold,
      avgSale,
      avgExpense,
      totalDebts,
      unpaidCount,
      paidFullCount,
      settlementRate,
      categoryBreakdown,
      recentTransactions: recentList.slice(0, 6)
    };
  }, [dailyRecords, expenses, incomes, selectedYear, selectedMonth]);

  // Évolution Mensuelle Flux de Trésorerie (Comparatif Rentrées vs Dépenses)
  const monthlyFlowData = useMemo(() => {
    const inflows = Array(12).fill(0);
    const outflows = Array(12).fill(0);

    dailyRecords
      .filter((r: DailyRecord) => {
        const parsed = getItemYearAndMonth(r.date);
        return parsed ? parsed.year === selectedYear : false;
      })
      .forEach((r: DailyRecord) => {
        const parsed = getItemYearAndMonth(r.date);
        if (parsed) inflows[parsed.month] += (r.total || 0);
      });

    incomes
      .filter((i: Income) => {
        const parsed = getItemYearAndMonth(i.date);
        return parsed ? parsed.year === selectedYear : false;
      })
      .forEach((i: Income) => {
        const parsed = getItemYearAndMonth(i.date);
        if (parsed) inflows[parsed.month] += (i.amount || 0);
      });

    expenses
      .filter((e: Expense) => {
        const parsed = getItemYearAndMonth(e.date);
        return parsed ? parsed.year === selectedYear : false;
      })
      .forEach((e: Expense) => {
        const parsed = getItemYearAndMonth(e.date);
        if (parsed) outflows[parsed.month] += (e.amount || 0);
      });

    return {
      labels: MONTHS,
      datasets: [
        {
          label: 'Rentrées (CA + Revenus)',
          data: inflows,
          backgroundColor: '#10B981',
          borderRadius: 6,
        },
        {
          label: 'Dépenses & Achats',
          data: outflows,
          backgroundColor: '#EF4444',
          borderRadius: 6,
        }
      ]
    };
  }, [dailyRecords, incomes, expenses, selectedYear]);

  const flowComparisonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 12,
          font: { size: 11, weight: 'bold' as const }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${Number(context.raw).toLocaleString()} F`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `${(value / 1000).toFixed(0)}k F`
        }
      }
    }
  };

  const categoryChartColors = [
    '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', 
    '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4'
  ];

  const categoryDoughnutData = {
    labels: transactionsStats.categoryBreakdown.length > 0 
      ? transactionsStats.categoryBreakdown.slice(0, 6).map(c => c.name) 
      : ['Aucune dépense'],
    datasets: [
      {
        data: transactionsStats.categoryBreakdown.length > 0 
          ? transactionsStats.categoryBreakdown.slice(0, 6).map(c => c.amount) 
          : [1],
        backgroundColor: transactionsStats.categoryBreakdown.length > 0
          ? categoryChartColors.slice(0, transactionsStats.categoryBreakdown.length)
          : ['#334155'],
        borderWidth: 0,
      }
    ]
  };

  const categoryDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          padding: 8,
          font: { size: 10 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.label}: ${Number(context.raw).toLocaleString()} F`
        }
      }
    }
  };

  // --- CHART CONFIGS ---
  const siteChartData = {
    labels: Object.keys(siteDistribution),
    datasets: [
      {
        label: 'Employés actifs',
        data: Object.values(siteDistribution),
        backgroundColor: '#14522D',
        borderRadius: 8,
      }
    ]
  };

  const typeChartData = {
    labels: ['CDD / CDI', 'Temporaire'],
    datasets: [
      {
        data: [typeDistribution.permanent, typeDistribution.temporaire],
        backgroundColor: ['#14522D', '#eab308'],
        borderWidth: 0,
      }
    ]
  };

  const lineChartData = {
    labels: MONTHS,
    datasets: [
      {
        label: `C.A. ${selectedYear} (FCFA)`,
        data: stats.monthlyCA,
        borderColor: '#14522D',
        backgroundColor: 'rgba(20, 82, 45, 0.1)',
        tension: 0.3,
        fill: true,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `${(value / 1000).toFixed(0)}k F`
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-scale">
      
      {/* 1. Global Period Filter Bar (Contrôle Temporel Global) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-brand rounded-xl">
            <LayoutDashboard className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Tableau de Bord Exécutif</h3>
            <p className="text-4xs text-slate-400 font-medium">Vue consolidée RH, Ventes & Santé Financière</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
            <CalendarDays className="w-4 h-4 text-brand" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={-1}>Toute l'année</option>
              {MONTHS.map((m: string, idx: number) => <option key={idx} value={idx}>{m}</option>)}
            </select>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {[2025, 2026, 2027].map((y: number) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Activité Commerciale & Ressources Humaines (KPIs Synthèse) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <Users className="w-4 h-4 text-brand" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Activité Opérationnelle & RH</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI: Chiffre d'Affaires POS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Chiffre d'Affaires Ventes</span>
              <span className="text-xl font-extrabold text-slate-800 dark:text-white font-mono block mt-1">{stats.totalCA.toLocaleString()} F</span>
              <span className="text-xs text-emerald-600 font-semibold mt-1 inline-flex items-center gap-0.5">
                +{stats.totalMargin.toLocaleString()} F marge
              </span>
            </div>
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-2xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          {/* KPI: Effectif Total */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Effectif Actif</span>
              <span className="text-xl font-extrabold text-slate-800 dark:text-white font-sans block mt-1">{activeCount} employé(s)</span>
              <span className="text-xs text-emerald-500 font-medium mt-1 inline-flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                100% en poste
              </span>
            </div>
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-brand rounded-2xl">
              <Users className="w-5 h-5 text-brand" />
            </div>
          </div>

          {/* KPI: Présence Aujourd'hui */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Présence Aujourd'hui</span>
              <span className="text-xl font-extrabold text-slate-800 dark:text-white font-sans block mt-1">{attendanceRateToday}%</span>
              <span className="text-xs text-slate-400 font-medium mt-1 block">
                {presentCount} / {activeCount} présents
              </span>
            </div>
            <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 rounded-2xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* KPI: Masse Salariale */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Masse Salariale Estimée</span>
              <span className="text-xl font-extrabold text-brand font-mono block mt-1">{totalPayrollCost.toLocaleString()} F</span>
              <span className="text-xs text-slate-400 font-medium mt-1 block">
                Mois en cours RH
              </span>
            </div>
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-2xl">
              <Coins className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Finances & Solde Net (Bilan Financier & Rentabilité) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <Coins className="w-4 h-4 text-brand" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Bilan Financier & Rentabilité</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Rentrées</span>
              <span className="text-2xl font-extrabold text-emerald-600 font-sans block">+{stats.totalRentrees.toLocaleString()} F</span>
              <span className="text-4xs text-slate-400 font-medium mt-1 block">Ventes POS & Revenus annexes</span>
            </div>
            <div className="p-3.5 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Dépenses</span>
              <span className="text-2xl font-extrabold text-red-500 font-sans block">-{stats.totalExpenses.toLocaleString()} F</span>
              <span className="text-4xs text-slate-400 font-medium mt-1 block">Charges, Achats & Salaires</span>
            </div>
            <div className="p-3.5 bg-red-500/10 text-red-600 rounded-2xl border border-red-500/20">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>

          <div className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm ${
            stats.soldeNet >= 0 
              ? 'bg-brand/5 border-brand/20 text-brand dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400' 
              : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/30'
          }`}>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Solde Net Exercice</span>
              <span className="text-2xl font-extrabold font-sans block">
                {stats.soldeNet >= 0 ? '+' : ''}{stats.soldeNet.toLocaleString()} F
              </span>
              <span className="text-4xs font-semibold opacity-75 mt-1 block">
                {stats.soldeNet >= 0 ? 'Bénéfice net consolidé' : 'Déficit sur la période'}
              </span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${
              stats.soldeNet >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                : 'bg-red-500/10 border-red-500/20 text-red-600'
            }`}>
              <ArrowRightLeft className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Graphiques Analytiques */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Line Chart: Progression Mensuelle */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl xl:col-span-2 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-brand" />
            <h4 className="font-bold text-slate-800 dark:text-white text-sm">Évolution Mensuelle du C.A. ({selectedYear})</h4>
          </div>
          <div className="h-56 relative">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Doughnut Chart: Répartition des Contrats */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-brand" />
            <h4 className="font-bold text-slate-800 dark:text-white text-sm">Répartition des Contrats RH</h4>
          </div>
          <div className="flex-1 min-h-[160px] flex items-center justify-center">
            {activeCount > 0 ? (
              <div className="max-w-[160px] w-full">
                <Doughnut 
                  data={typeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10 } }
                    }
                  }}
                />
              </div>
            ) : (
              <span className="text-sm italic text-slate-400">Aucun employé actif.</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. Statistiques & Analyse des Transactions */}
      <div className="flex flex-col gap-5">
        
        {/* Section Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand/10 text-brand rounded-xl border border-brand/20">
              <Receipt className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-base">Statistiques & Analyse des Transactions</h4>
              <p className="text-xs text-slate-400">Indicateurs clés d'encaissement, postes de charges et suivi des règlements</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNavigateToTransactions}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-all duration-150 shadow-sm cursor-pointer active:scale-95 self-start sm:self-auto"
          >
            <span>Gérer les transactions</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Cartes KPIs Transactions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1 : Volume global des transactions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Volume des Opérations</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white font-sans block mt-1">
                {transactionsStats.periodSales.length + transactionsStats.periodExpenses.length + transactionsStats.periodIncomes.length}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 block">
                {transactionsStats.periodSales.length} ventes • {transactionsStats.periodExpenses.length} charges • {transactionsStats.periodIncomes.length} entrées
              </span>
            </div>
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-2xl border border-indigo-500/10">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 2 : Panier Moyen Vente POS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Panier Moyen POS</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
                {transactionsStats.avgSale.toLocaleString()} F
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 block">
                {transactionsStats.totalUnitsSold.toLocaleString()} article(s) écoulé(s)
              </span>
            </div>
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-2xl border border-emerald-500/10">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 3 : Dépense Moyenne */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Charge Moyenne</span>
              <span className="text-2xl font-extrabold text-red-500 dark:text-red-400 font-mono block mt-1">
                {transactionsStats.avgExpense.toLocaleString()} F
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 block">
                {transactionsStats.totalExpenses.toLocaleString()} F de charges totales
              </span>
            </div>
            <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-2xl border border-red-500/10">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 4 : Dettes & Restes à Payer */}
          <div className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm ${
            transactionsStats.totalDebts > 0
              ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-950/15'
              : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/80'
          }`}>
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Dettes Fournisseurs</span>
              <span className="text-2xl font-extrabold text-amber-500 dark:text-amber-400 font-mono block mt-1">
                {transactionsStats.totalDebts.toLocaleString()} F
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 block">
                {transactionsStats.unpaidCount > 0 
                  ? `${transactionsStats.unpaidCount} facture(s) en attente de solde` 
                  : 'Toutes les factures sont soldées'}
              </span>
            </div>
            <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Graphiques Analytiques Spécifiques aux Transactions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Comparatif Mensuel Flux (Rentrées vs Dépenses) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl xl:col-span-2 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand" />
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                  Flux Mensuel de Trésorerie : Rentrées vs Dépenses ({selectedYear})
                </h4>
              </div>
              <span className="text-2xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                12 Mois Consolidés
              </span>
            </div>
            <div className="h-64 relative">
              <Bar data={monthlyFlowData} options={flowComparisonOptions} />
            </div>
          </div>

          {/* Répartition des Dépenses par Catégorie */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-brand" />
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Répartition des Charges</h4>
              </div>
              <span className="text-2xs text-slate-400">Par poste</span>
            </div>
            <div className="flex-1 min-h-[200px] flex items-center justify-center">
              {transactionsStats.totalExpenses > 0 ? (
                <div className="max-w-[200px] w-full">
                  <Doughnut data={categoryDoughnutData} options={categoryDoughnutOptions} />
                </div>
              ) : (
                <span className="text-sm italic text-slate-400">Aucune dépense enregistrée sur cette période.</span>
              )}
            </div>
          </div>
        </div>

        {/* Double Colonne : Top Postes de Dépenses + Dernières Transactions */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Colonne Gauche : Top Postes de Dépenses */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand" />
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Top Postes de Dépenses</h4>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Total : {transactionsStats.totalExpenses.toLocaleString()} F
              </span>
            </div>

            {transactionsStats.categoryBreakdown.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic">
                Aucune charge enregistrée pour cette sélection temporelle.
              </div>
            ) : (
              <div className="space-y-3.5">
                {transactionsStats.categoryBreakdown.slice(0, 5).map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {cat.amount.toLocaleString()} F
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(5, cat.percentage)}%`,
                          backgroundColor: categoryChartColors[idx % categoryChartColors.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colonne Droite : Flux Récent des Transactions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-brand" />
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Dernières Transactions Enregistrées</h4>
              </div>
              <button
                type="button"
                onClick={handleNavigateToTransactions}
                className="text-xs text-brand hover:underline font-semibold cursor-pointer"
              >
                Voir tout
              </button>
            </div>

            {transactionsStats.recentTransactions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic">
                Aucune transaction disponible pour cette sélection temporelle.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {transactionsStats.recentTransactions.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${
                        tx.type === 'sale'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : tx.type === 'income'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>
                        {tx.type === 'sale' ? (
                          <ShoppingBag className="w-4 h-4" />
                        ) : tx.type === 'income' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {tx.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {new Date(tx.date).toLocaleDateString('fr-FR')} • {tx.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-bold font-mono block ${
                        tx.amount >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} F
                      </span>
                      {tx.debt && tx.debt > 0 ? (
                        <span className="text-[10px] text-amber-500 font-medium">
                          Reste: {tx.debt.toLocaleString()} F
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Soldé</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
