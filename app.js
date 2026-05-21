// قائمة الأحياء
const neighborhoods = [
  'اليقين', 'جوهرة', 'ضحى', 'العلاء', 'النخيل', 'الرحامنة',
  'المشروع', 'الريان', 'الكوثر', 'الكرام', 'النهضة', 'البيضة',
  'مبروكة', 'السعادة', 'الشراف', 'الهدى', 'عبير', 'الكرون', 'سيدي مومن القديم'
];

// المتغيرات العامة
let neighborhoodsData = {};
let leaderboardData = [];
let deviceId = generateDeviceId();
let hasVoted = false;
let userVote = null;

// توليد معرّف فريد للجهاز
function generateDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', id);
  }
  return id;
}

// تهيئة البيانات
function initializeLocalData() {
  const stored = localStorage.getItem('neighborhoodsData');
  const votesData = localStorage.getItem('votesData') || '{}';
  
  if (!stored) {
    // إنشاء بيانات جديدة بجميع الأصوات = 0
    neighborhoods.forEach((neighborhood) => {
      neighborhoodsData[neighborhood] = {
        name: neighborhood,
        votes: 0
      };
    });
    saveLocalData();
  } else {
    neighborhoodsData = JSON.parse(stored);
  }
  
  // التحقق من هل صوّت هذا الجهاز
  const votes = JSON.parse(votesData);
  if (votes[deviceId]) {
    hasVoted = true;
    userVote = votes[deviceId];
    updateVoteStatus();
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
  updateVoteButtonState();
  
  // تحديث الترتيب كل 2 ثانية
  setInterval(() => {
    loadLeaderboard();
    loadStats();
  }, 2000);
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
    const medals = ['1', '2', '3'];
    const medal = index < 3 ? medals[index] : `${index + 1}`;
    const topClass = index < 3 ? `top-${index + 1}` : '';
    const highlight = userVote === item.name ? ' highlight' : '';
    
    return `
      <div class="leaderboard-item ${topClass}${highlight}">
        <div class="rank-medal">${medal}</div>
        <div class="neighborhood-name">${item.name}</div>
        <div class="vote-count">${item.votes}</div>
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
  const voteSelect = document.getElementById('voteNeighborhood');
  
  // تفريغ القائمة الحالية
  voteSelect.innerHTML = '<option value="">-- اختر الحي --</option>';

  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.value = neighborhood;
    option.textContent = neighborhood;
    voteSelect.appendChild(option);
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

  if (hasVoted) {
    showMessage('لقد صوّت الجهاز الحالي مسبقاً', 'error');
    return;
  }

  const voteNeighborhood = document.getElementById('voteNeighborhood').value;
  const submitButton = e.target.querySelector('.btn-vote');

  if (!voteNeighborhood) {
    showMessage('يرجى اختيار حي', 'error');
    return;
  }

  submitButton.disabled = true;
  const originalText = submitButton.innerHTML;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';

  try {
    // محاكاة تأخير
    await new Promise(resolve => setTimeout(resolve, 600));

    // إضافة صوت
    if (!neighborhoodsData[voteNeighborhood]) {
      neighborhoodsData[voteNeighborhood] = { name: voteNeighborhood, votes: 0 };
    }
    neighborhoodsData[voteNeighborhood].votes += 1;
    saveLocalData();

    // حفظ التصويت للجهاز
    hasVoted = true;
    userVote = voteNeighborhood;
    const votesData = JSON.parse(localStorage.getItem('votesData') || '{}');
    votesData[deviceId] = voteNeighborhood;
    localStorage.setItem('votesData', JSON.stringify(votesData));

    showMessage(`شكراً! تم تصويتك للحي: ${voteNeighborhood}`, 'success');
    
    // تحديث الترتيب والإحصائيات
    loadLeaderboard();
    loadStats();
    updateVoteStatus();
    updateVoteButtonState();

    // إعادة تعيين النموذج
    document.getElementById('voteForm').reset();
  } catch (error) {
    console.error('خطأ في التصويت:', error);
    showMessage('حدث خطأ في عملية التصويت. حاول مرة أخرى', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  }
}

// تحديث حالة التصويت
function updateVoteStatus() {
  const voteStatus = document.getElementById('voteStatus');
  const statusText = document.getElementById('voteStatusText');
  
  if (hasVoted) {
    voteStatus.classList.add('voted');
    statusText.textContent = `صوتت على: ${userVote}`;
  } else {
    voteStatus.classList.remove('voted');
    statusText.textContent = 'لم تصوّت بعد';
  }
}

// تحديث حالة زر التصويت
function updateVoteButtonState() {
  const submitButton = document.querySelector('.btn-vote');
  if (hasVoted) {
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-lock"></i> صوتك محفوظ';
    submitButton.style.opacity = '0.6';
  } else {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-check"></i> صوّت الآن';
    submitButton.style.opacity = '1';
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
    const avgVotes = totalNeighborhoods > 0 ? Math.round(totalVotes / totalNeighborhoods * 100) / 100 : 0;

    document.getElementById('totalVotes').textContent = totalVotes;
    document.getElementById('totalNeighborhoods').textContent = totalNeighborhoods;
    document.getElementById('avgVotes').textContent = avgVotes.toFixed(1);
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);
  }
}

// إعادة تعيين (للمسؤولين فقط)
function resetVotes() {
  if (confirm('هل أنت متأكد من إعادة تعيين جميع البيانات؟')) {
    localStorage.clear();
    deviceId = generateDeviceId();
    hasVoted = false;
    userVote = null;
    initializeLocalData();
    loadLeaderboard();
    loadStats();
    updateVoteStatus();
    updateVoteButtonState();
    showMessage('تم إعادة تعيين جميع البيانات', 'success');
  }
}

// مشاركة على تويتر
function shareOnTwitter() {
  const topNeighborhood = leaderboardData[0];
  if (!topNeighborhood) return;

  const text = `حي ${topNeighborhood.name} متصدر ترتيب أحياء سيدي مومن برصيد ${topNeighborhood.votes} صوت!\n\nصوّت الآن: ${window.location.href}`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}

// مشاركة على فيسبوك
function shareOnFacebook() {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
}

// مشاركة على واتس آب
function shareOnWhatsApp() {
  const topNeighborhood = leaderboardData[0];
  if (!topNeighborhood) return;

  const message = `حي ${topNeighborhood.name} متصدر ترتيب أحياء سيدي مومن برصيد ${topNeighborhood.votes} صوت!\n\nصوّت الآن: ${window.location.href}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// نسخ الرابط
function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const topNeighborhood = leaderboardData[0];
    if (topNeighborhood) {
      showMessage(`تم نسخ الرابط! حي ${topNeighborhood.name} متصدر الترتيب`, 'success');
    }
  }).catch(() => {
    showMessage('فشل نسخ الرابط', 'error');
  });
}
