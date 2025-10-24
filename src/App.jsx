// Birleştirilmiş Uygulama: QR Kod Kaydı → Ana Dashboard
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Gem, LayoutDashboard, ArrowRightLeft, Wallet, CreditCard, Landmark,
  AreaChart, Receipt, Settings, LogOut, Search, Bell, User, Home,
  Send, ChevronRight, QrCode, Eye, EyeOff, TrendingUp, PlusCircle,
  ArrowDownLeft, ArrowUpRight, ShoppingCart, Mic, Camera
} from "lucide-react";


/*
  Single-file App.js — tüm uygulama tek dosyada.
  Gereksinimler:
  - tailwindcss kurulmuş olmalı (ve index.css içinde tailwind direktifleri)
  - npm install lucide-react framer-motion
  - .env içinde Azure değişkenleri:
    REACT_APP_AZURE_ENDPOINT
    REACT_APP_AZURE_KEY
    REACT_APP_AZURE_DEPLOYMENT_NAME
    REACT_APP_AZURE_API_VERSION (opsiyonel)
*/

const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_ENDPOINT;
const AZURE_KEY = import.meta.env.VITE_AZURE_KEY;
const DEPLOYMENT = import.meta.env.VITE_AZURE_DEPLOYMENT_NAME;
const API_VERSION = import.meta.env.VITE_AZURE_API_VERSION || "2024-06-01-preview";

/* ---------------------------
  Helper: Azure çağrısı — action JSON bekliyoruz
   Dönen yapı: { raw, parsed } — parsed null ise fallback yapacağız
--------------------------- */
async function sendCommandToAzureForAction(command) {
  // Lokal demo fallback
  if (!AZURE_ENDPOINT || !AZURE_KEY || !DEPLOYMENT) {
    // Basit lokal intent çıkarımı (hızlı demo, prod ortamında Azure kullanılacak)
    const lc = command.toLowerCase();
    if (lc.includes("bakiye") || lc.includes("ne kadar") || lc.includes("param")) {
      return { raw: "Yerel: show_balance", parsed: { action: "show_balance", payload: null, message: "Toplam bakiyen ₺80.120,50" } };
    }
    if (lc.includes("gizle")) {
      return { raw: "Yerel: hide_balance", parsed: { action: "hide_balance", payload: null, message: "Bakiyen gizlendi." } };
    }
    if (lc.includes("kart")) {
      return { raw: "Yerel: navigate Kartlarım", parsed: { action: "navigate", payload: { menu: "Kartlarım" }, message: "Kartlarına geçiliyor." } };
    }
    if (lc.includes("transfer")) {
      return { raw: "Yerel: navigate Transferler", parsed: { action: "navigate", payload: { menu: "Transferler" }, message: "Transfer ekranı açıldı." } };
    }
    if (lc.includes("göremiyorum") || lc.includes("goremiyorum") || lc.includes("görmüyorum")) {
      return { raw: "Yerel: help_view_balance", parsed: { action: "speak", payload: { text: "Bakiyen ekranda görünmüyor ise sayfayı yenileyebilir veya 'bakiyemi göster' diyebilirsin." }, message: "Bakiyen ekranda görünmüyor ise sayfayı yenileyebilir veya 'bakiyemi göster' diyebilirsin." } };
    }
    return { raw: "Yerel: none", parsed: { action: "none", payload: null, message: "Üzgünüm, bunu anlayamadım. Tekrar eder misin?" } };
  }

  // System prompt: model yalnızca JSON dönmeli
  const systemPrompt = `
You are a Turkish banking voice assistant that ONLY returns a single valid JSON object (no extra text).
The JSON MUST follow this schema:
{
  "action": "navigate" | "show_balance" | "hide_balance" | "toggle_balance" | "speak" | "none" | "composite",
  "payload": object | null,
  "message": string | null
}
- "navigate": payload: { "menu": "Genel Bakış" | "Transferler" | "Hesaplarım" | "Kartlarım" | "Krediler" | "Yatırımlar" | "Ödemeler" | "Ayarlar" }
- "show_balance": payload null (the app will display and speak the balance)
- "hide_balance": payload null
- "toggle_balance": payload { "visible": true|false }
- "speak": payload { "text": "..." }
- "composite": payload { "actions": [ { action: ..., payload: ...}, ... ] }
If ambiguous, choose "none" and include a clarifying "message".
Return ONLY the JSON object.
`;

  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: command }
    ],
    max_tokens: 400,
    temperature: 0.12
  };

  const url = `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": AZURE_KEY },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    // dönen hata metnini raw olarak ver
    return { raw: "Azure hata: " + text, parsed: null };
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";

  // JSON'u gömülmüş olarak dönebilir — en baştan ve sondan {} al
  try {
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first !== -1 && last !== -1) {
      const jsonText = content.slice(first, last + 1);
      const parsed = JSON.parse(jsonText);
      return { raw: content, parsed };
    }
    // doğrudan parse
    const parsed = JSON.parse(content);
    return { raw: content, parsed };
  } catch (e) {
    // parse edilemedi
    return { raw: content, parsed: null };
  }
}

/* ---------------------------
  UI bileşenleri — tek dosyada korunacak
--------------------------- */

const SideNav = ({ activeMenu, setActiveMenu, enlargeButtons }) => (
  <nav className="hidden md:flex md:flex-col md:w-64 bg-white shadow-lg">
    <div className={`flex items-center justify-center shadow-md ${enlargeButtons ? 'h-24' : 'h-20'}`}>
      <Gem className={`text-primary ${enlargeButtons ? 'h-10 w-10' : 'h-8 w-8'}`} />
      <span className={`ml-2 font-bold text-primary ${enlargeButtons ? 'text-3xl' : 'text-2xl'}`}>BinarybridgeCU</span>
    </div>
    <div className="flex-1 overflow-y-auto">
      <ul className={`space-y-2 ${enlargeButtons ? 'py-8' : 'py-6'}`}>
        {[
          { icon: LayoutDashboard, label: "Genel Bakış" },
          { icon: ArrowRightLeft, label: "Transferler" },
          { icon: Wallet, label: "Hesaplarım" },
          { icon: CreditCard, label: "Kartlarım" },
          { icon: Landmark, label: "Krediler" },
          { icon: AreaChart, label: "Yatırımlar" },
          { icon: Receipt, label: "Ödemeler" },
        ].map((item) => (
          <li className="px-6" key={item.label}>
            <button
              onClick={() => setActiveMenu(item.label)}
              className={`w-full flex items-center rounded-lg transition-colors ${enlargeButtons ? 'px-5 py-4 text-lg' : 'px-4 py-3'} ${
                activeMenu === item.label
                  ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary"
                  : "text-gray-600 hover:bg-gray-50 hover:text-primary"
              }`}
            >
              <item.icon className={enlargeButtons ? 'h-7 w-7' : 'h-5 w-5'} />
              <span className="ml-4">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
    <div className="p-6 border-t border-gray-200">
      <button className={`w-full flex items-center text-gray-600 hover:bg-gray-50 hover:text-primary rounded-lg transition-colors text-left ${enlargeButtons ? 'px-5 py-4 text-lg' : 'px-4 py-3'}`}>
        <Settings className={enlargeButtons ? 'h-7 w-7' : 'h-5 w-5'} />
        <span className="ml-4">Ayarlar</span>
      </button>
      <button className={`w-full flex items-center text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2 text-left ${enlargeButtons ? 'px-5 py-4 text-lg' : 'px-4 py-3'}`}>
        <LogOut className={enlargeButtons ? 'h-7 w-7' : 'h-5 w-5'} />
        <span className="ml-4">Güvenli Çıkış</span>
      </button>
    </div>
  </nav>
);

const TopHeader = ({ onSearch, userData }) => (
  <header className="h-20 bg-white shadow-md flex items-center justify-between px-6 z-10">
    <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2 w-72">
      <Search className="h-5 w-5 text-gray-400" />
      <input
        onChange={(e) => onSearch && onSearch(e.target.value)}
        type="text"
        placeholder="İşlem, kampanya veya yardım ara..."
        className="bg-transparent ml-2 w-full text-sm text-gray-700 outline-none border-none focus:ring-0"
      />
    </div>
    <div className="md:hidden flex items-center">
      <Gem className="h-7 w-7 text-primary" />
      <span className="ml-2 text-xl font-bold text-primary">BinarybridgeCU</span>
    </div>
    <div className="flex items-center space-x-5">
      <button className="relative text-gray-500 hover:text-primary transition-colors">
        <Bell className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">3</span>
        </span>
      </button>
      <div className="flex items-center space-x-3 cursor-pointer">
        <img
          src={userData?.capturedImage || "https://placehold.co/40x40/0052cc/ffffff?text=AY"}
          alt="Kullanıcı profili"
          className="h-10 w-10 rounded-full object-cover border-2 border-primary/30"
        />
        <div className="hidden md:block">
          <span className="block text-sm font-semibold text-gray-800">
            {userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : "Ahmet Yılmaz"}
          </span>
          <span className="block text-xs text-gray-500">Müşteri No: 123456</span>
        </div>
      </div>
    </div>
  </header>
);

const BottomNav = ({ setActiveMenu }) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-t-lg z-20">
    <div className="flex justify-around h-16 items-center">
      {[Home, ArrowRightLeft, Wallet, CreditCard, User].map((Icon, idx) => (
        <button
          key={idx}
          onClick={() =>
            setActiveMenu(["Anasayfa", "Transfer", "Hesaplar", "Kartlar", "Profil"][idx])
          }
          className={`flex flex-col items-center justify-center ${idx === 0 ? "text-primary" : "text-gray-500 hover:text-primary"}`}
        >
          <Icon className="h-6 w-6" />
          <span className="text-xs font-medium">
            {["Anasayfa", "Transfer", "Hesaplar", "Kartlar", "Profil"][idx]}
          </span>
        </button>
      ))}
    </div>
  </nav>
);

/* === Dashboard parçaları (korunan orijinal içerik) === */

const AccessibilityQrCode = ({ refreshQR }) => (
  <div className="bg-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-center gap-4 border-l-4 border-accent">
    <div className="flex-shrink-0 p-3 bg-gray-100 rounded-lg">
      <QrCode className="h-12 w-12 text-primary" />
    </div>
    <div className="flex-1 text-center md:text-left">
      <h2 className="text-lg font-semibold text-gray-800">Erişilebilir İşlem Kodu</h2>
      <p className="text-sm text-gray-600">
        Bu QR kodu ATM'lerimizde okutarak ayarlarınıza uygun işlem yapın.
      </p>
    </div>
    <button
      onClick={refreshQR}
      className="w-full md:w-auto bg-primary-50 text-primary font-semibold px-5 py-2 rounded-lg hover:bg-primary-100 transition-colors"
    >
      Kodu Yenile
    </button>
  </div>
);

const QuickActions = ({ go, enlargeButtons }) => (
  <div className={`bg-white rounded-2xl shadow-md ${enlargeButtons ? 'p-8' : 'p-6'}`}>
    <h3 className={`font-semibold text-gray-800 ${enlargeButtons ? 'text-2xl mb-6' : 'text-xl mb-5'}`}>Hızlı İşlemler</h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
      {[
        { icon: Send, label: "Transfer", action: () => go("Transferler") },
        { icon: Receipt, label: "Ödemeler", action: () => go("Ödemeler") },
        { icon: Landmark, label: "Kredi", action: () => go("Krediler") },
        { icon: PlusCircle, label: "Yeni Hesap", action: () => go("Hesaplarım") },
      ].map((item, idx) => (
        <button type="button" onClick={item.action} className={`flex flex-col items-center rounded-lg hover:bg-gray-50 transition-colors ${enlargeButtons ? 'p-5' : 'p-3'}`} key={idx}>
          <div className={`rounded-full bg-primary-50 text-primary flex items-center justify-center ${enlargeButtons ? 'h-20 w-20' : 'h-14 w-14'}`}>
            <item.icon className={enlargeButtons ? 'h-9 w-9' : 'h-6 w-6'} />
          </div>
          <span className={`mt-2 font-medium text-gray-700 ${enlargeButtons ? 'text-base' : 'text-sm'}`}>{item.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const RecentTransactions = () => (
  <div className="bg-white p-6 rounded-2xl shadow-md">
    <h3 className="text-xl font-semibold text-gray-800 mb-5">Son İşlemler</h3>
    {[
      { icon: ArrowDownLeft, label: "Maaş Ödemesi", date: "22 Ekim 2025, 09:30", amount: "+ ₺24.500,00", color: "green", bg: "green-100" },
      { icon: ArrowUpRight, label: "Kira Ödemesi", date: "21 Ekim 2025, 14:45", amount: "- ₺8.500,00", color: "red", bg: "red-100" },
      { icon: ShoppingCart, label: "Market Alışverişi", date: "20 Ekim 2025, 18:12", amount: "- ₺780,40", color: "gray", bg: "gray-100" },
    ].map((tx, idx) => (
      <div className="flex items-center space-x-4 mb-4" key={idx}>
        <div className={`h-12 w-12 rounded-full bg-${tx.bg} text-${tx.color}-700 flex items-center justify-center flex-shrink-0`}>
          <tx.icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{tx.label}</p>
          <p className="text-xs text-gray-500">{tx.date}</p>
        </div>
        <span className={`text-sm font-bold text-${tx.color}-600`}>{tx.amount}</span>
      </div>
    ))}
  </div>
);

const RightSidebar = ({ goCards, userData }) => (
  <div className="lg:col-span-1 space-y-6">
    {userData && userData.qrJson && (
      <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-primary/20">
        <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <QrCode className="h-6 w-6 text-primary" />
          Erişilebilir QR Kodunuz
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Bu kodu ATM'lerde kullanabilirsiniz
        </p>
        <div className="flex flex-col items-center p-4 bg-gradient-to-br from-primary-50 to-purple-50 rounded-xl">
          <QRCodeSVG value={userData.qrJson} size={180} level="H" />
          <div className="mt-4 text-center">
            <p className="text-sm font-semibold text-gray-800">{userData.firstName} {userData.lastName}</p>
            <p className="text-xs text-gray-600">{userData.disability}</p>
          </div>
        </div>
      </div>
    )}
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h3 className="text-xl font-semibold text-gray-800 mb-5">Kartlarım</h3>
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-gray-900 text-white shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-semibold">PLATINUM</span>
            <CreditCard className="h-6 w-6" />
          </div>
          <p className="text-lg font-mono tracking-widest">**** **** **** 1234</p>
          <div className="flex justify-between items-end mt-2">
            <span className="text-sm">{userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : "Ahmet Yılmaz"}</span>
            <span className="text-sm">12/28</span>
          </div>
        </div>
        <button onClick={goCards} type="button" className="group w-full flex justify-between items-center text-sm font-medium text-primary hover:underline">
          Tüm Kartlarımı Görüntüle
          <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h3 className="text-xl font-semibold text-gray-800 mb-5">Kampanyalar</h3>
      <p className="text-gray-600 text-sm">Yaklaşan kampanyaları ve fırsatları buradan takip edebilirsiniz.</p>
    </div>
  </div>
);

/* === Bakiye kartı: parlama / ışıltı efektli, detaylı (uşak) === */
const BalanceCard = ({ isVisible, onToggle, highlight, balanceSpokenText }) => {
  return (
    <motion.div
      animate={highlight ? { scale: [1, 1.03, 1], boxShadow: ["0 0 0 rgba(0,0,0,0)", "0 0 30px rgba(99,102,241,0.6)", "0 0 0 rgba(0,0,0,0)"] } : {}}
      transition={{ duration: 1.2 }}
      className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden"
    >
      {/* Arka plan dekoratif şekiller */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <span className="text-base font-normal text-white/90">Genel Bakiye</span>
          <button
            onClick={() => onToggle(!isVisible)}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            aria-label="Bakiyeyi göster/gizle"
          >
            {isVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <motion.div
          key={isVisible ? "visible" : "hidden"}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="text-5xl font-bold tracking-tight">
            {isVisible ? "₺80.120,50" : "₺•••.•••,••"}
          </div>
        </motion.div>

        <div className="flex items-center gap-2">
          <div className="flex items-center text-green-400">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            <span className="text-sm font-medium">+ ₺1.450,20</span>
          </div>
          <span className="text-white/60 text-sm">(Son 7 Gün)</span>
        </div>
      </div>

      {/* Görsel ışıltı: sadece highlight true ise görünür */}
      <AnimatePresence>
        {highlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15), transparent 50%)"
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* === Dashboard içerik yöneticisi: ana grid + sağ sidebar === */
const DashboardMainContent = ({ activeMenu, isBalanceVisible, toggleBalance, balanceHighlight, refreshQR, setActiveMenu, userData, enlargeButtons }) => {
  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <BalanceCard isVisible={isBalanceVisible} onToggle={(v) => toggleBalance(v)} highlight={balanceHighlight} />
        <QuickActions go={(menu) => setActiveMenu(menu)} enlargeButtons={enlargeButtons} />
        <RecentTransactions />
        <AccessibilityQrCode refreshQR={refreshQR} />
      </div>
      <RightSidebar goCards={() => setActiveMenu("Kartlarım")} userData={userData} />
    </main>
  );
};

/* ---------------------------
  Ana uygulama
--------------------------- */
export default function App() {
  // QR Kayıt state'leri
  const [showRegistration, setShowRegistration] = useState(true);
  const [userRegistered, setUserRegistered] = useState(false);
  const [userData, setUserData] = useState(null);
  
  // UI state
  const [activeMenu, setActiveMenu] = useState("Genel Bakış");
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [balanceHighlight, setBalanceHighlight] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [lastAzureRaw, setLastAzureRaw] = useState(null);
  const [listening, setListening] = useState(false);
  const [qrKey, setQrKey] = useState(Date.now());

  const recogRef = useRef(null);
  const speakingRef = useRef(false);

  // Buton büyütme kontrolü: 65+ yaş veya engeli "Yok" veya "Görme Engelli" değilse
  const shouldEnlargeButtons = userData && (
    parseInt(userData.age) >= 65 || 
    (userData.disability !== "Yok" && userData.disability !== "Görme Engelli")
  );

  // TTS wrapper
  function speakText(text) {
    if (!text) return;
    try {
      // cancel ongoing TTS to prevent overlapping
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = "tr-TR";
      ut.rate = 1;
      ut.pitch = 1;
      ut.onstart = () => (speakingRef.current = true);
      ut.onend = () => (speakingRef.current = false);
      window.speechSynthesis.speak(ut);
    } catch (e) {
      console.warn("TTS hata:", e);
    }
  }

  // Merkezi eylem uygulayıcı: parsed JSON'dan UI eylemlerini tetikle
  function performParsedAction(parsed) {
    if (!parsed || typeof parsed !== "object") return;
    const action = parsed.action;
    const payload = parsed.payload ?? null;
    const message = parsed.message ?? null;

    // composite veya tekli
    if (action === "composite" && payload?.actions instanceof Array) {
      payload.actions.forEach((a) => performParsedAction(a));
      if (message) {
        setResponseMessage(message);
        speakText(message);
      }
      return;
    }

    switch (action) {
      case "navigate":
        if (payload?.menu) {
          setActiveMenu(payload.menu);
        }
        if (message) {
          setResponseMessage(message);
          speakText(message);
        }
        break;

      case "show_balance":
        setIsBalanceVisible(true);
        setBalanceHighlight(true);
        // konuşma: eğer message yoksa fallback string ile oku
        speakText(message ?? "Toplam bakiyen 80 bin yüz yirmi lira elli kuruş.");
        setResponseMessage(message ?? "Bakiyen gösteriliyor.");
        // parlama efektini kısa tut
        setTimeout(() => setBalanceHighlight(false), 1800);
        break;

      case "hide_balance":
        setIsBalanceVisible(false);
        setResponseMessage(message ?? "Bakiyen gizlendi.");
        if (message) speakText(message);
        break;

      case "toggle_balance":
        if (typeof payload?.visible === "boolean") setIsBalanceVisible(payload.visible);
        setResponseMessage(message ?? "Bakiyen ayarlandı.");
        if (message) speakText(message);
        break;

      case "speak":
        if (payload?.text) {
          speakText(payload.text);
          setResponseMessage(payload.text);
        } else if (message) {
          speakText(message);
          setResponseMessage(message);
        }
        break;

      case "none":
        // model net değilse message ile yönlendir
        if (message) {
          setResponseMessage(message);
          speakText(message);
        } else {
          setResponseMessage("Bunu anlayamadım, tekrar eder misin?");
          speakText("Bunu anlayamadım, tekrar eder misin?");
        }
        break;

      default:
        // bilinmeyen action fallback
        if (message) {
          setResponseMessage(message);
          speakText(message);
        } else {
          setResponseMessage("İşlem yapılamadı.");
        }
        console.warn("Bilinmeyen action:", action);
    }
  }

  // SpeechRecognition başlat/yeniden başlat ve olay bağla
  useEffect(() => {
    if (showRegistration || !userRegistered) return;
    
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      console.warn("Tarayıcı SpeechRecognition desteklemiyor.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      console.log("SpeechRecognition başladı.");
    };

    recognition.onerror = (err) => {
      console.error("SpeechRecognition hata:", err);
      // Hatalarda kısa bir bekleme sonrası yeniden başlatmayı deneyebiliriz
    };

    recognition.onend = () => {
      // continuous mod bazı tarayıcılarda durabilir; yeniden başlat
      try {
        recognition.start();
      } catch (e) {
        console.warn("Recognition yeniden başlatma hatası:", e);
      }
      setListening(true);
    };

    recognition.onresult = async (event) => {
      // En son sonucu al
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript.trim();
      console.log("Algılanan komut:", transcript);
      setResponseMessage("Komut algılandı: " + transcript);

      // Eğer şu an TTS konuşuyorsa ve kullanıcı konuşuyorsa, önce TTS'i iptal et
      if (speakingRef.current) {
        window.speechSynthesis.cancel();
      }

      // Azure ile analiz et
      try {
        const { raw, parsed } = await sendCommandToAzureForAction(transcript);
        setLastAzureRaw(raw);
        if (parsed) {
          performParsedAction(parsed);
        } else {
          // parsed null -> sadece raw metin döndü (Azure hata/serbest metin)
          // Ekrana göster ve oku (kırp)
          const textToShow = (raw && raw.length > 800) ? raw.slice(0, 800) + "..." : raw;
          setResponseMessage(textToShow);
          speakText(textToShow);
        }
      } catch (e) {
        console.error("Azure işleme hatası:", e);
        setResponseMessage("Sunucu hatası: " + (e.message || "Hata"));
        speakText("Sunucuya bağlanırken hata oluştu.");
      }
    };

    // start recognition
    try {
      recognition.start();
      recogRef.current = recognition;
    } catch (e) {
      console.warn("Recognition başlatılamadı:", e);
    }

    // cleanup
    return () => {
      try {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.stop();
      } catch (e) {}
    };
  }, [showRegistration, userRegistered]); // dependency: registration ve userRegistered

  // Kullanıcının elle dinlemeyi kapatıp açması için fonksiyon
  function toggleListeningManually() {
    const r = recogRef.current;
    if (!r) return alert("Tarayıcı ses tanımayı desteklemiyor veya hazır değil.");
    try {
      if (listening) {
        r.stop();
        window.speechSynthesis.cancel();
        setListening(false);
      } else {
        r.start();
        setListening(true);
      }
    } catch (e) {
      console.warn("Dinleme toggle hatası:", e);
    }
  }

  // QR yenile
  function refreshQR() {
    if (userData) {
      const newQrJson = JSON.stringify({ 
        ...userData, 
        refreshedAt: new Date().toISOString(),
        sessionId: Date.now()
      });
      setUserData({ ...userData, qrJson: newQrJson });
      setQrKey(Date.now());
      setResponseMessage("QR kodu yenilendi.");
      speakText("QR kodu yenilendi.");
    } else {
      setResponseMessage("QR kodu yenilemek için önce kayıt olmanız gerekiyor.");
      speakText("QR kodu yenilemek için önce kayıt olmanız gerekiyor.");
    }
  }

  // Toggle balance helper (manually triggered from UI)
  function toggleBalanceManual(newVal) {
    if (typeof newVal === "boolean") setIsBalanceVisible(newVal);
    else setIsBalanceVisible((p) => !p);
    setBalanceHighlight(true);
    setTimeout(() => setBalanceHighlight(false), 1200);
  }

  // Render edilen içerik - sayfa bazlı componentlerin korunması
  function renderContent() {
    switch (activeMenu) {
      case "Genel Bakış":
        return (
          <DashboardMainContent
            activeMenu={activeMenu}
            isBalanceVisible={isBalanceVisible}
            toggleBalance={(v) => toggleBalanceManual(v)}
            balanceHighlight={balanceHighlight}
            refreshQR={refreshQR}
            setActiveMenu={setActiveMenu}
            userData={userData}
            enlargeButtons={shouldEnlargeButtons}
          />
        );
      case "Transferler":
        return (
          <div className={`bg-white rounded-2xl shadow-md ${shouldEnlargeButtons ? 'p-8' : 'p-6'}`}>
            <h2 className={`font-semibold mb-4 ${shouldEnlargeButtons ? 'text-2xl' : 'text-xl'}`}>Transferler</h2>
            <p className={shouldEnlargeButtons ? 'text-lg' : ''}>Hesaplar arasında veya başka kişilere para transferi yapabilirsiniz.</p>
            <div className="mt-4">
              <button onClick={() => { setResponseMessage("Transfer örneği başlatılıyor."); speakText("Transfer ekranı açıldı."); }} className={`bg-primary text-white rounded-md ${shouldEnlargeButtons ? 'px-6 py-4 text-lg' : 'px-4 py-2'}`}>Yeni Transfer</button>
            </div>
          </div>
        );
      case "Hesaplarım":
        return (
          <div className={`bg-white rounded-2xl shadow-md ${shouldEnlargeButtons ? 'p-8' : 'p-6'}`}>
            <h2 className={`font-semibold mb-4 ${shouldEnlargeButtons ? 'text-2xl' : 'text-xl'}`}>Hesaplarım</h2>
            <p className={shouldEnlargeButtons ? 'text-lg' : ''}>Vadesiz ve vadeli hesaplarınızın bakiyelerini görebilirsiniz.</p>
          </div>
        );
      case "Kartlarım":
        return (
          <div className={`bg-white rounded-2xl shadow-md ${shouldEnlargeButtons ? 'p-8' : 'p-6'}`}>
            <h2 className={`font-semibold mb-4 ${shouldEnlargeButtons ? 'text-2xl' : 'text-xl'}`}>Kartlarım</h2>
            <p className={shouldEnlargeButtons ? 'text-lg' : ''}>Kredi ve banka kartlarınızı yönetebilir, limitlerini görebilirsiniz.</p>
          </div>
        );
      case "Krediler":
        return (
          <div className={`bg-white rounded-2xl shadow-md ${shouldEnlargeButtons ? 'p-8' : 'p-6'}`}>
            <h2 className={`font-semibold mb-4 ${shouldEnlargeButtons ? 'text-2xl' : 'text-xl'}`}>Krediler</h2>
            <p className={shouldEnlargeButtons ? 'text-lg' : ''}>Kredi başvurularınızı ve mevcut kredilerinizi takip edebilirsiniz.</p>
          </div>
        );
      case "Yatırımlar":
        return (
          <div className={`bg-white rounded-2xl shadow-md ${shouldEnlargeButtons ? 'p-8' : 'p-6'}`}>
            <h2 className={`font-semibold mb-4 ${shouldEnlargeButtons ? 'text-2xl' : 'text-xl'}`}>Yatırımlar</h2>
            <p className={shouldEnlargeButtons ? 'text-lg' : ''}>Borsa ve diğer yatırım araçlarınızı görebilirsiniz.</p>
          </div>
        );
      case "Ödemeler":
        return (
          <div className={`bg-white rounded-2xl shadow-md ${shouldEnlargeButtons ? 'p-8' : 'p-6'}`}>
            <h2 className={`font-semibold mb-4 ${shouldEnlargeButtons ? 'text-2xl' : 'text-xl'}`}>Ödemeler</h2>
            <p className={shouldEnlargeButtons ? 'text-lg' : ''}>Fatura ve diğer ödemelerinizi buradan gerçekleştirebilirsiniz.</p>
          </div>
        );
      default:
        return <div className="p-6 bg-white rounded-2xl shadow-md">Bölüm bulunamadı.</div>;
    }
  }

  // QR Kayıt modalı göster
  if (showRegistration) {
    return <AccessibilityRegistrationModal onComplete={(data) => {
      setUserData(data);
      setUserRegistered(true);
      setShowRegistration(false);
      speakText("Kayıt tamamlandı. Dashboard'a yönlendiriliyorsunuz.");
    }} onSkip={() => {
      setShowRegistration(false);
      setUserRegistered(true);
      speakText("Dashboard'a geçildi.");
    }} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SideNav activeMenu={activeMenu} setActiveMenu={setActiveMenu} enlargeButtons={shouldEnlargeButtons} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader onSearch={(q) => setResponseMessage(q ? `Arama: ${q}` : "")} userData={userData} />
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div className="p-6">{renderContent()}</div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <BottomNav setActiveMenu={setActiveMenu} />

      {/* Mikrofon/dinleme butonu */}
      <button
        onClick={toggleListeningManually}
        className={`fixed right-6 rounded-full shadow-xl text-white hover:scale-110 transition-transform z-50 ${listening ? "bg-red-500" : "bg-primary"} ${shouldEnlargeButtons ? 'bottom-28 p-6' : 'bottom-24 p-4'}`}
        title={listening ? "Dinlemeyi durdur" : "Dinlemeyi başlat"}
      >
        <Mic className={shouldEnlargeButtons ? 'h-8 w-8' : 'h-6 w-6'} />
      </button>

      {/* Azure / assistant mesaj kutusu */}
      {responseMessage && (
        <div className={`fixed right-6 bg-white rounded-lg shadow-lg z-50 ${shouldEnlargeButtons ? 'bottom-40 p-5 w-96 text-base' : 'bottom-32 p-4 w-80'}`}>
          <div className="text-sm text-gray-800">{responseMessage}</div>
          {lastAzureRaw && (
            <details className="mt-2 text-xs text-gray-500">
              <summary>Azure ham çıktı (gör)</summary>
              <pre className="whitespace-pre-wrap text-xs">{String(lastAzureRaw).slice(0, 1000)}</pre>
            </details>
          )}
        </div>
      )}

      {/* Mikrofon göstergesi (sol alt) */}
      <div className={`fixed left-6 flex items-center space-x-3 bg-white rounded-full shadow-lg z-50 ${shouldEnlargeButtons ? 'bottom-8 px-6 py-3' : 'bottom-6 px-4 py-2'}`}>
        <Mic className={`${listening ? "text-red-500 animate-pulse" : "text-gray-400"} ${shouldEnlargeButtons ? 'h-8 w-8' : 'h-6 w-6'}`} />
        <span className={`text-gray-600 ${shouldEnlargeButtons ? 'text-base' : 'text-sm'}`}>{listening ? "Dinleniyor..." : "Dinleme kapalı"}</span>
      </div>
    </div>
  );
}

/* === QR Kod Kayıt Modal Bileşeni === */
function AccessibilityRegistrationModal({ onComplete, onSkip }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [listening, setListening] = useState(false);
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [disability, setDisability] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [debugMessage, setDebugMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);

  function speak(text) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "tr-TR";
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      console.error("Kamera açılamadı:", e);
      alert("Kamera açılamadı. Lütfen izin verin.");
    }
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); }
  }

  function capturePhoto() {
    if (!videoRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
    setPhotoTaken(true);
    return dataUrl;
  }

  function createRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = "tr-TR";
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.continuous = false;
    return r;
  }

  useEffect(() => {
    recognitionRef.current = createRecognition();
    const timer = setTimeout(() => { startSession(); }, 1000);
    return () => {
      clearTimeout(timer);
      if (recognitionRef.current) {
        try { recognitionRef.current.onresult = null; recognitionRef.current.onend = null; } catch (e) {}
      }
      stopCamera();
      window.speechSynthesis.cancel();
    };
  }, []);

  async function startSession() {
    await startCamera();
    await speak("Merhaba, Engelli Bankacılık sistemine hoş geldiniz. Lütfen adınızı söyleyin.");
    setTimeout(() => { setStep(1); startListeningForAnswer(handleFirstNameResult); }, 500);
  }

  function startListeningForAnswer(onResult) {
    const r = recognitionRef.current;
    if (!r) { alert("Tarayıcınız konuşmayı tanımayı desteklemiyor."); return; }
    setDebugMessage("Dinleme başlatılıyor...");
    setListening(true);
    r.onstart = () => { setDebugMessage("Dinleme aktif - Konuşabilirsiniz!"); };
    r.onresult = (ev) => {
      let bestResult = ev.results[0][0];
      let bestConfidence = bestResult.confidence;
      for (let i = 0; i < ev.results[0].length; i++) {
        const alt = ev.results[0][i];
        if (alt.confidence > bestConfidence) { bestResult = alt; bestConfidence = alt.confidence; }
      }
      const transcript = bestResult.transcript.trim();
      setDebugMessage(`Algılanan: ${transcript} (${Math.round(bestConfidence * 100)}% güven)`);
      setListening(false);
      onResult(transcript);
    };
    r.onerror = (err) => {
      setDebugMessage(`Hata: ${err.error}`);
      setListening(false);
      if (err.error === "no-speech") {
        speak("Sizi duyamadım. Lütfen yüksek sesle tekrar söyleyin.");
        setTimeout(() => startListeningForAnswer(onResult), 2000);
      }
    };
    try { r.start(); } catch (e) { setListening(false); }
  }

  async function handleFirstNameResult(text) {
    setTranscript(text);
    const extractedName = extractName(text);
    setFirstName(extractedName);
    setListening(false);
    setAwaitingConfirmation(true);
    await speak(`${extractedName} olarak kaydettim. Doğru mu? Evet veya Hayır deyin.`);
    setTimeout(() => { startListeningForAnswer(handleFirstNameConfirmation); }, 500);
  }

  async function handleFirstNameConfirmation(text) {
    setAwaitingConfirmation(false);
    if (text.toLowerCase().includes("evet") || text.toLowerCase().includes("tamam")) {
      await speak(`Teşekkürler. Şimdi soyadınızı söyleyin.`);
      setTimeout(() => { setStep(2); startListeningForAnswer(handleLastNameResult); }, 500);
    } else {
      setFirstName("");
      await speak("Anladım. Lütfen adınızı tekrar söyleyin.");
      setTimeout(() => { startListeningForAnswer(handleFirstNameResult); }, 500);
    }
  }

  async function handleLastNameResult(text) {
    setTranscript(text);
    const extractedLastName = extractLastName(text);
    setLastName(extractedLastName);
    setListening(false);
    setAwaitingConfirmation(true);
    await speak(`${extractedLastName} olarak kaydettim. Doğru mu? Evet veya Hayır deyin.`);
    setTimeout(() => { startListeningForAnswer(handleLastNameConfirmation); }, 500);
  }

  async function handleLastNameConfirmation(text) {
    setAwaitingConfirmation(false);
    if (text.toLowerCase().includes("evet") || text.toLowerCase().includes("tamam")) {
      await speak(`Teşekkürler ${firstName} ${lastName}. Şimdi yaşınızı söyleyin.`);
      setTimeout(() => { setStep(3); startListeningForAnswer(handleAgeResult); }, 500);
    } else {
      setLastName("");
      await speak("Anladım. Lütfen soyadınızı tekrar söyleyin.");
      setTimeout(() => { startListeningForAnswer(handleLastNameResult); }, 500);
    }
  }

  async function handleAgeResult(text) {
    setTranscript(text);
    const extractedAge = extractAge(text);
    setAge(extractedAge);
    setListening(false);
    setAwaitingConfirmation(true);
    await speak(`${extractedAge} yaş olarak kaydettim. Doğru mu?`);
    setTimeout(() => { startListeningForAnswer(handleAgeConfirmation); }, 500);
  }

  async function handleAgeConfirmation(text) {
    setAwaitingConfirmation(false);
    if (text.toLowerCase().includes("evet") || text.toLowerCase().includes("tamam")) {
      await speak(`Teşekkürler. Şimdi engel türünüzü söyleyin. Eğer engeliniz yoksa 'yok' deyin.`);
      setTimeout(() => { setStep(4); startListeningForAnswer(handleDisabilityResult); }, 500);
    } else {
      setAge("");
      await speak("Anladım. Lütfen yaşınızı tekrar söyleyin.");
      setTimeout(() => { startListeningForAnswer(handleAgeResult); }, 500);
    }
  }

  async function handleDisabilityResult(text) {
    setTranscript(text);
    const extractedDisability = extractDisability(text);
    setDisability(extractedDisability);
    setListening(false);
    setAwaitingConfirmation(true);
    await speak(`${extractedDisability} olarak kaydettim. Doğru mu?`);
    setTimeout(() => { startListeningForAnswer(handleDisabilityConfirmation); }, 500);
  }

  async function handleDisabilityConfirmation(text) {
    setAwaitingConfirmation(false);
    if (text.toLowerCase().includes("evet") || text.toLowerCase().includes("tamam")) {
      await speak(`Mükemmel. Şimdi fotoğrafınızı çekeceğim.`);
      setTimeout(async () => {
        await speak("Fotoğrafınız çekiliyor.");
        capturePhoto();
        await speak("Fotoğraf çekildi. QR kodunuz hazır. Dashboard'a yönlendiriliyorsunuz.");
        setStep(5);
        // 3 saniye sonra otomatik olarak dashboard'a geç
        setTimeout(() => {
          stopCamera();
          onComplete({ firstName, lastName, age, disability, capturedImage, qrJson });
        }, 3000);
      }, 2000);
    } else {
      setDisability("");
      await speak("Anladım. Lütfen engel türünüzü tekrar söyleyin.");
      setTimeout(() => { startListeningForAnswer(handleDisabilityResult); }, 500);
    }
  }

  function extractAge(text) {
    // Sayıları çıkar
    const numbers = text.match(/\d+/);
    if (numbers) {
      return numbers[0];
    }
    
    // Türkçe sayı kelimelerini çevir
    const numberWords = {
      "bir": "1", "iki": "2", "üç": "3", "dört": "4", "beş": "5",
      "altı": "6", "yedi": "7", "sekiz": "8", "dokuz": "9", "on": "10",
      "yirmi": "20", "otuz": "30", "kırk": "40", "elli": "50",
      "altmış": "60", "yetmiş": "70", "seksen": "80", "doksan": "90"
    };
    
    for (const [word, num] of Object.entries(numberWords)) {
      if (text.toLowerCase().includes(word)) {
        return num;
      }
    }
    
    return text.trim();
  }

  function extractName(text) {
    const keywords = ["adım", "ismim", "benim adım", "ben"];
    for (const keyword of keywords) {
      const index = text.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        let extracted = text.substring(index + keyword.length).trim().replace(/[.,!?;:]/g, '').split(' ')[0];
        if (extracted) return extracted.charAt(0).toUpperCase() + extracted.slice(1);
      }
    }
    const words = text.trim().split(' ');
    return words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : text.trim();
  }

  function extractLastName(text) {
    const keywords = ["soyadım", "soyismim"];
    for (const keyword of keywords) {
      const index = text.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        let extracted = text.substring(index + keyword.length).trim().replace(/[.,!?;:]/g, '').split(' ')[0];
        if (extracted) return extracted.charAt(0).toUpperCase() + extracted.slice(1);
      }
    }
    const words = text.trim().split(' ');
    return words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : text.trim();
  }

  function extractDisability(text) {
    const lowerText = text.toLowerCase();
    
    // "Yok" kontrolü
    if (lowerText.includes("yok") || lowerText.includes("engel yok") || lowerText.includes("engelim yok")) {
      return "Yok";
    }
    
    const types = {
      "Görme Engelli": ["görme", "kör", "görme engelli", "göremiyorum"],
      "İşitme Engelli": ["işitme", "sağır", "işitme engelli", "duyamıyorum"],
      "Fiziksel Engelli": ["fiziksel", "yürüme", "tekerlekli", "ortopedik"],
      "Konuşma Engelli": ["konuşma", "konuşamıyorum", "dilsiz"]
    };
    
    for (const [type, keywords] of Object.entries(types)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) return type;
      }
    }
    
    return text.trim();
  }

  const qrJson = JSON.stringify({ firstName, lastName, age, disability });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Engelli Bankacılık Kaydı</h1>
            <button onClick={onSkip} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium">Atla →</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg">
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl bg-gray-900 h-64 object-cover" />
                <div className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white text-xs rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>CANLI
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                  <div className={`w-3 h-3 rounded-full ${listening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <p className="text-sm font-medium">{listening ? "🎙 Dinleniyor..." : awaitingConfirmation ? "⏳ Onay bekleniyor..." : "⏸ Hazır"}</p>
                </div>
                {debugMessage && <div className="p-3 bg-yellow-50 rounded-xl"><p className="text-xs">{debugMessage}</p></div>}
                {step > 0 && <div className="flex gap-2">{[1, 2, 3, 4, 5].map((s) => <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-indigo-500' : 'bg-gray-200'}`}></div>)}</div>}
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Kullanıcı Bilgileri</h2>
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 rounded-xl"><p className="text-xs text-gray-500">Ad</p><p className="text-lg font-semibold">{firstName || "—"}</p></div>
                <div className="p-3 bg-purple-50 rounded-xl"><p className="text-xs text-gray-500">Soyad</p><p className="text-lg font-semibold">{lastName || "—"}</p></div>
                <div className="p-3 bg-blue-50 rounded-xl"><p className="text-xs text-gray-500">Yaş</p><p className="text-lg font-semibold">{age || "—"}</p></div>
                <div className="p-3 bg-pink-50 rounded-xl"><p className="text-xs text-gray-500">Engel Türü</p><p className="text-lg font-semibold">{disability || "—"}</p></div>
              </div>
              {(firstName || lastName || age || disability) && <div className="flex flex-col items-center mt-4 p-4 bg-gray-50 rounded-xl"><h3 className="text-sm font-semibold mb-3">📱 QR Kod</h3><div className="p-3 bg-white rounded-lg shadow"><QRCodeSVG value={qrJson} size={150} /></div></div>}
              {capturedImage && <div className="mt-2"><p className="text-sm font-semibold mb-2">📸 Fotoğraf</p><img src={capturedImage} alt="Foto" className="rounded-xl w-full border-2 shadow-lg" /></div>}
              {step === 5 && (
                <div className="w-full mt-4 px-6 py-3 rounded-xl bg-green-500 text-white font-semibold text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Dashboard'a yönlendiriliyor...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}