# Açık Deniz — Online Demo

Mobil yatay ekran için düşük poligon görünümlü deniz savaşı prototipi.

## Oyuncu akışı

Nickini yaz → Denize açıl → aynı haritada rastgele doğ.

- Oda kodu veya ayarlar menüsü yok.
- Küçük nickler gemilerin üzerinde görünür.
- Joystick ile sür; ateşe bas, yana hedefle, bırak.
- Ön ve arka ateş kapalı; sağ/sol üçlü salvo ve ayrı dolum süreleri.
- Hızlanma, hasarla kesilen onarım, ada engelleri, batma ve yeniden doğma.
- Bir ortak denizde en fazla 8 oyuncu.

## Sunuculu sürüm (önerilen)

Node.js 22+ gerekir:

```sh
npm ci
npm test
npm start
```

Tarayıcıda `http://localhost:3000` açılır. Aynı Wi-Fi'deki telefon bilgisayarın yerel IP adresi ve 3000 portuyla bağlanabilir. İnternet üzerinden oyun için bu sunucu HTTPS/WSS sağlayan bir hizmette çalışmalıdır.

Sunucu HTML'yi de sunar ve WebSocket adresini otomatik ayarlar. Oyuncuların hiçbirinin telefonu sunucu olmaz. Hareket, mermiler, hasar, cooldown ve doğma merkezi sunucuda hesaplanır. Dünya yalnızca bellektedir; yeniden başlatmada sıfırlanır. Hesap, kalıcı ekonomi ve klan sistemi bu demoda yoktur.

### Render için hazır kurulum

Repo kökünde `render.yaml` hazırdır. Render'da bu repodan **Web Service** oluştur:

- Runtime: Node
- Build: `npm ci`
- Start: `npm start`
- Plan: Free
- Health check: `/health`

Yayınlanan Render adresi oyunu ve sunucuyu birlikte açar. Sunucu yayımlandıktan sonra GitHub Pages'i de kullanmak için `network-config.js` içindeki boş adresi `wss://YAYINLANAN-ADRES/ws` ile değiştir.

Ücretsiz Render sunucusu boşta kaldığında uyur; ilk açılış zaman alabilir. Kalıcı üretim sunucusu değildir. Render sunucusu: https://shipgametest.onrender.com/ . GitHub Pages aynı sunucuya bağlanır.

## GitHub Pages sürümü

`network-config.js` yayımlanan WebSocket sunucusunu kullanır. Adres bilerek boş bırakılırsa eski PeerJS bağlantısı kullanılır: ilk oyuncunun cihazı dünyayı yönetir. Host ayrılırsa bağlantı kesilir. Bu modun ikinci bulut tarayıcısıyla bağlantı testi zaman aşımına uğradı; farklı ağlarda çalıştığı doğrulanmadı. Sunuculu sürümün yerine güvenilir kabul edilmemelidir.

## Doğrulama

`npm test` gerçek yerel WebSocket bağlantılarıyla şunları kontrol eder:

- İki istemcinin aynı dünya ve hareketi alması.
- Gerçek oyun istemcisi kodunun sunucuya katılması ve ortak hasarı alması.
- Ateş açısı, salvo, yeniden dolum, hasar ve nick korunarak yeniden doğma.
- Sekiz oyuncu sınırı ve ayrılan oyuncunun kaldırılması.

iPhone Safari ve internette iki ayrı cihaz doğrulaması, sunucu yayını sonrasında yapılmalıdır.

PeerJS 1.5.5 MIT lisansıyla HTML içinde bulunur; lisans `PEERJS-LICENSE.txt` dosyasındadır. Sunuculu mod WebRTC/TURN kullanmaz.

## Online 03 — akıcı çizim

Kendi gemisi yerel hareket tahmini kullanır; sunucu düzeltmeleri yumuşatılır. Diğer gemiler ve kimlikli mermiler 100 ms tamponla kareler arasında çizilir. Hasar ve hareket otoritesi sunucuda kalır. Sunucu veri gönderimi 20 Hz; ekran çizimi cihazın requestAnimationFrame hızında çalışır. Bu sürümün oynanış testi kullanıcıya bırakıldı; sabit 60 FPS veya hatasız hareket henüz doğrulanmadı.
