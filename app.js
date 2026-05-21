// قائمة الأحياء
const neighborhoods = [
  'اليقين', 'جوهرة', 'ضحى', 'العلاء', 'النخيل', 'الرحامنة',
  'المشروع', 'الريان', 'الكوثر', 'الكرام', 'النهضة', 'البيضة',
  'مبروكة', 'السعادة', 'الشراف', 'الهدى', 'عبير', 'الكرون', 'سيدي مومن القديم'
];

// المتغيرات العامة
let leaderboardData = [];
let allNeighborhoodsIds = {};

// تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  loadNeighborhoodsList();
  loadStats();
  setupEventListeners();
  
  // تحديث الترتيب كل 5 ثوانٍ
  setInterval(loadLeaderboard, 5000);
});

// تحميل الترتيب
async function loadLeaderboard() {
  try {
    const response = await fetch('/api/neighborhoods/leaderboard');
    const data = await response.json();

    if (data.success) {
      leaderboardData = data.data;
      displayLeaderboard(data.data);
    }
  } catch (error) {
    console.error('خطأ في جلب الترتيب:', error);
  }
}

// عرض الترتيب
function displayLeaderboard(leaderboard) {
  const leaderboardElement = document.getElementById('leaderboard');
  
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardElement.innerHTML = '<div class="loading">لا توجد بيانات متوفرة</div>';
    return;
  }

  leaderboardElement.innerHTML = leaderboard.map((item, index) => `
    <div class="leaderboard-item ${index === 0 ? 'top-1' : index === 1 ? 'top-2' : index === 2 ? 'top-3' : ''}">
      <div class="rank-medal">${item.medal || (index + 1)}</div>
      <div class="neighborhood-name">${item.name}</div>
      <div class="vote-count">${item.votes} 🗳️</div>
    </div>
  `).join('');
}

// تحميل قائمة الأحياء
async function loadNeighborhoodsList() {
  try {
    const response = await fetch('/api/neighborhoods/list');
    const data = await response.json();

    if (data.success) {
      populateSelects(data.data);
    }
  } catch (error) {
    console.error('خطأ في جلب الأحياء:', error);
    // الخطة البديلة: استخدا�� القائمة المحلية
    populateSelectsLocal();
  }
}

// ملء القائمات المحلية
function populateSelectsLocal() {
  const residenceSelect = document.getElementById('residenceNeighborhood');
  const voteSelect = document.getElementById('voteNeighborhood');

  neighborhoods.forEach(neighborhood => {
    residenceSelect.innerHTML += `<option value="${neighborhood}">${neighborhood}</option>`;
    voteSelect.innerHTML += `<option value="${neighborhood}">${neighborhood}</option>`;
  });
}

// ملء القائمات من الخادم
function populateSelects(data) {
  const residenceSelect = document.getElementById('residenceNeighborhood');
  const voteSelect = document.getElementById('voteNeighborhood');

  data.forEach(item => {
    allNeighborhoodsIds[item.name] = item._id;
    residenceSelect.innerHTML += `<option value="${item._id}">${item.name}</option>`;
    voteSelect.innerHTML += `<option value="${item._id}">${item.name}</option>`;
  });
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
  const voteForm = document.getElementById('voteForm');
  voteForm.addEventListener('submit', handleVote);
}

// معالج التصويت
async function handleVote(e) {
  e.preventDefault();

  const neighborhoodId = document.getElementById('voteNeighborhood').value;
  const recaptchaResponse = grecaptcha.getResponse();

  if (!recaptchaResponse) {
    showMessage('يرجى تأكيد أنك لست روبوت', 'error');
    return;
  }

  const submitButton = e.target.querySelector('.btn-vote');
  submitButton.disabled = true;
  submitButton.textContent = 'جاري المعالجة...';

  try {
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        neighborhoodId: neighborhoodId,
        recaptchaToken: recaptchaResponse
      })
    });

    const data = await response.json();

    if (data.success) {
      showMessage('✅ تم التصويت بنجاح! شكراً لك', 'success');
      
      // تحديث الترتيب مباشرة
      if (data.leaderboard) {
        displayLeaderboard(data.leaderboard);
      }

      // إعادة تعيين النموذج
      document.getElementById('voteForm').reset();
      grecaptcha.reset();
      loadStats();
    } else {
      showMessage(`❌ ${data.message}`, 'error');
    }
  } catch (error) {
    console.error('خطأ في التصويت:', error);
    showMessage('حدث خطأ في عملية التصويت. حاول مرة أخرى', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'صوّت الآن 🗳️';
  }
}

// عرض الرسائل
function showMessage(message, type) {
  const messageElement = document.getElementById('voteMessage');
  messageElement.textContent = message;
  messageElement.className = `message ${type}`;
  
  setTimeout(() => {
    messageElement.className = 'message';
  }, 5000);
}

// تحميل الإحصائيات
async function loadStats() {
  try {
    const response = await fetch('/api/votes/stats/total');
    const data = await response.json();

    if (data.success) {
      const statsGrid = document.getElementById('statsGrid');
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${data.totalVotes}</div>
          <div class="stat-label">إجمالي الأصوات</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalNeighborhoods}</div>
          <div class="stat-label">عدد الأحياء</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.avgVotesPerNeighborhood}</div>
          <div class="stat-label">متوسط الأصوات</div>
        </div>
      `;
    }
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);
  }
}

// مشاركة على تويتر
function shareOnTwitter() {
  const topNeighborhood = leaderboardData[0];
  if (!topNeighborhood) return;

  const text = `🏆 حي ${topNeighborhood.name} متصدر ترتيب أحياء سيدي مومن برصيد ${topNeighborhood.votes} صوت! \n\nصوّت الآن: ${window.location.href}`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}

// مشاركة على واتس أب
function shareOnWhatsApp() {
  const topNeighborhood = leaderboardData[0];
  if (!topNeighborhood) return;

  const message = `🏆 حي ${topNeighborhood.name} متصدر ترتيب أحياء سيدي مومن برصيد ${topNeighborhood.votes} صوت!\n\nصوّت الآن: ${window.location.href}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// مشاركة على فيسبوك
function shareOnFacebook() {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
}

// نسخ الرابط
function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const topNeighborhood = leaderboardData[0];
    if (topNeighborhood) {
      showMessage(`✅ تم نسخ الرابط! حي ${topNeighborhood.name} متصدر الترتيب 🏆`, 'success');
    }
  }).catch(() => {
    showMessage('❌ فشل نسخ الرابط', 'error');
  });
}
