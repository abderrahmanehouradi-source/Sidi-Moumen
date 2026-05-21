// قائمة الأحياء
const neighborhoods = [
  'اليقين', 'جوهرة', 'ضحى', 'العلاء', 'النخيل', 'الرحامنة',
  'المشروع', 'الريان', 'الكوثر', 'الكرام', 'النهضة', 'البيضة',
  'مبروكة', 'السعادة', 'الشراف', 'الهدى', 'عبير', 'الكرون', 'سيدي مومن القديم'
];

let db;
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

// تهيئة Firebase
function initializeFirebase() {
  if (!firebaseConfig) {
    console.error('Firebase config not found. Using local mode.');
    initializeLocalMode();
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    
    // تحميل البيانات الأولية
    setupRealtimeSync();
  } catch (error) {
    console.error('Firebase initialization error:', error);
    initializeLocalMode();
  }
}

// وضع محلي بدون Firebase
function initializeLocalMode() {
  console.log('Running in local mode (no Firebase)');
  initializeLocalData();
  loadLeaderboard();
  loadNeighborhoodsList();
  loadStats();
  setupEventListeners();
  updateVoteButtonState();
}

// إعداد المزامنة الفورية
function setupRealtimeSync() {
  const votesRef = db.ref('votes');
  
  votesRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    updateLeaderboardFromFirebase(data);
    loadStats();
  });

  // التحقق من التصويت السابق
  const votesDataRef = db.ref('votedDevices');
  votesDataRef.child(deviceId).on('value', (snapshot) => {
    if (snapshot.exists()) {
      hasVoted = true;
      userVote = snapshot.val();
      updateVoteStatus();
      updateVoteButtonState();
    }
  });
}

// تحديث الترتيب من Firebase
function updateLeaderboardFromFirebase(data) {
  const updated = {};
  
  neighborhoods.forEach(neighborhood => {
    updated[neighborhood] = {
      name: neighborhood,
      votes: data[neighborhood] || 0
    };
  });
  
  displayLeaderboard(updated);
}

// تهيئة البيانات المحلية
function initializeLocalData() {
  const stored = localStorage.getItem('neighborhoodsData');
  
  if (!stored) {
    const data = {};
    neighborhoods.forEach((neighborhood) => {
      data[neighborhood] = 0;
    });
    localStorage.setItem('neighborhoodsData', JSON.stringify(data));
  }
}

// تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
  initializeFirebase();
  loadNeighborhoodsList();
  setupEventListeners();
  updateVoteButtonState();
});

// تحميل الترتيب
function loadLeaderboard() {
  try {
    const stored = JSON.parse(localStorage.getItem('neighborhoodsData') || '{}');
    displayLeaderboard(stored);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

// عرض الترتيب
function displayLeaderboard(data) {
  const leaderboardElement = document.getElementById('leaderboard');
  
  if (!data || Object.keys(data).length === 0) {
    leaderboardElement.innerHTML = '<div class="loading">لا توجد بيانات متوفرة</div>';
    return;
  }

  const sorted = neighborhoods
    .map(name => ({ name, votes: data[name] || 0 }))
    .sort((a, b) => b.votes - a.votes);

  leaderboardElement.innerHTML = sorted.map((item, index) => {
    const medals = ['1', '2', '3'];
    const medal = index < 3 ? medals[index] : `${index + 1}`;
    const topClass = index < 3 ? `top-${index + 1}` : '';
    
    return `
      <div class="leaderboard-item ${topClass}">
        <div class="rank-medal">${medal}</div>
        <div class="neighborhood-name">${item.name}</div>
        <div class="vote-count">${item.votes}</div>
      </div>
    `;
  }).join('');
}

// تحميل قائمة الأحياء
function loadNeighborhoodsList() {
  const voteSelect = document.getElementById('voteNeighborhood');
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
    await new Promise(resolve => setTimeout(resolve, 600));

    if (db) {
      // حفظ في Firebase
      const votesRef = db.ref('votes');
      const currentVotes = await votesRef.child(voteNeighborhood).once('value');
      const newCount = (currentVotes.val() || 0) + 1;
      
      await votesRef.child(voteNeighborhood).set(newCount);
      await db.ref('votedDevices').child(deviceId).set(voteNeighborhood);
    } else {
      // حفظ محلي
      const data = JSON.parse(localStorage.getItem('neighborhoodsData') || '{}');
      data[voteNeighborhood] = (data[voteNeighborhood] || 0) + 1;
      localStorage.setItem('neighborhoodsData', JSON.stringify(data));
      localStorage.setItem('votedDevice_' + deviceId, voteNeighborhood);
      
      loadLeaderboard();
      loadStats();
    }

    hasVoted = true;
    userVote = voteNeighborhood;
    showMessage(`شكراً! تم تصويتك لحي: ${voteNeighborhood}`, 'success');
    updateVoteStatus();
    updateVoteButtonState();
    document.getElementById('voteForm').reset();
  } catch (error) {
    console.error('Error voting:', error);
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
    statusText.textContent = `صوّت لـ: ${userVote}`;
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
    const data = JSON.parse(localStorage.getItem('neighborhoodsData') || '{}');
    const totalVotes = Object.values(data).reduce((sum, votes) => sum + votes, 0);
    const totalNeighborhoods = neighborhoods.length;
    const avgVotes = totalNeighborhoods > 0 ? Math.round(totalVotes / totalNeighborhoods * 100) / 100 : 0;

    document.getElementById('totalVotes').textContent = totalVotes;
    document.getElementById('totalNeighborhoods').textContent = totalNeighborhoods;
    document.getElementById('avgVotes').textContent = avgVotes.toFixed(1);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// مشاركة على تويتر
function shareOnTwitter() {
  const text = `أنا أشارك في ترتيب أحياء سيدي مومن. صوّت الآن: ${window.location.href}`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}

// مشاركة على فيسبوك
function shareOnFacebook() {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
}

// مشاركة على واتس آب
function shareOnWhatsApp() {
  const message = `تعال شارك معي في ترتيب أحياء سيدي مومن! ${window.location.href}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// نسخ الرابط
function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showMessage('تم نسخ الرابط بنجاح!', 'success');
  }).catch(() => {
    showMessage('فشل نسخ الرابط', 'error');
  });
}
