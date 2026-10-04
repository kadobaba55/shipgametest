# Naval Lab — Mobil savaş test stüdyosu

Tek dosyalık, bağımlılıksız HTML/Canvas savaş prototipi. Online oyun veya Unity sürümü değildir.

## Oynama

Yatay ekran önerilir. Sol joystick ile gemiyi sür. Ateş düğmesine basılı tut, parmağını ateş yönünde sürükle, bırak. Yalnız iki yanın 90 derecelik sektörlerinde ateş edilir. Sol ve sağ bağımsız yeniden dolar. Her salvo 3 mermi; her mermi 100 hasar; gemi 1000 can. Hızlanma ve onarım düğmeleri mevcut. Hasar onarımı keser. Batınca 2 saniye sonra yeniden doğulur. Adalar hareketi engeller ve mermileri durdurur; gemiler birbirinden geçer.

Ayarlar panelinde hız, dönüş, yavaşlama, mermi hızı, menzil, dolum ve zoom değiştirilebilir. Panel açıkken oyun durur. Ayarlar localStorage ile kaydedilir. İndirme düğmesi JSON dışa aktarır. Rakip sabit, devriye veya savaş botu olabilir. Bot basit prototip davranışıdır.

Masaüstünde WASD/yön tuşları; fareyle denizde basıp hedefle ve bırak.

## GitHub Pages

Repo Settings → Pages → Build and deployment → Source: GitHub Actions. Sonra Actions → Publish Naval Lab → Run workflow. Başarılı yayın adresi deployment çıktısında görünür. Bu repo için beklenen adres: https://kadobaba55.github.io/shipgametest/ (yayın yapılmadan aktif değildir).

Alternatif: Source: Deploy from a branch → main → / (root) → Save. HTML dosyası kökte olduğundan build gerektirmez.

## Yerel

Bilgisayarda bu klasörde `python -m http.server 8000` çalıştır ve http://localhost:8000 aç. Aynı Wi-Fi üzerinden bilgisayarın yerel IP adresiyle telefon da açabilir. Bu sürüm çevrimdışı önbellek/PWA kurmaz.

## Sınırlar

Canvas üzerinde basit izometrik çizim, Unity 3D değildir. Tek cihazda hareket ve atış hissi içindir. Ağ kodu, hesap, klan, ekonomi ve ganimet dahil değildir. iPhone Safari fiziksel cihaz testi ayrıca yapılmalıdır.
