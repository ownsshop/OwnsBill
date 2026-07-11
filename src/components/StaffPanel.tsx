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
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, handleFirestoreError, OperationType, firebaseConfig } from "../lib/firebase";
import {
  UserProfile,
  Customer,
  Package,
  Payment,
  Deposit,
  SalaryRequest,
  Ticket,
  TicketMessage,
  Invoice,
  Zone,
  Area,
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
  Users,
  Layers,
  Calendar,
  Download,
  X,
  User,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Menu,
} from "lucide-react";
import { exportToCSV } from "../lib/csv";

interface StaffPanelProps {
  currentUser: any;
}

export default function StaffPanel({ currentUser }: StaffPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "customers" | "deposit" | "salary" | "tickets" | "billing" | "reports">("dashboard");

  // Collections States
  const [staffProfile, setStaffProfile] = useState<UserProfile | null>(null);
  const [showStaffProfileModal, setShowStaffProfileModal] = useState(false);
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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [salaryRequests, setSalaryRequests] = useState<SalaryRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Billing Filters for Staff Panel
  const [billFilterCustOrPhone, setBillFilterCustOrPhone] = useState("");
  const [billFilterZone, setBillFilterZone] = useState("");
  const [billFilterMonth, setBillFilterMonth] = useState("");
  const [billFilterStatus, setBillFilterStatus] = useState(""); // "" | "paid" | "unpaid"

  // Manual Invoice Form
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "",
    amount: 0,
    month: new Date().toISOString().slice(0, 7),
  });

  // Report Category State
  const [reportType, setReportType] = useState<"payments" | "invoices">("payments");

  // Batch Payment State
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [batchPayAmount, setBatchPayAmount] = useState<Record<string, number>>({});
  const [batchPayMonths, setBatchPayMonths] = useState<Record<string, string>>({});

  // Active Support Ticket Chat State
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState("");

  // Forms
  const [depositForm, setDepositForm] = useState({ amount: 0, method: "cash", trxId: "" });
  const [salaryForm, setSalaryForm] = useState({ amount: 0 });

  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [companySettings, setCompanySettings] = useState({
    companyName: "OwnsLink ব্রডব্যান্ড",
    logoUrl: "/logo.svg",
    smsApiKey: "",
  });

  // Customer Modal & Form States (for Staff Panel)
  const [customerModal, setCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custForm, setCustForm] = useState({
    id: "",
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    password: "",
    pppoeUser: "",
    pppoePassword: "",
    address: "",
    nid: "",
    zone: "",
    area: "",
    packageId: "",
    onuMac: "",
    status: "active" as "active" | "expired" | "locked",
    dueAmount: 0,
    promiseDate: "",
    lat: 23.8103,
    lng: 90.4125,
    staffId: "",
  });

  useEffect(() => {
    // 1. Fetch Staff Profile info
    const unsubProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setStaffProfile(docSnap.data() as UserProfile);
      }
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((doc) => list.push(doc.data() as UserProfile));
      setUsers(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "users"));

    // 2. Customers
    const unsubCustomers = onSnapshot(collection(db, "customers"), (snap) => {
      const list: Customer[] = [];
      snap.forEach((doc) => list.push(doc.data() as Customer));
      setCustomers(list);
    });

    // 3. Packages
    const unsubPkgs = onSnapshot(collection(db, "packages"), (snap) => {
      const list: Package[] = [];
      snap.forEach((doc) => list.push(doc.data() as Package));
      setPackages(list);
    });

    // 4. Payments
    const unsubPayments = onSnapshot(
      query(collection(db, "payments"), where("staffId", "==", currentUser.uid)),
      (snap) => {
        const list: Payment[] = [];
        snap.forEach((doc) => list.push(doc.data() as Payment));
        setPayments(list);
      }
    );

    // 5. Deposits
    const unsubDeposits = onSnapshot(
      query(collection(db, "deposits"), where("staffId", "==", currentUser.uid)),
      (snap) => {
        const list: Deposit[] = [];
        snap.forEach((doc) => list.push(doc.data() as Deposit));
        setDeposits(list);
      }
    );

    // 6. Salary Requests
    const unsubSalary = onSnapshot(
      query(collection(db, "salaryRequests"), where("staffId", "==", currentUser.uid)),
      (snap) => {
        const list: SalaryRequest[] = [];
        snap.forEach((doc) => list.push(doc.data() as SalaryRequest));
        setSalaryRequests(list);
      }
    );

    // 7. Support Tickets assigned to this staff
    const unsubTickets = onSnapshot(
      query(collection(db, "tickets"), where("assignedTo", "==", currentUser.uid)),
      (snap) => {
        const list: Ticket[] = [];
        snap.forEach((doc) => list.push(doc.data() as Ticket));
        setTickets(list);
      }
    );

    // 8. Invoices subscription
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
      const list: Invoice[] = [];
      snap.forEach((doc) => list.push(doc.data() as Invoice));
      setInvoices(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "invoices"));

    // 9. Zones subscription
    const unsubZones = onSnapshot(collection(db, "zones"), (snap) => {
      const list: Zone[] = [];
      snap.forEach((doc) => list.push(doc.data() as Zone));
      setZones(list);
    });

    // 10. Areas subscription
    const unsubAreas = onSnapshot(collection(db, "areas"), (snap) => {
      const list: Area[] = [];
      snap.forEach((doc) => list.push(doc.data() as Area));
      setAreas(list);
    });

    // 11. Load Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "company"), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings(docSnap.data() as any);
      }
    });

    return () => {
      unsubProfile();
      unsubUsers();
      unsubCustomers();
      unsubPkgs();
      unsubPayments();
      unsubDeposits();
      unsubSalary();
      unsubTickets();
      unsubInvoices();
      unsubZones();
      unsubAreas();
      unsubSettings();
    };
  }, [currentUser.uid]);

  // Load active ticket message thread on change
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

  // Filter Customers assigned to this staff
  const myCustomers = customers.filter((c) => c.staffId === currentUser.uid);

  // Financial calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const myCollectionsToday = payments
    .filter((p) => p.date === todayStr && p.status === "approved")
    .reduce((sum, curr) => sum + curr.amount, 0);

  const pendingDepositsSum = deposits
    .filter((d) => d.status === "pending")
    .reduce((sum, curr) => sum + curr.amount, 0);

  // Mark Customer Bill as Paid (Batch payment)
  const handleMarkAsPaid = async (cust: Customer) => {
    const amountToPay = batchPayAmount[cust.id] || cust.dueAmount;
    const billingMonth = batchPayMonths[cust.id] || new Date().toISOString().slice(0, 7);

    if (amountToPay <= 0) {
      alert("অনুগ্রহ করে সঠিক বিল এমাউন্ট ইনপুট দিন!");
      return;
    }

    try {
      const paymentId = `PAY-ST-${Date.now()}`;
      
      // 1. Write the payment document
      await setDoc(doc(db, "payments", paymentId), {
        id: paymentId,
        customerId: cust.id,
        staffId: currentUser.uid,
        amount: Number(amountToPay),
        month: billingMonth,
        method: "cash",
        status: "approved", // staff cash collected, approved immediately
        date: todayStr,
      });

      // 2. Subtract from customer's due amount
      const remainingDue = Math.max(0, cust.dueAmount - amountToPay);
      await updateDoc(doc(db, "customers", cust.id), { dueAmount: remainingDue });

      // 3. Add to staff's collected balance
      const currentStaffBalance = staffProfile?.balance || 0;
      await updateDoc(doc(db, "users", currentUser.uid), {
        balance: currentStaffBalance + Number(amountToPay),
      });

      // 4. Update the corresponding monthly invoice status if found
      const invoiceId = `INV-${cust.id}-${billingMonth}`;
      const invoiceRef = doc(db, "invoices", invoiceId);
      const invoiceSnap = await getDoc(invoiceRef);
      if (invoiceSnap.exists()) {
        await updateDoc(invoiceRef, { status: "paid" });
      }

      alert(`${cust.name} এর ${billingMonth} মাসের বিল সফলভাবে আদায় করা হয়েছে!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "payments");
    }
  };

  // Save or edit customer (Staff Panel)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let cid = editingCustomer ? editingCustomer.id : "";
      
      if (!cid) {
        // Registration / New Customer creation
        if (!custForm.email.trim() || !custForm.password) {
          alert("ইমেইল এবং পাসওয়ার্ড অবশ্যই প্রদান করতে হবে!");
          return;
        }

        try {
          const secAppName = `SecondaryApp-Staff-${Date.now()}`;
          const secApp = initializeApp(firebaseConfig, secAppName);
          const secAuth = getAuth(secApp);
          const userCred = await createUserWithEmailAndPassword(secAuth, custForm.email.trim(), custForm.password);
          cid = userCred.user.uid;
          await secAuth.signOut();
        } catch (authErr: any) {
          console.error("Firebase auth creation error (Staff):", authErr);
          let msg = "ফায়ারবেস অথেনটিকেশন নিবন্ধন ব্যর্থ হয়েছে: ";
          if (authErr.code === "auth/email-already-in-use") {
            msg += "এই ইমেইল এড্রেসটি ইতিমধ্যে ব্যবহৃত হচ্ছে!";
          } else if (authErr.code === "auth/weak-password") {
            msg += "পাসওয়ার্ড দুর্বল (কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন)!";
          } else if (authErr.code === "auth/invalid-email") {
            msg += "অকার্যকর ইমেইল এড্রেস!";
          } else {
            msg += authErr.message || "";
          }
          alert(msg);
          return;
        }
      }

      // Default the staffId to current staff user
      const payload: Customer = {
        ...custForm,
        id: cid,
        email: custForm.email.toLowerCase().trim(),
        dueAmount: Number(custForm.dueAmount),
        lat: Number(custForm.lat),
        lng: Number(custForm.lng),
        staffId: currentUser.uid, // Auto-assign to registering staff member!
      };

      // Set customer details in customers collection
      await setDoc(doc(db, "customers", cid), payload);

      // Create profile in users collection for authentication
      await setDoc(doc(db, "users", cid), {
        uid: cid,
        name: custForm.name,
        email: custForm.email.toLowerCase().trim(),
        phone: custForm.phone,
        role: "customer",
        zone: custForm.zone,
        area: custForm.area,
        balance: 0,
        createdAt: new Date().toISOString(),
      });

      alert(editingCustomer ? "গ্রাহক প্রোফাইল সফলভাবে আপডেট করা হয়েছে!" : "নতুন গ্রাহক সফলভাবে ফায়ারবেস ও ডাটাবেজে রেজিস্টার করা হয়েছে এবং আপনার অধীনে এসাইন করা হয়েছে!");
      setCustomerModal(false);
      setEditingCustomer(null);
      resetCustForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "customers");
    }
  };

  const resetCustForm = () => {
    setCustForm({
      id: "",
      name: "",
      phone: "",
      whatsapp: "",
      email: "",
      password: "",
      pppoeUser: "",
      pppoePassword: "",
      address: "",
      nid: "",
      zone: zones[0]?.name || "",
      area: areas[0]?.name || "",
      packageId: packages[0]?.id || "",
      onuMac: "",
      status: "active",
      dueAmount: 0,
      promiseDate: "",
      lat: 23.8103,
      lng: 90.4125,
      staffId: currentUser.uid,
    });
  };

  const handleEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setCustForm({
      ...cust,
      password: cust.password || "",
      whatsapp: cust.whatsapp || "",
      pppoeUser: cust.pppoeUser || "",
      pppoePassword: cust.pppoePassword || "",
    });
    setCustomerModal(true);
  };

  // Generate Manual Invoice
  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedCust = customers.find((c) => c.id === invoiceForm.customerId);
      if (!selectedCust) return;

      const invoiceId = `INV-MAN-${Date.now()}`;
      await setDoc(doc(db, "invoices", invoiceId), {
        id: invoiceId,
        customerId: invoiceForm.customerId,
        customerName: selectedCust.name,
        amount: Number(invoiceForm.amount),
        month: invoiceForm.month,
        status: "unpaid",
        createdAt: new Date().toISOString(),
      });

      // Increase customer due amount
      const currentDue = selectedCust.dueAmount || 0;
      await updateDoc(doc(db, "customers", selectedCust.id), {
        dueAmount: currentDue + Number(invoiceForm.amount),
      });

      alert("ম্যানুয়াল ইনভয়েস সফলভাবে জেনারেট করা হয়েছে!");
      setInvoiceModal(false);
      setInvoiceForm({ customerId: "", amount: 0, month: new Date().toISOString().slice(0, 7) });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "invoices");
    }
  };

  // Generate Auto/Bulk Invoices for All Active Customers
  const handleBulkGenerateInvoices = async () => {
    const monthInput = prompt(
      "কোন মাসের জন্য সব গ্রাহকের বিল ইনভয়েস জেনারেট করতে চান? (ফরম্যাট: YYYY-MM)",
      new Date().toISOString().slice(0, 7)
    );
    if (!monthInput) return;

    if (!/^\d{4}-\d{2}$/.test(monthInput)) {
      alert("ভুল ফরম্যাট! দয়া করে YYYY-MM ফরম্যাটে লিখুন (যেমন: 2026-07)");
      return;
    }

    if (!confirm(`আপনি কি নিশ্চিতভাবে ${monthInput} মাসের জন্য সব সক্রিয় গ্রাহকের অটো-বিলিং ইনভয়েস জেনারেট করতে চান?`)) {
      return;
    }

    try {
      let count = 0;
      const targetCustomers = customers.filter((c) => c.status !== "locked");

      for (const cust of targetCustomers) {
        const invoiceId = `INV-${cust.id}-${monthInput}`;
        const invoiceRef = doc(db, "invoices", invoiceId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (!invoiceSnap.exists()) {
          const pkg = packages.find((p) => p.id === cust.packageId);
          const amount = pkg ? pkg.price : 500;

          await setDoc(invoiceRef, {
            id: invoiceId,
            customerId: cust.id,
            customerName: cust.name,
            amount: amount,
            month: monthInput,
            status: "unpaid",
            createdAt: new Date().toISOString(),
          });

          const currentDue = cust.dueAmount || 0;
          await updateDoc(doc(db, "customers", cust.id), {
            dueAmount: currentDue + amount,
          });

          count++;
        }
      }

      alert(`সাফল্য! মোট ${count} জন গ্রাহকের জন্য ${monthInput} মাসের অটো-ইনভয়েস সফলভাবে জেনারেট করা হয়েছে।`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "invoices");
    }
  };

  // Submit Cash Deposit Request
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositForm.amount <= 0) {
      alert("ডিপোজিট এমাউন্ট অবশ্যই ০ এর বেশি হতে হবে!");
      return;
    }
    const currentStaffBalance = staffProfile?.balance || 0;
    if (depositForm.amount > currentStaffBalance) {
      alert("আপনার সংগৃহীত ব্যালেন্সের চেয়ে বেশি ডিপোজিট রিকোয়েস্ট করতে পারবেন না!");
      return;
    }

    try {
      const depId = `DEP-${Date.now()}`;
      await setDoc(doc(db, "deposits", depId), {
        id: depId,
        staffId: currentUser.uid,
        amount: Number(depositForm.amount),
        method: depositForm.method,
        trxId: depositForm.trxId || "N/A",
        status: "pending",
        date: todayStr,
      });

      setDepositForm({ amount: 0, method: "cash", trxId: "" });
      alert("ডিপোজিট রিকোয়েস্টটি সফলভাবে জমা দেওয়া হয়েছে! অ্যাডমিন অ্যাপ্রুভালের জন্য অপেক্ষা করুন।");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "deposits");
    }
  };

  // Submit Salary Request
  const handleRequestSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salaryForm.amount <= 0) {
      alert("অনুরোধকৃত বেতন অবশ্যই ০ এর বেশি হতে হবে!");
      return;
    }

    try {
      const salId = `SAL-REQ-${Date.now()}`;
      await setDoc(doc(db, "salaryRequests", salId), {
        id: salId,
        staffId: currentUser.uid,
        amount: Number(salaryForm.amount),
        status: "pending",
        date: todayStr,
      });

      setSalaryForm({ amount: 0 });
      alert("বেতন রিকোয়েস্টটি অ্যাডমিনের কাছে পাঠানো হয়েছে!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "salaryRequests");
    }
  };

  // Reply to assigned Support Ticket message thread
  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicket) return;

    try {
      const msgId = `TKT-MSG-${Date.now()}`;
      await setDoc(doc(db, "tickets", activeTicket.id, "messages", msgId), {
        id: msgId,
        senderId: currentUser.uid,
        senderName: staffProfile?.name || "স্টাফ",
        senderRole: "staff",
        message: replyMessage,
        timestamp: new Date().toISOString(),
      });
      setReplyMessage("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tickets/${activeTicket.id}/messages`);
    }
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
                স্টাফ প্যানেল
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "হোম ড্যাশবোর্ড", icon: TrendingUp },
              { id: "customers", label: "আমার গ্রাহক সমূহ", icon: Users },
              { id: "billing", label: "বিলিং সেন্টার", icon: FileText },
              { id: "deposit", label: "অফিসে টাকা জমা", icon: DollarSign },
              { id: "salary", label: "বেতন উইথড্র", icon: Calendar },
              { id: "tickets", label: "সাপোর্ট টিকিটস", icon: MessageSquare },
              { id: "reports", label: "রিপোর্ট সমূহ", icon: Layers },
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
                  setShowStaffProfileModal(true);
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
              {staffProfile?.name ? staffProfile.name.slice(0, 2).toUpperCase() : "ST"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate text-gray-800 dark:text-zinc-200">
                {staffProfile?.name || "মাঠকর্মী"}
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
                {staffProfile?.name ? staffProfile.name.slice(0, 2).toUpperCase() : "ST"}
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 hidden sm:inline">
                {staffProfile?.name || "মাঠকর্মী"}
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
                    setShowStaffProfileModal(true);
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
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <header>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">মাঠকর্মী ওভারভিউ</h2>
              <p className="text-gray-500 dark:text-zinc-400 mt-1">আজকের বিল কালেকশন এবং সংগৃহীত ক্যাশ হিসাব</p>
            </header>

            {/* Metric Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: "আমার সংগৃহীত ক্যাশ ব্যালেন্স", val: `${staffProfile?.balance || 0} ৳`, sub: "অফিসে জমাদানের অপেক্ষায়", icon: DollarSign, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
                { label: "আজকের মোট কালেকশন", val: `${myCollectionsToday} ৳`, sub: "আজকের সংগৃহীত বিল", icon: TrendingUp, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
                { label: "পেন্ডিং ডিপোজিট রিকোয়েস্ট", val: `${pendingDepositsSum} ৳`, sub: "অফিসে অনুমোদনাধীন", icon: AlertTriangle, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
              ].map((m, idx) => {
                const IconComp = m.icon;
                return (
                  <div key={idx} className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-zinc-400 font-semibold text-sm">{m.label}</span>
                      <span className={`p-3 rounded-xl ${m.color}`}>
                        <IconComp className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-bold">{m.val}</h3>
                      <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MY CUSTOMERS & PAYMENT COLLECTION */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">আমার এলাকাভুক্ত গ্রাহক তালিকা</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1">আপনার জোনে ব্রডব্যান্ড বিল কালেকশন করুন</p>
              </div>
              <button
                onClick={() => {
                  resetCustForm();
                  setCustomerModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2 transition shadow-md hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                নতুন গ্রাহক নিবন্ধন করুন
              </button>
            </header>

            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500 bg-gray-50/50">
                      <th className="py-4 px-6">গ্রাহক নাম ও আইডি</th>
                      <th className="py-4 px-6">মোবাইল নম্বর</th>
                      <th className="py-4 px-6">এরিয়া ও ঠিকানা</th>
                      <th className="py-4 px-6">প্যাকেজ ও মাসিক স্পিড</th>
                      <th className="py-4 px-6">বকেয়া বিল পরিমাণ</th>
                      <th className="py-4 px-6">বিল মাস নির্বাচন</th>
                      <th className="py-4 px-6 text-right">বিল পরিশোধ রেকর্ড</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                    {myCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold">
                          আপনার অধীনে কোনো গ্রাহক এসাইন করা নেই!
                        </td>
                      </tr>
                    ) : (
                      myCustomers.map((cust) => {
                        const pkg = packages.find((p) => p.id === cust.packageId);
                        const selectedMonth = batchPayMonths[cust.id] || new Date().toISOString().slice(0, 7);
                        return (
                          <tr key={cust.id} className="hover:bg-gray-50/50">
                            <td className="py-4 px-6">
                              <div>
                                <h4 className="font-bold">{cust.name}</h4>
                                <span className="text-xs text-gray-400 block">{cust.id}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">{cust.phone}</td>
                            <td className="py-4 px-6 text-gray-500">
                              {cust.area} <br />
                              <span className="text-xs">{cust.address}</span>
                            </td>
                            <td className="py-4 px-6 font-semibold">
                              {pkg ? pkg.name : "N/A"}{" "}
                              <span className="text-xs text-emerald-600 block">{pkg ? `${pkg.price} ৳` : ""}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`font-extrabold ${cust.dueAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                {cust.dueAmount || 0} ৳
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setBatchPayMonths({ ...batchPayMonths, [cust.id]: e.target.value })}
                                className="border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 rounded p-1 text-xs"
                              />
                            </td>
                            <td className="py-4 px-6 text-right">
                              {cust.dueAmount > 0 ? (
                                <div className="flex justify-end gap-2 items-center">
                                  <input
                                    type="number"
                                    placeholder="বিল পরিমাণ"
                                    value={batchPayAmount[cust.id] ?? cust.dueAmount}
                                    onChange={(e) => setBatchPayAmount({ ...batchPayAmount, [cust.id]: Number(e.target.value) })}
                                    className="w-20 border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 rounded p-1 text-xs text-center"
                                  />
                                  <button
                                    onClick={() => handleMarkAsPaid(cust)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                                  >
                                    পেইড মার্ক করুন
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs bg-emerald-50 text-emerald-700 py-1 px-2.5 rounded-full font-bold">পরিশোধিত</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MONEY DEPOSIT (CASH DEP TO ADMIN) */}
        {activeTab === "deposit" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Deposit Form */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4">অফিসে সংগৃহীত ক্যাশ জমা দিন</h3>
              <form onSubmit={handleSubmitDeposit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">টাকার পরিমাণ (BDT)</label>
                  <input
                    type="number"
                    required
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">সর্বোচ্চ জমা দিতে পারবেন: {staffProfile?.balance || 0} ৳</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">জমাদানের মাধ্যম</label>
                  <select
                    value={depositForm.method}
                    onChange={(e) => setDepositForm({ ...depositForm, method: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm text-gray-850"
                  >
                    <option value="cash">অফিস ক্যাশ কাউন্টার</option>
                    <option value="bkash">বিকাশ (bKash)</option>
                    <option value="nagad">নগদ (Nagad)</option>
                  </select>
                </div>
                {depositForm.method !== "cash" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">ট্রানজেকশন আইডি (TrxID)</label>
                    <input
                      type="text"
                      value={depositForm.trxId}
                      onChange={(e) => setDepositForm({ ...depositForm, trxId: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm"
                >
                  ডিপোজিট সাবমিট করুন
                </button>
              </form>
            </div>

            {/* Deposit History */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4">আমার ডিপোজিট সাবমিশন হিস্ট্রি</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500">
                      <th className="py-3 px-4">ডিপোজিট আইডি</th>
                      <th className="py-3 px-4">পরিমাণ</th>
                      <th className="py-3 px-4">মেথড</th>
                      <th className="py-3 px-4">তারিখ</th>
                      <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                    {deposits.map((d) => (
                      <tr key={d.id}>
                        <td className="py-3 px-4 font-mono text-xs text-gray-500">{d.id}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">{d.amount} ৳</td>
                        <td className="py-3 px-4 uppercase text-xs font-semibold">{d.method}</td>
                        <td className="py-3 px-4 text-xs text-gray-400">{d.date}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            d.status === "approved" ? "bg-emerald-50 text-emerald-700" : d.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {d.status === "approved" ? "অনুমোদিত" : d.status === "rejected" ? "বাতিল" : "পেন্ডিং"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SALARY ACTIONS */}
        {activeTab === "salary" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Request Salary */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4">বেতন উইথড্র বা উত্তোলনের আবেদন</h3>
              <form onSubmit={handleRequestSalary} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">আবেদনকৃত টাকার পরিমাণ</label>
                  <input
                    type="number"
                    required
                    value={salaryForm.amount}
                    onChange={(e) => setSalaryForm({ ...salaryForm, amount: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">আপনার নির্ধারিত মাসিক বেতন: {staffProfile?.salary || 15000} ৳</p>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm"
                >
                  বেতন রিকোয়েস্ট সাবমিট করুন
                </button>
              </form>
            </div>

            {/* Salary Requests History */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4">আমার বেতন রিকোয়েস্ট হিস্ট্রি</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500">
                      <th className="py-3 px-4">রিকোয়েস্ট আইডি</th>
                      <th className="py-3 px-4">পরিমাণ</th>
                      <th className="py-3 px-4">তারিখ</th>
                      <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                    {salaryRequests.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 px-4 font-mono text-xs text-gray-500">{s.id}</td>
                        <td className="py-3 px-4 font-bold text-blue-600">{s.amount} ৳</td>
                        <td className="py-3 px-4 text-xs text-gray-400">{s.date}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            s.status === "approved" ? "bg-emerald-50 text-emerald-700" : s.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {s.status === "approved" ? "অনুমোদিত" : s.status === "rejected" ? "বাতিল" : "পেন্ডিং"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUPPORT TICKETS & CHAT REPLY */}
        {activeTab === "tickets" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Tickets list */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4">আমার দায়িত্বপ্রাপ্ত সাপোর্ট টিকিট সমূহ</h3>
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">আপনার জন্য কোনো সাপোর্ট টিকিট এসাইন করা নেই।</p>
                ) : (
                  tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTicket(t)}
                      className={`w-full text-left p-4 rounded-xl border transition ${
                        activeTicket?.id === t.id
                          ? "bg-emerald-50/50 border-emerald-500"
                          : "border-gray-100 dark:border-zinc-800 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm block truncate">{t.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === "open" ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600"
                        }`}>
                          {t.status === "open" ? "Open" : "Closed"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">টিকিট আইডি: {t.id}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Active Ticket Message board */}
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
                            <span className="text-[9px] opacity-60 block text-right mt-1">{m.timestamp.slice(11, 16)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendTicketReply} className="p-4 border-t border-gray-100 dark:border-zinc-800 flex gap-2">
                    <input
                      type="text"
                      placeholder="আপনার সমাধান বাংলায় লিখুন..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm"
                    />
                    <button type="submit" className="bg-emerald-600 text-white p-2.5 rounded-xl">
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-400">
                  <MessageSquare className="h-12 w-12 mb-2" />
                  <p className="text-sm">বার্তা দেখতে এবং সমাধান প্রদান করতে বামপাশের একটি টিকিট নির্বাচন করুন</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: BILLING CENTER */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">বিলিং সেন্টার</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1">
                  অটো ইনভয়েসিং স্ক্রিপ্ট এবং ম্যানুয়াল কাস্টম ইনভয়েস জেনারেশন
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleBulkGenerateInvoices}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2 transition"
                >
                  <FileText className="h-4 w-4" />
                  সব সক্রিয় গ্রাহকের অটো-বিল জেনারেট করুন
                </button>
                <button
                  onClick={() => setInvoiceModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2 transition"
                >
                  <Plus className="h-4 w-4" />
                  ম্যানুয়াল ইনভয়েস তৈরি করুন
                </button>
              </div>
            </header>

            {/* Invoices List */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-lg">ইনভয়েস তালিকা ও অনুসন্ধান</h3>
                  <p className="text-xs text-gray-500 mt-0.5">ফিল্টার অনুযায়ী ইনভয়েসসমূহ অনুসন্ধান করুন</p>
                </div>
                {/* Clear Filters Button */}
                {(billFilterCustOrPhone || billFilterZone || billFilterMonth || billFilterStatus) && (
                  <button
                    onClick={() => {
                      setBillFilterCustOrPhone("");
                      setBillFilterZone("");
                      setBillFilterMonth("");
                      setBillFilterStatus("");
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    সব ফিল্টার রিসেট করুন
                  </button>
                )}
              </div>

              {/* Filters Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-gray-50 dark:bg-zinc-850 p-4 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">কাস্টমার / মোবাইল</label>
                  <input
                    type="text"
                    placeholder="নাম বা মোবাইল নম্বর..."
                    value={billFilterCustOrPhone}
                    onChange={(e) => setBillFilterCustOrPhone(e.target.value)}
                    className="w-full text-xs border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">জোন (Zone)</label>
                  <select
                    value={billFilterZone}
                    onChange={(e) => setBillFilterZone(e.target.value)}
                    className="w-full text-xs border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="">সকল জোন</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">মাস (Month)</label>
                  <input
                    type="month"
                    value={billFilterMonth}
                    onChange={(e) => setBillFilterMonth(e.target.value)}
                    className="w-full text-xs border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">বিল স্ট্যাটাস (Due)</label>
                  <select
                    value={billFilterStatus}
                    onChange={(e) => setBillFilterStatus(e.target.value)}
                    className="w-full text-xs border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="">সকল বিল</option>
                    <option value="paid">পরিশোধিত</option>
                    <option value="unpaid">বকেয়া (Due)</option>
                  </select>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500">
                      <th className="py-3 px-4">ইনভয়েস আইডি</th>
                      <th className="py-3 px-4">গ্রাহক নাম ও বিবরণ</th>
                      <th className="py-3 px-4">বিল মাস</th>
                      <th className="py-3 px-4">টাকার পরিমাণ</th>
                      <th className="py-3 px-4">জেনারেট তারিখ</th>
                      <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                    {(() => {
                      const filteredList = invoices.filter((inv) => {
                        const cust = customers.find((c) => c.id === inv.customerId);
                        if (billFilterCustOrPhone) {
                          const search = billFilterCustOrPhone.toLowerCase().trim();
                          const nameMatch = inv.customerName?.toLowerCase().includes(search) || cust?.name?.toLowerCase().includes(search);
                          const phoneMatch = cust?.phone?.toLowerCase().includes(search);
                          if (!nameMatch && !phoneMatch) return false;
                        }
                        if (billFilterZone && cust?.zone !== billFilterZone) return false;
                        if (billFilterMonth && inv.month !== billFilterMonth) return false;
                        if (billFilterStatus && inv.status !== billFilterStatus) return false;
                        return true;
                      });

                      if (filteredList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400">ফিল্টার অনুযায়ী কোনো ইনভয়েস খুঁজে পাওয়া যায়নি</td>
                          </tr>
                        );
                      }

                      return filteredList.map((inv) => {
                        const cust = customers.find((c) => c.id === inv.customerId);
                        return (
                          <tr key={inv.id}>
                            <td className="py-3 px-4 font-mono font-bold text-xs text-gray-500">{inv.id}</td>
                            <td className="py-3 px-4">
                              <div className="font-semibold">{inv.customerName || inv.customerId}</div>
                              {cust && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  মোবাইল: {cust.phone} | জোন: {cust.zone} ({cust.area})
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold">{inv.month}</td>
                            <td className="py-3 px-4 font-bold text-slate-800 dark:text-zinc-200">{inv.amount} ৳</td>
                            <td className="py-3 px-4 text-xs text-gray-400">{inv.createdAt ? inv.createdAt.slice(0, 10) : "N/A"}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                              }`}>
                                {inv.status === "paid" ? "পরিশোধিত" : "বকেয়া"}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: REPORTS */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">রিপোর্ট সমূহ</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1">
                  বিল কালেকশন এবং মাসিক জেনারেটেড বিল ইনভয়েস রিপোর্ট রপ্তানি করুন
                </p>
              </div>
              <button
                onClick={() => {
                  if (reportType === "payments") {
                    exportToCSV(
                      payments,
                      [
                        { key: "id", label: "Transaction ID" },
                        { key: "customerId", label: "Customer ID" },
                        { key: "amount", label: "Amount Paid (BDT)" },
                        { key: "month", label: "Month" },
                        { key: "method", label: "Method" },
                        { key: "status", label: "Status" },
                        { key: "date", label: "Payment Date" },
                      ],
                      "Payments_Report"
                    );
                  } else if (reportType === "invoices") {
                    exportToCSV(
                      invoices,
                      [
                        { key: "id", label: "Invoice ID" },
                        { key: "customerName", label: "Customer Name" },
                        { key: "amount", label: "Billing Amount" },
                        { key: "month", label: "Billing Month" },
                        { key: "status", label: "Status" },
                        { key: "createdAt", label: "Created Date" },
                      ],
                      "Invoices_Report"
                    );
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2 transition"
              >
                <Download className="h-4 w-4" />
                CSV এক্সপোর্ট করুন
              </button>
            </header>

            {/* Filter Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">রিপোর্ট ক্যাটাগরি</label>
                <select
                  value={reportType}
                  onChange={(e: any) => setReportType(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm text-gray-800 dark:text-white"
                >
                  <option value="payments">বিল কালেকশন হিস্ট্রি</option>
                  <option value="invoices">মাসিক জেনারেটেড বিল ইনভয়েস</option>
                </select>
              </div>
            </div>

            {/* Data View */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 uppercase text-emerald-600">লাইভ ডেটা ভিউয়ার</h3>
              <div className="overflow-x-auto">
                {reportType === "payments" ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold text-gray-400">
                        <th className="py-2 px-3">লেনদেন আইডি</th>
                        <th className="py-2 px-3">গ্রাহক</th>
                        <th className="py-2 px-3">টাকা পরিমাণ</th>
                        <th className="py-2 px-3">পদ্ধতি</th>
                        <th className="py-2 px-3">বিল মাস</th>
                        <th className="py-2 px-3">তারিখ</th>
                        <th className="py-2 px-3">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-mono text-xs">{p.id}</td>
                          <td className="py-2 px-3 font-semibold">{p.customerId}</td>
                          <td className="py-2 px-3 font-bold text-emerald-600">{p.amount} ৳</td>
                          <td className="py-2 px-3 uppercase text-xs font-semibold">{p.method}</td>
                          <td className="py-2 px-3">{p.month}</td>
                          <td className="py-2 px-3 text-xs text-gray-400">{p.date}</td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold text-gray-400">
                        <th className="py-2 px-3">ইনভয়েস আইডি</th>
                        <th className="py-2 px-3">গ্রাহক আইডি</th>
                        <th className="py-2 px-3">টাকা পরিমাণ</th>
                        <th className="py-2 px-3">বিল মাস</th>
                        <th className="py-2 px-3">জেনারেট তারিখ</th>
                        <th className="py-2 px-3">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                      {invoices.map((i) => (
                        <tr key={i.id}>
                          <td className="py-2 px-3 font-mono text-xs">{i.id}</td>
                          <td className="py-2 px-3">{i.customerName || i.customerId}</td>
                          <td className="py-2 px-3 font-bold text-red-600">{i.amount} ৳</td>
                          <td className="py-2 px-3">{i.month}</td>
                          <td className="py-2 px-3 text-xs text-gray-400">{i.createdAt ? i.createdAt.slice(0, 10) : "N/A"}</td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${i.status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                              {i.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>

      {/* Manual Invoice Modal */}
      {invoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">ম্যানুয়াল ইনভয়েস জেনারেট করুন</h3>
              <button onClick={() => setInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateManualInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">গ্রাহক নির্বাচন করুন</label>
                <select
                  required
                  value={invoiceForm.customerId}
                  onChange={(e) => {
                    const cust = customers.find((c) => c.id === e.target.value);
                    const pkg = packages.find((p) => p.id === cust?.packageId);
                    setInvoiceForm({
                      ...invoiceForm,
                      customerId: e.target.value,
                      amount: pkg ? pkg.price : 0,
                    });
                  }}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white"
                >
                  <option value="">গ্রাহক সিলেক্ট করুন</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              {invoiceForm.customerId && (() => {
                const selectedCust = customers.find((c) => c.id === invoiceForm.customerId);
                const selectedPkg = selectedCust ? packages.find((p) => p.id === selectedCust.packageId) : null;
                const selectedStaff = selectedCust ? users.find((u) => u.uid === selectedCust.staffId) : null;
                return (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/30 rounded-xl p-3 text-xs space-y-1.5 text-gray-900 dark:text-white">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold">গ্রাহকের প্যাকেজ:</span>
                      <span className="font-bold text-gray-950 dark:text-zinc-100">
                        {selectedPkg ? `${selectedPkg.name} (${selectedPkg.speed} Mbps - ${selectedPkg.price} ৳)` : "অনির্ধারিত / পাওয়া যায়নি"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold">দায়িত্বপ্রাপ্ত স্টাফ:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {selectedStaff ? selectedStaff.name : (selectedCust?.staffId ? "লোড হচ্ছে..." : "অনির্ধারিত")}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">টাকার পরিমাণ</label>
                <input
                  type="number"
                  required
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 p-2 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">বিল পরিশোধের মাস</label>
                <input
                  type="month"
                  required
                  value={invoiceForm.month}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, month: e.target.value })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition"
              >
                ইনভয়েস সফলভাবে জেনারেট করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Modal (Create/Edit - Staff Panel) */}
      {customerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">{editingCustomer ? "গ্রাহক প্রোফাইল এডিট করুন" : "নতুন গ্রাহক নিবন্ধন ফরম"}</h3>
              <button onClick={() => setCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">গ্রাহকের নাম</label>
                  <input
                    type="text"
                    required
                    value={custForm.name}
                    onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    value={custForm.phone}
                    onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">WhatsApp নম্বর</label>
                  <input
                    type="tel"
                    placeholder="যেমন: 017XXXXXXXX"
                    value={custForm.whatsapp || ""}
                    onChange={(e) => setCustForm({ ...custForm, whatsapp: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">ইমেইল এড্রেস <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    required
                    value={custForm.email}
                    onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    লগইন পাসওয়ার্ড {editingCustomer ? "(পরিবর্তন করতে চাইলে লিখুন)" : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingCustomer}
                    placeholder={editingCustomer ? "পাসওয়ার্ড অপরিবর্তিত থাকবে" : "৬ অক্ষরের পাসওয়ার্ড দিন"}
                    minLength={6}
                    value={custForm.password}
                    onChange={(e) => setCustForm({ ...custForm, password: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">PPPoE User Name (রাউটার প্রোফাইল)</label>
                  <input
                    type="text"
                    placeholder="যেমন: pppoe_user_12"
                    value={custForm.pppoeUser || ""}
                    onChange={(e) => setCustForm({ ...custForm, pppoeUser: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">PPPoE Password (রাউটার পাসওয়ার্ড)</label>
                  <input
                    type="text"
                    placeholder="যেমন: router_pass_34"
                    value={custForm.pppoePassword || ""}
                    onChange={(e) => setCustForm({ ...custForm, pppoePassword: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">NID নম্বর</label>
                  <input
                    type="text"
                    value={custForm.nid}
                    onChange={(e) => setCustForm({ ...custForm, nid: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">জোন</label>
                  <select
                    value={custForm.zone}
                    onChange={(e) => setCustForm({ ...custForm, zone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">জোন নির্বাচন করুন</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">এরিয়া</label>
                  <select
                    value={custForm.area}
                    onChange={(e) => setCustForm({ ...custForm, area: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">এরিয়া নির্বাচন করুন</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">ব্রডব্যান্ড প্যাকেজ</label>
                  <select
                    value={custForm.packageId}
                    onChange={(e) => setCustForm({ ...custForm, packageId: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">প্যাকেজ নির্বাচন করুন</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.price} ৳)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">ONU MAC এড্রেস</label>
                  <input
                    type="text"
                    value={custForm.onuMac}
                    onChange={(e) => setCustForm({ ...custForm, onuMac: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg font-mono text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">শুরুতে বকেয়া পরিমাণ</label>
                  <input
                    type="number"
                    value={custForm.dueAmount}
                    onChange={(e) => setCustForm({ ...custForm, dueAmount: Number(e.target.value) })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">বিল প্রদানের প্রতিশ্রুত তারিখ (Promise Date)</label>
                  <input
                    type="date"
                    value={custForm.promiseDate}
                    onChange={(e) => setCustForm({ ...custForm, promiseDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">কানেকশন স্ট্যাটাস</label>
                  <select
                    value={custForm.status}
                    onChange={(e: any) => setCustForm({ ...custForm, status: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="expired">মেয়াদোত্তীর্ণ (Expired)</option>
                    <option value="locked">লকড (Locked)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">পূর্ণ ঠিকানা</label>
                <textarea
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition"
              >
                সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Staff Profile Modal */}
      {showStaffProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowStaffProfileModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-extrabold text-2xl mx-auto border-2 border-emerald-400 shadow-md">
                {staffProfile?.name ? staffProfile.name.slice(0, 2).toUpperCase() : "ST"}
              </div>
              <h3 className="font-bold text-xl mt-3 text-gray-900 dark:text-white">
                {staffProfile?.name || "মাঠকর্মী প্রোফাইল"}
              </h3>
              <span className="inline-block mt-1 px-3 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full text-xs font-bold">
                মাঠকর্মী (Field Staff)
              </span>
            </div>

            <div className="space-y-3 border-t border-gray-100 dark:border-zinc-800 pt-4 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-400 text-xs">ইমেইল এড্রেস:</span>
                <span className="font-medium text-gray-900 dark:text-white">{currentUser.email}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-400 text-xs">মোবাইল নম্বর:</span>
                <span className="font-medium text-gray-900 dark:text-white">{staffProfile?.phone || "অনির্ধারিত"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-400 text-xs">হোয়াটসঅ্যাপ নম্বর:</span>
                <span className="font-medium text-gray-900 dark:text-white">{staffProfile?.whatsapp || "অনির্ধারিত"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-400 text-xs">জাতীয় পরিচয়পত্র (NID):</span>
                <span className="font-medium text-gray-900 dark:text-white">{staffProfile?.nid || "অনির্ধারিত"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-400 text-xs">নির্ধারিত মাসিক বেতন:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{staffProfile?.salary || "0"} ৳</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-dashed border-gray-100 dark:border-zinc-800 pt-2">
                <span className="font-bold text-gray-500 dark:text-zinc-400 text-xs">বর্তমান ক্যাশ ব্যালেন্স:</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{staffProfile?.balance || "0"} ৳</span>
              </div>
              <div className="py-1">
                <span className="block font-semibold text-gray-400 text-xs mb-1">পূর্ণ ঠিকানা:</span>
                <span className="font-medium text-gray-900 dark:text-white block bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-xs leading-relaxed">
                  {staffProfile?.address || "কোনো ঠিকানা যুক্ত করা হয়নি।"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowStaffProfileModal(false)}
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
