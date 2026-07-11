import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  UserProfile,
  Customer,
  Package,
  Payment,
  Ticket,
  TicketMessage,
  Invoice,
} from "../types";
import {
  Wifi,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  Check,
  FileText,
  MessageSquare,
  Send,
  Download,
  Settings,
  RefreshCw,
  Copy,
  X,
  User,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Menu,
} from "lucide-react";

interface CustomerPanelProps {
  currentUser: any;
}

export default function CustomerPanel({ currentUser }: CustomerPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "pay" | "history" | "support" | "device">("dashboard");

  // State
  const [customerProfile, setCustomerProfile] = useState<Customer | null>(null);
  const [showCustomerProfileModal, setShowCustomerProfileModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showTopDropdown, setShowTopDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const isTopToggle = target.closest('[data-dropdown-toggle="top"]');
      const isTopMenu = target.closest('[data-dropdown-menu="top"]');
      const isProfileToggle = target.closest('[data-dropdown-toggle="profile"]');
      const isProfileMenu = target.closest('[data-dropdown-menu="profile"]');
      
      if (!isTopToggle && !isTopMenu) {
        setShowTopDropdown(false);
      }
      if (!isProfileToggle && !isProfileMenu) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);
  const [broadbandPackage, setBroadbandPackage] = useState<Package | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companySettings, setCompanySettings] = useState({
    companyName: "OwnsLink ব্রডব্যান্ড",
    logoUrl: "/logo.svg",
    smsApiKey: "",
  });

  // Forms
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: "bkash", trxId: "", month: "" });
  const [newTicketTitle, setNewTicketTitle] = useState("");
  
  // Live Ticket message thread
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // ONU restart simulation
  const [rebooting, setRebooting] = useState(false);
  const [rebootStatus, setRebootStatus] = useState("");

  // Copy success indicator
  const [copiedText, setCopiedText] = useState("");

  useEffect(() => {
    // 1. Fetch Customer details
    const unsubCust = onSnapshot(doc(db, "customers", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const custData = docSnap.data() as Customer;
        setCustomerProfile(custData);
        setPaymentForm((prev) => ({ ...prev, amount: custData.dueAmount }));

        // Fetch package
        getDoc(doc(db, "packages", custData.packageId)).then((pkgSnap) => {
          if (pkgSnap.exists()) {
            setBroadbandPackage(pkgSnap.data() as Package);
          }
        });
      }
    });

    // 2. Invoices
    const unsubInvoices = onSnapshot(
      query(collection(db, "invoices"), where("customerId", "==", currentUser.uid)),
      (snap) => {
        const list: Invoice[] = [];
        snap.forEach((doc) => list.push(doc.data() as Invoice));
        setInvoices(list);
      }
    );

    // 3. Payments
    const unsubPayments = onSnapshot(
      query(collection(db, "payments"), where("customerId", "==", currentUser.uid)),
      (snap) => {
        const list: Payment[] = [];
        snap.forEach((doc) => list.push(doc.data() as Payment));
        setPayments(list);
      }
    );

    // 4. Tickets
    const unsubTickets = onSnapshot(
      query(collection(db, "tickets"), where("customerId", "==", currentUser.uid)),
      (snap) => {
        const list: Ticket[] = [];
        snap.forEach((doc) => list.push(doc.data() as Ticket));
        setTickets(list);
      }
    );

    // 5. Load Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "company"), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings(docSnap.data() as any);
      }
    });

    return () => {
      unsubCust();
      unsubInvoices();
      unsubPayments();
      unsubTickets();
      unsubSettings();
    };
  }, [currentUser.uid]);

  // Load chat for support ticket
  useEffect(() => {
    if (!activeTicket) return;
    const unsubTicketMsgs = onSnapshot(
      query(collection(db, "tickets", activeTicket.id, "messages"), orderBy("timestamp", "asc")),
      (snap) => {
        const list: TicketMessage[] = [];
        snap.forEach((doc) => list.push(doc.data() as TicketMessage));
        setTicketMessages(list);
      }
    );
    return () => unsubTicketMsgs();
  }, [activeTicket]);

  // Copy merchant account number
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2000);
  };

  // Submit Payment Gateway Form
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentForm.amount <= 0 || !paymentForm.trxId) {
      alert("অনুগ্রহ করে বিল পরিশোধের পরিমাণ এবং সঠিক ট্রানজেকশন আইডি প্রদান করুন!");
      return;
    }

    try {
      const payId = `PAY-ON-${Date.now()}`;
      await setDoc(doc(db, "payments", payId), {
        id: payId,
        customerId: currentUser.uid,
        amount: Number(paymentForm.amount),
        month: paymentForm.month || new Date().toISOString().slice(0, 7),
        method: paymentForm.method,
        trxId: paymentForm.trxId,
        status: "pending", // Pending admin approval
        date: new Date().toISOString().slice(0, 10),
      });

      alert("আপনার পেমেন্ট রিকোয়েস্টটি পেন্ডিং লিস্টে জমা হয়েছে। অ্যাডমিন ভেরিফাই করে অ্যাপ্রুভ করবেন। ধন্যবাদ!");
      setPaymentForm({ amount: customerProfile?.dueAmount || 0, method: "bkash", trxId: "", month: "" });
      setActiveTab("dashboard");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "payments");
    }
  };

  // Submit New Support Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim()) return;

    try {
      const ticketId = `TKT-${Date.now()}`;
      const newTicket: Ticket = {
        id: ticketId,
        customerId: currentUser.uid,
        title: newTicketTitle,
        status: "open",
        assignedTo: "", // Will be assigned by admin
      };

      await setDoc(doc(db, "tickets", ticketId), newTicket);

      // Add first message thread in subcollection
      const msgId = `TKT-MSG-${Date.now()}`;
      await setDoc(doc(db, "tickets", ticketId, "messages", msgId), {
        id: msgId,
        senderId: currentUser.uid,
        senderName: customerProfile?.name || "গ্রাহক",
        senderRole: "customer",
        message: `হেল্পডেস্ক টিকিট তৈরি করা হয়েছে: ${newTicketTitle}`,
        timestamp: new Date().toISOString(),
      });

      setNewTicketTitle("");
      alert("সাপোর্ট টিকিট সফলভাবে সাবমিট হয়েছে! একজন প্রতিনিধি দ্রুত যোগাযোগ করবেন।");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "tickets");
    }
  };

  // Send Ticket Message Reply
  const handleSendTicketMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTicket) return;

    try {
      const msgId = `TKT-MSG-${Date.now()}`;
      await setDoc(doc(db, "tickets", activeTicket.id, "messages", msgId), {
        id: msgId,
        senderId: currentUser.uid,
        senderName: customerProfile?.name || "গ্রাহক",
        senderRole: "customer",
        message: newMessage,
        timestamp: new Date().toISOString(),
      });
      setNewMessage("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tickets/${activeTicket.id}/messages`);
    }
  };

  // Simulate ONU Restart
  const handleOnuRestart = () => {
    setRebooting(true);
    setRebootStatus("আপনার ONU রাউটারের সাথে কানেক্ট করা হচ্ছে...");
    
    setTimeout(() => {
      setRebootStatus("রিস্টার্ট কমান্ড পাঠানো হচ্ছে...");
    }, 1500);

    setTimeout(() => {
      setRebootStatus("ডিভাইস বন্ধ হচ্ছে... পুনরায় বুট করার জন্য অপেক্ষা করুন (৩০ সেকেন্ড)।");
    }, 3000);

    setTimeout(() => {
      setRebooting(false);
      setRebootStatus("");
      alert("আপনার ONU রাউটারটি সফলভাবে রিস্টার্ট করা হয়েছে এবং সংকেত পুনরায় চেক করা হচ্ছে। অনুগ্রহ করে ২ মিনিট পর ইন্টারনেট চেক করুন।");
    }, 6000);
  };

  // Print PDF Invoice emulation
  const handlePrintInvoice = (invoice: Invoice) => {
    const company = companySettings.companyName || "OwnsBill";
    const printContent = `
      ==================================================
                   ${company} ইন্টারনেট ইনভয়েস
      ==================================================
      ইনভয়েস আইডি : ${invoice.id}
      গ্রাহকের নাম : ${customerProfile?.name}
      গ্রাহক আইডি : ${invoice.customerId}
      বিল মাস     : ${invoice.month}
      টাকার পরিমাণ : ${invoice.amount} BDT
      স্ট্যাটাস     : ${invoice.status.toUpperCase()}
      তারিখ       : ${invoice.createdAt ? invoice.createdAt.slice(0, 10) : "N/A"}
      ==================================================
      বিকাশ বা নগদ ট্রানজেকশন সাবমিট করে পেইড বুঝে নিন।
      Copyright © 2026 ${company}. All rights reserved
    `;
    const win = window.open("", "_blank");
    win?.document.write(`<pre style="font-family: monospace; padding: 20px;">${printContent}</pre>`);
    win?.document.close();
    win?.print();
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 flex-col md:flex-row relative">
      
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 md:hidden shrink-0 z-30">
        <div className="flex items-center gap-2">
          {companySettings.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt="Logo"
              referrerPolicy="no-referrer"
              className="h-10 w-10 object-cover rounded-full border border-gray-200 dark:border-zinc-800 p-0.5 bg-white shadow-sm shrink-0"
            />
          ) : (
            <div className="bg-emerald-600 text-white h-10 w-10 flex items-center justify-center rounded-full font-bold text-sm shrink-0">OL</div>
          )}
          <h1 className="font-bold text-base text-emerald-600 dark:text-emerald-400">
            {companySettings.companyName || "OwnsLink"}
          </h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-gray-150 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 transition"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Layout */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-zinc-800 p-6 flex flex-col justify-between shrink-0 transition-transform duration-300 md:relative md:translate-x-0 ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div>
          <div className="flex items-center gap-3 mb-8">
            {companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="h-12 w-12 object-cover rounded-full border border-gray-200 dark:border-zinc-800 p-0.5 bg-white shadow-sm shrink-0"
              />
            ) : (
              <div className="bg-emerald-600 text-white h-12 w-12 flex items-center justify-center rounded-full font-bold text-lg shrink-0">OL</div>
            )}
            <div>
              <h1 className="font-bold text-base tracking-tight text-emerald-600 dark:text-emerald-400 leading-tight">
                {companySettings.companyName || "OwnsLink ব্রডব্যান্ড"}
              </h1>
              <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 py-0.5 px-2 rounded-full font-semibold mt-1 inline-block">
                কাস্টমার প্যানেল
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "আমার ড্যাশবোর্ড", icon: TrendingUp },
              { id: "pay", label: "বিল পরিশোধ", icon: DollarSign },
              { id: "history", label: "বিল হিস্ট্রি", icon: FileText },
              { id: "support", label: "সাপোর্ট ও চ্যাট", icon: MessageSquare },
              { id: "device", label: "আমার ওএনইউ ডিভাইস", icon: Wifi },
            ].map((tab) => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <IconComp className="h-4.5 w-4.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="relative pt-4 mt-2 border-t border-gray-100 dark:border-zinc-800">
          {showProfileDropdown && (
            <div
              data-dropdown-menu="profile"
              className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl p-2 shadow-xl z-50 space-y-1"
            >
              <button
                onClick={() => {
                  setShowCustomerProfileModal(true);
                  setShowProfileDropdown(false);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition"
              >
                <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                প্রোফাইল দেখুন
              </button>
              <button
                onClick={() => {
                  const isDark = document.documentElement.classList.contains("dark");
                  if (isDark) {
                    document.documentElement.classList.remove("dark");
                    localStorage.setItem("theme", "light");
                  } else {
                    document.documentElement.classList.add("dark");
                    localStorage.setItem("theme", "dark");
                  }
                  setShowProfileDropdown(false);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition"
              >
                <Sun className="h-4 w-4 text-amber-500" />
                ডার্ক / লাইট মোড
              </button>
              <button
                onClick={async () => {
                  const { signOut } = await import("firebase/auth");
                  const { auth } = await import("../lib/firebase");
                  await signOut(auth);
                }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
              >
                <LogOut className="h-4 w-4" />
                লগআউট করুন
              </button>
            </div>
          )}

          <button
            data-dropdown-toggle="profile"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="w-full text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800/40 p-2 rounded-xl transition"
            title="প্রোফাইল ও সেটিংস"
          >
            <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-extrabold text-sm border border-emerald-200 dark:border-emerald-900/50">
              {customerProfile?.name ? customerProfile.name.slice(0, 2).toUpperCase() : "CU"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate text-gray-800 dark:text-zinc-200">
                {customerProfile?.name || "গ্রাহক প্রোফাইল"}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                {currentUser.email}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header with Profile Dropdown */}
        <header className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 py-3 flex justify-between items-center shrink-0 z-30">
          <div />

          <div className="relative">
            <button
              data-dropdown-toggle="top"
              onClick={() => setShowTopDropdown(!showTopDropdown)}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 p-1.5 pr-3 rounded-xl border border-gray-150 dark:border-zinc-800 transition"
            >
              <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                {customerProfile?.name ? customerProfile.name.slice(0, 2).toUpperCase() : "CU"}
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 hidden sm:inline">
                {customerProfile?.name || "গ্রাহক"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {showTopDropdown && (
              <div
                data-dropdown-menu="top"
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl p-2 shadow-xl z-50 space-y-1"
              >
                <button
                  onClick={() => {
                    setShowCustomerProfileModal(true);
                    setShowTopDropdown(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition"
                >
                  <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  প্রোফাইল দেখুন
                </button>
                <button
                  onClick={() => {
                    const isDark = document.documentElement.classList.contains("dark");
                    if (isDark) {
                      document.documentElement.classList.remove("dark");
                      localStorage.setItem("theme", "light");
                    } else {
                      document.documentElement.classList.add("dark");
                      localStorage.setItem("theme", "dark");
                    }
                    setShowTopDropdown(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition"
                >
                  <Sun className="h-4 w-4 text-amber-500" />
                  ডার্ক / লাইট মোড
                </button>
                <button
                  onClick={async () => {
                    const { signOut } = await import("firebase/auth");
                    const { auth } = await import("../lib/firebase");
                    await signOut(auth);
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                >
                  <LogOut className="h-4 w-4" />
                  লগআউট করুন
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Panel Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
        
        {/* TAB 1: CUSTOMER DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <header>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">আসসালামু আলাইকুম, {customerProfile?.name || "গ্রাহক"}!</h2>
              <p className="text-gray-500 dark:text-zinc-400 mt-1">আপনার ইন্টারনেট স্পিড প্যাক এবং সংযোগ স্থিতি দেখুন</p>
            </header>

            {/* Connection Profile Status Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Package Card */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 dark:text-zinc-400 font-semibold text-sm">সক্রিয় ইন্টারনেট প্যাকেজ</span>
                  <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <Wifi className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-emerald-600">{broadbandPackage?.name || "Starter Pack"}</h3>
                  <p className="text-3xl font-extrabold mt-2">{broadbandPackage?.speed || "10 Mbps"}</p>
                  <p className="text-xs text-gray-400 mt-1">মাসিক সাবস্ক্রিপশন ফি: {broadbandPackage?.price || 500} ৳</p>
                </div>
              </div>

              {/* Status Card */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 dark:text-zinc-400 font-semibold text-sm">সংযোগ স্থিতি</span>
                  <span className={`p-2.5 rounded-xl ${
                    customerProfile?.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  }`}>
                    <Check className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-extrabold uppercase ${
                    customerProfile?.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {customerProfile?.status === "active" ? "সক্রিয় (Active)" : "মেয়াদোত্তীর্ণ (Expired)"}
                  </span>
                  <p className="text-xs text-gray-400 mt-3">ডিভাইস ONU MAC:</p>
                  <p className="text-xs font-mono text-gray-500 font-semibold mt-1">{customerProfile?.onuMac || "N/A"}</p>
                </div>
              </div>

              {/* Dues Card */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 dark:text-zinc-400 font-semibold text-sm">মোট বকেয়া পরিমাণ</span>
                  <span className={`p-2.5 rounded-xl ${
                    customerProfile?.dueAmount && customerProfile.dueAmount > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    <DollarSign className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className={`text-3xl font-extrabold ${
                    customerProfile?.dueAmount && customerProfile.dueAmount > 0 ? "text-red-600" : "text-emerald-600"
                  }`}>
                    {customerProfile?.dueAmount || 0} ৳
                  </h3>
                  {customerProfile?.promiseDate ? (
                    <p className="text-xs text-red-500 font-semibold mt-2">
                      বিল পরিশোধের ওয়াদাকৃত তারিখ: {customerProfile.promiseDate}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-2">কোনো বকেয়া বিল অনাদায়ী নেই</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: BILL PAYMENT INSTRUCTIONS & SUBMIT */}
        {activeTab === "pay" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Payment Method instructions */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-lg">বিকাশ / নগদ / রকেট মার্চেন্ট পেমেন্ট</h3>
              <p className="text-sm text-gray-500">
                নিচের যেকোনো মার্চেন্ট নাম্বারে আপনার বকেয়া পরিমাণ টাকা সেন্ডমানি বা পেমেন্ট করুন এবং ট্রানজেকশন আইডি (TrxID) ইনপুটে সাবমিট করুন।
              </p>

              {/* bKash instructions */}
              <div className="border border-red-200 bg-rose-50/30 dark:bg-red-950/20 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-rose-700">বিকাশ মার্চেন্ট নম্বর (পেমেন্ট)</h4>
                  <p className="text-base font-mono font-bold text-gray-700 dark:text-white mt-1">০১৭৮৮৯৯৮৮৭৭</p>
                </div>
                <button
                  onClick={() => handleCopy("01788998877", "bKash")}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy className="h-4 w-4" />
                  {copiedText === "bKash" ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Nagad instructions */}
              <div className="border border-orange-200 bg-orange-50/30 dark:bg-orange-950/20 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-orange-700">নগদ মার্চেন্ট নম্বর (পেমেন্ট)</h4>
                  <p className="text-base font-mono font-bold text-gray-700 dark:text-white mt-1">০১৮৯৯৮৮৯৯৮৮</p>
                </div>
                <button
                  onClick={() => handleCopy("01899889988", "Nagad")}
                  className="bg-orange-100 hover:bg-orange-200 text-orange-700 p-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy className="h-4 w-4" />
                  {copiedText === "Nagad" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Payment Submit Form */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4">পেমেন্ট সাবমিশন ফর্ম</h3>
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">টাকার পরিমাণ (BDT)</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">আপনার মোট বকেয়া বিল: {customerProfile?.dueAmount || 0} ৳</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">পেমেন্ট মেথড</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm text-gray-800"
                  >
                    <option value="bkash">বিকাশ (bKash)</option>
                    <option value="nagad">নগদ (Nagad)</option>
                    <option value="rocket">রকেট (Rocket)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">লেনদেন ট্রানজেকশন আইডি (TrxID)</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: K8H99JF03"
                    value={paymentForm.trxId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, trxId: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm font-mono text-emerald-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">বিল প্রদানের মাস</label>
                  <input
                    type="month"
                    required
                    value={paymentForm.month}
                    onChange={(e) => setPaymentForm({ ...paymentForm, month: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm text-gray-850"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm"
                >
                  পেমেন্ট সাবমিট করুন
                </button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 3: INVOICE HISTORY */}
        {activeTab === "history" && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-lg">আমার মাসিক বিল ও ইনভয়েস হিস্ট্রি</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500">
                    <th className="py-3 px-4">ইনভয়েস আইডি</th>
                    <th className="py-3 px-4">মাস</th>
                    <th className="py-3 px-4">টাকার পরিমাণ</th>
                    <th className="py-3 px-4">স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-right">ডাউনলোড</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">কোনো ইনভয়েস হিস্ট্রি পাওয়া যায়নি।</td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-3 px-4 font-mono font-bold text-xs text-gray-500">{inv.id}</td>
                        <td className="py-3 px-4">{inv.month}</td>
                        <td className="py-3 px-4 font-bold">{inv.amount} ৳</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}>
                            {inv.status === "paid" ? "পরিশোধিত" : "বকেয়া"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handlePrintInvoice(inv)}
                            className="text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 hover:text-emerald-600 font-semibold py-1.5 px-3 rounded-lg inline-flex items-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5" /> প্রিন্ট ইনভয়েস
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SUPPORT TICKETS & REAL-TIME INTERACTION */}
        {activeTab === "support" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create Support ticket & view tickets */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-lg">নতুন সাপোর্ট টিকিট খুলুন</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">টিকিটের বিষয় / সমস্যা</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: ইন্টারনেট স্পিড পাচ্ছি না"
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm"
                >
                  টিকিট সাবমিট করুন
                </button>
              </form>

              <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 space-y-3">
                <h4 className="font-bold text-sm">আমার চলমান টিকিট সমূহ:</h4>
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      activeTicket?.id === t.id ? "bg-emerald-50/50 border-emerald-500" : "border-gray-50 dark:border-zinc-800 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs truncate block">{t.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.status === "open" ? "bg-red-50 text-red-600" : "bg-gray-100"}`}>
                        {t.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">টিকিট আইডি: {t.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Support Messages thread */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col h-[500px]">
              {activeTicket ? (
                <>
                  <header className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-base">{activeTicket.title}</h4>
                      <span className="text-xs text-gray-400">টিকিট আইডি: {activeTicket.id}</span>
                    </div>
                  </header>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {ticketMessages.map((m) => {
                      const isMe = m.senderId === currentUser.uid;
                      return (
                        <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-xl p-3 ${
                            isMe ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-950"
                          }`}>
                            <p className="text-xs font-bold mb-1 opacity-85">{m.senderName} ({m.senderRole})</p>
                            <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                            <span className="text-[9px] opacity-60 block text-right mt-1">
                              {m.timestamp ? m.timestamp.slice(11, 16) : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendTicketMessage} className="p-4 border-t border-gray-100 dark:border-zinc-800 flex gap-2">
                    <input
                      type="text"
                      placeholder="আপনার সমাধান বাংলায় লিখুন..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm dark:text-white"
                    />
                    <button type="submit" className="bg-emerald-600 text-white p-2.5 rounded-xl">
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-400">
                  <MessageSquare className="h-12 w-12 mb-2" />
                  <p className="text-sm">লাইভ চ্যাট করতে বা প্রতিনিধিকে উত্তর দিতে চলমান একটি টিকিট নির্বাচন করুন</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 5: ONU DEVICE CONTROLS */}
        {activeTab === "device" && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm max-w-xl mx-auto text-center space-y-6">
            <div className="mx-auto bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-full w-20 h-20 flex items-center justify-center text-emerald-600">
              <RefreshCw className={`h-10 w-10 ${rebooting ? "animate-spin" : ""}`} />
            </div>
            
            <header>
              <h3 className="font-bold text-xl">আপনার ONU ফাইবার রাউটার রিস্টার্ট করুন</h3>
              <p className="text-sm text-gray-500 mt-2">
                লাইন স্লো হলে বা ইন্টারনেট সাময়িক বন্ধ থাকলে সরাসরি কাস্টমার পোর্টাল থেকে আপনার ওএনইউ ডিভাইস রিস্টার্ট রিকোয়েস্ট পাঠাতে পারেন।
              </p>
            </header>

            {rebootStatus && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-sm font-semibold animate-pulse">
                {rebootStatus}
              </div>
            )}

            <button
              onClick={handleOnuRestart}
              disabled={rebooting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {rebooting ? "রিস্টার্ট হচ্ছে..." : "ONU রিস্টার্ট রিকোয়েস্ট পাঠান"}
            </button>
          </div>
        )}

      </main>
    </div>

      {/* Customer Profile Modal */}
      {showCustomerProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-gray-900 dark:text-white">
            <button
              onClick={() => setShowCustomerProfileModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-extrabold text-2xl mx-auto border-2 border-emerald-400 shadow-md">
                {customerProfile?.name ? customerProfile.name.slice(0, 2).toUpperCase() : "CU"}
              </div>
              <h3 className="font-bold text-xl mt-3 text-gray-900 dark:text-white">
                {customerProfile?.name || "গ্রাহক প্রোফাইল"}
              </h3>
              <div className="flex justify-center gap-2 mt-1.5">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  customerProfile?.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {customerProfile?.status === "active" ? "সক্রিয় সংযোগ" : "মেয়াদোত্তীর্ণ সংযোগ"}
                </span>
                <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-full text-[10px] font-bold uppercase">
                  আইডি: {customerProfile?.id || "N/A"}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-gray-100 dark:border-zinc-800 pt-4 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex justify-between items-center py-0.5">
                <span className="font-semibold text-gray-400">মোবাইল নম্বর:</span>
                <span className="font-bold text-gray-900 dark:text-white">{customerProfile?.phone || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="font-semibold text-gray-400">হোয়াটসঅ্যাপ নম্বর:</span>
                <span className="font-bold text-gray-900 dark:text-white">{customerProfile?.whatsapp || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="font-semibold text-gray-400">লগইন ইমেইল:</span>
                <span className="font-semibold text-gray-950 dark:text-zinc-100">{customerProfile?.email || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="font-semibold text-gray-400">জোন ও এরিয়া:</span>
                <span className="font-medium text-gray-900 dark:text-white">{customerProfile?.zone} ({customerProfile?.area})</span>
              </div>
              
              <div className="border-t border-dashed border-gray-100 dark:border-zinc-800 my-2 pt-2">
                <div className="bg-slate-50 dark:bg-zinc-850 p-2.5 rounded-xl space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">PPPoE User:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{customerProfile?.pppoeUser || "অনির্ধারিত"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">PPPoE Password:</span>
                    <span className="font-bold text-gray-950 dark:text-zinc-100">{customerProfile?.pppoePassword || "অনির্ধারিত"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="font-semibold text-gray-400">ইন্টারনেট প্যাকেজ:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{broadbandPackage?.name || "প্যাকেজ লোড হচ্ছে..."}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="font-bold text-gray-500 dark:text-zinc-400">মোট বকেয়া বিল:</span>
                <span className="font-extrabold text-red-600 dark:text-red-400">{customerProfile?.dueAmount || 0} ৳</span>
              </div>

              <div className="pt-1.5">
                <span className="block font-semibold text-gray-400 mb-1">কানেকশন ঠিকানা:</span>
                <span className="font-medium text-gray-900 dark:text-white block bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg leading-relaxed text-[11px]">
                  {customerProfile?.address || "কোনো ঠিকানা পাওয়া যায়নি।"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowCustomerProfileModal(false)}
              className="mt-6 w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-bold py-2.5 rounded-xl text-sm transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
