// Get center location from localStorage or use default (Maryville, Missouri)
const defaultLocation = { lat: 40.3461, lng: -94.8722 }; // Maryville, MO
let centerLocation = defaultLocation;

const storedLocation = localStorage.getItem('centerLocation');
if (storedLocation) {
  // Try to parse as "lat,lng"
  const parts = storedLocation.split(',');
  if (parts.length === 2) {
    centerLocation = {
      lat: parseFloat(parts[0]),
      lng: parseFloat(parts[1])
    };
  }
}

// Initialize map at center location
const map = L.map('map').setView([centerLocation.lat, centerLocation.lng], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Example centers & trashcans (center at provided location)
const centers = [
  {
    name: localStorage.getItem('centerName') || "Your Recycling Center",
    lat: centerLocation.lat,
    lng: centerLocation.lng,
    types: ["Plastic", "Glass", "Metal"]
  }
];
const trashcans = [
  { id: 1, lat: centerLocation.lat + 0.005, lng: centerLocation.lng + 0.005, fullness: 80 },
  { id: 2, lat: centerLocation.lat - 0.005, lng: centerLocation.lng - 0.005, fullness: 30 }
];

// Add center markers
centers.forEach(center => {
  L.marker([center.lat, center.lng])
    .addTo(map)
    .bindPopup(`<b>${center.name}</b><br>Accepts: ${center.types.join(', ')}`);
});

// Add trashcan markers
trashcans.forEach(tc => {
  L.circleMarker([tc.lat, tc.lng], {
    color: tc.fullness > 75 ? 'red' : 'green',
    radius: 10
  })
    .addTo(map)
    .bindPopup(`Trashcan #${tc.id}<br>Fullness: ${tc.fullness}%`);
});

// --- STATS SECTION ---
const ctx = document.getElementById('trashStatsChart').getContext('2d');
const trashStatsChart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: trashcans.map(tc => `Trashcan ${tc.id}`),
    datasets: [{
      label: 'Fullness (%)',
      data: trashcans.map(tc => tc.fullness),
      backgroundColor: trashcans.map(tc => tc.fullness > 75 ? 'rgba(255,0,0,0.6)' : 'rgba(0,128,0,0.6)')
    }]
  },
  options: {
    scales: {
      y: { beginAtZero: true, max: 100 }
    }
  }
});

// --- ROUTES SECTION ---
document.getElementById('routes').innerHTML = `
  <p>Suggested pickup route: Trashcan 1 → Trashcan 2 → ${centers[0].name}</p>
`;

// --- CENTER INFO SECTION ---
document.getElementById('centerInfo').innerHTML = centers.map(center => `
  <div class="center-card">
    <h3>${center.name}</h3>
    <p>Accepts: ${center.types.join(', ')}</p>
    <p>Location: (${center.lat}, ${center.lng})</p>
  </div>
`).join('');