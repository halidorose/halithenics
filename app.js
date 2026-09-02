/* ==========================================================================
   halithenics — Engine (Fixes: 1-Hour Hypertrophy, Locked Weekend Redirect, Reset Wizard, Persist Accounts)
   ========================================================================== */

let currentUser = null;
let savedProgram = null;
let userStats = { workouts: 0, streak: 0, pullups: '-' };

let timerInterval = null;
let timerSecondsLeft = 0;

const EMAILJS_PUBLIC_KEY = "IRUAlQeA4UfYl-tLE";
const EMAILJS_SERVICE_ID = "service_fchh3e7";
const EMAILJS_TEMPLATE_ID = "template_xjhfoyn";

// Lemon Squeezy Gerçek Checkout Linkiniz
const LEMON_SQUEEZY_CHECKOUT_URL = "https://halithenics.lemonsqueezy.com/checkout/buy/ff9472c4-4798-4d1d-91af-20256282ba30";

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.display = 'none';
      splash.classList.add('hidden');
    }
  }, 1000);

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
   HIPERTROFİ BİLGİ KUTUSU (1 SAATLİK HAFIZALI)
   ========================================================================== */
function setupHypertrophyObserver() {
  const targets = document.querySelectorAll('.hypertrophy-target');
  if (!targets.length) return;

  // 1 saatlik (3600000 ms) kontrol
  const closedAt = localStorage.getItem('halithenics_hypertrophy_closed_at');
  if (closedAt) {
    const timePassed = Date.now() - parseInt(closedAt, 10);
    if (timePassed < 3600000) {
      return; // 1 saat henüz dolmadıysa gözlemciyi başlatma
    }
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const checkClosed = localStorage.getItem('halithenics_hypertrophy_closed_at');
        if (checkClosed && (Date.now() - parseInt(checkClosed, 10) < 3600000)) {
          return;
        }
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
  // Kapatıldığı zaman damgasını kaydet
  localStorage.setItem('halithenics_hypertrophy_closed_at', Date.now().toString());
}

/* ==========================================================================
   LEMON SQUEEZY & ÖDEME
   ========================================================================== */
function redirectToLemonSqueezy() {
  if (!currentUser) {
    showToast("Ödeme yapabilmek için önce giriş yapmalısınız.", "warning");
    openAuthModal();
    return;
  }

  const redirectUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}?payment=success`);
  const finalCheckoutUrl = `${LEMON_SQUEEZY_CHECKOUT_URL}?checkout[email]=${encodeURIComponent(currentUser.email)}&checkout[custom][user_email]=${encodeURIComponent(currentUser.email)}&redirect_url=${redirectUrl}`;

  showToast("Lemon Squeezy ödeme sayfasına yönlendiriliyorsunuz...", "info");
  setTimeout(() => { window.location.href = finalCheckoutUrl; }, 1500);
}

function handlePaymentSuccess() {
  const localUser = JSON.parse(localStorage.getItem('halithenics_currentUser'));
  if (localUser && localUser.email) {
    currentUser = localUser;
    currentUser.isPro = true;
    currentUser.proExpiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
    saveUserData();
    updateNavUser();
    showToast("Ödemeniz doğrulandı! 1 Aylık Pro Üyeliğiniz Aktif Edildi.", "info");
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/* ==========================================================================
   SEKME VE MODAL YÖNETİMİ & SIFIRLAMA
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

  // Eğer kullanıcı oturum açmamışsa veya programı yoksa Program Oluştur sekmesini sıfırla
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
}

/* ==========================================================================
   OTURUM VE VERİ KAYIT MOTORU (GÜÇLENDİRİLMİŞ)
   ========================================================================== */
function checkLocalSession() {
  const localUser = JSON.parse(localStorage.getItem('halithenics_currentUser'));
  if (localUser && localUser.email) {
    const dbUser = JSON.parse(localStorage.getItem(`db_user_${localUser.email.toLowerCase().trim()}`));
    currentUser = dbUser || localUser;
    
    checkSubscriptionStatus();
    updateNavUser();
    
    savedProgram = currentUser.program || null;
    userStats = currentUser.stats || { workouts: 0, streak: 0, pullups: '-' };
    
    if (savedProgram) {
      const badge = document.getElementById('savedBadge');
      if (badge) badge.classList.remove('hidden');
      renderProgramDashboard();
    }
  }
}

function checkSubscriptionStatus() {
  if (!currentUser) return;
  if (currentUser.isPro && currentUser.proExpiresAt) {
    if (Date.now() > currentUser.proExpiresAt) {
      currentUser.isPro = false;
      currentUser.proExpiresAt = null;
      saveUserData();
      showToast("Pro üyelik süreniz doldu. Hesabınız Ücretsiz plana düşürüldü.", "warning");
    }
  }
}

function saveUserData() {
  if (!currentUser || !currentUser.email) return;
  const cleanEmail = currentUser.email.toLowerCase().trim();
  
  currentUser.program = savedProgram;
  currentUser.stats = userStats;
  
  // Hem aktif kullanıcılara hem veritabanı kütüğüne yaz
  localStorage.setItem('halithenics_currentUser', JSON.stringify(currentUser));
  localStorage.setItem(`db_user_${cleanEmail}`, JSON.stringify(currentUser));
}

function handleEmailAuth(e) {
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

  const existingDB = JSON.parse(localStorage.getItem(`db_user_${email}`));

  if (existingDB) {
    // Hesap varsa şifre doğrulama uyarısı verip verilerini yükle
    if (existingDB.password && existingDB.password !== password) {
      showToast("Bu e-posta adresi zaten kullanılıyor. Şifre hatalı!", "error");
      return;
    }
    currentUser = existingDB;
    savedProgram = currentUser.program || null;
    userStats = currentUser.stats || { workouts: 0, streak: 0, pullups: '-' };
    showToast(`Tekrar hoş geldin, ${email.split('@')[0]}!`, "info");
  } else {
    // Sıfırdan kayıt aç
    currentUser = { 
      email: email, 
      password: password,
      isPro: false, 
      proExpiresAt: null, 
      lastCreated: null, 
      dailyCount: 0,
      program: null,
      stats: { workouts: 0, streak: 0, pullups: '-' }
    };
    
    if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY) {
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { user_email: email })
        .catch(err => console.error(err));
    }
    showToast(`Hesabın başarıyla oluşturuldu: ${email}`, "info");
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
  } else {
    const badge = document.getElementById('savedBadge');
    if (badge) badge.classList.add('hidden');
    const noProg = document.getElementById('noProgramView');
    if (noProg) noProg.classList.remove('hidden');
    const progView = document.getElementById('programView');
    if (progView) progView.classList.add('hidden');
  }
}

function handleGoogleLoginSuccess(email) {
  const cleanEmail = email.toLowerCase().trim();
  const existingDB = JSON.parse(localStorage.getItem(`db_user_${cleanEmail}`));

  if (existingDB) {
    currentUser = existingDB;
    savedProgram = currentUser.program || null;
    userStats = currentUser.stats || { workouts: 0, streak: 0, pullups: '-' };
    showToast(`Google ile giriş yapıldı: ${cleanEmail}`, "info");
  } else {
    currentUser = { 
      email: cleanEmail, 
      isPro: false, 
      proExpiresAt: null, 
      lastCreated: null, 
      dailyCount: 0,
      program: null,
      stats: { workouts: 0, streak: 0, pullups: '-' }
    };
    showToast(`Hesabın Google ile oluşturuldu: ${cleanEmail}`, "info");
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

  if (currentUser) {
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
        badge.innerText = `Pro Sporcu (Kalan: ${daysLeft} Gün)`;
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

  if (!currentUser) {
    showToast("Program oluşturabilmek için önce giriş yapmalısınız.", "warning");
    openAuthModal();
    return;
  }

  const now = Date.now();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  if (!currentUser.isPro) {
    if (currentUser.lastCreated && (now - currentUser.lastCreated < THREE_DAYS_MS)) {
      const daysLeft = Math.ceil((THREE_DAYS_MS - (now - currentUser.lastCreated)) / (1000 * 60 * 60 * 24));
      showToast(`Ücretsiz hesaplarda 3 günde 1 program oluşturulabilir. Kalan: ${daysLeft} gün. Pro hesaba geçebilirsiniz.`, "warning");
      return;
    }
  } else {
    if (currentUser.dailyCount >= 2) {
      showToast("Pro planda günlük program oluşturma sınırına ulaştınız (2/2).", "warning");
      return;
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
    goal, weight, height, days
  };

  userStats.pullups = pullups;
  currentUser.lastCreated = now;
  currentUser.dailyCount = (currentUser.dailyCount || 0) + 1;

  saveUserData();

  const badge = document.getElementById('savedBadge');
  if (badge) badge.classList.remove('hidden');
  renderProgramDashboard();
  showTab('myProgram');
  showToast("Yapay zeka antrenman programınız başarıyla oluşturuldu.", "info");
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

  const p = savedProgram.pullups;
  let daysData = [];

  if (p < 4) {
    daysData = [
      { day: 'Pazartesi', type: 'Göğüs & İtiş Gücü', ex: ['4 Set x 8 Tekrar Diz Üstü / Nizami Şınav', '3 Set x 6 Tekrar Yavaş İnişli Negatif Dip', '3 Set x 45 Saniye Plank'] },
      { day: 'Salı', type: 'Sırt & Çekiş Hipertrofisi', ex: ['4 Set x 6 Tekrar Negatif Barfiks (5sn iniş)', '3 Set x 10 Tekrar Eğik Çekiş (Australian Row)', '3 Set x 12 Tekrar Yüz Çekişi (Facepull)'] },
      { day: 'Çarşamba', type: 'Dinlenme & Mobilite', ex: ['Aktif Dinlenme - 30 Dk Tempolu Yürüyüş & Esnetme'] },
      { day: 'Perşembe', type: 'Alt Vücut & Karın', ex: ['4 Set x 15 Tekrar Çömelme (Air Squat)', '3 Set x 10 Tekrar Lunge', '3 Set x 12 Tekrar Bacak Kaldırma (Leg Raise)'] },
      { day: 'Cuma', type: 'Tüm Vücut Dayanıklılık', ex: ['3 Set x 8 Şınav', '3 Set x 5 Negatif Barfiks', '3 Set x 12 Squat'] },
      { day: 'Cumartesi', type: 'Teknik & Bar Uyumu', isWeekend: true, ex: ['4 Set x 20 Saniye Barda Asılı Kalma', '3 Set x 8 Skapular Barfiks'] },
      { day: 'Pazar', type: 'Tam Dinlenme', isWeekend: true, ex: ['Kas Onarımı ve Rejenerasyon'] }
    ];
  } else if (p <= 10) {
    daysData = [
      { day: 'Pazartesi', type: 'Çekiş A (Sırt & Biceps)', ex: ['4 Set x %80 Maksimum Nizami Barfiks', '3 Set x 8 Chin-Up', '3 Set x 10 Eğik Çekiş', '3 Set x 12 Vücut Ağırlığı Curl'] },
      { day: 'Salı', type: 'İtiş A (Göğüs & Omuz)', ex: ['4 Set x 10 Paralel Dip', '4 Set x 12 Defisit Şınav', '3 Set x 8 Pike Push-Up (Omuz)'] },
      { day: 'Çarşamba', type: 'Dinlenme', ex: ['Aktif Dinlenme & Köpük Rulo Masajı'] },
      { day: 'Perşembe', type: 'Bacak & Karın Stabilitesi', ex: ['4 Set x 12 Sıçramalı Squat', '3 Set x 10 Destekli Tek Bacak Squat', '4 Set x 10 Barda Diz Kaldırma'] },
      { day: 'Cuma', type: 'Üst Vücut Yoğunluk', ex: ['3 Set x Maksimum Barfiks', '3 Set x 12 Dip', '3 Set x 15 Elmas Şınav'] },
      { day: 'Cumartesi', type: 'Gelişmiş Teknikler', isWeekend: true, ex: ['4 Set x 5 Göğse Çekiş Barfiks', '3 Set x 30 Saniye Hollow Body Hold'] },
      { day: 'Pazar', type: 'Dinlenme', isWeekend: true, ex: ['Tam Dinlenme'] }
    ];
  } else {
    daysData = [
      { day: 'Pazartesi', type: 'Ağırlıklı / Ağır Çekiş', ex: ['5 Set x 5 Tekrar Ağırlıklı Barfiks', '4 Set x 8 Sternum Barfiks', '3 Set x 6 Yüksek Çekiş Barfiks'] },
      { day: 'Salı', type: 'Ağır İtiş & Dipler', ex: ['5 Set x 6 Tekrar Ağırlıklı Dip', '4 Set x 8 Okçu Şınavı (Archer)', '3 Set x 6 Duvarda Amut Şınavı'] },
      { day: 'Çarşamba', type: 'Dinlenme & Mobilite', ex: ['Aktif Dinlenme ve Eklem Sağlığı Çalışması'] },
      { day: 'Perşembe', type: 'Patlayıcı Bacak & Karın', ex: ['4 Set x 8 Tek Bacak Squat (Pistol)', '4 Set x 12 Arka Bacak Curl', '4 Set x 10 Barda Bacak Kaldırma'] },
      { day: 'Cuma', type: 'Hacim Odaklı Üst Vücut', ex: ['4 Set x 10 Nizami Barfiks', '4 Set x 15 Düz Bar Dip', '3 Set x 12 Halka Şınav'] },
      { day: 'Cumartesi', type: 'Muscle-Up & Skill Çalışması', isWeekend: true, ex: ['5 Set x 3 Temiz Bar Muscle-Up', '4 Set x 15 Saniye Front Lever Tuck Hold'] },
      { day: 'Pazar', type: 'Yenilenme', isWeekend: true, ex: ['Zihinsel ve Fiziksel Dinlenme'] }
    ];
  }

  daysData.forEach((d) => {
    const isLocked = d.isWeekend && (!currentUser || !currentUser.isPro);
    const card = document.createElement('div');
    
    // Kilitli kartlara tıklanınca Planlar sekmesine yönlendir
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
   KRONOMETRE SİSTEMİ
   ========================================================================== */
function setTimer(sec) {
  pauseTimer();
  timerSecondsLeft = sec;
  updateTimerDisplay();
  const status = document.getElementById('timerStatus');
  if (status) status.innerText = "Set";
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
   HAREKET KÜTÜPHANESİ & AKTİF FİLTRELER
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
      <button onclick="openExerciseModal('${ex.id}')" class="text-brand-500 text-xs font-semibold mt-2 underline block">[ Detayları İncele ]</button>
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
    <span class="text-brand-500 text-xs font-bold">[ Biyomekanik Detay ]</span>
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