import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
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
  Zone,
  Area,
  Expense,
  Invoice,
  LiveChatMessage,
  Ticket,
} from "../types";
import { exportToCSV } from "../lib/csv";
import { cloudFunctionCode } from "../lib/cloudFunctionCode";
import {
  Users,
  Wifi,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  MapPin,
  MessageSquare,
  Settings,
  Download,
  Phone,
  Layers,
  Calendar,
  Send,
  UserCheck,
  UserPlus,
  User,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Menu,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface AdminPanelProps {
  currentUser: any;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "customers" | "packages" | "billing" | "deposits" | "staff" | "chat" | "reports" | "settings"
  >("dashboard");

  // Collections States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [salaryRequests, setSalaryRequests] = useState<SalaryRequest[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Local Company Settings State
  const [companySettings, setCompanySettings] = useState({
    companyName: "OwnsLink ব্রডব্যান্ড",
    logoUrl: "/logo.svg",
    smsApiKey: "",
  });

  const adminProfile = users.find((u) => u.uid === currentUser?.uid || u.email === currentUser?.email);

  // Modal and Form States
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

  // Package Form States
  const [pkgModal, setPkgModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [pkgForm, setPkgForm] = useState({
    id: "",
    name: "",
    speed: "",
    price: 0,
    oltProfile: "",
  });

  // Manual Invoice Form
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "",
    amount: 0,
    month: new Date().toISOString().slice(0, 7),
  });

  // Zone/Area Form States
  const [newZoneName, setNewZoneName] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");

  // Staff Form
  const [staffModal, setStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    uid: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    whatsapp: "",
    nid: "",
    address: "",
    salary: 15000,
    role: "staff" as "staff" | "admin",
  });

  // Live Chat Message Input
  const [newMessage, setNewMessage] = useState("");

  // Reports Date Range Filters
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportType, setReportType] = useState<"payments" | "expenses" | "invoices">("payments");

  // Filters for Billing & Customers
  const [filterZone, setFilterZone] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [overdueMonthsFilter, setOverdueMonthsFilter] = useState(false); // 2+ Months Due

  // Dedicated Billing Filters
  const [billFilterCustOrPhone, setBillFilterCustOrPhone] = useState("");
  const [billFilterZone, setBillFilterZone] = useState("");
  const [billFilterStaff, setBillFilterStaff] = useState("");
  const [billFilterMonth, setBillFilterMonth] = useState("");
  const [billFilterStatus, setBillFilterStatus] = useState(""); // "" | "paid" | "unpaid"

  // CSV Import State
  const [csvImportText, setCsvImportText] = useState("");
  const [csvImportModal, setCsvImportModal] = useState(false);
  const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
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

  // Load Realtime Data
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((doc) => list.push(doc.data() as UserProfile));
      setUsers(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "users"));

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snap) => {
      const list: Customer[] = [];
      snap.forEach((doc) => list.push(doc.data() as Customer));
      setCustomers(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "customers"));

    const unsubPkgs = onSnapshot(collection(db, "packages"), (snap) => {
      const list: Package[] = [];
      snap.forEach((doc) => list.push(doc.data() as Package));
      setPackages(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "packages"));

    const unsubPayments = onSnapshot(collection(db, "payments"), (snap) => {
      const list: Payment[] = [];
      snap.forEach((doc) => list.push(doc.data() as Payment));
      setPayments(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "payments"));

    const unsubDeposits = onSnapshot(collection(db, "deposits"), (snap) => {
      const list: Deposit[] = [];
      snap.forEach((doc) => list.push(doc.data() as Deposit));
      setDeposits(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "deposits"));

    const unsubSalary = onSnapshot(collection(db, "salaryRequests"), (snap) => {
      const list: SalaryRequest[] = [];
      snap.forEach((doc) => list.push(doc.data() as SalaryRequest));
      setSalaryRequests(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "salaryRequests"));

    const unsubZones = onSnapshot(collection(db, "zones"), (snap) => {
      const list: Zone[] = [];
      snap.forEach((doc) => list.push(doc.data() as Zone));
      setZones(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "zones"));

    const unsubAreas = onSnapshot(collection(db, "areas"), (snap) => {
      const list: Area[] = [];
      snap.forEach((doc) => list.push(doc.data() as Area));
      setAreas(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "areas"));

    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snap) => {
      const list: Expense[] = [];
      snap.forEach((doc) => list.push(doc.data() as Expense));
      setExpenses(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "expenses"));

    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
      const list: Invoice[] = [];
      snap.forEach((doc) => list.push(doc.data() as Invoice));
      setInvoices(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "invoices"));

    const unsubChat = onSnapshot(
      query(collection(db, "communityChat"), orderBy("timestamp", "asc")),
      (snap) => {
        const list: LiveChatMessage[] = [];
        snap.forEach((doc) => list.push(doc.data() as LiveChatMessage));
        setChatMessages(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "communityChat")
    );

    // Load Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "company"), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings(docSnap.data() as any);
      }
    });

    return () => {
      unsubUsers();
      unsubCustomers();
      unsubPkgs();
      unsubPayments();
      unsubDeposits();
      unsubSalary();
      unsubZones();
      unsubAreas();
      unsubExpenses();
      unsubInvoices();
      unsubChat();
      unsubSettings();
    };
  }, []);

  // WhatsApp Alert Link Helper
  const getWhatsAppLink = (phone: string, customerName: string, date: string) => {
    const company = companySettings.companyName || "OwnsBill";
    const text = encodeURIComponent(
      `প্রিয় ${customerName}, ${company} ইন্টারনেট সার্ভিসের আপনার বিল পরিশোধের প্রতিশ্রুতি তারিখ ছিল ${date}। অনুগ্রহ করে দ্রুত বিল পরিশোধ করুন। ধন্যবাদ।`
    );
    return `https://wa.me/88${phone}?text=${text}`;
  };

  // Promise Date Alert Checker (Alarm 1 day before promise date)
  const isPromiseDateNear = (promiseDateStr: string | undefined) => {
    if (!promiseDateStr) return false;
    try {
      const promiseDate = new Date(promiseDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      promiseDate.setHours(0, 0, 0, 0);

      const diffTime = promiseDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Trigger alarm if exactly 1 day before, today, or past due
      return diffDays <= 1;
    } catch {
      return false;
    }
  };

  const overduePromiseCustomers = customers.filter(
    (c) => c.dueAmount > 0 && c.promiseDate && isPromiseDateNear(c.promiseDate)
  );

  // Financial Calculations for Dashboard
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalCollectionsToday = payments
    .filter((p) => p.status === "approved" && p.date === todayStr)
    .reduce((sum, curr) => sum + curr.amount, 0);

  const totalOutstandingDues = customers.reduce((sum, curr) => sum + (curr.dueAmount || 0), 0);
  const activeCustomersCount = customers.filter((c) => c.status === "active").length;
  const expiredCustomersCount = customers.filter((c) => c.status === "expired").length;

  // Chart Data: Monthly Collection (Recharts)
  const getMonthlyCollectionData = () => {
    const monthlyMap: Record<string, number> = {};
    payments
      .filter((p) => p.status === "approved")
      .forEach((p) => {
        const m = p.month; // e.g. "2026-07"
        monthlyMap[m] = (monthlyMap[m] || 0) + p.amount;
      });
    return Object.keys(monthlyMap)
      .sort()
      .map((k) => ({
        মাস: k,
        টাকা: monthlyMap[k],
      }));
  };

  // Chart Data: Paid vs Unpaid Invoices
  const getPaidUnpaidData = () => {
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    const unpaidCount = invoices.filter((i) => i.status === "unpaid").length;
    return [
      { name: "পরিশোধিত (Paid)", value: paidCount || 1, color: "#10B981" },
      { name: "বকেয়া (Unpaid)", value: unpaidCount || 1, color: "#EF4444" },
    ];
  };

  // CRUD handlers - Customers
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
          const secAppName = `SecondaryApp-${Date.now()}`;
          const secApp = initializeApp(firebaseConfig, secAppName);
          const secAuth = getAuth(secApp);
          const userCred = await createUserWithEmailAndPassword(secAuth, custForm.email.trim(), custForm.password);
          cid = userCred.user.uid;
          await secAuth.signOut();
        } catch (authErr: any) {
          console.error("Firebase auth creation error:", authErr);
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

      const payload: Customer = {
        ...custForm,
        id: cid,
        email: custForm.email.toLowerCase().trim(),
        dueAmount: Number(custForm.dueAmount),
        lat: Number(custForm.lat),
        lng: Number(custForm.lng),
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

      alert(editingCustomer ? "গ্রাহক প্রোফাইল সফলভাবে আপডেট করা হয়েছে!" : "নতুন গ্রাহক সফলভাবে ফায়ারবেস ও ডাটাবেজে রেজিস্টার করা হয়েছে!");
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
      staffId: "",
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

  const handleDeleteCustomer = async (id: string) => {
    if (confirm("আপনি কি নিশ্চিতভাবে এই গ্রাহককে ডিলিট করতে চান?")) {
      try {
        await deleteDoc(doc(db, "customers", id));
        await deleteDoc(doc(db, "users", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
      }
    }
  };

  // CRUD - Packages
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pid = editingPkg ? editingPkg.id : "PKG-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      const payload: Package = {
        ...pkgForm,
        id: pid,
        price: Number(pkgForm.price),
      };
      await setDoc(doc(db, "packages", pid), payload);
      setPkgModal(false);
      setEditingPkg(null);
      setPkgForm({ id: "", name: "", speed: "", price: 0, oltProfile: "" });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "packages");
    }
  };

  // CSV Import Parser
  const handleCSVImport = async () => {
    try {
      if (!csvImportText.trim()) return;
      const lines = csvImportText.split("\n");
      // Format: Name, Phone, Email, Address, NID, MAC, Zone, Area, PackageID, Balance/Due
      let imported = 0;
      for (const line of lines) {
        const cols = line.split(",").map((c) => c.trim());
        if (cols.length >= 2 && cols[0] && cols[1]) {
          const cid = "CUST-IMP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
          const customerObj: Customer = {
            id: cid,
            name: cols[0],
            phone: cols[1],
            email: cols[2] || `${cid.toLowerCase()}@owns.com`,
            address: cols[3] || "টুলস ইম্পোর্ট",
            nid: cols[4] || "N/A",
            onuMac: cols[5] || "MAC-00:00:00:00",
            zone: cols[6] || zones[0]?.name || "মিরপুর জোন",
            area: cols[7] || areas[0]?.name || "মিরপুর-১০",
            packageId: cols[8] || packages[0]?.id || "pkg-1",
            status: "active",
            dueAmount: Number(cols[9]) || 0,
            promiseDate: "",
          };
          await setDoc(doc(db, "customers", cid), customerObj);
          await setDoc(doc(db, "users", cid), {
            uid: cid,
            name: customerObj.name,
            email: customerObj.email,
            phone: customerObj.phone,
            role: "customer",
            createdAt: new Date().toISOString(),
          });

          // Also generate a pending invoice (former bill) if dueAmount is greater than 0
          if (customerObj.dueAmount > 0) {
            const invoiceId = "INV-IMP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
            await setDoc(doc(db, "invoices", invoiceId), {
              id: invoiceId,
              customerId: cid,
              customerName: customerObj.name,
              amount: customerObj.dueAmount,
              month: new Date().toISOString().slice(0, 7), // Use current month YYYY-MM
              status: "unpaid",
              createdAt: new Date().toISOString(),
            });
          }

          imported++;
        }
      }
      alert(`সফলভাবে ${imported} জন গ্রাহক ডাটা ও সাবেক বকেয়া বিল ইম্পোর্ট করা হয়েছে!`);
      setCsvImportText("");
      setCsvImportModal(false);
    } catch (err) {
      alert("ইম্পোর্ট ব্যর্থ হয়েছে, অনুগ্রহ করে ফরম্যাট চেক করুন।");
    }
  };

  // Deposit Approvals handler (Cash deposited by Staff to Admin)
  const handleDepositStatus = async (deposit: Deposit, newStatus: "approved" | "rejected") => {
    try {
      // 1. Update deposit status
      await updateDoc(doc(db, "deposits", deposit.id), { status: newStatus });

      // 2. If approved, update staff's collected balance
      if (newStatus === "approved") {
        const staffRef = doc(db, "users", deposit.staffId);
        const staffSnap = await getDoc(staffRef);
        if (staffSnap.exists()) {
          const staffData = staffSnap.data() as UserProfile;
          const currentBalance = staffData.balance || 0;
          // Subtract the approved deposited cash from staff's local collected balance
          const newBalance = Math.max(0, currentBalance - deposit.amount);
          await updateDoc(staffRef, { balance: newBalance });
        }
      }
      alert(`ডিপোজিট রিকোয়েস্টটি সফলভাবে ${newStatus === "approved" ? "অনুমোদন" : "বাতিল"} করা হয়েছে!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `deposits/${deposit.id}`);
    }
  };

  // Salary Approval handler
  const handleSalaryStatus = async (request: SalaryRequest, newStatus: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "salaryRequests", request.id), { status: newStatus });
      alert(`বেতন রিকোয়েস্টটি সফলভাবে ${newStatus === "approved" ? "অনুমোদন" : "বাতিল"} করা হয়েছে!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `salaryRequests/${request.id}`);
    }
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

  // Generate Auto/Bulk Invoices for All Active Customers for a month
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

    if (!confirm(`আপনি কি নিশ্চিতভাবে ${monthInput} মাসের জন্য সকল সক্রিয় গ্রাহকের অটো-বিলিং ইনভয়েস জেনারেট করতে চান?`)) {
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

  // Manage Zones and Areas
  const handleAddZone = async () => {
    if (!newZoneName.trim()) return;
    try {
      const zid = "zone-" + Math.random().toString(36).substr(2, 5);
      await setDoc(doc(db, "zones", zid), { id: zid, name: newZoneName });
      setNewZoneName("");
      alert("নতুন জোন সফলভাবে যুক্ত হয়েছে!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "zones");
    }
  };

  const handleAddArea = async () => {
    if (!newAreaName.trim() || !selectedZoneId) {
      alert("অনুগ্রহ করে এরিয়া নাম এবং জোন সিলেক্ট করুন!");
      return;
    }
    try {
      const aid = "area-" + Math.random().toString(36).substr(2, 5);
      await setDoc(doc(db, "areas", aid), { id: aid, name: newAreaName, zoneId: selectedZoneId });
      setNewAreaName("");
      alert("নতুন এরিয়া সফলভাবে যুক্ত হয়েছে!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "areas");
    }
  };

  // Delete Zone
  const handleDeleteZone = async (id: string) => {
    if (confirm("আপনি কি নিশ্চিতভাবে এই জোনটি ডিলিট করতে চান?")) {
      await deleteDoc(doc(db, "zones", id));
    }
  };

  // Delete Area
  const handleDeleteArea = async (id: string) => {
    if (confirm("আপনি কি নিশ্চিতভাবে এই এরিয়াটি ডিলিট করতে চান?")) {
      await deleteDoc(doc(db, "areas", id));
    }
  };

  // Save Settings
  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "company"), companySettings);
      alert("কোম্পানি সেটিংস সফলভাবে আপডেট করা হয়েছে!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/company");
    }
  };

  // Save Staff Profiles
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let sid = staffForm.uid;

      if (!sid) {
        // Registration / New Staff creation
        if (!staffForm.email.trim() || !staffForm.password) {
          alert("ইমেইল এবং পাসওয়ার্ড অবশ্যই প্রদান করতে হবে!");
          return;
        }

        try {
          const secAppName = `SecondaryApp-Staff-${Date.now()}`;
          const secApp = initializeApp(firebaseConfig, secAppName);
          const secAuth = getAuth(secApp);
          const userCred = await createUserWithEmailAndPassword(secAuth, staffForm.email.trim(), staffForm.password);
          sid = userCred.user.uid;
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

      let existingBalance = 0;
      let existingCreatedAt = new Date().toISOString();
      if (staffForm.uid) {
        try {
          const userSnap = await getDoc(doc(db, "users", sid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            existingBalance = data.balance ?? 0;
            existingCreatedAt = data.createdAt ?? existingCreatedAt;
          }
        } catch (e) {
          console.error("Error fetching existing user:", e);
        }
      }

      await setDoc(doc(db, "users", sid), {
        uid: sid,
        name: staffForm.name,
        email: staffForm.email.toLowerCase().trim(),
        phone: staffForm.phone,
        whatsapp: staffForm.whatsapp || "",
        nid: staffForm.nid || "",
        address: staffForm.address || "",
        role: staffForm.role,
        salary: Number(staffForm.salary),
        balance: existingBalance,
        createdAt: existingCreatedAt,
      });
      setStaffModal(false);
      setStaffForm({ uid: "", name: "", email: "", password: "", phone: "", whatsapp: "", nid: "", address: "", salary: 15000, role: "staff" });
      alert(staffForm.uid ? "স্টাফ প্রোফাইল সফলভাবে আপডেট করা হয়েছে!" : "নতুন স্টাফ সফলভাবে ফায়ারবেস অথেনটিকেশন ও ডাটাবেজে রেজিস্টার করা হয়েছে!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "users");
    }
  };

  // Live Chat send message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const msgId = "MSG-" + Date.now();
      await setDoc(doc(db, "communityChat", msgId), {
        id: msgId,
        senderId: currentUser.uid,
        senderName: currentUser.email?.split("@")[0] || "অ্যাডমিন",
        senderRole: "admin",
        message: newMessage,
        timestamp: new Date().toISOString(),
      });
      setNewMessage("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "communityChat");
    }
  };

  // Filter Customers based on state selectors
  const filteredCustomers = customers.filter((c) => {
    if (filterZone && c.zone !== filterZone) return false;
    if (filterArea && c.area !== filterArea) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterStaff && c.staffId !== filterStaff) return false;
    if (overdueMonthsFilter && c.dueAmount < 1000) return false; // Simple rule for overdue (dues exceeding 1000 BDT)
    return true;
  });

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
                অ্যাডমিন প্যানেল
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "ড্যাশবোর্ড", icon: TrendingUp },
              { id: "customers", label: "গ্রাহক ব্যবস্থাপনা", icon: Users },
              { id: "packages", label: "প্যাকেজ সেটিংস", icon: Wifi },
              { id: "billing", label: "বিলিং সেন্টার", icon: DollarSign },
              { id: "deposits", label: "ডিপোজিট অ্যাপ্রুভাল", icon: UserCheck },
              { id: "staff", label: "স্টাফ ও বেতন", icon: Layers },
              { id: "chat", label: "হেল্পলাইন চ্যাট", icon: MessageSquare },
              { id: "reports", label: "রিপোর্ট সমূহ", icon: FileText },
              { id: "settings", label: "কনফিগারেশন", icon: Settings },
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
                  setShowAdminProfileModal(true);
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
              {adminProfile?.name ? adminProfile.name.slice(0, 2).toUpperCase() : "AD"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate text-gray-800 dark:text-zinc-200">
                {adminProfile?.name || "অ্যাডমিন প্রোফাইল"}
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
        {/* Top Header */}
        <header className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 py-3 flex justify-between items-center shrink-0 z-30">
          <div />

          <div className="relative">
            <button
              data-dropdown-toggle="top"
              onClick={() => setShowTopDropdown(!showTopDropdown)}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 p-1.5 pr-3 rounded-xl border border-gray-150 dark:border-zinc-800 transition"
            >
              <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                {adminProfile?.name ? adminProfile.name.slice(0, 2).toUpperCase() : "AD"}
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 hidden sm:inline">
                {adminProfile?.name || "অ্যাডমিন"}
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
                    setShowAdminProfileModal(true);
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

        {/* Main Panel Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
        
        {/* Alerts: Promise Date Reminder Alarm */}
        {overduePromiseCustomers.length > 0 && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-5 dark:bg-red-950/20 dark:border-red-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-800 dark:text-red-400">
                  ওয়াদাকৃত বিল পরিশোধের রিমাইন্ডার অ্যালার্ট!
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  আজ অথবা আগামীকাল বিল পরিশোধের ওয়াদা করেছেন এমন {overduePromiseCustomers.length} জন গ্রাহক বকেয়া বিল পরিশোধ করেননি। অনুগ্রহ করে যোগাযোগ করুন।
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab("customers");
                  setFilterStatus("");
                  setFilterZone("");
                  setOverdueMonthsFilter(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-2"
              >
                গ্রাহক তালিকা দেখুন
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: SMART DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <header>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">ড্যাশবোর্ড ওভারভিউ</h2>
              <p className="text-gray-500 dark:text-zinc-400 mt-1">
                আজকের ISP অপারেশন এবং লাইভ বিলিং পরিসংখ্যান
              </p>
            </header>

            {/* Metric Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "সক্রিয় গ্রাহক", val: activeCustomersCount, sub: "অনলাইন কানেকশন", icon: Wifi, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
                { label: "আজকের কালেকশন", val: `${totalCollectionsToday} ৳`, sub: "ক্যাশ + অনলাইন গেটওয়ে", icon: DollarSign, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
                { label: "মোট বকেয়া পরিমাণ", val: `${totalOutstandingDues} ৳`, sub: "গ্রাহকদের অনাদায়ী বিল", icon: AlertTriangle, color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
                { label: "মেয়াদোত্তীর্ণ গ্রাহক", val: expiredCustomersCount, sub: "সাময়িক বন্ধ কানেকশন", icon: Users, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Earnings Chart */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4">মাসিক বিল কালেকশন পরিসংখ্যান</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getMonthlyCollectionData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="মাস" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="টাকা" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Paid vs Unpaid Pie Chart */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4">চলতি মাসের ইনভয়েস স্ট্যাটাস (পরিশোধিত বনাম বকেয়া)</h3>
                <div className="h-80 w-full flex flex-col justify-between">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getPaidUnpaidData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getPaidUnpaidData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Promise alarm detailed alert list */}
            {overduePromiseCustomers.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  ওয়াদা ভঙ্গকারী / আজকালের মধ্যে ওয়াদাকারী গ্রাহক তালিকা ({overduePromiseCustomers.length} জন)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500">
                        <th className="py-3 px-4">গ্রাহক নাম</th>
                        <th className="py-3 px-4">মোবাইল</th>
                        <th className="py-3 px-4">জোন ও এরিয়া</th>
                        <th className="py-3 px-4">বকেয়া</th>
                        <th className="py-3 px-4">প্রতিশ্রুত তারিখ</th>
                        <th className="py-3 px-4 text-center">যোগাযোগ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                      {overduePromiseCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                          <td className="py-3 px-4 font-semibold">{c.name}</td>
                          <td className="py-3 px-4">{c.phone}</td>
                          <td className="py-3 px-4 text-gray-500">{c.zone} - {c.area}</td>
                          <td className="py-3 px-4 text-red-600 font-bold">{c.dueAmount} ৳</td>
                          <td className="py-3 px-4 text-red-500 font-bold">{c.promiseDate}</td>
                          <td className="py-3 px-4 text-center">
                            <a
                              href={getWhatsAppLink(c.phone, c.name, c.promiseDate || "")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs"
                            >
                              <Phone className="h-3 w-3" />
                              WhatsApp পাঠান
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CUSTOMERS MANAGEMENT */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">গ্রাহক ব্যবস্থাপনা</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1">সব কাস্টমার প্রোফাইল, কানেকশন এবং বকেয়া কন্ট্রোল প্যানেল</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    resetCustForm();
                    setEditingCustomer(null);
                    setCustomerModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  নতুন গ্রাহক যুক্ত করুন
                </button>
                <button
                  onClick={() => setCsvImportModal(true)}
                  className="bg-zinc-800 dark:bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  CSV ইম্পোর্ট করুন
                </button>
              </div>
            </header>

            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-4 rounded-2xl">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">জোন ফিল্টার</label>
                <select
                  value={filterZone}
                  onChange={(e) => setFilterZone(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-sm text-gray-800 dark:text-white"
                >
                  <option value="">সব জোন</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">এরিয়া ফিল্টার</label>
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-sm text-gray-800 dark:text-white"
                >
                  <option value="">সব এরিয়া</option>
                  {areas
                    .filter((a) => !filterZone || zones.find((z) => z.name === filterZone)?.id === a.zoneId)
                    .map((a) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">স্ট্যাটাস ফিল্টার</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-sm text-gray-800 dark:text-white"
                >
                  <option value="">সব স্ট্যাটাস</option>
                  <option value="active">সক্রিয় (Active)</option>
                  <option value="expired">মেয়াদোত্তীর্ণ (Expired)</option>
                  <option value="locked">লকড (Locked)</option>
                </select>
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overdueMonthsFilter}
                    onChange={(e) => setOverdueMonthsFilter(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-sm font-semibold">২/৩ মাসের বেশি বকেয়া</span>
                </label>
              </div>
            </div>

            {/* Customers Data Table */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500 bg-gray-50/50 dark:bg-zinc-800/20">
                      <th className="py-4 px-6">নাম ও আইডি</th>
                      <th className="py-4 px-6">মোবাইল</th>
                      <th className="py-4 px-6">জোন/এরিয়া</th>
                      <th className="py-4 px-6">প্যাকেজ</th>
                      <th className="py-4 px-6">ONU MAC</th>
                      <th className="py-4 px-6">বকেয়া পরিমাণ</th>
                      <th className="py-4 px-6 text-center">স্ট্যাটাস</th>
                      <th className="py-4 px-6 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                          কোনো গ্রাহক প্রোফাইল পাওয়া যায়নি!
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => {
                        const pkg = packages.find((p) => p.id === c.packageId);
                        return (
                          <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                            <td className="py-4 px-6">
                              <div>
                                <h4 className="font-bold">{c.name}</h4>
                                <span className="text-xs text-gray-400 block mt-0.5">{c.id}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">{c.phone}</td>
                            <td className="py-4 px-6 text-gray-500">
                              {c.zone} <br />
                              <span className="text-xs">{c.area}</span>
                            </td>
                            <td className="py-4 px-6 font-semibold">
                              {pkg ? pkg.name : "N/A"}{" "}
                              <span className="text-xs text-gray-400 block">{pkg ? `${pkg.price} ৳` : ""}</span>
                            </td>
                            <td className="py-4 px-6 font-mono text-xs">{c.onuMac || "N/A"}</td>
                            <td className="py-4 px-6">
                              <span className={`font-bold ${c.dueAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                {c.dueAmount || 0} ৳
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                                  c.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : c.status === "expired"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                    : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                }`}
                              >
                                {c.status === "active" ? "সক্রিয়" : c.status === "expired" ? "মেয়াদোত্তীর্ণ" : "লকড"}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEditCustomer(c)}
                                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-blue-600"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(c.id)}
                                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
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

        {/* TAB 3: PACKAGE MANAGEMENT */}
        {activeTab === "packages" && (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">ইন্টারনেট প্যাকেজ সেটিংস</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1">সব ধরনের গতি এবং মূল্যের ব্রডব্যান্ড প্যাকেজ CRUD অপারেশন</p>
              </div>
              <button
                onClick={() => {
                  setEditingPkg(null);
                  setPkgForm({ id: "", name: "", speed: "", price: 0, oltProfile: "" });
                  setPkgModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                নতুন প্যাকেজ যুক্ত করুন
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((p) => (
                <div key={p.id} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{p.name}</h3>
                      <span className="text-xs bg-gray-100 dark:bg-zinc-800 py-1 px-2.5 rounded-full font-bold">{p.speed}</span>
                    </div>
                    <div className="my-6">
                      <span className="text-3xl font-extrabold">{p.price} ৳</span>
                      <span className="text-xs text-gray-400"> / প্রতি মাস</span>
                    </div>
                    <div className="text-xs bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg text-gray-500 space-y-1">
                      <div>OLT প্রোফাইল: <span className="font-mono">{p.oltProfile || "ডিফল্ট"}</span></div>
                      <div>প্যাকেজ আইডি: <span className="font-mono">{p.id}</span></div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6 border-t border-gray-50 dark:border-zinc-800 pt-4">
                    <button
                      onClick={() => {
                        setEditingPkg(p);
                        setPkgForm({ ...p });
                        setPkgModal(true);
                      }}
                      className="text-xs font-semibold py-1.5 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-blue-600 flex items-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" /> এডিট
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("প্যাকেজটি ডিলিট করতে চান?")) {
                          await deleteDoc(doc(db, "packages", p.id));
                        }
                      }}
                      className="text-xs font-semibold py-1.5 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> ডিলিট
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BILLING CENTER & AUTOMATION */}
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  সব সক্রিয় গ্রাহকের অটো-বিল জেনারেট করুন
                </button>
                <button
                  onClick={() => setInvoiceModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  ম্যানুয়াল ইনভয়েস তৈরি করুন
                </button>
              </div>
            </header>

            {/* Automation Code Display */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-2">প্রতি মাসের ১ তারিখে অটো-বিলিং ক্লাউড ফাংশন স্ক্রিপ্ট (TypeScript)</h3>
              <p className="text-sm text-gray-500 mb-4">
                এই কোডটি Firebase Functions এ ডিপ্লয় করলে প্রতি মাসের ১ তারিখে স্বয়ংক্রিয়ভাবে সব সক্রিয় গ্রাহকের ইনভয়েস ও বকেয়া আপডেট করে দেবে।
              </p>
              <div className="bg-zinc-950 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-64">
                <pre>{cloudFunctionCode}</pre>
              </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-lg">ইনভয়েস তালিকা ও অনুসন্ধান</h3>
                  <p className="text-xs text-gray-500 mt-0.5">ফিল্টার অনুযায়ী ইনভয়েসসমূহ অনুসন্ধান করুন</p>
                </div>
                {/* Clear Filters Button */}
                {(billFilterCustOrPhone || billFilterZone || billFilterStaff || billFilterMonth || billFilterStatus) && (
                  <button
                    onClick={() => {
                      setBillFilterCustOrPhone("");
                      setBillFilterZone("");
                      setBillFilterStaff("");
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6 bg-gray-50 dark:bg-zinc-850 p-4 rounded-xl">
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
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">স্টাফ (Staff)</label>
                  <select
                    value={billFilterStaff}
                    onChange={(e) => setBillFilterStaff(e.target.value)}
                    className="w-full text-xs border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="">সকল স্টাফ</option>
                    {users
                      .filter((u) => u.role === "staff" || u.role === "admin")
                      .map((st) => (
                        <option key={st.uid} value={st.uid}>{st.name}</option>
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
                      <th className="py-3 px-4">কালেক্টর স্টাফ</th>
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
                        if (billFilterStaff && cust?.staffId !== billFilterStaff) return false;
                        if (billFilterMonth && inv.month !== billFilterMonth) return false;
                        if (billFilterStatus && inv.status !== billFilterStatus) return false;
                        return true;
                      });

                      if (filteredList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-400">ফিল্টার অনুযায়ী কোনো ইনভয়েস খুঁজে পাওয়া যায়নি</td>
                          </tr>
                        );
                      }

                      return filteredList.map((inv) => {
                        const cust = customers.find((c) => c.id === inv.customerId);
                        const assignedStaff = users.find((u) => u.uid === cust?.staffId);
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
                            <td className="py-3 px-4 text-xs text-gray-500 font-medium">
                              {assignedStaff ? assignedStaff.name : (cust?.staffId ? "লোড হচ্ছে..." : "অনির্ধারিত")}
                            </td>
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

        {/* TAB 5: DEPOSITS APPROVAL */}
        {activeTab === "deposits" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">স্টাফ ক্যাশ ডিপোজিট অ্যাপ্রুভাল</h2>
              <p className="text-gray-500 dark:text-zinc-400 mt-1">
                স্টাফদের সংগৃহীত টাকা অফিসে জমা করার পর অনুমোদন করুন (অনুমোদন করলে স্টাফের ব্যালেন্স কমবে এবং অফিসের ক্যাশ আপডেট হবে)
              </p>
            </header>

            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500 bg-gray-50/50">
                      <th className="py-4 px-6">ডিপোজিট আইডি</th>
                      <th className="py-4 px-6">স্টাফ মেম্বার</th>
                      <th className="py-4 px-6">টাকার পরিমাণ</th>
                      <th className="py-4 px-6">পদ্ধতি ও ট্রানজেকশন</th>
                      <th className="py-4 px-6">তারিখ</th>
                      <th className="py-4 px-6">বর্তমান স্ট্যাটাস</th>
                      <th className="py-4 px-6 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                    {deposits.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold">
                          কোনো ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি!
                        </td>
                      </tr>
                    ) : (
                      deposits.map((dep) => {
                        const staff = users.find((u) => u.uid === dep.staffId);
                        return (
                          <tr key={dep.id}>
                            <td className="py-4 px-6 font-mono font-semibold text-xs text-gray-500">{dep.id}</td>
                            <td className="py-4 px-6 font-bold">{staff ? staff.name : dep.staffId}</td>
                            <td className="py-4 px-6 font-bold text-emerald-600">{dep.amount} ৳</td>
                            <td className="py-4 px-6">
                              <span className="font-semibold text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">{dep.method}</span>
                              <p className="text-xs text-gray-400 mt-0.5 font-mono">TrxID: {dep.trxId || "N/A"}</p>
                            </td>
                            <td className="py-4 px-6 text-xs text-gray-400">{dep.date}</td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                dep.status === "approved"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : dep.status === "rejected"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}>
                                {dep.status === "approved" ? "অনুমোদিত" : dep.status === "rejected" ? "বাতিল" : "পেন্ডিং"}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {dep.status === "pending" && (
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => handleDepositStatus(dep, "approved")}
                                    className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                                    title="Approve"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDepositStatus(dep, "rejected")}
                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                    title="Reject"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
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

        {/* TAB 6: STAFFS & SALARY */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">স্টাফ এবং বেতন ব্যবস্থাপনা</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1">সব মাঠকর্মী প্রোফাইল, বেতন রিকোয়েস্ট এবং পারমিশন টগল</p>
              </div>
              <button
                onClick={() => {
                  setStaffForm({ uid: "", name: "", email: "", password: "", phone: "", whatsapp: "", nid: "", address: "", salary: 15000, role: "staff" });
                  setStaffModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                নতুন স্টাফ যুক্ত করুন
              </button>
            </header>

            {/* Staff List */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4">অ্যাক্টিভ স্টাফ ও মেম্বার তালিকা</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500">
                      <th className="py-3 px-4">নাম</th>
                      <th className="py-3 px-4">ইমেইল</th>
                      <th className="py-3 px-4">মোবাইল</th>
                      <th className="py-3 px-4">নির্ধারিত মাসিক বেতন</th>
                      <th className="py-3 px-4">সংগৃহীত ক্যাশ ব্যালেন্স</th>
                      <th className="py-3 px-4">ভূমিকা (Role)</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                    {users
                      .filter((u) => u.role === "staff" || u.role === "admin")
                      .map((st) => (
                        <tr key={st.uid}>
                          <td className="py-3 px-4 font-semibold">{st.name}</td>
                          <td className="py-3 px-4 text-gray-500">{st.email}</td>
                          <td className="py-3 px-4">{st.phone}</td>
                          <td className="py-3 px-4 font-semibold">{st.salary || 15000} ৳</td>
                          <td className="py-3 px-4 text-emerald-600 font-bold">{st.balance || 0} ৳</td>
                          <td className="py-3 px-4">
                            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded font-bold uppercase">
                              {st.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setStaffForm({
                                  uid: st.uid,
                                  name: st.name,
                                  email: st.email,
                                  password: "",
                                  phone: st.phone,
                                  whatsapp: st.whatsapp || "",
                                  nid: st.nid || "",
                                  address: st.address || "",
                                  salary: st.salary || 15000,
                                  role: st.role,
                                });
                                setStaffModal(true);
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs transition"
                            >
                              এডিট
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Salary Requests List */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4">বেতন উত্তোলনের রিকোয়েস্ট তালিকা</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-sm font-semibold text-gray-500">
                      <th className="py-3 px-4">রিকোয়েস্ট আইডি</th>
                      <th className="py-3 px-4">স্টাফ মেম্বার</th>
                      <th className="py-3 px-4">অনুরোধকৃত বেতন পরিমাণ</th>
                      <th className="py-3 px-4">তারিখ</th>
                      <th className="py-3 px-4">বর্তমান স্ট্যাটাস</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-sm">
                    {salaryRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">কোনো রিকোয়েস্ট নেই</td>
                      </tr>
                    ) : (
                      salaryRequests.map((req) => {
                        const st = users.find((u) => u.uid === req.staffId);
                        return (
                          <tr key={req.id}>
                            <td className="py-3 px-4 font-mono font-semibold text-xs text-gray-500">{req.id}</td>
                            <td className="py-3 px-4 font-semibold">{st ? st.name : req.staffId}</td>
                            <td className="py-3 px-4 font-bold text-blue-600">{req.amount} ৳</td>
                            <td className="py-3 px-4 text-xs text-gray-400">{req.date}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                req.status === "approved"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : req.status === "rejected"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}>
                                {req.status === "approved" ? "অনুমোদিত" : req.status === "rejected" ? "বাতিল" : "পেন্ডিং"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {req.status === "pending" && (
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => handleSalaryStatus(req, "approved")}
                                    className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"
                                  >
                                    অনুমোদন
                                  </button>
                                  <button
                                    onClick={() => handleSalaryStatus(req, "rejected")}
                                    className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                  >
                                    বাতিল
                                  </button>
                                </div>
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

        {/* TAB 7: LIVE HELPLINE CHAT */}
        {activeTab === "chat" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">লাইভ হেল্পলাইন চ্যাট</h2>
              <p className="text-gray-500 dark:text-zinc-400 mt-1">
                Firestore real-time স্ন্যাপশট ভিত্তিক কেন্দ্রীয় হেল্পলাইন চ্যানেল
              </p>
            </header>

            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col h-[500px]">
              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">কোনো চ্যাট বার্তা নেই। চ্যাট শুরু করুন!</div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                          isMe
                            ? "bg-emerald-600 text-white rounded-tr-none"
                            : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-tl-none"
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold truncate opacity-80">{msg.senderName}</span>
                            <span className="text-[10px] bg-black/10 py-0.5 px-1.5 rounded uppercase font-semibold">
                              {msg.senderRole}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <span className="text-[9px] opacity-60 block text-right mt-1">
                            {msg.timestamp ? msg.timestamp.slice(11, 16) : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChatMessage} className="border-t border-gray-100 dark:border-zinc-800 p-4 flex gap-2">
                <input
                  type="text"
                  placeholder="আপনার বার্তা বাংলায় লিখুন..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:text-white"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl transition shadow-sm"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 8: REPORT CENTER & CSV EXPORTS */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">রিপোর্ট সমূহ</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1">
                  কোম্পানি ফাইন্যান্স, কাস্টমার বিল কালেকশন এবং অফিস খরচের রিপোর্ট রপ্তানি করুন
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2"
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
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-sm text-gray-800 dark:text-white"
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

        {/* TAB 9: SETTINGS & ZONE/AREA CRUD */}
        {activeTab === "settings" && (
          <div className="space-y-8">
            <header>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">সিস্টেম কনফিগারেশন</h2>
              <p className="text-gray-500 dark:text-zinc-400 mt-1">কোম্পানি প্রোফাইল, জোন ও এরিয়া এবং গেটওয়ে ক্রিয়েশন</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Company Profile Settings */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4">কোম্পানি প্রোফাইল</h3>
                <form onSubmit={handleSaveCompanySettings} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">কোম্পানির নাম</label>
                    <input
                      type="text"
                      required
                      value={companySettings.companyName}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">কোম্পানি লোগো URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={companySettings.logoUrl}
                      onChange={(e) => setCompanySettings({ ...companySettings, logoUrl: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">SMS গেটওয়ে API কী</label>
                    <input
                      type="text"
                      placeholder="API_KEY_XXXXXX"
                      value={companySettings.smsApiKey}
                      onChange={(e) => setCompanySettings({ ...companySettings, smsApiKey: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm"
                  >
                    সেটিংস সংরক্ষণ করুন
                  </button>
                </form>
              </div>

              {/* Zones and Areas Managers */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-4">জোন ও এরিয়া CRUD অপারেশনস</h3>
                  
                  {/* Add Zone */}
                  <div className="space-y-2 mb-6">
                    <label className="block text-sm font-semibold text-gray-600">নতুন জোন যুক্ত করুন</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="যেমন: মিরপুর জোন"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-sm"
                      />
                      <button
                        onClick={handleAddZone}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" /> যুক্ত
                      </button>
                    </div>
                  </div>

                  {/* Add Area */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-600">নতুন এরিয়া যুক্ত করুন</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                        className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-sm"
                      >
                        <option value="">জোন নির্বাচন করুন</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="যেমন: রোড-১০"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleAddArea}
                      className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> এরিয়া যুক্ত করুন
                    </button>
                  </div>
                </div>

                {/* List Zones / Areas to delete */}
                <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 space-y-4">
                  <h4 className="font-semibold text-sm">বিদ্যমান জোন সমূহ:</h4>
                  <div className="flex flex-wrap gap-2">
                    {zones.map((z) => (
                      <span key={z.id} className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 py-1 px-2.5 rounded-full text-xs font-semibold">
                        {z.name}
                        <button onClick={() => handleDeleteZone(z.id)} className="text-red-500 hover:text-red-700">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <h4 className="font-semibold text-sm">বিদ্যমান এরিয়া সমূহ:</h4>
                  <div className="flex flex-wrap gap-2">
                    {areas.map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 py-1 px-2.5 rounded-full text-xs font-semibold">
                        {a.name}
                        <button onClick={() => handleDeleteArea(a.id)} className="text-red-500 hover:text-red-700">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>
    </div>

      {/* --- MODAL DIALOGS --- */}

      {/* Customer Modal (Create/Edit) */}
      {customerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
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
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
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
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
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
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">PPPoE User Name (রাউটার প্রোফাইল)</label>
                  <input
                    type="text"
                    placeholder="যেমন: pppoe_user_12"
                    value={custForm.pppoeUser || ""}
                    onChange={(e) => setCustForm({ ...custForm, pppoeUser: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">PPPoE Password (রাউটার পাসওয়ার্ড)</label>
                  <input
                    type="text"
                    placeholder="যেমন: router_pass_34"
                    value={custForm.pppoePassword || ""}
                    onChange={(e) => setCustForm({ ...custForm, pppoePassword: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">NID নম্বর</label>
                  <input
                    type="text"
                    value={custForm.nid}
                    onChange={(e) => setCustForm({ ...custForm, nid: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">জোন</label>
                  <select
                    value={custForm.zone}
                    onChange={(e) => setCustForm({ ...custForm, zone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm"
                  >
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
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm"
                  >
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
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm"
                  >
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
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">শুরুতে বকেয়া পরিমাণ</label>
                  <input
                    type="number"
                    value={custForm.dueAmount}
                    onChange={(e) => setCustForm({ ...custForm, dueAmount: Number(e.target.value) })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">বিল প্রদানের প্রতিশ্রুত তারিখ (Promise Date)</label>
                  <input
                    type="date"
                    value={custForm.promiseDate}
                    onChange={(e) => setCustForm({ ...custForm, promiseDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">কানেকশন স্ট্যাটাস</label>
                  <select
                    value={custForm.status}
                    onChange={(e: any) => setCustForm({ ...custForm, status: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="expired">মেয়াদোত্তীর্ণ (Expired)</option>
                    <option value="locked">লকড (Locked)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">মাঠকর্মী (Staff Member)</label>
                  <select
                    value={custForm.staffId}
                    onChange={(e) => setCustForm({ ...custForm, staffId: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm"
                  >
                    <option value="">মাঠকর্মী নির্বাচন করুন</option>
                    {users
                      .filter((u) => u.role === "staff")
                      .map((st) => (
                        <option key={st.uid} value={st.uid}>{st.name}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">পূর্ণ ঠিকানা</label>
                <textarea
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl"
              >
                সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Package Modal (Create/Edit) */}
      {pkgModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">{editingPkg ? "প্যাকেজ এডিট করুন" : "নতুন ইন্টারনেট প্যাকেজ যুক্ত করুন"}</h3>
              <button onClick={() => setPkgModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSavePackage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">প্যাকেজের নাম</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ১০ এমবিপিএস সাধারণ"
                  value={pkgForm.name}
                  onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">স্পিড / গতি</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 10 Mbps"
                  value={pkgForm.speed}
                  onChange={(e) => setPkgForm({ ...pkgForm, speed: e.target.value })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">মাসিক মূল্য (টাকা)</label>
                <input
                  type="number"
                  required
                  value={pkgForm.price}
                  onChange={(e) => setPkgForm({ ...pkgForm, price: Number(e.target.value) })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">OLT প্রোফাইল আইডি (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: Profile_10M"
                  value={pkgForm.oltProfile}
                  onChange={(e) => setPkgForm({ ...pkgForm, oltProfile: e.target.value })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl"
              >
                প্যাকেজ সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Invoice Modal */}
      {invoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">ম্যানুয়াল ইনভয়েস জেনারেট করুন</h3>
              <button onClick={() => setInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateManualInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">গ্রাহক নির্বাচন করুন</label>
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
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-sm"
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
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/30 rounded-xl p-3 text-xs space-y-1.5">
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
                <label className="block text-xs font-bold mb-1">টাকার পরিমাণ</label>
                <input
                  type="number"
                  required
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">বিল পরিশোধের মাস</label>
                <input
                  type="month"
                  required
                  value={invoiceForm.month}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, month: e.target.value })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl"
              >
                ইনভয়েস সফলভাবে জেনারেট করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {csvImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">গ্রাহক ডেটা ইম্পোর্ট করুন</h3>
              <button onClick={() => setCsvImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                নিচের ইনপুটে কমা দ্বারা বিভক্ত ফরম্যাটে এক বা একাধিক গ্রাহক ডেটা পেস্ট করুন। <br />
                <strong>ফরম্যাট:</strong> নাম, মোবাইল নম্বর, ইমেইল, ঠিকানা, NID নম্বর, ONU MAC, জোন, এরিয়া, প্যাকেজ আইডি, বকেয়া <br />
                <em>উদাহরণ:</em> <br />
                <code className="block bg-gray-100 dark:bg-zinc-800 p-2 rounded text-[10px] text-emerald-600">
                  সাকিব আল হাসান, 01712345678, shakib@owns.com, রোড-৫ মিরপুর, 1234567890, MAC-ABC, মিরপুর জোন, মিরপুর-১০, pkg-1, 500
                </code>
              </p>
              <textarea
                rows={6}
                value={csvImportText}
                onChange={(e) => setCsvImportText(e.target.value)}
                placeholder="সাকিব আল হাসান, 01712345678, shakib@owns.com, রোড-৫ মিরপুর, 1234567890, MAC-ABC, মিরপুর জোন, মিরপুর-১০, pkg-1, 500"
                className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg font-mono text-xs"
              />
              <button
                onClick={handleCSVImport}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm"
              >
                পেস্টকৃত ডাটা ইম্পোর্ট সম্পন্ন করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {staffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">স্টাফ প্রোফাইল ম্যানেজার</h3>
              <button onClick={() => setStaffModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSaveStaff} className="space-y-4 text-gray-900 dark:text-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">স্টাফের পূর্ণ নাম</label>
                  <input
                    type="text"
                    required
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">লগইন ইমেইল এড্রেস</label>
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">লগইন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষরের)</label>
                  <input
                    type="password"
                    required={!staffForm.uid}
                    placeholder={staffForm.uid ? "পাসওয়ার্ড অপরিবর্তিত থাকবে" : "৬ অক্ষরের পাসওয়ার্ড দিন"}
                    minLength={6}
                    value={staffForm.password || ""}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">হোয়াটসঅ্যাপ নম্বর (WhatsApp No.)</label>
                  <input
                    type="tel"
                    value={staffForm.whatsapp || ""}
                    onChange={(e) => setStaffForm({ ...staffForm, whatsapp: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white text-sm"
                    placeholder="WhatsApp নম্বর দিন"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">NID নম্বর (NID Card No.)</label>
                  <input
                    type="text"
                    value={staffForm.nid || ""}
                    onChange={(e) => setStaffForm({ ...staffForm, nid: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white text-sm"
                    placeholder="NID নম্বর দিন"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">নির্ধারিত বেতন (টাকা)</label>
                  <input
                    type="number"
                    required
                    value={staffForm.salary}
                    onChange={(e) => setStaffForm({ ...staffForm, salary: Number(e.target.value) })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">ভূমিকা (Role)</label>
                  <select
                    value={staffForm.role}
                    onChange={(e: any) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="staff">স্টাফ (Staff)</option>
                    <option value="admin">অ্যাডমিন (Admin)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">স্থায়ী ও বর্তমান ঠিকানা (Address)</label>
                <textarea
                  value={staffForm.address || ""}
                  onChange={(e) => setStaffForm({ ...staffForm, address: e.target.value })}
                  className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 p-2 rounded-lg text-gray-900 dark:text-white text-sm"
                  rows={2}
                  placeholder="স্টাফের পূর্ণ ঠিকানা দিন"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition mt-2"
              >
                স্টাফ সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Profile Modal */}
      {showAdminProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAdminProfileModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-extrabold text-2xl mx-auto border-2 border-emerald-400 shadow-md">
                {adminProfile?.name ? adminProfile.name.slice(0, 2).toUpperCase() : "AD"}
              </div>
              <h3 className="font-bold text-xl mt-3 text-gray-900 dark:text-white">
                {adminProfile?.name || "অ্যাডমিন প্রোফাইল"}
              </h3>
              <span className="inline-block mt-1 px-3 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full text-xs font-bold">
                সিস্টেম অ্যাডমিনিস্ট্রেটর
              </span>
            </div>

            <div className="space-y-4 border-t border-gray-100 dark:border-zinc-800 pt-4 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-400 text-xs">ইমেইল এড্রেস:</span>
                <span className="font-medium text-gray-900 dark:text-white">{currentUser.email}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-400 text-xs">মোবাইল নম্বর:</span>
                <span className="font-medium text-gray-900 dark:text-white">{adminProfile?.phone || "অনির্ধারিত"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-400 text-xs">হোয়াটসঅ্যাপ:</span>
                <span className="font-medium text-gray-900 dark:text-white">{adminProfile?.whatsapp || "অনির্ধারিত"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-400 text-xs">জাতীয় পরিচয়পত্র (NID):</span>
                <span className="font-medium text-gray-900 dark:text-white">{adminProfile?.nid || "অনির্ধারিত"}</span>
              </div>
              <div className="py-1">
                <span className="block font-semibold text-gray-400 text-xs mb-1">পূর্ণ ঠিকানা:</span>
                <span className="font-medium text-gray-900 dark:text-white block bg-gray-50 dark:bg-zinc-850 p-2.5 rounded-lg text-xs leading-relaxed">
                  {adminProfile?.address || "কোনো ঠিকানা যুক্ত করা হয়নি।"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowAdminProfileModal(false)}
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
