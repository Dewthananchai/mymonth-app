import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoomProvider } from './context/RoomContext';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LiffPage from './pages/LiffPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import BudgetPage from './pages/BudgetPage';
import BillView from './components/BillView';
import SettingsPage from './pages/SettingsPage';
import AddExpenseModal from './pages/AddExpenseModal';

function MainApp() {
  // LIFF page — ตรวจสอบ path ก่อน
  if (window.location.pathname === '/liff') {
    return <LiffPage />;
  }

  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [pageKey, setPageKey] = useState(0);

  const handleTabChange = (tab) => {
    if (tab === currentTab) return;
    setCurrentTab(tab);
    setPageKey(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/30 to-teal-50/30 flex flex-col items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-3xl text-white shadow-xl shadow-emerald-500/30 pulse-glow">
            🏠
          </div>
          <div className="space-y-2 text-center">
            <div className="skeleton-shimmer h-4 w-32 rounded-lg mx-auto" />
            <div className="skeleton-shimmer h-3 w-48 rounded-lg mx-auto" />
          </div>
          <p className="text-xs font-semibold text-slate-500 animate-pulse">กำลังโหลดข้อมูล MyMonth...</p>
        </div>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onNavigateLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateRegister={() => setAuthView('register')} />;
  }

  // Logged In
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setAddExpenseModalOpen(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setAddExpenseModalOpen(true);
  };

  return (
    <RoomProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Navigation Bar */}          <Navbar
          currentTab={currentTab}
          setCurrentTab={handleTabChange}
          onOpenAddExpense={handleOpenAddExpense}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 lg:pb-6">
          <div key={pageKey} className="page-transition">
            {currentTab === 'dashboard' && (
              <DashboardPage
                onNavigateTab={handleTabChange}
                onOpenAddExpense={handleOpenAddExpense}
              />
            )}

            {currentTab === 'expenses' && (
              <ExpensesPage
                onOpenAddExpense={handleOpenAddExpense}
                onEditExpense={handleEditExpense}
                onNavigateTab={handleTabChange}
              />
            )}

            {currentTab === 'budgets' && (
              <BudgetPage />
            )}

            {currentTab === 'bills' && (
              <BillView />
            )}

            {currentTab === 'settings' && (
              <SettingsPage />
            )}
          </div>
        </main>

        {/* Modal for Add / Edit Expense */}
        <AddExpenseModal
          isOpen={addExpenseModalOpen}
          onClose={() => {
            setAddExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          initialData={editingExpense}
        />

        {/* Global Toast Alerts */}
        <Toast />
      </div>
    </RoomProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
