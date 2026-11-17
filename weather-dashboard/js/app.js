// Weather Data Dashboard: load data, clean it, calculate KPIs, draw charts, react to the user.
// The four repeating steps from the course: 1) Store  2) Calculate  3) Display  4) React

// ---------- PART 1: Settings ----------
const DATA_FILE = "data/weather.csv";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Northern-hemisphere seasons, as month numbers (1 = January)
const SEASONS = { All: [1,2,3,4,5,6,7,8,9,10,11,12], Winter: [12,1,2], Spring: [3,4,5], Summer: [6,7,8], Autumn: [9,10,11] };
const CITY_COLORS = ["#1d6fa3", "#b85c00", "#2a9d8f", "#7b3fa0", "#c0392b"];
const CONDITION_COLORS = { Sunny: "#f2a33a", Hot: "#c0392b", Windy: "#7f8c8d", Cloudy: "#5d7b93", Rainy: "#1d6fa3" };

// What the user has selected (the "state" of the page)
const state = { city: "All", season: "All", unit: "C" };

let DATA = [];          // cleaned records
let CITIES = [];        // each city once
let cleanedCount = 0;   // how many cells were missing or invalid
let tempChart, rainChart, humChart, condChart;

// ---------- PART 2: Helpers ----------
const $ = id => document.getElementById(id);
const valid = arr => arr.filter(v => v !== null && !Number.isNaN(v));   // drop missing values
const sum = arr => valid(arr).reduce((t, x) => t + x, 0);
const avg = arr => { const v = valid(arr); return v.length ? sum(v) / v.length : null; };
const pct = (part, total) => total ? part / total * 100 : 0;
const toUnit = c => c === null ? null : (state.unit === "F" ? c * 9 / 5 + 32 : c);    // °C -> °F when needed
const fmtT = (c, d = 1) => c === null ? "—" : toUnit(c).toFixed(d) + "°" + state.unit;
const fmt = (v, d = 1) => v === null ? "—" : v.toFixed(d);
const monthOf = d => d.month;   // 1..12

// ---------- PART 3: Load the CSV file ----------
// On Live Server or GitHub Pages the file is fetched. (Opening index.html by double-click will not work,
// because browsers block fetch() from file://. Use Live Server.)
async function loadCSV() {
  const embedded = document.getElementById("weather-csv");   // optional inline copy, used by the offline preview
  if (embedded) return embedded.textContent.trim();
  const res = await fetch(DATA_FILE);
  if (!res.ok) throw new Error("Could not load " + DATA_FILE);
  return (await res.text()).trim();
}

// Turn CSV text into an array of objects: one object per line, keys from the header line
function parseCSV(text) {
  const [header, ...lines] = text.split(/\r?\n/);
  const keys = header.split(",");
  return lines.filter(l => l.trim()).map(line => {
    const cells = line.split(",");
    return Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? "").trim()]));
  });
}

// ---------- PART 4: Clean the data ----------
// Rules: empty -> missing; values outside a sensible range -> missing. Missing values are skipped in calculations.
const RULES = {
  temperature: v => v >= -50 && v <= 60,
  humidity:    v => v >= 0 && v <= 100,
  rainfall:    v => v >= 0,
  wind_speed:  v => v >= 0
};
function cleanNumber(raw, rule, record, field) {
  const v = raw === "" ? NaN : Number(raw);
  if (Number.isNaN(v) || !rule(v)) {
    record.cleaned.push(field);  // remember which cells were fixed, so the table can mark them
    cleanedCount++;
    return null;
  }
  return v;
}
function clean(rows) {
  return rows.map(r => {
    const d = { date: r.date, city: r.city, condition: r.condition || "Unknown", cleaned: [] };
    d.month = Number(r.date.slice(5, 7));
    for (const field of Object.keys(RULES)) d[field] = cleanNumber(r[field], RULES[field], d, field);
    return d;
  });
}

// ---------- PART 5: Filter ----------
function selectedRows(city = state.city) {
  const months = SEASONS[state.season];
  return DATA.filter(d => (city === "All" || d.city === city) && months.includes(d.month));
}
// Months of the selected season in calendar order (Winter shows Jan, Feb, Dec)
const seasonMonths = () => SEASONS[state.season].slice().sort((a, b) => a - b);

// ---------- PART 6: Create the charts once ----------
function makeCharts() {
  Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  Chart.defaults.color = "#3e4c59";
  const common = { responsive: true, maintainAspectRatio: false };

  // 1) Line: temperature trend (one line per city)
  tempChart = new Chart($("tempChart"), {
    type: "line",
    data: { labels: [], datasets: [] },
    options: { ...common, interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "bottom" },
                 tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y.toFixed(1)}°${state.unit}` } } },
      scales: { x: { title: { display: true, text: "Month (2025)" } },
                y: { title: { display: true, text: "Average temperature (°C)" } } } }
  });

  // 2) Bar: rainfall per month
  rainChart = new Chart($("rainChart"), {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Rainfall (mm)", data: [], backgroundColor: "#1d6fa3", borderRadius: 4 }] },
    options: { ...common, plugins: { legend: { display: false },
                 tooltip: { callbacks: { label: c => `${c.parsed.y.toFixed(1)} mm` } } },
      scales: { x: { title: { display: true, text: "Month (2025)" } },
                y: { beginAtZero: true, title: { display: true, text: "Rainfall (mm)" } } } }
  });

  // 3) Bar: average humidity of every city (all cities stay visible so they can be compared)
  humChart = new Chart($("humChart"), {
    type: "bar",
    data: { labels: CITIES, datasets: [{ label: "Average humidity (%)", data: [], backgroundColor: [], borderRadius: 4 }] },
    options: { ...common, plugins: { legend: { display: false },
                 tooltip: { callbacks: { label: c => `${c.parsed.y.toFixed(1)} %` } } },
      scales: { x: { title: { display: true, text: "City" } },
                y: { beginAtZero: true, max: 100, title: { display: true, text: "Relative humidity (%)" } } } }
  });

  // 4) Pie: share of months with each weather condition
  condChart = new Chart($("condChart"), {
    type: "pie",
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: "#fff", borderWidth: 2 }] },
    options: { ...common, plugins: { legend: { position: "right" },
                 tooltip: { callbacks: { label: c => `${c.label}: ${c.parsed} months (${pct(c.parsed, sum(c.dataset.data)).toFixed(0)}%)` } } } }
  });
}

// ---------- PART 7: Render everything for the current selection ----------
function render() {
  const rows = selectedRows();
  const months = seasonMonths();
  const labels = months.map(m => MONTHS[m - 1]);
  const cities = state.city === "All" ? CITIES : [state.city];
  const temps = rows.map(d => d.temperature);
  const where = state.city === "All" ? "the five cities" : state.city;
  const when = state.season === "All" ? "2025" : `${state.season.toLowerCase()} 2025`;

  // --- 1) Calculate the KPIs ---
  const withTemp = rows.filter(d => d.temperature !== null);
  const hottest = withTemp.reduce((a, b) => (b.temperature > a.temperature ? b : a), withTemp[0]);
  const coldest = withTemp.reduce((a, b) => (b.temperature < a.temperature ? b : a), withTemp[0]);
  const totalRain = sum(rows.map(d => d.rainfall));
  const kpis = [
    ["Records", rows.length, `${cities.length} cit${cities.length > 1 ? "ies" : "y"} × ${months.length} months`],
    ["Average temp.", fmtT(avg(temps)), "mean of monthly values"],
    ["Highest temp.", fmtT(hottest?.temperature ?? null), hottest ? `${hottest.city}, ${MONTHS[hottest.month - 1]}` : ""],
    ["Lowest temp.", fmtT(coldest?.temperature ?? null), coldest ? `${coldest.city}, ${MONTHS[coldest.month - 1]}` : ""],
    ["Total rainfall", fmt(totalRain) + " mm", "sum of monthly totals"],
    ["Avg humidity", fmt(avg(rows.map(d => d.humidity)), 0) + " %", "relative humidity"]
  ];

  // --- 2) Display KPIs and table ---
  $("kpis").innerHTML = kpis.map(([label, value, sub]) =>
    `<div class="col-6 col-md-4 col-xl-2"><div class="card kpi p-3 h-100"><small>${label}</small>` +
    `<div class="value">${value}</div><div class="sub">${sub}</div></div></div>`).join("");

  const cell = (d, field, text) => `<td${d.cleaned.includes(field) ? ' class="cleaned" title="Missing or invalid in the raw data"' : ""}>${text}</td>`;
  $("tbody").innerHTML = rows.map(d =>
    `<tr><td>${d.date}</td><td>${d.city}</td>` +
    cell(d, "temperature", d.temperature === null ? "—" : toUnit(d.temperature).toFixed(1)) +
    cell(d, "humidity", d.humidity ?? "—") +
    cell(d, "rainfall", d.rainfall === null ? "—" : d.rainfall.toFixed(1)) +
    cell(d, "wind_speed", d.wind_speed === null ? "—" : d.wind_speed.toFixed(1)) +
    `<td>${d.condition}</td></tr>`).join("");
  $("thTemp").textContent = `Temperature (°${state.unit})`;

  $("filterSummary").textContent =
    `Showing ${rows.length} records for ${where}, ${when}. Temperatures in °${state.unit}.`;

  // --- 3) Update the charts ---
  // Line: one dataset per city, one point per month
  tempChart.data.labels = labels;
  tempChart.data.datasets = cities.map(c => {
    const color = CITY_COLORS[CITIES.indexOf(c)];
    return { label: c, borderColor: color, backgroundColor: color, tension: .3, spanGaps: true, pointRadius: 3,
      data: months.map(m => { const r = DATA.find(d => d.city === c && d.month === m); return r ? toUnit(r.temperature) : null; }) };
  });
  tempChart.options.scales.y.title.text = `Average temperature (°${state.unit})`;

  // Bar: total rainfall of the selected cities, per month
  const rainByMonth = months.map(m => sum(rows.filter(d => d.month === m).map(d => d.rainfall)));
  rainChart.data.labels = labels;
  rainChart.data.datasets[0].data = rainByMonth;
  rainChart.data.datasets[0].label = state.city === "All" ? "Rainfall, 5 cities combined (mm)" : `Rainfall in ${state.city} (mm)`;

  // Bar: humidity per city for the selected season; highlight the chosen city
  const humByCity = CITIES.map(c => avg(selectedRows(c).map(d => d.humidity)));
  humChart.data.datasets[0].data = humByCity;
  humChart.data.datasets[0].backgroundColor = CITIES.map((c, i) =>
    state.city === "All" || state.city === c ? CITY_COLORS[i] : "#c3ccd5");

  // Pie: how many months had each condition
  const condCounts = {};
  rows.forEach(d => { condCounts[d.condition] = (condCounts[d.condition] || 0) + 1; });
  const condNames = Object.keys(CONDITION_COLORS).filter(k => condCounts[k]);
  condChart.data.labels = condNames;
  condChart.data.datasets[0].data = condNames.map(k => condCounts[k]);
  condChart.data.datasets[0].backgroundColor = condNames.map(k => CONDITION_COLORS[k]);

  [tempChart, rainChart, humChart, condChart].forEach(c => c.update());

  // --- 4) Write a finding under each chart (data storytelling) ---
  writeFindings({ rows, months, labels, cities, where, when, rainByMonth, totalRain, humByCity, condCounts });
}

// ---------- PART 8: Findings: a sentence that explains each chart ----------
function writeFindings({ rows, months, labels, cities, where, when, rainByMonth, totalRain, humByCity, condCounts }) {
  // Temperature: mean across the selected cities for each month, then the warmest and coolest month
  const monthMeans = months.map(m => avg(rows.filter(d => d.month === m).map(d => d.temperature)));
  const hi = monthMeans.indexOf(Math.max(...valid(monthMeans)));
  const lo = monthMeans.indexOf(Math.min(...valid(monthMeans)));
  let t = `In ${where}, ${when}, the warmest month is ${labels[hi]} (${fmtT(monthMeans[hi])}) and the coolest is ` +
          `${labels[lo]} (${fmtT(monthMeans[lo])}), a swing of ${Math.abs(+toUnit(monthMeans[hi]).toFixed(1) - +toUnit(monthMeans[lo]).toFixed(1)).toFixed(1)}°${state.unit}.`;
  if (cities.length > 1) {
    const cityMeans = cities.map(c => avg(rows.filter(d => d.city === c).map(d => d.temperature)));
    const h = cityMeans.indexOf(Math.max(...cityMeans)), l = cityMeans.indexOf(Math.min(...cityMeans));
    t += ` ${cities[h]} is the hottest city on average (${fmtT(cityMeans[h])}); ${cities[l]} is the mildest (${fmtT(cityMeans[l])}).`;
  }
  if (months.length === 1) t = `Only one month selected: average ${fmtT(monthMeans[0])}.`;
  $("tempFinding").innerHTML = "<strong>Finding:</strong> " + t;

  // Rainfall: wettest month and how dry the rest of the period is
  let r;
  if (totalRain < 1) {
    r = `${where} received almost no rain in ${when} (${totalRain.toFixed(1)} mm in total): it is effectively a desert climate.`;
  } else {
    const w = rainByMonth.indexOf(Math.max(...rainByMonth));
    const dry = rainByMonth.filter(v => v < 1).length;
    r = `${labels[w]} is the wettest month with ${rainByMonth[w].toFixed(1)} mm, ${pct(rainByMonth[w], totalRain).toFixed(0)}% of the ` +
        `${totalRain.toFixed(1)} mm total.` +
        (dry ? ` ${dry} of ${months.length} months had less than 1 mm, so the rain falls in a short wet season.` : "");
  }
  $("rainFinding").innerHTML = "<strong>Finding:</strong> " + r;

  // Humidity: compare the cities
  const okH = humByCity.map((v, i) => [CITIES[i], v]).filter(([, v]) => v !== null);
  const maxH = okH.reduce((a, b) => (b[1] > a[1] ? b : a)), minH = okH.reduce((a, b) => (b[1] < a[1] ? b : a));
  let h = `${maxH[0]} is the most humid city (${maxH[1].toFixed(0)}%) and ${minH[0]} the driest (${minH[1].toFixed(0)}%). ` +
          `Coastal cities stay humid all year, while inland Aswan is far drier.`;
  if (state.city !== "All") {
    const mine = humByCity[CITIES.indexOf(state.city)], all = avg(humByCity);
    h = `${state.city} averages ${fmt(mine, 0)}% humidity, ${mine >= all ? "above" : "below"} the five-city average of ${all.toFixed(0)}%. ` +
        `Most humid: ${maxH[0]} (${maxH[1].toFixed(0)}%); driest: ${minH[0]} (${minH[1].toFixed(0)}%).`;
  }
  $("humFinding").innerHTML = "<strong>Finding:</strong> " + h;

  // Conditions: most common condition
  const top = Object.entries(condCounts).sort((a, b) => b[1] - a[1])[0];
  const rainy = (condCounts.Rainy || 0) + (condCounts.Cloudy || 0);
  $("condFinding").innerHTML = "<strong>Finding:</strong> " +
    `“${top[0]}” is the most common condition (${top[1]} of ${rows.length} months, ${pct(top[1], rows.length).toFixed(0)}%). ` +
    `Rainy or cloudy months make up ${pct(rainy, rows.length).toFixed(0)}% of the selection.`;
}

// ---------- PART 9: React to the user ----------
function setActive(groupId, attr, value) {
  document.querySelectorAll(`#${groupId} .btn`).forEach(b => {
    const on = b.dataset[attr] === value;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on);
  });
}
function wireControls() {
  ["All", ...CITIES].forEach(c => $("cityFilter").add(new Option(c === "All" ? "All cities" : c, c)));
  $("cityFilter").addEventListener("change", e => { state.city = e.target.value; render(); });

  $("seasonButtons").addEventListener("click", e => {
    const b = e.target.closest("[data-season]"); if (!b) return;
    state.season = b.dataset.season; setActive("seasonButtons", "season", state.season); render();
  });
  $("unitButtons").addEventListener("click", e => {
    const b = e.target.closest("[data-unit]"); if (!b) return;
    state.unit = b.dataset.unit; setActive("unitButtons", "unit", state.unit); render();
  });
  $("resetBtn").addEventListener("click", () => {
    Object.assign(state, { city: "All", season: "All", unit: "C" });
    $("cityFilter").value = "All"; setActive("seasonButtons", "season", "All"); setActive("unitButtons", "unit", "C");
    render();
  });
}

// ---------- PART 10: Start ----------
(async function start() {
  try {
    DATA = clean(parseCSV(await loadCSV()));
    CITIES = [...new Set(DATA.map(d => d.city))];
    $("recordNote").textContent = `${DATA.length} records (${CITIES.length} cities × 12 months). ` +
      `${cleanedCount} cells were missing or invalid in the raw file and were cleaned.`;
    wireControls();
    makeCharts();
    render();
  } catch (err) {
    $("main").insertAdjacentHTML("afterbegin",
      `<div class="alert alert-danger" role="alert"><strong>The data could not be loaded.</strong> ${err.message}. ` +
      `Open the site with Live Server (or on GitHub Pages) instead of double-clicking index.html.</div>`);
    console.error(err);
  }
})();
