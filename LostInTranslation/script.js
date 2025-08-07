const citiesWithMetro = [
  { city: "Amsterdam", code: "nl" },
  { city: "Athens", code: "gr" },
  { city: "Barcelona", code: "es" },
  { city: "Berlin", code: "de" },
  { city: "Boston", code: "us" },
  { city: "Copenhagen", code: "dk" },
  { city: "Glasgow", code: "gb" },
  { city: "Hamburg", code: "de" },
  { city: "Helsinki", code: "fi" },
  { city: "Lisbon", code: "pt" },
  { city: "London", code: "gb" },
  { city: "Los Angeles", code: "us" },
  { city: "Madrid", code: "es" },
  { city: "Munich", code: "de" },
  { city: "New York City", code: "us" },
  { city: "Oslo", code: "no" },
  { city: "Paris", code: "fr" },
  { city: "Rome", code: "it" },
  { city: "San Francisco", code: "us" },
  { city: "Stockholm", code: "se" },
  { city: "Vienna", code: "at" },
  { city: "Warsaw", code: "pl" }
];

const input = document.getElementById('city-input');
const suggestions = document.getElementById('city-suggestions');

// Helper for rendering suggestions with inline divs and SVG/PNG icons
function renderSuggestions(value) {
  suggestions.innerHTML = '';
  if (!value || value.length < 1) {
    suggestions.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
    return;
  }
  const matches = citiesWithMetro.filter(item =>
    item.city.toLowerCase().includes(value.toLowerCase())
  );
  if (matches.length === 0) {
    suggestions.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
    return;
  }
  matches.forEach(({ city, code }) => {
    const div = document.createElement('div');
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "10px";
    div.style.padding = "6px 10px";

    // Use PNGs from flagcdn, 24x18 is standard, rounded with CSS
    div.innerHTML = `
      <span style="color:#2a9d8f; font-weight:bold; margin-right:6px;">NEW!</span>
      <img src="https://flagcdn.com/24x18/${code.toLowerCase()}.png"
           alt="flag"
           style="width:26px;height:20px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.08);object-fit:cover;vertical-align:middle;"/>
      <span style="font-size:1rem;">${city}</span>
    `;
    div.setAttribute('role', 'option');
    div.onclick = () => {
      input.value = city;
      suggestions.classList.remove('open');
      input.setAttribute('aria-expanded', 'false');
      suggestions.innerHTML = '';
    };
    suggestions.appendChild(div);
  });
  suggestions.classList.add('open');
  input.setAttribute('aria-expanded', 'true');
}

// Show on input
input.addEventListener('input', () => {
  renderSuggestions(input.value);
});

// Show all on focus
input.addEventListener('focus', () => {
  renderSuggestions('');
});

// Optional: close on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.form')) {
    suggestions.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
  }
});

// Keyboard navigation (optional)
input.addEventListener('keydown', (e) => {
  const options = Array.from(suggestions.children);
  let idx = options.findIndex(option => option.classList.contains('active'));
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (idx >= 0) options[idx].classList.remove('active');
    idx = (idx + 1) % options.length;
    options[idx]?.classList.add('active');
    options[idx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (idx >= 0) options[idx].classList.remove('active');
    idx = (idx - 1 + options.length) % options.length;
    options[idx]?.classList.add('active');
    options[idx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    if (idx >= 0) {
      input.value = options[idx].textContent.replace(/^NEW!\s*/, '').trim();
      suggestions.classList.remove('open');
      input.setAttribute('aria-expanded', 'false');
      suggestions.innerHTML = '';
    }
  }
});
