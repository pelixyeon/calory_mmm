// Gemini API Key (실제 배포시 노출 주의!)
const GEMINI_API_KEY = "AIzaSyD2uQbFjDrBF-F3WMZtY7sl6MLgOCS2OoE";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;

// 사진 촬영/갤러리 버튼
const cameraBtn = document.getElementById('camera-btn');
const galleryBtn = document.getElementById('gallery-btn');
const cameraInput = document.getElementById('camera-input');
const galleryInput = document.getElementById('gallery-input');
const previewSection = document.getElementById('preview-section');
const previewCanvas = document.getElementById('preview-canvas');
const resultSection = document.getElementById('result-section');
const resultList = document.getElementById('result-list');
const calorieTotal = document.getElementById('calorie-total');
const exerciseSuggestion = document.getElementById('exercise-suggestion');
const copyBtn = document.getElementById('copy-btn');
const retryBtn = document.getElementById('retry-btn');
const loadingDiv = document.getElementById('loading');

cameraBtn.onclick = () => cameraInput.click();
galleryBtn.onclick = () => galleryInput.click();

retryBtn.onclick = () => {
  previewSection.style.display = 'none';
  resultSection.style.display = 'none';
  cameraInput.value = '';
  galleryInput.value = '';
};

copyBtn.onclick = function() {
  const resultText = resultList.innerText + '\n' + calorieTotal.innerText + '\n' + exerciseSuggestion.innerText;
  navigator.clipboard.writeText(resultText)
    .then(() => alert('결과가 복사되었습니다!'))
    .catch(() => alert('복사에 실패했습니다. 브라우저 권한을 확인하세요.'));
};

[cameraInput, galleryInput].forEach(input => {
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new Image();
      img.onload = function() {
        const ctx = previewCanvas.getContext('2d');
        previewCanvas.width = img.width;
        previewCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        previewSection.style.display = 'block';
        // base64 변환
        const base64 = previewCanvas.toDataURL('image/jpeg').split(',')[1];
        // Gemini API 호출
        loadingDiv.style.display = 'block';
        fetch(GEMINI_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: "이 이미지는 어떤 음식이고, 각 음식의 예상 칼로리를 음식명과 칼로리만 bullet 형태로 알려줘. 예시: - 김치찌개 1인분 - 320kcal" },
                  { inlineData: { mimeType: "image/jpeg", data: base64 } }
                ]
              }
            ]
          })
        })
        .then(res => res.json())
        .then(data => {
          loadingDiv.style.display = 'none';
          let text = "";
          try {
            text = data.candidates[0].content.parts[0].text;
          } catch {
            text = "결과를 불러오지 못했습니다.";
          }
          const { items, total } = parseGeminiResult(text);
          // 결과 표시
          resultList.innerHTML = "";
          items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.name} - ${item.kcal}`;
            resultList.appendChild(li);
          });
          calorieTotal.innerText = `총 예상 칼로리: ${total}kcal`;
          exerciseSuggestion.innerText = getExerciseSuggestion(total);
          resultSection.style.display = 'block';
        })
        .catch(err => {
          loadingDiv.style.display = 'none';
          alert("AI 인식에 실패했습니다: " + err);
        });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
});

// Gemini 결과 파싱
function parseGeminiResult(responseText) {
  // 줄 단위로 분리
  const lines = responseText.split('\n').map(line => line.trim()).filter(Boolean);
  let total = 0;
  const items = [];

  lines.forEach(line => {
    // 1. "- 음식명 - 약 320kcal" 또는 "- 음식명: 320kcal" 또는 "음식명 - 320kcal" 등 다양한 형태 지원
    const match = line.match(/[-•]?\s*([^:-]+)[-:]\s*약?\s*([\d,]+)\s*kcal/i);
    if (match) {
      const name = match[1].trim();
      const kcal = match[2].replace(/,/g, '');
      total += parseInt(kcal, 10);
      items.push({ name, kcal: kcal + 'kcal' });
    }
    // 2. "음식명 320kcal" 형태도 지원
    else {
      const match2 = line.match(/([^\d]+)\s*([\d,]+)\s*kcal/i);
      if (match2) {
        const name = match2[1].trim();
        const kcal = match2[2].replace(/,/g, '');
        total += parseInt(kcal, 10);
        items.push({ name, kcal: kcal + 'kcal' });
      }
    }
  });

  // 총합이 이미 명시되어 있으면, 그 값을 우선 사용
  const totalMatch = responseText.match(/총[합계]?[\s:]*([\d,]+)\s*kcal/i);
  if (totalMatch) {
    total = parseInt(totalMatch[1].replace(/,/g, ''), 10);
  }

  return { items, total };
}

// 운동량 계산 예시
function getExerciseSuggestion(kcal) {
  // 단순 예시: 1km 달리기 = 60kcal, 10분 등산 = 70kcal
  const runKm = Math.round(kcal / 60);
  const hikeMin = Math.round(kcal / 7);
  return `🏃‍♂️ 달리기 약 ${runKm}km, 🥾 등산 약 ${hikeMin}분`;
}