const PROFILE_KEY = "healthProfile";
const RECORDS_KEY = "healthRecords";

let chart = null;

function getProfile() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY));
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function getRecords() {
  return JSON.parse(localStorage.getItem(RECORDS_KEY)) || [];
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function calculateBMI(height, weight) {
  if (height === null || weight === null) return null;

  const heightM = height / 100;
  if (heightM <= 0) return null;

  return Number((weight / (heightM * heightM)).toFixed(1));
}

function parseNumber(id) {
  const value = document.getElementById(id).value;
  if (value === "") return null;
  return Number(value);
}

function getNormalRanges(age) {
  if (age < 20) {
    return {
      sbp: [90, 120],
      dbp: [50, 70],
      heartRate: [70, 100],
      spo2: [98, 99],
      temperature: [36.5, 37.0]
    };
  }

  if (age < 65) {
    return {
      sbp: [100, 130],
      dbp: [50, 70],
      heartRate: [65, 85],
      spo2: [98, 99],
      temperature: [36.5, 37.0]
    };
  }

  return {
    sbp: [100, 140],
    dbp: [50, 80],
    heartRate: [60, 90],
    spo2: [97, 99],
    temperature: [36.3, 37.0]
  };
}

function getStatus(value, range) {
  if (value === null || value === undefined) return null;

  if (value >= range[0] && value <= range[1]) {
    return "green";
  }

  return "red";
}

function formatValue(value) {
  return value === null || value === undefined ? "-" : value;
}

function getRecent7DayRecords() {
  const records = getRecords();
  const now = new Date();
  const sevenDaysAgo = new Date();

  sevenDaysAgo.setDate(now.getDate() - 7);

  return records.filter(record => {
    const recordDate = new Date(record.rawDate);
    return recordDate >= sevenDaysAgo && recordDate <= now;
  });
}

function calculateAverage(records, key) {
  const values = records
    .map(record => record[key])
    .filter(value => value !== null && value !== undefined && !isNaN(value));

  if (values.length === 0) return null;

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

function renderProfile() {
  const profileSection = document.getElementById("profileSection");
  const recordSection = document.getElementById("recordSection");

  const profile = getProfile();

  if (!profile) {
    profileSection.innerHTML = `
      <h2>第一次使用：設定基本資料</h2>

      <form id="profileForm">
        <input type="text" id="name" placeholder="姓名" required />

        <select id="sex" required>
          <option value="">請選擇性別</option>
          <option value="男">男</option>
          <option value="女">女</option>
          <option value="其他">其他</option>
        </select>

        <label>出生年月日</label>
        <input type="date" id="birthDate" required />

        <button type="submit">儲存基本資料</button>
      </form>
    `;

    document.getElementById("profileForm").addEventListener("submit", function (e) {
      e.preventDefault();

      const newProfile = {
        name: document.getElementById("name").value,
        sex: document.getElementById("sex").value,
        birthDate: document.getElementById("birthDate").value,
        createdAt: new Date().toLocaleString()
      };

      saveProfile(newProfile);
      renderAll();
    });

    recordSection.classList.add("hidden");
    return;
  }

  const age = calculateAge(profile.birthDate);

  profileSection.innerHTML = `
    <h2>基本資料</h2>

    <p><strong>姓名：</strong>${profile.name}</p>
    <p><strong>性別：</strong>${profile.sex}</p>
    <p><strong>出生年月日：</strong>${profile.birthDate}</p>
    <p><strong>年齡：</strong>${age} 歲</p>

    <details>
      <summary>修改基本資料</summary>

      <form id="editProfileForm">
        <input type="text" id="editName" value="${profile.name}" required />

        <select id="editSex" required>
          <option value="男" ${profile.sex === "男" ? "selected" : ""}>男</option>
          <option value="女" ${profile.sex === "女" ? "selected" : ""}>女</option>
          <option value="其他" ${profile.sex === "其他" ? "selected" : ""}>其他</option>
        </select>

        <input type="date" id="editBirthDate" value="${profile.birthDate}" required />

        <button type="submit">更新基本資料</button>
      </form>
    </details>
  `;

  document.getElementById("editProfileForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const updatedProfile = {
      ...profile,
      name: document.getElementById("editName").value,
      sex: document.getElementById("editSex").value,
      birthDate: document.getElementById("editBirthDate").value
    };

    saveProfile(updatedProfile);
    renderAll();
  });

  recordSection.classList.remove("hidden");
}

function setupRecordForm() {
  const recordForm = document.getElementById("recordForm");

  recordForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const height = parseNumber("height");
    const weight = parseNumber("weight");

    const now = new Date();

    const record = {
      rawDate: now.toISOString(),
      createdAt: now.toLocaleString(),
      height: height,
      weight: weight,
      bmi: calculateBMI(height, weight),
      sbp: parseNumber("sbp"),
      dbp: parseNumber("dbp"),
      heartRate: parseNumber("heartRate"),
      spo2: parseNumber("spo2"),
      temperature: parseNumber("temperature")
    };

    const records = getRecords();
    records.push(record);
    saveRecords(records);

    recordForm.reset();
    renderAll();
  });
}

function renderStatus() {
  const profile = getProfile();
  const records = getRecords();

  const statusSection = document.getElementById("statusSection");
  const statusGrid = document.getElementById("statusGrid");

  if (!profile || records.length === 0) {
    statusSection.classList.add("hidden");
    return;
  }

  const latest = records[records.length - 1];
  const age = calculateAge(profile.birthDate);
  const ranges = getNormalRanges(age);

  const items = [
    { key: "sbp", label: "收縮壓", unit: "mmHg" },
    { key: "dbp", label: "舒張壓", unit: "mmHg" },
    { key: "heartRate", label: "心律", unit: "bpm" },
    { key: "spo2", label: "血氧", unit: "%" },
    { key: "temperature", label: "體溫", unit: "°C" }
  ];

  statusGrid.innerHTML = "";

  items.forEach(item => {
    const value = latest[item.key];

    if (value === null || value === undefined) return;

    const range = ranges[item.key];
    const status = getStatus(value, range);

    statusGrid.innerHTML += `
      <div class="status-box">
        <div>${item.label}</div>
        <strong>${value} ${item.unit}</strong>
        <span class="${status}">●</span>
        <small>正常：${range[0]}–${range[1]}</small>
      </div>
    `;
  });

  statusSection.classList.remove("hidden");
}

function renderAverage() {
  const profile = getProfile();
  const records = getRecent7DayRecords();

  const averageSection = document.getElementById("averageSection");
  const averageGrid = document.getElementById("averageGrid");

  if (!profile || records.length === 0) {
    averageSection.classList.add("hidden");
    return;
  }

  const age = calculateAge(profile.birthDate);
  const ranges = getNormalRanges(age);

  const items = [
    { key: "sbp", label: "收縮壓", unit: "mmHg" },
    { key: "dbp", label: "舒張壓", unit: "mmHg" },
    { key: "heartRate", label: "心律", unit: "bpm" },
    { key: "spo2", label: "血氧", unit: "%" },
    { key: "temperature", label: "體溫", unit: "°C" },
    { key: "weight", label: "體重", unit: "kg" },
    { key: "bmi", label: "BMI", unit: "" }
  ];

  averageGrid.innerHTML = "";

  items.forEach(item => {
    const avg = calculateAverage(records, item.key);

    if (avg === null) return;

    let statusHtml = "";

    if (ranges[item.key]) {
      const status = getStatus(avg, ranges[item.key]);
      statusHtml = `<span class="${status}">●</span>
                    <small>正常：${ranges[item.key][0]}–${ranges[item.key][1]}</small>`;
    }

    averageGrid.innerHTML += `
      <div class="status-box">
        <div>${item.label}</div>
        <strong>${avg} ${item.unit}</strong>
        ${statusHtml}
        <small>近 7 天平均</small>
      </div>
    `;
  });

  averageSection.classList.remove("hidden");
}

function renderChart() {
  const records = getRecords();
  const chartSection = document.getElementById("chartSection");

  if (records.length === 0) {
    chartSection.classList.add("hidden");
    return;
  }

  chartSection.classList.remove("hidden");

  const labels = records.map(r => r.createdAt);

  const data = {
    labels: labels,
    datasets: [
      { label: "身高", data: records.map(r => r.height), spanGaps: true },
      { label: "體重", data: records.map(r => r.weight), spanGaps: true },
      { label: "BMI", data: records.map(r => r.bmi), spanGaps: true },
      { label: "收縮壓", data: records.map(r => r.sbp), spanGaps: true },
      { label: "舒張壓", data: records.map(r => r.dbp), spanGaps: true },
      { label: "心律", data: records.map(r => r.heartRate), spanGaps: true },
      { label: "血氧", data: records.map(r => r.spo2), spanGaps: true },
      { label: "體溫", data: records.map(r => r.temperature), spanGaps: true }
    ]
  };

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(document.getElementById("healthChart"), {
    type: "line",
    data: data,
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function renderHistory() {
  const records = getRecords();
  const historySection = document.getElementById("historySection");
  const historyTable = document.getElementById("historyTable");

  if (records.length === 0) {
    historySection.classList.add("hidden");
    return;
  }

  historyTable.innerHTML = "";

  records.forEach(record => {
    historyTable.innerHTML += `
      <tr>
        <td>${record.createdAt}</td>
        <td>${formatValue(record.height)}</td>
        <td>${formatValue(record.weight)}</td>
        <td>${formatValue(record.bmi)}</td>
        <td>${formatValue(record.sbp)}</td>
        <td>${formatValue(record.dbp)}</td>
        <td>${formatValue(record.heartRate)}</td>
        <td>${formatValue(record.spo2)}</td>
        <td>${formatValue(record.temperature)}</td>
      </tr>
    `;
  });

  historySection.classList.remove("hidden");
}

function clearRecords() {
  const confirmed = confirm("確定要清除所有健康紀錄嗎？");

  if (!confirmed) return;

  localStorage.removeItem(RECORDS_KEY);
  renderAll();
}

function renderAll() {
  renderProfile();
  renderStatus();
  renderAverage();
  renderChart();
  renderHistory();
}

setupRecordForm();
renderAll();