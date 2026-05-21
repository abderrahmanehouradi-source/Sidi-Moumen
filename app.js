// قائمة الأحياء
const neighborhoods = [
  'اليقين', 'جوهرة', 'ضحى', 'العلاء', 'النخيل', 'الرحامنة',
  'المشروع', 'الريان', 'الكوثر', 'الكرام', 'النهضة', 'البيضة',
  'مبروكة', 'السعادة', 'الشراف', 'الهدى', 'عبير', 'الكرون', 'سيدي مومن القديم'
];

const RANK_ICONS = [
  { icon: 'fa-crown',  label: '1' },
  { icon: 'fa-trophy', label: '2' },
  { icon: 'fa-award',  label: '3' },
];

let leaderboardData = [];
let deviceId = getDeviceId();
let hasVoted = false;
let userVote = null;

function getDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', id);
  }
  return id;
}

function getRankIcon(index) {
  if (index < 3) {
    const { icon } = RANK_ICONS[index];
    return `<i class="fas ${icon}"></i>`;
  }
  return `<span class="rank-number">${index + 1}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  checkVoteStatus();
  loadLeaderboard();
  populateSelects();
  setupEventListeners();

  setInterval(loadLeaderboard, 5000);
});

function checkVoteStatus() {
  const stored = localStorage.getItem('voteRecord');
  if (stored) {
    const { deviceId: storedDevice, neighborhood } = JSON.parse(stored);
    if (storedDevice === deviceId) {
      hasVoted = true;
      userVote = neighborhood;
      updateVoteStatus();
      updateVoteButtonState();
    }
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch('/api/votes');
    if (!res.ok) throw new Error('فشل في جلب البيانات');
    const data = await res.json();
    leaderboardData = data;
    displayLeaderboard(data);
    updateStats(data);
  } catch (err) {
    console.error('خطأ في تحميل الترتيب:', err);
    const el = document.getElementById('leaderboard');
    if (el.classList.contains('loading')) {
      el.innerHTML = '<div class="loading">تعذّر تحميل البيانات، يُرجى تحديث الصفحة</div>';
    }
  }
}

function displayLeaderboard(leaderboard) {
  const el = document.getElementById('leaderboard');
  if (!leaderboard || leaderboard.length === 0) {
    el.innerHTML = '<div class="loading">لا توجد بيانات متوفرة</div>';
    return;
  }

  el.innerHTML = leaderboard.map((item, index) => {
    const topClass = index < 3 ? ` top-${index + 1}` : '';
    const highlight = userVote === item.neighborhood ? ' highlight' : '';
    const rankDisplay = getRankIcon(index);

    return `
      <div class="leaderboard-item${topClass}${highlight}">
        <div class="rank-medal">${rankDisplay}</div>
        <div class="neighborhood-name">${item.neighborhood}</div>
        <div class="vote-count"><i class="fas fa-vote-yea"></i> ${item.votes}</div>
      </div>
    `;
  }).join('');
}

function updateStats(data) {
  const totalVotes = data.reduce((sum, item) => sum + item.votes, 0);
  const totalNeighborhoods = neighborhoods.length;
  const avgVotes = totalNeighborhoods > 0 ? (totalVotes / totalNeighborhoods).toFixed(1) : '0';

  document.getElementById('totalVotes').textContent = totalVotes;
  document.getElementById('totalNeighborhoods').textContent = totalNeighborhoods;
  document.getElementById('avgVotes').textContent = avgVotes;
}

function populateSelects() {
  const voteSelect = document.getElementById('voteNeighborhood');
  voteSelect.innerHTML = '<option value="">-- اختر الحي --</option>';
  neighborhoods.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    voteSelect.appendChild(option);
  });
}

function setupEventListeners() {
  document.getElementById('voteForm').addEventListener('submit', handleVote);
}

async function handleVote(e) {
  e.preventDefault();

  if (hasVoted) {
    showMessage('لقد صوّت هذا الجهاز مسبقاً', 'error');
    return;
  }

  const neighborhood = document.getElementById('voteNeighborhood').value;
  if (!neighborhood) {
    showMessage('يرجى اختيار حي', 'error');
    return;
  }

  const submitButton = e.target.querySelector('.btn-vote');
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';

  try {
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, neighborhood }),
    });

    const data = await res.json();

    if (res.status === 409) {
      hasVoted = true;
      userVote = data.votedFor;
      localStorage.setItem('voteRecord', JSON.stringify({ deviceId, neighborhood: data.votedFor }));
      showMessage(`لقد صوّت هذا الجهاز مسبقاً على: ${data.votedFor}`, 'error');
      updateVoteStatus();
      updateVoteButtonState();
      return;
    }

    if (!res.ok) {
      throw new Error(data.error || 'خطأ في الخادم');
    }

    hasVoted = true;
    userVote = neighborhood;
    localStorage.setItem('voteRecord', JSON.stringify({ deviceId, neighborhood }));

    showMessage(`شكراً! تم تصويتك للحي: ${neighborhood}`, 'success');
    updateVoteStatus();
    updateVoteButtonState();
    document.getElementById('voteForm').reset();
    await loadLeaderboard();
  } catch (err) {
    console.error('خطأ في التصويت:', err);
    showMessage(err.message || 'حدث خطأ في عملية التصويت. حاول مرة أخرى', 'error');
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-check"></i> صوّت الآن';
  } finally {
    if (!hasVoted) {
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-check"></i> صوّت الآن';
    }
  }
}

function updateVoteStatus() {
  const voteStatus = document.getElementById('voteStatus');
  const statusText = document.getElementById('voteStatusText');
  if (hasVoted) {
    voteStatus.classList.add('voted');
    statusText.innerHTML = `<i class="fas fa-check-circle"></i> صوتّ على: ${userVote}`;
  } else {
    voteStatus.classList.remove('voted');
    statusText.innerHTML = '<i class="fas fa-clock"></i> لم تصوّت بعد';
  }
}

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

function showMessage(message, type) {
  const messageElement = document.getElementById('voteMessage');
  messageElement.textContent = message;
  messageElement.className = `message ${type}`;
  setTimeout(() => { messageElement.className = ''; }, 5000);
}

function shareOnTwitter() {
  const top = leaderboardData[0];
  if (!top) return;
  const text = `حي ${top.neighborhood} متصدر ترتيب أحياء سيدي مومن برصيد ${top.votes} صوت!\n\nصوّت الآن: ${window.location.href}`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}

function shareOnFacebook() {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
}

function shareOnWhatsApp() {
  const top = leaderboardData[0];
  if (!top) return;
  const message = `حي ${top.neighborhood} متصدر ترتيب أحياء سيدي مومن برصيد ${top.votes} صوت!\n\nصوّت الآن: ${window.location.href}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const top = leaderboardData[0];
    if (top) showMessage(`تم نسخ الرابط! حي ${top.neighborhood} متصدر الترتيب`, 'success');
  }).catch(() => showMessage('فشل نسخ الرابط', 'error'));
}
