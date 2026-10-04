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

## ONLINE 08 — genişletilmiş demo

- Çevik ve Zırhlı gemi seçimi; sağ analog yön ve menzil, sol analog hareket.
- Gerçek oyuncu azsa toplam dört gemiye tamamlayan açıkça etiketlenmiş botlar. Sekiz gerçek oyuncuya kadar otomatik yer açılır.
- Denizde tahta/sandık ganimeti; batınca gemi yükünün %50'si düşer, bankadaki kaynak korunur.
- Her bağlı oyuncunun ana adası ve 105 birim boşaltma alanı. Aktarım kapasite / 30 hızında; alandan çıkınca durur.
- Beş dakikalık ortak maç, 10 saniyelik sonuç ekranı, otomatik yeni tur. Batırma 100, teslim edilen kaynak 5 puan.
- Genel skor, nick, toplam batırma, banka, galibiyet ve maç sayısı sunucuda tutulur. Botlar genel tabloya girmez.
- Sentezlenen sesler, duman, parçalar ve darbe sarsıntısı. İlk dokunma sesi etkinleştirir.

### Kalıcı kayıt

Render Environment içinde `DATABASE_URL` PostgreSQL bağlantısı olmalıdır; bağlantı yalnızca sunucuda kullanılır. Nick ve skorlar Postgres'te korunur; bağlantı olmadan yalnızca oturum tablosu vardır. Ücretsiz Render Postgres 30 gün sonra sona erer; demo süresi sonrası kayıtların taşınması ya da planın değiştirilmesi gerekir.

Tarayıcıdaki rastgele 256 bit anahtar oyuncuyu tanır. IP yalnızca tuzlu özet olarak son bağlantı kaydıdır; aynı Wi-Fi kullanıcılarını birleştirmez. Anahtar herkese açık API'ye veya skor tablosuna çıkmaz. Tarayıcı verisini silmek ya da başka cihaz kullanmak yeni profil oluşturur; cihazlar arası hesap kurtarma henüz yoktur. İlk kayıt nicki kalıcıdır.

Sözdizimi ve canlı servis sağlığı kontrol edilir. Telefon oynanışı, çoklu dokunma ve denge testleri kullanıcıya bırakılır.


## ONLINE 09 — kaptan oturumu
Sunucu tarafından verilen bir yıllık HttpOnly/SameSite çerezi ve yerel anahtar yedeği aynı kaptanı geri getirir. Açılışta /session kayıtlı nicki ve profili yükler; kayıtlı nick tekrar istenmez. Oturum servisi erişilemiyorsa yeni kimlik açılmaz. Safari ve uygulama içi tarayıcı ayrı çerez depolarına sahip olabilir; tarayıcı verisini silmek veya farklı cihaz kullanmak yeni kimlik oluşturur. IP kimlik doğrulaması için kullanılmaz.

5 Ekim 2026 kullanıcı isteğiyle eski demo kayıtları bir kez sıfırlanır. Migration işareti tekrar dağıtımlarda yeni kayıtların sıfırlanmasını önler. Önceki tablo sunucuda naval_profiles_before_reset_20261005 olarak kurtarma kopyasıdır; oyun ve genel tablo bu kayıtlara erişmez.
