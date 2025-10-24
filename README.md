🏦 BinaryBridgeCU – Engelsiz Akıllı Bankacılık Asistanı

BinaryBridgeCU, engelli bireylerin bankacılık işlemlerinde karşılaştıkları erişim ve iletişim zorluklarını ortadan kaldırmak amacıyla geliştirilmiş yenilikçi bir web uygulamasıdır.
Proje, ses ve görüntü tanıma teknolojilerini kullanarak kullanıcıdan isim, soyisim, yaş ve engel türü bilgilerini alır, bu bilgileri bir QR kod olarak kaydeder ve sonrasında sesli komut sistemi aracılığıyla kullanıcıların dijital bankacılık işlemlerini kolayca gerçekleştirmesine olanak tanır.

🚀 Özellikler

🎙️ Sesli komut desteği ile erişilebilir bankacılık deneyimi

🎥 Kamera ve mikrofon ile kullanıcı bilgisi alma

🔐 QR kod oluşturma ve kimlik doğrulama

🧠 Engel türüne göre kişiselleştirilmiş arayüz

🪄 Yaş uyarlamalı görünüm: Kullanıcı 65 yaş üstündeyse dashboard’daki yazı ve font boyutları otomatik olarak büyür

💻 Kullanıcı dostu dashboard yapısı

🧩 Kullanılan Teknolojiler

Uygulamamız, modern web ve yapay zekâ teknolojileri kullanılarak geliştirilmiştir.
Kullanıcı deneyimini kişiselleştirmek ve erişilebilirliği artırmak için aşağıdaki teknolojiler ve frameworkler entegre edilmiştir:

Katman	Teknolojiler
Frontend	React.js (modern ve hızlı kullanıcı arayüzleri için), Tailwind CSS
Yapay Zekâ ve Bulut Servisleri	Azure AI, Azure Speech Services (sesli ve yazılı geri bildirim için)
QR Kod Yönetimi	QRCode.js – kullanıcı verilerini güvenli ve kişiselleştirilmiş biçimde saklamak için
Ek Frameworkler ve Araçlar	Gemini, Flash (uygulama akışı ve veri işleme optimizasyonu için)
Build Tool	Vite
📂 Proje Yapısı
binarybridge-cu/
│
├── .env
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.cjs
├── tailwind.config.js
├── vite.config.js
│
├── .vscode/
│   └── settings.json
│
└── src/
    ├── App.jsx         # Ana uygulama dosyası
    ├── main.jsx        # Giriş noktası
    ├── index.css       # Stil dosyaları
    └── mainpage.js     # Dashboard bileşeni

⚙️ Kurulum ve Çalıştırma

Projeyi klonla:

git clone https://github.com/kullaniciadi/binarybridge-cu.git
cd binarybridge-cu


Bağımlılıkları yükle:

npm install


Uygulamayı başlat:

npm run dev


Tarayıcıdan şu adrese git:
👉 http://localhost:5173

💡 Amaç

Bu proje, engelli bireylerin dijital bankacılık işlemlerinde bağımsızlık ve erişilebilirlik kazanmasını sağlamak, kapsayıcı finansal teknolojilere öncülük etmeyi hedeflemektedir.

📈 Gelecekte Planlanan Özellikler

🤖 Yapay zekâ destekli asistan (kullanıcı niyetini algılama)

👁️ Yüz tanıma tabanlı güvenlik sistemi

🧩 Mobil uygulama entegrasyonu (React Native)

🌐 Bulut veri senkronizasyonu
