// قائمة الأحياء
const neighborhoods = [
  'اليقين', 'جوهرة', 'ضحى', 'العلاء', 'النخيل', 'الرحامنة',
  'المشروع', 'الريان', 'الكوثر', 'الكرام', 'النهضة', 'البيضة',
  'مبروكة', 'السعادة', 'الشراف', 'الهدى', 'عبير', 'الكرون', 'سيدي مومن القديم'
];

// بيانات الأحياء (محلياً)
let neighborhoodsData = {};
let leaderboardData = [];

// تهيئة البيانات المحلية
function initializeLocalData() {
  const stored = localStorage.getItem('neighborhoodsData');
  
  if (!stored) {
    neighborhoods.forEach((neighborhood, index) => {
      neighborhoodsData[neighborhood] = {
        name: neighborhood,
        votes: Math.floor(Math.random() * 50) + 1
      };
    });
    saveLocalData();
  } else {
    neighborhoodsData = JSON.parse(stored);
  }
}

// حفظ البيانات محلياً
function saveLocalData() {
  localStorage.setItem('neighborhoodsData', JSON.stringify(neighborhoodsData));
}

// تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
  initializeLocalData();
  loadLeaderboard();
  loadNeighborhoodsList();
  loadStats();
  setupEventListeners();
  
  // تحديث الترتيب كل 3 ثوانٍ
  setInterval(() => {
    loadLeaderboard();
    loadStats();
  }, 3000);
});

// تحميل الترتيب
function loadLeaderboard() {
  try {
    const sorted = Object.values(neighborhoodsData).sort((a, b) => b.votes - a.votes);
    leaderboardData = sorted;
    displayLeaderboard(sorted);
  } catch (error) {
    console.error('خطأ في تحميل الترتيب:', error);
  }
}

// عرض الترتيب
function displayLeaderboard(leaderboard) {
  const leaderboardElement = document.getElementById('leaderboard');
  
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardElement.innerHTML = '<div class="loading">لا توجد بيانات متوفرة</div>';
    return;
  }

  leaderboardElement.innerHTML = leaderboard.map((item, index) => {
    const medals = ['🥇', '🥈', '🥉'];
    const medal = medals[index] || `${index + 1}`;
    const topClass = index < 3 ? `top-${index + 1}` : '';
    
    return `
      <div class="leaderboard-item ${topClass}">
        <div class="rank-medal">${medal}</div>
        <div class="neighborhood-name">${item.name}</div>
        <div class="vote-count">${item.votes} 🗳️</div>
      </div>
    `;
  }).join('');
}

// تحميل قائمة الأحياء
function loadNeighborhoodsList() {
  populateSelects();
}

// ملء القائمات
function populateSelects() {
  const residenceSelect = document.getElementById('residenceNeighborhood');
  const voteSelect = document.getElementById('voteNeighborhood');

  neighborhoods.forEach(neighborhood => {
    const option1 = document.createElement('option');
    option1.value = neighborhood;
    option1.textContent = neighborhood;
    residenceSelect.appendChild(option1);
    
    const option2 = document.createElement('option');
    option2.value = neighborhood;
    option2.textContent = neighborhood;
    voteSelect.appendChild(option2);
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

  const residenceNeighborhood = document.getElementById('residenceNeighborhood').value;
  const voteNeighborhood = document.getElementById('voteNeighborhood').value;
  const submitButton = e.target.querySelector('.btn-vote');

  if (!residenceNeighborhood || !voteNeighborhood) {
    showMessage('يرجى اختيار الأحياء', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'جاري المعالجة...';

  try {
    // محاكاة التأخير
    await new Promise(resolve => setTimeout(resolve, 800));

    // إضافة صوت
    if (!neighborhoodsData[voteNeighborhood]) {
      neighborhoodsData[voteNeighborhood] = { name: voteNeighborhood, votes: 0 };
    }
    neighborhoodsData[voteNeighborhood].votes += 1;
    saveLocalData();

    showMessage('✅ تم التصويت بنجاح! شكراً لك 🎉', 'success');
    
    // تحديث الترتيب مباشرة
    loadLeaderboard();
    loadStats();

    // إعادة تعيين النموذج
    document.getElementById('voteForm').reset();
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
    messageElement.className = '';
  }, 5000);
}

// تحميل الإحصائيات
function loadStats() {
  try {
    const totalVotes = Object.values(neighborhoodsData).reduce((sum, item) => sum + item.votes, 0);
    const totalNeighborhoods = neighborhoods.length;
    const avgVotes = totalNeighborhoods > 0 ? Math.round(totalVotes / totalNeighborhoods * 10) / 10 : 0;

    document.getElementById('totalVotes').textContent = totalVotes;
    document.getElementById('totalNeighborhoods').textContent = totalNeighborhoods;
    document.getElementById('avgVotes').textContent = avgVotes;
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
