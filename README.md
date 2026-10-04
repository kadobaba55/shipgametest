# Naval Lab — Ortak deniz prototipi v2

Canlı: https://kadobaba55.github.io/shipgametest/

Oyuncu nickini yazar ve tek ortak dünyaya otomatik bağlanır. Nickler gemilerin üzerinde gösterilir. İlk giren tarayıcı host olur; sonraki oyuncular rastgele güvenli konumda doğar. En fazla 8 oyuncu. Oda kodu ve hesap yok. İlk cihaz sekmesi açık ve ön planda kalmalı. Host kapanırsa dünya kapanır; oyuncular tekrar bağlanarak yeni dünya açabilir. Kalıcı sunucu/host devri yok.

Host gemileri, mermileri, hasarı, yetenekleri, ölüm ve yeniden doğmayı hesaplar. Misafirler hareket girdisi ve ateş/yetenek isteklerini gönderir. 20 Hz durum aktarımı. Ön/arka atış kapalı, yanlar 90 derece, taraflar bağımsız dolar. 3x100 hasar, 1000 can. Batınca 2 saniye sonra rastgele güvenli noktada doğulur. Atış açısı dolguları kaldırıldı; sadece nişan çizgisi var.

PeerJS 1.5.5 HTML içine eklenmiştir (MIT; PEERJS-LICENSE.txt). WebRTC veri bağlantıları ve ücretsiz PeerJS Cloud sinyalleşmesi kullanılır. PeerJS TURN ve Open Relay TCP/TLS 443 aktarım desteği eklendi; servis erişimi/kotası ve ağ kısıtları bağlantıyı etkileyebilir. İlk testte aynı Wi-Fi önerilir. Kamera/mikrofon izni kullanılmaz. Bu sistem prototiptir; kalıcı MMO sunucusu, güvenilir host, hile koruması ve oyuncu verisi yoktur.

Sol joystick hareket. Sağ ateş düğmesini basılı tut, hedef yönünde sürükle, bırak. Masaüstü WASD/yön tuşları; denizde fareyle bas, hedefle ve bırak. Hızlanma 3 sn / cooldown20 sn. Onarım 5 sn içinde yüzde15 / cooldown45 sn, hasar keser.

Oyuncuya ayar paneli veya bot seçeneği gösterilmez. Tüm denge değerleri sabittir. GitHub Pages main / root üzerinden otomatik yayınlanır. Çevrimdışı PWA, Unity 3D, klan ve ekonomi içermez.
