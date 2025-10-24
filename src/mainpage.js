// src/App.js
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gem, LayoutDashboard, ArrowRightLeft, Wallet, CreditCard, Landmark,
  AreaChart, Receipt, Settings, LogOut, Search, Bell, User, Home,
  Send, ChevronRight, QrCode, Eye, EyeOff, TrendingUp, PlusCircle,
  ArrowDownLeft, ArrowUpRight, ShoppingCart, Mic
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

const AZURE_ENDPOINT = process.env.REACT_APP_AZURE_ENDPOINT;
const AZURE_KEY = process.env.REACT_APP_AZURE_KEY;
const DEPLOYMENT = process.env.REACT_APP_AZURE_DEPLOYMENT_NAME;
const API_VERSION = process.env.REACT_APP_AZURE_API_VERSION || "2024-06-01-preview";

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

const SideNav = ({ activeMenu, setActiveMenu }) => (
  <nav className="hidden md:flex md:flex-col md:w-64 bg-white shadow-lg">
    <div className="flex items-center justify-center h-20 shadow-md">
      <Gem className="h-8 w-8 text-primary" />
      <span className="ml-2 text-2xl font-bold text-primary">BinarybridgeCU</span>
    </div>
    <div className="flex-1 overflow-y-auto">
      <ul className="py-6 space-y-2">
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
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeMenu === item.label
                  ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary"
                  : "text-gray-600 hover:bg-gray-50 hover:text-primary"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="ml-4">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
    <div className="p-6 border-t border-gray-200">
      <button className="w-full flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-primary rounded-lg transition-colors text-left">
        <Settings className="h-5 w-5" />
        <span className="ml-4">Ayarlar</span>
      </button>
      <button className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2 text-left">
        <LogOut className="h-5 w-5" />
        <span className="ml-4">Güvenli Çıkış</span>
      </button>
    </div>
  </nav>
);

const TopHeader = ({ onSearch }) => (
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
          src="https://placehold.co/40x40/0052cc/ffffff?text=AY"
          alt="Kullanıcı profili"
          className="h-10 w-10 rounded-full object-cover border-2 border-primary/30"
        />
        <div className="hidden md:block">
          <span className="block text-sm font-semibold text-gray-800">Ahmet Yılmaz</span>
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

const QuickActions = ({ go }) => (
  <div className="bg-white p-6 rounded-2xl shadow-md">
    <h3 className="text-xl font-semibold text-gray-800 mb-5">Hızlı İşlemler</h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
      {[
        { icon: Send, label: "Transfer", action: () => go("Transferler") },
        { icon: Receipt, label: "Ödemeler", action: () => go("Ödemeler") },
        { icon: Landmark, label: "Kredi", action: () => go("Krediler") },
        { icon: PlusCircle, label: "Yeni Hesap", action: () => go("Hesaplarım") },
      ].map((item, idx) => (
        <button type="button" onClick={item.action} className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors" key={idx}>
          <div className="h-14 w-14 rounded-full bg-primary-50 text-primary flex items-center justify-center">
            <item.icon className="h-6 w-6" />
          </div>
          <span className="mt-2 text-sm font-medium text-gray-700">{item.label}</span>
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

const RightSidebar = ({ goCards }) => (
  <div className="lg:col-span-1 space-y-6">
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
            <span className="text-sm">Ahmet Yılmaz</span>
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
      className="bg-gradient-to-br from-primary-600 to-primary-800 text-white p-6 md:p-8 rounded-2xl shadow-xl"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-medium text-primary-200">Genel Bakiye</span>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              onToggle(!isVisible);
            }}
            className="text-primary-200 hover:text-white transition-colors"
            aria-label="Bakiyeyi göster/gizle"
          >
            {isVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <motion.div
        key={isVisible ? "visible" : "hidden"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold mb-4"
      >
        {isVisible ? "₺80.120,50" : "•••.•••,••"}
      </motion.div>

      <div className="flex items-center text-green-300">
        <TrendingUp className="h-5 w-5 mr-1" />
        <span className="text-sm font-medium">+ ₺1.450,20 (Son 7 Gün)</span>
      </div>

      {/* Görsel ışıltı: sadece highlight true ise görünür */}
      <AnimatePresence>
        {highlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="pointer-events-none absolute inset-0 rounded-2xl mix-blend-screen"
            style={{
              background: "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.12), transparent 10%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08), transparent 10%)"
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* === Dashboard içerik yöneticisi: ana grid + sağ sidebar === */
const DashboardMainContent = ({ activeMenu, isBalanceVisible, toggleBalance, balanceHighlight, refreshQR, setActiveMenu }) => {
  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <BalanceCard isVisible={isBalanceVisible} onToggle={(v) => toggleBalance(v)} highlight={balanceHighlight} />
        <QuickActions go={(menu) => setActiveMenu(menu)} />
        <RecentTransactions />
        <AccessibilityQrCode refreshQR={refreshQR} />
      </div>
      <RightSidebar goCards={() => setActiveMenu("Kartlarım")} />
    </main>
  );
};

/* ---------------------------
  Ana uygulama
--------------------------- */
export default function App() {
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
  }, []); // mount only

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
    setQrKey(Date.now());
    setResponseMessage("QR kodu yenilendi.");
    speakText("QR kodu yenilendi.");
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
          />
        );
      case "Transferler":
        return (
          <div className="p-6 bg-white rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Transferler</h2>
            <p>Hesaplar arasında veya başka kişilere para transferi yapabilirsiniz.</p>
            <div className="mt-4">
              <button onClick={() => { setResponseMessage("Transfer örneği başlatılıyor."); speakText("Transfer ekranı açıldı."); }} className="px-4 py-2 bg-primary text-white rounded-md">Yeni Transfer</button>
            </div>
          </div>
        );
      case "Hesaplarım":
        return (
          <div className="p-6 bg-white rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Hesaplarım</h2>
            <p>Vadesiz ve vadeli hesaplarınızın bakiyelerini görebilirsiniz.</p>
          </div>
        );
      case "Kartlarım":
        return (
          <div className="p-6 bg-white rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Kartlarım</h2>
            <p>Kredi ve banka kartlarınızı yönetebilir, limitlerini görebilirsiniz.</p>
          </div>
        );
      case "Krediler":
        return (
          <div className="p-6 bg-white rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Krediler</h2>
            <p>Kredi başvurularınızı ve mevcut kredilerinizi takip edebilirsiniz.</p>
          </div>
        );
      case "Yatırımlar":
        return (
          <div className="p-6 bg-white rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Yatırımlar</h2>
            <p>Borsa ve diğer yatırım araçlarınızı görebilirsiniz.</p>
          </div>
        );
      case "Ödemeler":
        return (
          <div className="p-6 bg-white rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Ödemeler</h2>
            <p>Fatura ve diğer ödemelerinizi buradan gerçekleştirebilirsiniz.</p>
          </div>
        );
      default:
        return <div className="p-6 bg-white rounded-2xl shadow-md">Bölüm bulunamadı.</div>;
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SideNav activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader onSearch={(q) => setResponseMessage(q ? `Arama: ${q}` : "")} />
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
        className={`fixed bottom-24 right-6 p-4 rounded-full shadow-xl text-white ${listening ? "bg-red-500" : "bg-primary"} hover:scale-110 transition-transform z-50`}
        title={listening ? "Dinlemeyi durdur" : "Dinlemeyi başlat"}
      >
        <Mic className="h-6 w-6" />
      </button>

      {/* Azure / assistant mesaj kutusu */}
      {responseMessage && (
        <div className="fixed bottom-32 right-6 bg-white p-4 rounded-lg shadow-lg w-80 z-50">
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
      <div className="fixed bottom-6 left-6 flex items-center space-x-3 bg-white px-4 py-2 rounded-full shadow-lg z-50">
        <Mic className={`h-6 w-6 ${listening ? "text-red-500 animate-pulse" : "text-gray-400"}`} />
        <span className="text-sm text-gray-600">{listening ? "Dinleniyor..." : "Dinleme kapalı"}</span>
      </div>
    </div>
  );
}