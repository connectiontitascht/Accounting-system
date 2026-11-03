/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays,
  Settings,
  Scale,
  LayoutDashboard,
  Receipt,
  BarChart3,
  User,
  Menu,
  X,
  LogOut,
  Users,
  FileText,
  ChevronDown,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { AuthScreen } from './components/AuthScreen';
import { Transaction, AppUser } from './types';
import { BudgetSummary } from './components/BudgetSummary';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { GraphicalReports } from './components/GraphicalReports';
import { PaymentMethodBreakdown } from './components/PaymentMethodBreakdown';
import { HomeUserSection } from './components/HomeUserSection';
import { ResellerSection } from './components/ResellerSection';
import { VoucherSection } from './components/VoucherSection';
import { DailyClosingSection } from './components/DailyClosingSection';
import { SystemUsersSection } from './components/SystemUsersSection';
import { NotificationBell } from './components/NotificationBell';

// Default initial mock transactions in English to make the app gorgeous on first load
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't-1',
    type: 'income',
    title: 'New Connection & Service Charge',
    amount: 32000,
    category: 'service_charge',
    date: '2026-06-01',
    notes: 'New connection fee and router setup charge',
  },
  {
    id: 't-2',
    type: 'expense',
    title: 'Office Rent Payment',
    amount: 12005,
    category: 'office_rent',
    date: '2026-06-02',
    notes: 'June office rent',
  },
  {
    id: 't-3',
    type: 'expense',
    title: 'Office Tea & Snacks',
    amount: 3450,
    category: 'office_expense',
    date: '2026-06-03',
    notes: 'Office afternoon tea snacks and guest entertainment',
  },
  {
    id: 't-4',
    type: 'income',
    title: 'Customer Monthly Bill Collection',
    amount: 15500,
    category: 'customer_bill',
    date: '2026-06-04',
    notes: 'Dhamrai zone retail user bill collection',
  },
  {
    id: 't-5',
    type: 'expense',
    title: 'Electricity & Wifi Bill',
    amount: 2125,
    category: 'utilities',
    date: '2026-06-04',
    notes: 'Paid via online payment gateway',
  },
  {
    id: 't-6',
    type: 'expense',
    title: 'Office Mobile Bill Paid',
    amount: 720,
    category: 'mobile_bill',
    date: '2026-06-05',
    notes: 'Officers mobile allowance bill',
  }
];

export default function App() {
  const [user, setUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('titas_custom_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading custom user session:', e);
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [resellers, setResellers] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'history' | 'home_user' | 'reseller' | 'voucher' | 'daily_closing' | 'system_users'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);

  // Auth loading state view
  useEffect(() => {
    setAuthLoading(false);
  }, []);
  useEffect(() => {
    if (!user) {
      setCurrentUserProfile(null);
      return;
    }

    const docRef = doc(db, 'app_users', user.uid);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const profile = docSnap.data() as AppUser;
        // Ensure menuAccess exists
        if (!profile.menuAccess) {
          profile.menuAccess = {
            showDashboard: true,
            showHistory: true,
            showHomeUser: true,
            showReseller: true,
            showVoucher: true,
            showDailyClosing: true,
          };
        }
        console.log("Logged in user profile:", profile);
        setCurrentUserProfile(profile);
      } else {
        // If this is a custom user, they must exist. Don't auto-seed default admin.
        if (user.isCustom) {
          return;
        }

        // Automatically seed admin profile for first-time or backward compatibility
        const adminProfile: AppUser = {
          id: user.uid,
          email: user.email || 'admin@titas.com',
          role: 'admin',
          permissions: {
            canDeleteTransactions: true,
            canDeleteVouchers: true,
            canApproveSupervisor: true,
            canApproveManager: true,
            canApproveAccounts: true,
            canManageDailyClosing: true,
            canManageSubscribers: true
          },
          createdBy: 'system',
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(docRef, adminProfile);
          setCurrentUserProfile(adminProfile);
        } catch (err) {
          console.error('Failed to seed admin profile:', err);
          // Fallback in-memory
          setCurrentUserProfile(adminProfile);
        }
      }
    }, (error) => {
      console.error('Failed to listen to user profile:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Redirect to first permitted section if activeSection is hidden
  useEffect(() => {
    if (!currentUserProfile || !currentUserProfile.menuAccess) return;
    
    const access = currentUserProfile.menuAccess;
    const isSectionPermitted = {
      dashboard: access.showDashboard,
      history: access.showHistory,
      home_user: access.showHomeUser,
      reseller: access.showReseller,
      voucher: access.showVoucher,
      daily_closing: access.showDailyClosing,
      system_users: currentUserProfile.role === 'admin'
    };

    if (activeSection !== 'system_users' && !isSectionPermitted[activeSection as keyof typeof isSectionPermitted]) {
      // Find the first permitted section
      const permittedOrder: Array<'dashboard' | 'history' | 'home_user' | 'reseller' | 'voucher' | 'daily_closing'> = [
        'dashboard', 'history', 'home_user', 'reseller', 'voucher', 'daily_closing'
      ];
      const fallback = permittedOrder.find(sec => isSectionPermitted[sec]);
      if (fallback) {
        setActiveSection(fallback);
      }
    }
  }, [currentUserProfile, activeSection]);

  // Seeding initial mock data dynamically
  const seedInitialData = async (uid: string) => {
    try {
      // Create documents sequentially or concurrently
      for (const tx of INITIAL_TRANSACTIONS) {
        const newId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const docRef = doc(db, 'transactions', newId);
        await setDoc(docRef, {
          id: newId,
          type: tx.type,
          title: tx.title,
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          notes: tx.notes || '',
          userId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Failed to seed initial transactions:', err);
    }
  };

  // Listen to User's Transactions in Firestore
  useEffect(() => {
    if (!user || !currentUserProfile) {
      setTransactions([]);
      return;
    }

    let transactionsQuery;
    if (['admin', 'accountant'].includes(currentUserProfile.role)) {
      transactionsQuery = query(collection(db, 'transactions'));
    } else {
      transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid)
      );
    }

    const unsubscribeSnapshot = onSnapshot(
      transactionsQuery,
      async (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          list.push({
            id: docSnapshot.id,
            type: data.type,
            title: data.title,
            amount: data.amount,
            category: data.category,
            date: data.date,
            notes: data.notes || '',
            paymentMethod: data.paymentMethod || '',
            receivedBy: data.receivedBy || '',
            receivedDate: data.receivedDate || '',
            userId: data.userId,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || '',
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || '',
            clientId: data.clientId || '',
            monthlyBill: Number(data.monthlyBill) || 0,
            billingMonth: data.billingMonth || '',
            collectorName: data.collectorName || '',
            receiverName: data.receiverName || '',
            status: data.status || 'approved',
            isDailyClosing: data.isDailyClosing || false,
          });
        });

        // Sort descending by calendar date
        list.sort((a, b) => b.date.localeCompare(a.date));
        setTransactions(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'transactions');
      }
    );

    return () => unsubscribeSnapshot();
  }, [user, currentUserProfile]);

  // Listen to Resellers in Firestore
  useEffect(() => {
    if (!user || !currentUserProfile) {
      setResellers([]);
      return;
    }

    let resellersQuery;
    if (['admin', 'accountant'].includes(currentUserProfile.role)) {
      resellersQuery = query(collection(db, 'resellers'));
    } else {
      resellersQuery = query(
        collection(db, 'resellers'),
        where('userId', '==', user.uid)
      );
    }

    const unsubscribe = onSnapshot(
      resellersQuery,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ...data
          });
        });
        setResellers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'resellers');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // One-time automatic database cleanup requested by the user
  useEffect(() => {
    if (!user) return;

    const runAutomaticCleanup = async () => {
      const isCleaned = localStorage.getItem('complete_db_reset_july_10_v2');
      if (isCleaned) return;

      console.log("Running complete database reset: deleting all transactions, vouchers, and resetting reseller balances...");
      try {
        // 1. Delete all transactions belonging to the user
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        let deletedTxCount = 0;
        for (const docSnap of transactionsSnapshot.docs) {
          await deleteDoc(doc(db, 'transactions', docSnap.id));
          deletedTxCount++;
        }

        // 2. Delete all vouchers belonging to the user
        const vouchersQuery = query(
          collection(db, 'vouchers'),
          where('userId', '==', user.uid)
        );
        const vouchersSnapshot = await getDocs(vouchersQuery);
        let deletedVoucherCount = 0;
        for (const docSnap of vouchersSnapshot.docs) {
          await deleteDoc(doc(db, 'vouchers', docSnap.id));
          deletedVoucherCount++;
        }

        // 3. Query and reset penal/billing amounts (totalPaid, totalDue, and unpaidMonths) for all resellers belonging to this user
        const resellersQuery = query(
          collection(db, 'resellers'),
          where('userId', '==', user.uid)
        );
        const resellersSnapshot = await getDocs(resellersQuery);
        let updatedResellers = 0;
        for (const docSnap of resellersSnapshot.docs) {
          const docRef = doc(db, 'resellers', docSnap.id);
          await updateDoc(docRef, {
            totalPaid: 0,
            totalDue: 0,
            unpaidMonths: 0,
            updatedAt: serverTimestamp()
          });
          updatedResellers++;
        }

        // 4. Mark cleanup as completed in localStorage to prevent repeat executions
        localStorage.setItem('complete_db_reset_july_10_v2', 'true');
        
        console.log(`Reset success: ${deletedTxCount} transactions deleted, ${deletedVoucherCount} vouchers deleted, ${updatedResellers} resellers zeroed out.`);
      } catch (err) {
        console.error("Complete database reset failed:", err);
      }
    };

    runAutomaticCleanup();
  }, [user]);

  // Handle adding transaction in Firebase
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    if (!user) return;
    const newId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const docRef = doc(db, 'transactions', newId);
    try {
      await setDoc(docRef, {
        id: newId,
        type: newTx.type,
        title: newTx.title,
        amount: newTx.amount,
        category: newTx.category,
        date: newTx.date,
        notes: newTx.notes || '',
        paymentMethod: newTx.paymentMethod || '',
        receivedBy: newTx.receivedBy || '',
        receivedDate: newTx.receivedDate || '',
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        clientId: newTx.clientId || '',
        monthlyBill: newTx.monthlyBill || 0,
        billingMonth: newTx.billingMonth || '',
        collectorName: newTx.collectorName || '',
        receiverName: newTx.receiverName || '',
        status: newTx.status || 'approved',
      });
      // Trigger notification
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        id: notificationRef.id,
        userId: user.uid,
        type: 'new_transaction',
        message: `New ${newTx.type} added: ${newTx.title}`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions/${newId}`);
    }
  };

  // Handle deleting transaction in Firebase
  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const docRef = doc(db, 'transactions', id);
      try {
        await deleteDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
      }
    }
  };

  // Handle deleting all transactions
  const handleDeleteAllTransactions = async () => {
    if (!user) return;
    if (transactions.length === 0) {
      alert('No transaction entries found.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete all transactions? This cannot be undone!')) return;
    if (!window.confirm('Confirm for the last time: You are about to delete all transaction records and reset the calculations. Are you sure?')) return;
    
    try {
      for (const tx of transactions) {
        const docRef = doc(db, 'transactions', tx.id);
        await deleteDoc(docRef);
      }
      alert('All transactions have been deleted successfully and the database has been reset.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions/all');
    }
  };

  // Handle Safe Sign Out
  const safeSignOut = async () => {
    try {
      localStorage.removeItem('titas_custom_user');
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Auth loading state view
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center font-sans space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-600">Loading Titas Accounting Dashboard...</p>
      </div>
    );
  }

  // If user is not authenticated, show Auth Screen
  if (!user) {
    return (
      <div className="p-4 bg-red-100">
        <AuthScreen onCustomLogin={(customUser: any) => {
          localStorage.setItem('titas_custom_user', JSON.stringify(customUser));
          setUser(customUser);
        }} />
      </div>
    );
  }

  // Filter out pending and rejected home user bills, and exclude daily closing transactions from general financial math
  const approvedOrStandardTransactions = transactions.filter(t => {
    // 1. Filter out daily closing statements from main transactional lists and metrics
    const isDailyClosingStatement = t.isDailyClosing === true || 
      (t.notes && (t.notes.includes('Daily Closing entry statement:') || t.notes.includes('Daily Closing expense statement:')));
    if (isDailyClosingStatement) {
      return false;
    }

    // 2. Filter out rejected home user bills
    const isHomeUserBill = t.category === 'customer_bill' || !!t.clientId || t.title.includes('Home User') || t.title.includes('হোম ইউজার') || (t.notes && (t.notes.includes('Manual Bill') || t.notes.includes('ম্যানুয়াল বিল জমা')));
    if (isHomeUserBill) {
      return t.status !== 'rejected'; // Show all except explicitly rejected ones
    }
    return true; // standard transactions are shown immediately
  });

  return (
    <div className="grid grid-cols-[80px,1fr] h-screen bg-bg text-ink font-geist overflow-hidden antialiased">
      {/* Nav Sidebar */}
      <nav className="sidebar h-screen bg-surface border-r border-border flex flex-col items-center py-6 gap-8">
        <div className="logo-box bg-accent text-black flex items-center justify-center font-bold rounded-xl mb-2">TA</div>
        <div className="flex flex-col gap-4">
            <button onClick={() => setActiveSection('dashboard')} className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}>
                <LayoutDashboard className="w-6 h-6" />
            </button>
            <button onClick={() => setActiveSection('history')} className={`nav-item ${activeSection === 'history' ? 'active' : ''}`}>
                <Receipt className="w-6 h-6" />
            </button>
            <button onClick={() => setActiveSection('home_user')} className={`nav-item ${activeSection === 'home_user' ? 'active' : ''}`}>
                <Users className="w-6 h-6" />
            </button>
            <button onClick={() => setActiveSection('reseller')} className={`nav-item ${activeSection === 'reseller' ? 'active' : ''}`}>
                <Users className="w-6 h-6" />
            </button>
            <button onClick={() => setActiveSection('daily_closing')} className={`nav-item ${activeSection === 'daily_closing' ? 'active' : ''}`}>
                <Calculator className="w-6 h-6" />
            </button>
        </div>
        <div className="mt-auto">
            <button onClick={safeSignOut} className="nav-item text-ink-dim hover:text-rose-500 hover:bg-rose-500/5 transition">
                <LogOut className="w-6 h-6" />
            </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="grid grid-rows-[auto,1fr,auto] h-screen overflow-hidden">
        {/* Dynamic header row matching high density aesthetic */}
        <header className="border-b border-border flex items-center justify-between px-10 h-[72px] bg-bg/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-accent">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-geist font-bold text-lg">
            {activeSection === 'dashboard' && 'Dashboard'}
            {activeSection === 'history' && 'Transactions'}
            {activeSection === 'home_user' && 'Home User'}
            {activeSection === 'reseller' && 'Reseller'}
            {activeSection === 'daily_closing' && 'Daily Closing'}
            {activeSection === 'system_users' && 'System Users'}
          </h2>
          </div>
          <div className="input-group">
            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="p-2 border border-border bg-surface font-mono text-sm rounded-lg" />
          </div>
        </header>

        {/* Content canvas with perfect margins and grids */}
        <main className="overflow-y-auto p-10 space-y-6">
          {/* Universal high level stats counters */}
          {activeSection !== 'home_user' && activeSection !== 'reseller' && activeSection !== 'voucher' && activeSection !== 'daily_closing' && activeSection !== 'system_users' && (
            <BudgetSummary 
              transactions={approvedOrStandardTransactions} 
              resellers={resellers} 
              allTransactions={transactions} 
            />
          )}

          {/* Section 1: Dashboard overview */}
          {activeSection === 'dashboard' && (
            <div className="w-full space-y-6">
              {/* Graphs & Breakdowns */}
              <GraphicalReports transactions={approvedOrStandardTransactions} />
              
              {/* Payment Method Grid Breakdown */}
              <PaymentMethodBreakdown transactions={approvedOrStandardTransactions} />
            </div>
          )}

          {/* Section 2: Unified list table views with floating entry point */}
          {activeSection === 'history' && (
            <div className="w-full animate-fade-in">
              <TransactionList 
                transactions={approvedOrStandardTransactions} 
                onDeleteTransaction={handleDeleteTransaction} 
                onDeleteAllTransactions={handleDeleteAllTransactions} 
              />
            </div>
          )}

          {/* Section 5: Home user subscriber list portal */}
          {activeSection === 'home_user' && (
            <HomeUserSection userId={user.uid} onAddTransaction={handleAddTransaction} transactions={transactions} currentUserProfile={currentUserProfile} />
          )}

          {/* Section 5 Duplicate: Reseller subscriber list portal */}
          {activeSection === 'reseller' && (
            <ResellerSection userId={user.uid} onAddTransaction={handleAddTransaction} transactions={transactions} currentUserProfile={currentUserProfile} />
          )}

          {/* Section 6: Voucher expense requests list and workflow */}
          {activeSection === 'voucher' && (
            <VoucherSection userId={user.uid} onAddTransaction={handleAddTransaction} currentUserProfile={currentUserProfile} />
          )}

          {/* Section 7: Daily closing audit and locked states */}
          {activeSection === 'daily_closing' && (
            <DailyClosingSection userId={user.uid} transactions={transactions} currentUserProfile={currentUserProfile} />
          )}

          {/* Section 8: System Users & RBAC Administrative dashboard */}
          {activeSection === 'system_users' && (
            <SystemUsersSection currentUserId={user.uid} />
          )}
        </main>

        {/* Humid and clean editorial footer */}
        <footer className="text-center py-4 border-t border-border text-xs text-ink-dim">
          <p>© 2026 Titas Accounting Software | Secure, Offline-Ready Local Data Inventory.</p>
        </footer>
      </div>
    </div>
  );
}
