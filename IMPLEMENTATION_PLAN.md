# Naval Lab — Demo genişletme planı

1. Savaş hissi: sentezlenmiş top/isabet sesleri, namlu dumanı, tahta parçaları, kendi gemisinde küçük sarsıntı. Ses ilk kullanıcı dokunuşunda açılır.
2. Botlar: en az dört aktif gemi, en fazla sekiz gerçek oyuncu. Gerçek oyuncular geldikçe botlar ayrılır; bot nickleri açıkça işaretlenir.
3. Ganimet: gemi yük kapasitesi, denizde toplanabilen tahta/sandık parçaları. Batınca taşınan yükün %50'si düşer; bankadaki kaynak korunur.
4. Ana ada: her bağlı oyuncuya ayrı ada. Yakındaki boşaltma alanında aktarım otomatik; tam yük 30 saniye. Ayrılınca durur; adaya dönüş göstergesi vardır.
5. Maç: ortak beş dakika, batırma 100 puan ve teslim edilen her kaynak 5 puan. Sonuç ekranı 10 saniye; sonra yeni maç. Genel skor korunur.
6. Gemi seçimi: Çevik (800 can, 115 hız, 80 yük) ve Zırhlı (1200 can, 78 hız, 140 yük).
7. Genel skor: sunucu hesaplar. Kalıcı, gizli cihaz anahtarı ile profil; ilk kayıt nicki korunur. Aynı IP oyuncuları birleştirmez. IP yalnızca sunucuda tuzlu özet olarak tutulur; tabloya çıkmaz. Tarayıcı verisi silinirse profil kurtarmak için ileride hesap sistemi gerekir.
8. Postgres: DATABASE_URL ile yeniden yayınlamadan bağımsız kayıt. Veritabanı yoksa arayüz kalıcı kayıt iddiasında bulunmaz. Ücretsiz Render Postgres 30 gün ile sınırlıdır.

Doğrulama: kaynakların sözdizimi ve yayın sağlığı. Telefon, çoklu dokunma, savaş dengesi ve performans testleri kullanıcıda.
