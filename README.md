# Weather Data Dashboard (Project 3)

Interactive, responsive website that presents monthly weather data (2025) for five Egyptian cities:
Cairo, Alexandria, Port Said, Hurghada and Aswan.

Built with HTML5, CSS3, Bootstrap 5, JavaScript and Chart.js.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure: header, nav, filters, KPIs, charts, table, data notes, footer |
| `css/style.css` | Own styles (colours, KPI cards, chart sizes, focus outlines) |
| `js/app.js` | Loads the CSV, cleans it, calculates KPIs, draws and updates the charts |
| `data/weather.csv` | Dataset used by the site (60 records) |
| `data/weather.json` | Same dataset in JSON format |

## Features

- **KPIs:** records, average / highest / lowest temperature, total rainfall, average humidity
- **Charts:** line (temperature trend), bar (rainfall per month), bar (humidity by city), pie (weather conditions)
- **Filter:** city dropdown. All KPIs, the table and the charts update together
- **Extra controls:** season buttons (Winter / Spring / Summer / Autumn), °C / °F toggle, Reset
- **Data storytelling:** a finding under each chart, recalculated for every selection
- **Data cleaning:** 5 missing or invalid cells (empty values, humidity 105 %, rainfall −1) are set to missing, highlighted in the table and excluded from calculations
- **Accessibility:** semantic HTML, skip link, aria-labels on charts, keyboard focus outlines, `aria-pressed` buttons, live filter summary

## Run locally

1. Open the folder in Visual Studio Code.
2. Right-click `index.html` → **Open with Live Server**.

(Double-clicking `index.html` will not load the data, because browsers block `fetch()` from `file://`.)

## Publish on GitHub Pages

1. Create a new public repository on GitHub, e.g. `weather-dashboard`.
2. Upload all files, keeping the folders (`css`, `js`, `data`) and `index.html` at the top level.
3. Go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, and save.
4. After about a minute the site is live at `https://<your-username>.github.io/weather-dashboard/`.

## Data note

Simulated teaching dataset built from published long-term monthly climate normals for each city, with small random
variation to imitate one year. Not official observations. See the "About the data" section on the site for methods and limitations.
# ufe-data-visualization-project
