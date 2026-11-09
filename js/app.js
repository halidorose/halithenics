/* ==========================================================================
   halithenics — Engine (With Cloud Firestore & Verification & Subscription)
   ========================================================================== */

let currentUser = null;
let savedProgram = null;
let userStats = { workouts: 0, streak: 0, pullups: '-' };

let timerInterval = null;
let timerSecondsLeft = 0;

let pendingRegistration = null;

const EMAILJS_PUBLIC_KEY = "IRUAlQeA4UfYl-tLE";
const EMAILJS_SERVICE_ID = "service_fqyyddw";
const EMAILJS_TEMPLATE_ID = "template_l7bmfyo";

const LEMON_SQUEEZY_CHECKOUT_URL = "https://halithenics.lemonsqueezy.com/checkout/buy/ff9472c4-4798-4d1d-91af-20256282ba30";

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.display = 'none';
      splash.classList.add('hidden');
    }
  }, 800);

  if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY) {
    try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch (e) { console.error(e); }
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    handlePaymentSuccess();
  }

  checkLocalSession();
  renderExerciseGrid('ALL');
  setupHypertrophyObserver();
});

function containsTurkishChars(str) {
  return /[çğıöşüÇĞİÖŞÜ]/.test(str);
}

/* ==========================================================================
   HIPERTROFİ BİLGİ KUTUSU (1 SAAT HAFIZALI)
   ========================================================================== */
function setupHypertrophyObserver() {
  const targets = document.querySelectorAll('.hypertrophy-target');
  if (!targets.length) return;

  const closedAt = localStorage.getItem('halithenics_hypertrophy_closed_at');
  if (closedAt) {
    const timePassed = Date.now() - parseInt(closedAt, 10);
    if (timePassed < 3600000) return; // 1 saat henüz dolmadı
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const checkClosed = localStorage.getItem('halithenics_hypertrophy_closed_at');
        if (checkClosed && (Date.now() - parseInt(checkClosed, 10) < 3600000)) return;
        const box = document.getElementById('hypertrophyInfoBox');
        if (box) box.classList.remove('hidden');
      }
    });
  }, { threshold: 0.5 });

  targets.forEach(t => observer.observe(t));
}

function closeHypertrophyBox() {
  const box = document.getElementById('hypertrophyInfoBox');
  if (box) box.classList.add('hidden');
  localStorage.setItem('halithenics_hypertrophy_closed_at', Date.now().toString());
}

/* ==========================================================================
   LEMON SQUEEZY YÖNLENDİRMESİ VE ABONELİK (1 AY & HAFTADA 3 PROGRAM HAKKI)
   ========================================================================== */
function redirectToLemonSqueezy() {
  if (!currentUser || !currentUser.email) {
    showToast("Pro üyelik satın alabilmek için lütfen önce bir hesap oluşturun veya giriş yapın.", "warning");
    openAuthModal();
    return;
  }

  const userEmail = currentUser.email || '';
  const redirectUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}?payment=success`);
  const finalCheckoutUrl = `${LEMON_SQUEEZY_CHECKOUT_URL}?checkout[email]=${encodeURIComponent(userEmail)}&checkout[custom][user_email]=${encodeURIComponent(userEmail)}&redirect_url=${redirectUrl}`;

  showToast("Lemon Squeezy güvenli ödeme sayfasına yönlendiriliyorsunuz...", "info");
  setTimeout(() => { window.location.href = finalCheckoutUrl; }, 1200);
}

function handlePaymentSuccess() {
  const localUser = JSON.parse(localStorage.getItem('halithenics_currentUser'));
  const user = currentUser || localUser;
  
  if (user && user.email) {
    currentUser = user;
    currentUser.isPro = true;
    currentUser.proExpiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 1 Ay (30 Gün)
    currentUser.proWeeklyCount = 0;
    currentUser.proWeekStartDate = Date.now();
    
    saveUserData();
    updateNavUser();
    showToast("Ödemeniz doğrulandı! 1 Aylık Pro Üyeliğiniz hesabınızda aktifleştirildi.", "info");
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/* ==========================================================================
   SEKME VE MODAL YÖNETİMİ
   ========================================================================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  let borderColor = 'border-brand-500';
  let textColor = 'text-brand-500';
  if (type === 'error') { borderColor = 'border-red-500'; textColor = 'text-red-400'; }
  if (type === 'warning') { borderColor = 'border-yellow-500'; textColor = 'text-yellow-400'; }

  toast.className = `border ${borderColor} bg-dark-950 p-4 text-xs ${textColor} rounded-xl shadow-xl pointer-events-auto transition duration-300 font-sans`;
  toast.innerHTML = `
    <div class="flex justify-between items-center gap-4">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-white">✕</button>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => { if (toast) toast.remove(); }, 4000);
}

function showTab(tabName) {
  const tabs = ['home', 'articles', 'generator', 'myProgram', 'pricing'];
  tabs.forEach(t => {
    const el = document.getElementById(`sec-${t}`);
    if (el) el.classList.add('hidden');
  });

  if (tabName === 'generator' && (!currentUser || !savedProgram)) {
    resetWizardInputs();
  }

  const target = document.getElementById(`sec-${tabName}`);
  if (target) target.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetWizardInputs() {
  currentWizStep = 1;
  const h = document.getElementById('wizHeight'); if (h) h.value = '';
  const w = document.getElementById('wizWeight'); if (w) w.value = '';
  const a = document.getElementById('wizAge'); if (a) a.value = '';
  const p = document.getElementById('wizPullups'); if (p) p.value = '';
  
  const s1 = document.getElementById('wizStep1'); if (s1) s1.classList.remove('hidden');
  const s2 = document.getElementById('wizStep2'); if (s2) s2.classList.add('hidden');
  const s3 = document.getElementById('wizStep3'); if (s3) s3.classList.add('hidden');

  const ind1 = document.getElementById('step-ind-1'); if (ind1) ind1.className = "text-brand-500 font-bold";
  const ind2 = document.getElementById('step-ind-2'); if (ind2) ind2.className = "";
  const ind3 = document.getElementById('step-ind-3'); if (ind3) ind3.className = "";
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('hidden');
}

function openAuthModal() { 
  const el = document.getElementById('authModal');
  if (el) el.classList.remove('hidden'); 
}
function closeAuthModal() { 
  const el = document.getElementById('authModal');
  if (el) el.classList.add('hidden'); 
  cancelVerification();
}

/* ==========================================================================
   YASAL METİNLER MODALI (Gizlilik, Kullanım Şartları, İade)
   ========================================================================== */
function openLegalModal(type) {
  const modal = document.getElementById('legalModal');
  const content = document.getElementById('legalModalContent');
  if (!modal || !content) return;

  if (type === 'privacy') {
    content.innerHTML = `
      <h3 class="text-xl font-bold font-serif text-gray-100 border-b border-gray-800 pb-2">Gizlilik Politikası (Privacy Policy)</h3>
      <p class="text-[11px] text-gray-400">Son Güncelleme: Kasım 2026</p>
      <p>halithenics ("Sitemiz"), kullanıcılarımızın gizliliğine ve kişisel verilerinin korunmasına büyük önem vermektedir. Bu bildirim, 6698 sayılı KVKK ve GDPR uyumlu veri işleme esaslarımızı açıklar.</p>
      <h4 class="font-bold text-gray-200 text-sm mt-3">1. Toplanan Veriler</h4>
      <p>Sitemize üye olurken veya Google Sign-In kullanırken sağladığınız e-posta adresi, profil bilgileri, vücut ölçüleri (boy, kilo, yaş) ve antrenman tercihleri veritabanımızda güvenle saklanır.</p>
      <h4 class="font-bold text-gray-200 text-sm mt-3">2. Verilerin Kullanımı ve Saklanması</h4>
      <p>Toplanan veriler yalnızca kişiselleştirilmiş calisthenics antrenman ve makro beslenme programları oluşturmak, oturumunuzu açık tutmak ve üyelik statünüzü (Ücretsiz/Pro) doğrulamak için kullanılır. Verileriniz üçüncü taraflarla reklam amacıyla asla paylaşılmaz.</p>
      <h4 class="font-bold text-gray-200 text-sm mt-3">3. Ödeme ve İşlem Güvenliği</h4>
      <p>Ödeme işlemleri uluslararası ödeme altyapısı Lemon Squeezy aracılığıyla yürütülmektedir. Kredi kartı veya banka bilgileriniz halithenics sunucularında asla tutulmaz veya işlenmez.</p>
    `;
  } else if (type === 'terms') {
    content.innerHTML = `
      <h3 class="text-xl font-bold font-serif text-gray-100 border-b border-gray-800 pb-2">Kullanım Şartları (Terms of Service)</h3>
      <p class="text-[11px] text-gray-400">Son Güncelleme: Kasım 2026</p>
      <p>halithenics platformunu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.</p>
      <h4 class="font-bold text-gray-200 text-sm mt-3">1. Hizmet Kapsamı</h4>
      <p>halithenics, vücut ağırlığı antrenmanlarına yönelik yapay zeka ve algoritma destekli kişisel antrenman programı oluşturma hizmeti sunan dijital bir platformdur.</p>
      <h4 class="font-bold text-gray-200 text-sm mt-3">2. Hesap Sorumluluğu</h4>
      <p>Kullanıcılar hesap güvenliklerinden kendileri sorumludur. Pro üyelikler kişiye özel olup başka hesaplarla paylaşılamaz veya devredilemez.</p>
      <h4 class="font-bold text-gray-200 text-sm mt-3">3. Sağlık ve Sorumluluk Reddi</h4>
      <p>Sitede sunulan egzersiz tavsiyeleri ve programlar genel bilgilendirme ve spor rehberliği amaçlıdır. Herhangi bir tıbbi teşhis veya tedavi yerine geçmez. Antrenmanlara başlamadan önce sağlık durumunuzu doktorunuza danışmanız önerilir.</p>
    `;
  } else if (type === 'refund') {
    content.innerHTML = `
      <h3 class="text-xl font-bold font-serif text-gray-100 border-b border-gray-800 pb-2">İade ve İptal Politikası (Refund Policy)</h3>
      <p class="text-[11px] text-gray-400">Son Güncelleme: Kasım 2026</p>
      <h4 class="font-bold text-gray-200 text-sm mt-3">1. Dijital İçerik İade Esasları</h4>
      <p>halithenics Pro planı, satın alma anında anında erişime açılan dijital antrenman içerikleri ve algoritma hizmetlerini kapsar.</p>
      <h4 class="font-bold text-gray-200 text-sm mt-3">2. İade Koşulları</h4>
      <p>Mesafeli Sözleşmeler Yönetmeliği uyarınca, elektronik ortamda anında ifa edilen dijital içerik hizmetlerinde cayma hakkı sınırlıdır. Ancak teknik bir aksaklık veya hizmete erişim sağlanamaması durumunda, satın alımdan itibaren 14 gün içinde yapılan başvurular değerlendirilerek iade işlemi gerçekleştirilir.</p>
      <h4 class="font-bold text-gray-200 text-sm mt-3">3. İletişim</h4>
      <p>İade veya destek talepleriniz için destek kanalımız üzerinden bizimle iletişime geçebilirsiniz.</p>
    `;
  }

  modal.classList.remove('hidden');
}

function closeLegalModal() {
  const modal = document.getElementById('legalModal');
  if (modal) modal.classList.add('hidden');
}

/* ==========================================================================
   FIRESTORE BULUT VERİTABANI MOTORU & YEREL OTURUM
   ========================================================================== */
async function checkLocalSession() {
  const localUser = JSON.parse(localStorage.getItem('halithenics_currentUser'));
  const guestProg = JSON.parse(localStorage.getItem('halithenics_guestProgram'));

  if (localUser && localUser.email) {
    const cleanEmail = localUser.email.toLowerCase().trim();
    
    let dbUser = null;
    if (window.db_getUserFromFirestore) {
      dbUser = await window.db_getUserFromFirestore(cleanEmail);
    }
    
    currentUser = dbUser || localUser;
    
    checkSubscriptionStatus();
    updateNavUser();
    
    savedProgram = currentUser.program || guestProg || null;
    userStats = currentUser.stats || { workouts: 0, streak: 0, pullups: savedProgram ? savedProgram.pullups : '-' };
    
    if (savedProgram) {
      const badge = document.getElementById('savedBadge');
      if (badge) badge.classList.remove('hidden');
      renderProgramDashboard();
    }
  } else if (guestProg) {
    savedProgram = guestProg;
    userStats = { workouts: 0, streak: 0, pullups: guestProg.pullups || '-' };
    const badge = document.getElementById('savedBadge');
    if (badge) badge.classList.remove('hidden');
    renderProgramDashboard();
  }
}

function checkSubscriptionStatus() {
  if (!currentUser) return;
  
  // 1 Ay (30 Gün) Dolma Kontrolü
  if (currentUser.isPro && currentUser.proExpiresAt) {
    if (Date.now() > currentUser.proExpiresAt) {
      currentUser.isPro = false;
      currentUser.proExpiresAt = null;
      currentUser.proWeeklyCount = 0;
      saveUserData();
      showToast("1 Aylık Pro üyelik süreniz doldu. Hesabınız Ücretsiz plana güncellendi.", "warning");
    }
  }

  // Haftalık 3 Program Hakkı Sıfırlama Kontrolü (Pro Kullanıcılar İçin)
  if (currentUser.isPro) {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (!currentUser.proWeekStartDate || (Date.now() - currentUser.proWeekStartDate > SEVEN_DAYS_MS)) {
      currentUser.proWeekStartDate = Date.now();
      currentUser.proWeeklyCount = 0;
      saveUserData();
    }
  }
}

function saveUserData() {
  if (savedProgram) {
    localStorage.setItem('halithenics_guestProgram', JSON.stringify(savedProgram));
  }

  if (!currentUser || !currentUser.email) return;
  const cleanEmail = currentUser.email.toLowerCase().trim();
  
  currentUser.program = savedProgram;
  currentUser.stats = userStats;
  
  localStorage.setItem('halithenics_currentUser', JSON.stringify(currentUser));
  
  if (window.db_saveUserToFirestore) {
    window.db_saveUserToFirestore(cleanEmail, currentUser);
  }
}

async function handleEmailAuth(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('authEmail');
  const passInput = document.getElementById('authPass');
  
  const email = emailInput ? emailInput.value.toLowerCase().trim() : "";
  const password = passInput ? passInput.value : "";

  if (containsTurkishChars(email)) {
    showToast("E-posta adresinde Türkçe karakter kullanılamaz!", "error");
    return;
  }

  if (containsTurkishChars(password)) {
    showToast("Şifrenizde Türkçe karakter kullanılamaz!", "error");
    return;
  }

  if (!email || !email.includes('@')) {
    showToast("Lütfen geçerli bir e-posta adresi girin.", "error");
    return;
  }

  if (password.length < 6) {
    showToast("Şifreniz en az 6 karakter olmalıdır.", "warning");
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  
  let existingDB = null;
  if (window.db_getUserFromFirestore) {
    existingDB = await window.db_getUserFromFirestore(cleanEmail);
  }

  if (existingDB) {
    if (existingDB.password && existingDB.password !== password) {
      showToast("Bu e-posta adresi zaten kullanılıyor. Şifreniz hatalı!", "error");
      return;
    }
    
    currentUser = existingDB;
    savedProgram = currentUser.program || savedProgram || null;
    userStats = currentUser.stats || { workouts: 0, streak: 0, pullups: savedProgram ? savedProgram.pullups : '-' };
    
    saveUserData();
    checkSubscriptionStatus();
    updateNavUser();
    closeAuthModal();
    showToast(`Tekrar hoş geldin, ${cleanEmail.split('@')[0]}!`, "info");

    if (savedProgram) {
      const badge = document.getElementById('savedBadge');
      if (badge) badge.classList.remove('hidden');
      renderProgramDashboard();
      showTab('myProgram');
    }
  } else {
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    pendingRegistration = { email: cleanEmail, password, code: generatedCode };

    showToast("Doğrulama kodu e-postanıza gönderiliyor...", "info");

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      user_email: cleanEmail,
      passcode: generatedCode
    })
    .then(() => {
      showToast("6 haneli doğrulama kodu e-postanıza gönderildi!", "info");
      document.getElementById('authMainForm').classList.add('hidden');
      document.getElementById('verifyForm').classList.remove('hidden');
    })
    .catch((err) => {
      console.error("EmailJS Gönderim Hatası:", err);
      showToast("Doğrulama kodu gönderilemedi. Lütfen e-posta adresinizi kontrol edin.", "error");
    });
  }
}

function handleVerifyCodeSubmit(e) {
  if (e) e.preventDefault();
  const inputCode = document.getElementById('verifyCodeInput').value.trim();

  if (!pendingRegistration) {
    showToast("Kayıt oturumu bulunamadı. Lütfen tekrar deneyin.", "error");
    cancelVerification();
    return;
  }

  if (inputCode === pendingRegistration.code) {
    currentUser = { 
      email: pendingRegistration.email, 
      password: pendingRegistration.password,
      isPro: false, 
      proExpiresAt: null, 
      proWeeklyCount: 0,
      proWeekStartDate: null,
      lastCreated: null, 
      program: savedProgram || null,
      stats: userStats || { workouts: 0, streak: 0, pullups: '-' }
    };

    saveUserData();
    updateNavUser();
    closeAuthModal();
    showToast("E-posta adresiniz doğrulandı. Hesabınız başarıyla oluşturuldu!", "info");
    
    cancelVerification();
  } else {
    showToast("Girdiğiniz doğrulama kodu hatalı! Lütfen tekrar kontrol edin.", "error");
  }
}

function cancelVerification() {
  pendingRegistration = null;
  const mainF = document.getElementById('authMainForm'); if (mainF) mainF.classList.remove('hidden');
  const verF = document.getElementById('verifyForm'); if (verF) verF.classList.add('hidden');
  const inp = document.getElementById('verifyCodeInput'); if (inp) inp.value = '';
}

async function handleGoogleLoginSuccess(email) {
  const cleanEmail = email.toLowerCase().trim();
  
  let existingDB = null;
  if (window.db_getUserFromFirestore) {
    existingDB = await window.db_getUserFromFirestore(cleanEmail);
  }

  if (existingDB) {
    currentUser = existingDB;
    savedProgram = currentUser.program || savedProgram || null;
    userStats = currentUser.stats || { workouts: 0, streak: 0, pullups: savedProgram ? savedProgram.pullups : '-' };
    showToast(`Google ile giriş yapıldı: ${cleanEmail}`, "info");
  } else {
    currentUser = { 
      email: cleanEmail, 
      isPro: false, 
      proExpiresAt: null, 
      proWeeklyCount: 0,
      proWeekStartDate: null,
      lastCreated: null, 
      program: savedProgram || null,
      stats: userStats || { workouts: 0, streak: 0, pullups: '-' }
    };
    showToast(`Hesabınız Google ile oluşturuldu: ${cleanEmail}`, "info");
  }

  saveUserData();
  checkSubscriptionStatus();
  updateNavUser();
  closeAuthModal();

  if (savedProgram) {
    const badge = document.getElementById('savedBadge');
    if (badge) badge.classList.remove('hidden');
    renderProgramDashboard();
    showTab('myProgram');
  }
}

function logout() {
  currentUser = null;
  savedProgram = null;
  userStats = { workouts: 0, streak: 0, pullups: '-' };
  localStorage.removeItem('halithenics_currentUser');
  localStorage.removeItem('halithenics_guestProgram');
  
  if (window.firebaseSignOut) {
    window.firebaseSignOut();
  }

  updateNavUser();
  const badge = document.getElementById('savedBadge');
  if (badge) badge.classList.add('hidden');
  const noProg = document.getElementById('noProgramView');
  if (noProg) noProg.classList.remove('hidden');
  const progView = document.getElementById('programView');
  if (progView) progView.classList.add('hidden');
  
  resetWizardInputs();
  showTab('home');
  showToast("Oturum kapatıldı.", "info");
}

function updateNavUser() {
  const area = document.getElementById('authNavArea');
  const badge = document.getElementById('userStatusBadge');
  
  if (!area) return;

  if (currentUser && currentUser.email) {
    const isPro = currentUser.isPro;
    area.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-semibold">
        <span class="${isPro ? 'text-yellow-400 font-bold' : 'text-gray-300'}">
          ${currentUser.email.split('@')[0]} ${isPro ? '[Pro]' : '[Ücretsiz]'}
        </span>
        <button onclick="logout()" class="text-red-400 text-[11px] underline ml-2">Çıkış Yap</button>
      </div>
    `;
    
    if (badge) {
      if (isPro && currentUser.proExpiresAt) {
        const daysLeft = Math.ceil((currentUser.proExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        const weeklyRemaining = 3 - (currentUser.proWeeklyCount || 0);
        badge.innerText = `Pro Sporcu (${daysLeft} Gün Kalan | Haftalık Hak: ${weeklyRemaining}/3)`;
      } else {
        badge.innerText = 'Ücretsiz Hesap';
      }
    }
  } else {
    area.innerHTML = `
      <button onclick="openAuthModal()" class="bg-dark-900 border border-gray-700 hover:border-brand-500 text-gray-200 px-4 py-2 text-xs font-semibold rounded-lg transition">
        Giriş Yap / Kayıt Ol
      </button>
    `;
    if (badge) badge.innerText = 'Giriş Yapılmadı';
  }
}

/* ==========================================================================
   SİHİRBAZ VE PROGRAM PANOLARI
   ========================================================================== */

let currentWizStep = 1;

function nextWizStep(step) {
  if (step === 2) {
    const h = parseFloat(document.getElementById('wizHeight').value);
    const w = parseFloat(document.getElementById('wizWeight').value);
    const a = parseInt(document.getElementById('wizAge').value);

    if (!h || h < 100 || h > 250 || !w || w < 30 || w > 250 || !a || a < 10 || a > 100) {
      showToast("Lütfen geçerli boy, kilo ve yaş değerleri giriniz.", "error");
      return;
    }
  }

  const currentEl = document.getElementById(`wizStep${currentWizStep}`);
  const nextEl = document.getElementById(`wizStep${step}`);
  if (currentEl) currentEl.classList.add('hidden');
  if (nextEl) nextEl.classList.remove('hidden');
  
  const curInd = document.getElementById(`step-ind-${currentWizStep}`);
  const nextInd = document.getElementById(`step-ind-${step}`);
  if (curInd) curInd.classList.remove('text-brand-500', 'font-bold');
  if (nextInd) nextInd.classList.add('text-brand-500', 'font-bold');
  
  currentWizStep = step;
}

function handleWizardSubmit(e) {
  if (e) e.preventDefault();

  const now = Date.now();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  // Program Oluşturma Sınırları ve Kontrolleri
  if (currentUser && currentUser.email) {
    if (!currentUser.isPro) {
      // Ücretsiz Hesap: 3 günde 1 program hakkı
      if (currentUser.lastCreated && (now - currentUser.lastCreated < THREE_DAYS_MS)) {
        const daysLeft = Math.ceil((THREE_DAYS_MS - (now - currentUser.lastCreated)) / (1000 * 60 * 60 * 24));
        showToast(`Ücretsiz hesaplarda 3 günde 1 program oluşturulabilir. Kalan süre: ${daysLeft} gün. Pro hesaba geçerek haftada 3 kez program kurabilirsiniz.`, "warning");
        return;
      }
    } else {
      // Pro Hesap: Haftada 3 kez program kurma hakkı
      if (!currentUser.proWeekStartDate || (now - currentUser.proWeekStartDate > SEVEN_DAYS_MS)) {
        currentUser.proWeekStartDate = now;
        currentUser.proWeeklyCount = 0;
      }

      if ((currentUser.proWeeklyCount || 0) >= 3) {
        showToast("Pro hesabınızın bu haftalık program oluşturma hakkını doldurdunuz (3/3). Hakkınız 7 günlük periyot sonunda sıfırlanacaktır.", "warning");
        return;
      }
    }
  }

  const pullups = parseInt(document.getElementById('wizPullups').value);
  if (isNaN(pullups) || pullups < 0 || pullups > 100) {
    showToast("Lütfen geçerli bir barfiks sayısı giriniz.", "error");
    return;
  }

  const height = parseFloat(document.getElementById('wizHeight').value);
  const weight = parseFloat(document.getElementById('wizWeight').value);
  const age = parseInt(document.getElementById('wizAge').value);
  const goalEl = document.querySelector('input[name="wizGoal"]:checked');
  const goal = goalEl ? goalEl.value : 'maintain';
  const days = parseInt(document.getElementById('wizDays').value);

  // Mifflin-St Jeor TDEE & Makro Hesaplaması
  let bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  let tdee = bmr * 1.375;
  if (goal === 'lose') tdee -= 400;
  if (goal === 'gain') tdee += 400;

  const protein = Math.round(weight * 2.0);
  const fat = Math.round(weight * 0.9);
  const carb = Math.max(0, Math.round((tdee - ((protein * 4) + (fat * 9))) / 4));

  savedProgram = {
    cal: Math.round(tdee),
    protein, carb, fat, pullups,
    goal, weight, height, age, days
  };

  userStats.pullups = pullups;

  if (currentUser && currentUser.email) {
    currentUser.lastCreated = now;
    if (currentUser.isPro) {
      currentUser.proWeeklyCount = (currentUser.proWeeklyCount || 0) + 1;
    }
  }

  saveUserData();

  const badge = document.getElementById('savedBadge');
  if (badge) badge.classList.remove('hidden');
  renderProgramDashboard();
  showTab('myProgram');
  
  if (currentUser && currentUser.email) {
    showToast("Calisthenics antrenman programınız başarıyla oluşturuldu ve hesabınıza kaydedildi.", "info");
  } else {
    showToast("Programınız özel algoritma ile oluşturuldu! (Hesabınıza kaydetmek için giriş yapabilirsiniz)", "info");
  }
}

function renderProgramDashboard() {
  if (!savedProgram) return;

  const noProg = document.getElementById('noProgramView');
  if (noProg) noProg.classList.add('hidden');
  const progView = document.getElementById('programView');
  if (progView) progView.classList.remove('hidden');

  document.getElementById('dashCal').innerText = savedProgram.cal + ' kcal';
  document.getElementById('dashProtein').innerText = savedProgram.protein + 'g';
  document.getElementById('dashCarb').innerText = savedProgram.carb + 'g';
  document.getElementById('dashFat').innerText = savedProgram.fat + 'g';

  document.getElementById('statWorkouts').innerText = userStats.workouts;
  document.getElementById('statStreak').innerText = userStats.streak + ' Gün';
  document.getElementById('statPullups').innerText = userStats.pullups;

  const container = document.getElementById('weeklyWorkoutCards');
  if (!container) return;
  container.innerHTML = '';

  const p = savedProgram.pullups || 0;
  const h = savedProgram.height || 175;
  const w = savedProgram.weight || 70;
  const daysFreq = savedProgram.days || 4;
  const goal = savedProgram.goal || 'maintain';

  // Bilimsel Biyomekanik & Moment Kolu Faktörü (BMI & Boy Uzunluğu)
  const bmi = (w / ((h / 100) * (h / 100))).toFixed(1);
  const isHighLeverage = h > 182 || bmi > 25; // Uzun boy veya yüksek kitle durumunda eklem yükü artar

  // Hareket Kademeleri
  let pushEx1 = '4 Set x 10 Paralel Dip';
  let pushEx2 = '4 Set x 12 Defisit Şınav';
  let pullEx1 = '4 Set x 8 Nizami Barfiks';
  let pullEx2 = '3 Set x 10 Eğik Çekiş (Australian Row)';
  let legEx1 = '4 Set x 15 Çömelme (Air Squat)';
  let legEx2 = '3 Set x 12 Bulgarian Split Squat';

  if (p < 4) {
    pushEx1 = isHighLeverage ? '4 Set x 10 Eğimli Şınav (Incline Push-Up)' : '4 Set x 8 Nizami Şınav';
    pushEx2 = '3 Set x 6 Yavaş İnişli Negatif Dip';
    pullEx1 = '4 Set x 6 Negatif Barfiks (5sn Yavaş İniş)';
    pullEx2 = '3 Set x 10 Eğik Çekiş (Australian Row)';
    legEx1 = '4 Set x 15 Vücut Ağırlığı Squat';
    legEx2 = '3 Set x 10 Adımlama Lunge';
  } else if (p <= 10) {
    pushEx1 = '4 Set x 10 Paralel Dip';
    pushEx2 = '4 Set x 12 Şınav (Göğüs Aktivasyonu)';
    pullEx1 = `4 Set x ${Math.max(5, Math.round(p * 0.8))} Tekrar Nizami Barfiks`;
    pullEx2 = '3 Set x 10 Chin-Up (Biceps Odağı)';
    legEx1 = '4 Set x 12 Sıçramalı Squat (Jump Squat)';
    legEx2 = '3 Set x 10 Bulgarian Split Squat';
  } else {
    pushEx1 = '5 Set x 8 Ağırlıklı / Defisit Dip';
    pushEx2 = '4 Set x 8 Okçu Şınavı (Archer Push-Up)';
    pullEx1 = '5 Set x 6 Yüksek / Ağırlıklı Barfiks';
    pullEx2 = '4 Set x 8 Sternum Barfiks';
    legEx1 = '4 Set x 8 Pistol Squat (Tek Bacak Squat)';
    legEx2 = '4 Set x 12 Nordic Hamstring Curl Prep';
  }

  let daysData = [];

  if (daysFreq === 3) {
    daysData = [
      { day: 'Pazartesi', type: 'Gün 1: Tüm Vücut A', ex: [pullEx1, pushEx1, legEx1, '3 Set x 45 Saniye Kore Plank'] },
      { day: 'Salı', type: 'Aktif Dinlenme & Mobilite', ex: ['30 Dk Tempolu Yürüyüş & Omuz Esnetme'] },
      { day: 'Çarşamba', type: 'Gün 2: Tüm Vücut B', ex: [pullEx2, pushEx2, legEx2, '3 Set x 12 Barda Diz Kaldırma'] },
      { day: 'Perşembe', type: 'Aktif Dinlenme & Eklem Sağlığı', ex: ['Köpük Rulo Masajı & Kalça Mobilite'] },
      { day: 'Cuma', type: 'Gün 3: Tüm Vücut C', ex: ['3 Set x Maksimum Şınav', '3 Set x Maksimum Barfiks', '4 Set x 15 Squat', '3 Set x 30sn Hollow Body Hold'] },
      { day: 'Cumartesi', type: 'Teknik & Bar Uyumu', isWeekend: true, ex: ['4 Set x 20 Saniye Barda Asılı Kalma', '3 Set x 8 Skapular Barfiks'] },
      { day: 'Pazar', type: 'Tam Dinlenme', isWeekend: true, ex: ['Kas Onarımı ve Rejenerasyon'] }
    ];
  } else if (daysFreq === 5) {
    daysData = [
      { day: 'Pazartesi', type: 'Gün 1: İtiş (Push - Göğüs & Omuz)', ex: [pushEx1, pushEx2, '3 Set x 10 Pike Push-Up (Omuz)', '3 Set x 15 Elmas Şınav'] },
      { day: 'Salı', type: 'Gün 2: Çekiş (Pull - Sırt & Biceps)', ex: [pullEx1, pullEx2, '3 Set x 10 Face Pull', '3 Set x 12 Vücut Ağırlığı Biceps Curl'] },
      { day: 'Çarşamba', type: 'Gün 3: Alt Vücut & Core', ex: [legEx1, legEx2, '4 Set x 12 Borda Diz/Bacak Kaldırma', '3 Set x 45sn Plank'] },
      { day: 'Perşembe', type: 'Dinlenme & Mobilite', ex: ['Tüm Vücut Esnetme & Bilek Isınması'] },
      { day: 'Cuma', type: 'Gün 4: Üst Vücut Hacim', ex: ['4 Set x 10 Nizami Barfiks', '4 Set x 12 Dip', '3 Set x 15 Şınav'] },
      { day: 'Cumartesi', type: 'Gün 5: Beceri & Core (Skill Day)', isWeekend: true, ex: ['4 Set x 5 Göğse Çekiş / Muscle-Up Geçişi', '4 Set x 15 Saniye L-Sit / Tuck Hold'] },
      { day: 'Pazar', type: 'Tam Dinlenme', isWeekend: true, ex: ['Kas Onarımı ve Zihinsel Yenilenme'] }
    ];
  } else {
    daysData = [
      { day: 'Pazartesi', type: 'Gün 1: Üst Vücut A (İtiş & Çekiş)', ex: [pullEx1, pushEx1, '3 Set x 10 Eğik Çekiş', '3 Set x 10 Pike Push-Up'] },
      { day: 'Salı', type: 'Gün 2: Alt Vücut & Core A', ex: [legEx1, legEx2, '3 Set x 12 Bacak Kaldırma', '3 Set x 45sn Plank'] },
      { day: 'Çarşamba', type: 'Dinlenme & Mobilite', ex: ['Aktif Dinlenme & Köpük Rulo Masajı'] },
      { day: 'Perşembe', type: 'Gün 3: Üst Vücut B (Omuz & Hacim)', ex: [pullEx2, pushEx2, '3 Set x 12 Chin-Up', '3 Set x 15 Elmas Şınav'] },
      { day: 'Cuma', type: 'Gün 4: Alt Vücut & Patlayıcılık B', ex: ['4 Set x 12 Jump Squat', '3 Set x 10 RDL (Vücut Ağırlığı)', '4 Set x 10 Barda Bacak Kaldırma'] },
      { day: 'Cumartesi', type: 'Gelişmiş Teknikler', isWeekend: true, ex: ['4 Set x 5 Göğse Çekiş Barfiks', '3 Set x 30 Saniye Hollow Body Hold'] },
      { day: 'Pazar', type: 'Tam Dinlenme', isWeekend: true, ex: ['Kas Onarımı ve Rejenerasyon'] }
    ];
  }

  daysData.forEach((d) => {
    const isLocked = d.isWeekend && (!currentUser || !currentUser.isPro);
    const card = document.createElement('div');
    
    if (isLocked) {
      card.className = "border border-yellow-500/30 bg-dark-950/40 opacity-60 p-4 rounded-xl cursor-pointer hover:border-yellow-500 transition";
      card.onclick = () => {
        showToast("Hafta sonu kilitli içeriklerini açmak için Pro plana geçmelisiniz.", "warning");
        showTab('pricing');
      };
      card.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <span class="text-brand-500 font-bold">${d.day}</span>
            <div class="text-gray-400 font-semibold mt-0.5">${d.type}</div>
          </div>
          <span class="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] px-2.5 py-1 rounded font-bold">Pro Kilitli (Tıkla & Yükselt)</span>
        </div>
      `;
    } else {
      card.className = "border border-gray-800 bg-dark-950 p-4 rounded-xl";
      let exChecklist = d.ex.map((e) => `
        <label class="flex items-center gap-2 cursor-pointer mt-1.5">
          <input type="checkbox" onchange="toggleExerciseCheck(this)" class="accent-brand-500">
          <span class="text-gray-300 font-sans">${e}</span>
        </label>
      `).join('');

      card.innerHTML = `
        <div class="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
          <span class="text-brand-500 font-bold">${d.day}</span>
          <span class="text-gray-400 font-semibold">${d.type}</span>
        </div>
        <div class="space-y-1">${exChecklist}</div>
      `;
    }
    container.appendChild(card);
  });
}

function toggleExerciseCheck(cb) {
  const label = cb.parentElement.querySelector('span');
  if (cb.checked) {
    label.classList.add('line-through', 'text-gray-600');
    userStats.workouts += 1;
  } else {
    label.classList.remove('line-through', 'text-gray-600');
    userStats.workouts = Math.max(0, userStats.workouts - 1);
  }
  saveUserData();
  const statW = document.getElementById('statWorkouts');
  if (statW) statW.innerText = userStats.workouts;
}

/* ==========================================================================
   KRONOMETRE
   ========================================================================== */
function setTimer(sec) {
  pauseTimer();
  timerSecondsLeft = sec;
  updateTimerDisplay();
  const status = document.getElementById('timerStatus');
  if (status) status.innerText = "Hazır";
}

function startTimer() {
  if (timerSecondsLeft <= 0) timerSecondsLeft = 90;
  pauseTimer();
  const status = document.getElementById('timerStatus');
  if (status) status.innerText = "Çalışıyor";
  
  timerInterval = setInterval(() => {
    timerSecondsLeft--;
    updateTimerDisplay();
    if (timerSecondsLeft <= 0) {
      pauseTimer();
      if (status) status.innerText = "Bitti";
      showToast("Set dinlenme süresi doldu!", "info");
    }
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const status = document.getElementById('timerStatus');
  if (status) status.innerText = "Durduruldu";
}

function resetTimer() {
  pauseTimer();
  timerSecondsLeft = 0;
  updateTimerDisplay();
  const status = document.getElementById('timerStatus');
  if (status) status.innerText = "Hazır";
}

function updateTimerDisplay() {
  const m = Math.floor(timerSecondsLeft / 60);
  const s = timerSecondsLeft % 60;
  const disp = document.getElementById('timerDisplay');
  if (disp) disp.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

/* ==========================================================================
   HAREKET KÜTÜPHANESİ
   ========================================================================== */
const exerciseData = [
  { id: '1', name: 'Nizami Şınav (Push-Up)', level: 'BEGINNER', levelTr: 'Başlangıç', muscle: 'Göğüs, Ön Omuz, Triceps', diff: '2/5', desc: 'Vücudun kalas gibi düz tutulduğu, göğsün yere 2 cm kalana kadar indiği temel itiş hareketi.' },
  { id: '2', name: 'Nizami Barfiks (Pull-Up)', level: 'INTERMEDIATE', levelTr: 'Orta Seviye', muscle: 'Kanat, Biceps, Üst Sırt', diff: '3.5/5', desc: 'Sallanma yapmadan, çenenin barı geçtiği ve aşağıda kolların tam açıldığı nizami çekiş.' },
  { id: '3', name: 'Paralel Bar Dip', level: 'INTERMEDIATE', levelTr: 'Orta Seviye', muscle: 'Alt Göğüs, Triceps, Ön Omuz', diff: '3/5', desc: 'Paralel barda dirseklerin 90 derece bükülerek vücudun aşağı bırakılıp itildiği temel hareket.' },
  { id: '4', name: 'Pike Push-Up (Omuz Şınavı)', level: 'BEGINNER', levelTr: 'Başlangıç', muscle: 'Omuz (Deltoid), Triceps', diff: '2.5/5', desc: 'Kalçanın yukarıda A formu oluşturduğu, dikey omuz itiş gücünü geliştiren egzersiz.' },
  { id: '5', name: 'Bar Muscle-Up', level: 'ADVANCED', levelTr: 'İleri Seviye', muscle: 'Tüm Üst Vücut Patlayıcı Güç', diff: '5/5', desc: 'Çekiş gücü ile göğsün barın üstüne geçirildiği ve dip itişiyle tamamlanan üst seviye hareket.' },
  { id: '6', name: 'Hollow Body Hold', level: 'BEGINNER', levelTr: 'Başlangıç', muscle: 'Tüm Karın (Core Stabilitesi)', diff: '2/5', desc: 'Bel bölgesinin yere tamamen yapıştığı, karın kaslarının izometrik olarak kasıldığı temel duruş.' }
];

function filterExercises(lvl) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.className = "filter-btn px-3 py-1.5 border border-gray-800 hover:border-gray-700 text-gray-400 rounded-lg transition";
  });

  const activeBtn = document.getElementById(`btn-filter-${lvl}`);
  if (activeBtn) {
    activeBtn.className = "filter-btn px-3 py-1.5 border border-brand-500 bg-brand-500/10 text-brand-500 font-bold rounded-lg transition";
  }

  renderExerciseGrid(lvl);
}

function renderExerciseGrid(filter) {
  const grid = document.getElementById('exerciseGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const list = filter === 'ALL' ? exerciseData : exerciseData.filter(e => e.level === filter);

  list.forEach(ex => {
    const card = document.createElement('div');
    card.className = "border border-gray-800 bg-dark-950 p-4 rounded-xl space-y-2 hover:border-gray-700 transition";
    card.innerHTML = `
      <div class="flex justify-between items-center text-xs">
        <span class="text-brand-500 font-bold">${ex.levelTr}</span>
        <span class="text-gray-500">${ex.diff}</span>
      </div>
      <h4 class="font-bold text-gray-200 text-base font-serif">${ex.name}</h4>
      <p class="text-xs text-gray-400 font-sans">${ex.muscle}</p>
      <button onclick="openExerciseModal('${ex.id}')" class="text-brand-500 text-xs font-semibold mt-2 underline block">Detayları İncele</button>
    `;
    grid.appendChild(card);
  });
}

function openExerciseModal(id) {
  const ex = exerciseData.find(e => e.id === id);
  if (!ex) return;

  const content = document.getElementById('detailModalContent');
  if (!content) return;
  
  content.innerHTML = `
    <span class="text-brand-500 text-xs font-bold">Detaylar</span>
    <h3 class="text-2xl font-bold font-serif text-gray-100 my-2">${ex.name}</h3>
    <p class="text-gray-300 leading-relaxed mb-4 font-sans">${ex.desc}</p>
    <ul class="space-y-2 border-t border-gray-800 pt-3 text-gray-400 font-sans">
      <li><strong>Hedef Kaslar:</strong> ${ex.muscle}</li>
      <li><strong>Zorluk Derecesi:</strong> ${ex.diff}</li>
      <li><strong>Form İpucu:</strong> Hareket boyunca karın bölgenizi sıkı tutun ve ivme/momentum kullanmaktan kaçının.</li>
    </ul>
  `;
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('hidden');
}

function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.add('hidden');
}