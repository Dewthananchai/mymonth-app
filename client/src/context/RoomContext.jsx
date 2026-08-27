import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const { user } = useAuth();
  // Default to August 2026 as per specification
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalPersonal: 0, totalShared: 0, totalAll: 0, myPersonalTotal: 0 });
  const [budgetsData, setBudgetsData] = useState(null);
  const [settlementData, setSettlementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get('/categories');
      setCategories(data);
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  }, [user]);

  const fetchExpenses = useCallback(async (filters = {}) => {
    if (!user) return;
    try {
      setLoading(true);
      const params = {
        month: selectedMonth,
        ...filters
      };
      const res = await api.get('/expenses', params);
      setExpenses(res.expenses || []);
      setSummary(res.summary || { totalPersonal: 0, totalShared: 0, totalAll: 0, myPersonalTotal: 0 });
    } catch (err) {
      console.error('Fetch expenses error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedMonth]);

  const fetchBudgets = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get('/budgets', { month: selectedMonth });
      setBudgetsData(data);
    } catch (err) {
      console.error('Fetch budgets error:', err);
    }
  }, [user, selectedMonth]);

  const fetchSettlement = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get('/settlements/summary', { month: selectedMonth });
      setSettlementData(data);
    } catch (err) {
      console.error('Fetch settlements error:', err);
    }
  }, [user, selectedMonth]);

  const refreshAll = useCallback(() => {
    fetchCategories();
    fetchExpenses();
    fetchBudgets();
    fetchSettlement();
  }, [fetchCategories, fetchExpenses, fetchBudgets, fetchSettlement]);

  useEffect(() => {
    if (user) {
      refreshAll();
    }
  }, [user, selectedMonth, refreshAll]);

  return (
    <RoomContext.Provider
      value={{
        selectedMonth,
        setSelectedMonth,
        categories,
        expenses,
        summary,
        budgetsData,
        settlementData,
        loading,
        toast,
        showToast,
        fetchCategories,
        fetchExpenses,
        fetchBudgets,
        fetchSettlement,
        refreshAll
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  return useContext(RoomContext);
}
