
"use strict";

/* ==========================================================
   AADS — Adaptive Ambulance Dispatch & Emergency Routing
   Front-end educational simulation. Not for real dispatch.
   ========================================================== */

const $ = (id) => document.getElementById(id);

const nodes = {
  A: { x: 78,  y: 77,  name: "North Gate", type: "station" },
  B: { x: 265, y: 77,  name: "Central Hub", type: "junction" },
  C: { x: 475, y: 77,  name: "East Gate", type: "station" },
  D: { x: 115, y: 218, name: "West Road", type: "junction" },
  E: { x: 340, y: 218, name: "Central Junction", type: "junction" },
  F: { x: 600, y: 218, name: "Medical District", type: "hospital" },
  G: { x: 265, y: 337, name: "South Gate", type: "junction" }
};

// Edge weights are illustrative travel-cost units.
const edges = [
  ["A", "B", 5], ["B", "C", 3], ["A", "D", 4],
  ["D", "E", 3], ["B", "E", 2], ["C", "F", 4],
  ["E", "F", 2], ["E", "G", 4], ["D", "G", 5],
  ["B", "G", 5]
];

const graph = Object.fromEntries(
  Object.keys(nodes).map((node) => [node, []])
);

for (const [a, b, weight] of edges) {
  graph[a].push([b, weight]);
  graph[b].push([a, weight]);
}

let emergencies = [
  { id: "E101", type: "Cardiac emergency", location: "F", severity: 10, status: "Waiting" },
  { id: "E102", type: "Road accident", location: "C", severity: 7, status: "Waiting" },
  { id: "E103", type: "Medical assistance", location: "B", severity: 4, status: "Waiting" },
  { id: "E104", type: "Minor injury", location: "D", severity: 2, status: "Waiting" }
];

let ambulances = [
  { id: "A1", location: "A", status: "Available", traffic: 8 },
  { id: "A2", location: "C", status: "Available", traffic: 2 },
  { id: "A3", location: "D", status: "Available", traffic: 4 },
  { id: "A4", location: "G", status: "On Mission", traffic: 3 }
];

let hospitals = [
  { id: "H1", name: "Central Medical Centre", location: "F", occupied: 9, capacity: 20, specialties: ["cardiac", "general"] },
  { id: "H2", name: "City General Hospital", location: "E", occupied: 8, capacity: 20, specialties: ["trauma", "general"] },
  { id: "H3", name: "Northside Hospital", location: "B", occupied: 5, capacity: 20, specialties: ["general", "cardiac"] }
];

let lastResult = null;
let nextEmergencyNumber = 105;
let toastTimer = null;

/* ------------------ Binary Min Heap ------------------ */

class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    let i = this.items.length - 1;

    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.items[parent][0] <= this.items[i][0]) break;

      [this.items[parent], this.items[i]] =
        [this.items[i], this.items[parent]];

      i = parent;
    }
  }

  pop() {
    if (!this.items.length) return null;

    const minimum = this.items[0];
    const last = this.items.pop();

    if (this.items.length) {
      this.items[0] = last;
      let i = 0;

      while (true) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;

        if (
          left < this.items.length &&
          this.items[left][0] < this.items[smallest][0]
        ) smallest = left;

        if (
          right < this.items.length &&
          this.items[right][0] < this.items[smallest][0]
        ) smallest = right;

        if (smallest === i) break;

        [this.items[i], this.items[smallest]] =
          [this.items[smallest], this.items[i]];

        i = smallest;
      }
    }

    return minimum;
  }
}

/* ------------------ Graph + Dijkstra ------------------ */

function dijkstra(start, destination, trafficMode = "normal") {
  if (!graph[start] || !graph[destination]) {
    return { cost: Infinity, route: [] };
  }

  const distances = Object.fromEntries(
    Object.keys(nodes).map((node) => [node, Infinity])
  );
  const previous = {};
  const visited = new Set();
  const heap = new MinHeap();

  distances[start] = 0;
  heap.push([0, start]);

  while (heap.size) {
    const [distance, current] = heap.pop();

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === destination) break;

    for (const [neighbor, baseCost] of graph[current]) {
      if (visited.has(neighbor)) continue;

      // Traffic changes the road's traversal cost.
      const factor =
        trafficMode === "heavy" ? 1.8 :
        trafficMode === "clear" ? 0.8 : 1;

      const roadCost = baseCost * factor;
      const nextDistance = distance + roadCost;

      if (nextDistance < distances[neighbor]) {
        distances[neighbor] = nextDistance;
        previous[neighbor] = current;
        heap.push([nextDistance, neighbor]);
      }
    }
  }

  if (!Number.isFinite(distances[destination])) {
    return { cost: Infinity, route: [] };
  }

  const route = [];
  let current = destination;

  while (current !== undefined) {
    route.unshift(current);
    current = previous[current];
  }

  return { cost: distances[destination], route };
}

/* ------------------ Emergency Priority Queue ------------------ */

// Higher severity first; older incidents break ties.
function getPriorityQueue() {
  return emergencies
    .filter((e) => e.status === "Waiting")
    .slice()
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));
}

function severityLabel(value) {
  if (value >= 10) return "Critical";
  if (value >= 7) return "Serious";
  if (value >= 4) return "Moderate";
  return "Minor";
}

function severityClass(value) {
  return severityLabel(value).toLowerCase();
}

/* ------------------ Adaptive Dispatch Engine ------------------ */

// Illustrative scoring formula: lower is better.
// Route cost is the main factor; traffic adds a penalty.
function evaluateAmbulance(ambulance, emergency, trafficMode) {
  const path = dijkstra(
    ambulance.location,
    emergency.location,
    trafficMode
  );

  if (!path.route.length) return null;

  const trafficMultiplier =
    trafficMode === "heavy" ? 1.8 :
    trafficMode === "clear" ? 0.8 : 1;

  const trafficPenalty = ambulance.traffic * trafficMultiplier;

  const score = path.cost + trafficPenalty * 0.35;

  return {
    ...ambulance,
    route: path.route,
    routeCost: path.cost,
    trafficPenalty,
    score
  };
}

function evaluateHospital(hospital, patientLocation, trafficMode) {
  const path = dijkstra(patientLocation, hospital.location, trafficMode);
  if (!path.route.length) return null;

  const occupancy = hospital.occupied / hospital.capacity;
  const available = hospital.capacity - hospital.occupied;

  // Illustrative cost; a real system would verify clinical capabilities.
  const capacityPenalty = occupancy * 5;
  const score = path.cost + capacityPenalty;

  return {
    ...hospital,
    route: path.route,
    routeCost: path.cost,
    occupancy,
    available,
    score
  };
}

function calculateDispatch(emergencyId) {
  const emergency = emergencies.find((e) => e.id === emergencyId);
  if (!emergency || emergency.status !== "Waiting") {
    showToast("Select an emergency that is still waiting.");
    return;
  }

  const trafficMode = $("trafficMode").value;

  const candidates = ambulances
    .filter((a) => a.status === "Available")
    .map((a) => evaluateAmbulance(a, emergency, trafficMode))
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);

  if (!candidates.length) {
    lastResult = null;
    $("dispatchResult").innerHTML = `
      <div class="dispatch-placeholder">
        <div class="placeholder-icon">!</div>
        <div><strong>No available ambulance</strong>
        <p>All units are occupied or no route was found in this simulation.</p></div>
      </div>`;
    showToast("No available ambulance candidates.");
    return;
  }

  const winner = candidates[0];

  const hospitalsRanked = hospitals
    .map((h) => evaluateHospital(h, emergency.location, trafficMode))
    .filter(Boolean)
    .filter((h) => h.available > 0)
    .sort((a, b) => a.score - b.score);

  const selectedHospital = hospitalsRanked[0] || null;

  // Baseline comparison: nearest available ambulance by route cost.
  const nearest = candidates.slice().sort(
    (a, b) => a.routeCost - b.routeCost
  )[0];

  lastResult = {
    emergencyId,
    trafficMode,
    winnerId: winner.id,
    hospitalId: selectedHospital ? selectedHospital.id : null,
    candidates,
    winner,
    nearest,
    selectedHospital
  };

  renderDispatchResult(lastResult);
  drawMap(winner.route, emergency.location, winner.id);
  $("baselineValue").textContent = nearest.routeCost.toFixed(1);
  $("adaptiveValue").textContent = winner.routeCost.toFixed(1);

  showToast(`Best candidate: ${winner.id}. Review the route and score before assigning.`);
}

/* ------------------ Render Dispatch Result ------------------ */

function renderDispatchResult(result) {
  const { winner, candidates, selectedHospital, emergencyId } = result;

  $("dispatchResult").innerHTML = `
    <div class="dispatch-output">
      <div class="recommendation">
        <div>
          <span class="section-kicker">TOP-RANKED AVAILABLE UNIT</span>
          <strong>🚑 ${winner.id} · Junction ${winner.location}</strong>
          <p>Route: ${winner.route.join(" → ")}<br>
          Estimated route cost: ${winner.routeCost.toFixed(1)} units<br>
          Traffic penalty: ${winner.trafficPenalty.toFixed(1)} units</p>
        </div>
        <div class="recommendation-score">
          ${winner.score.toFixed(1)}
          <small>Dispatch score</small>
        </div>
      </div>

      <div class="section-kicker" style="margin-top:15px">CANDIDATE RANKING · LOWER SCORE IS BETTER</div>
      <div class="candidate-list">
        ${candidates.map((a, i) => {
          const max = Math.max(...candidates.map((c) => c.score), 1);
          const width = Math.max(5, a.score / max * 100);
          return `
            <div class="candidate-row ${i === 0 ? "winner" : ""}">
              <span>${a.id}${i === 0 ? "<small>Recommended</small>" : "<small>Candidate</small>"}</span>
              <div class="score-track"><span style="width:${width}%"></span></div>
              <span class="candidate-score">${a.score.toFixed(1)}</span>
            </div>`;
        }).join("")}
      </div>

      ${selectedHospital ? `
        <div class="hospital-recommendation">
          <strong>✚ Suggested destination: ${selectedHospital.name}</strong>
          <p>Route: ${selectedHospital.route.join(" → ")} ·
          ${selectedHospital.available} simulated beds available ·
          Occupancy ${Math.round(selectedHospital.occupancy * 100)}%.</p>
        </div>` : `
        <div class="hospital-recommendation">
          <strong>No destination passed the capacity check.</strong>
          <p>All simulated facilities are full or unreachable. This is not a clinical recommendation.</p>
        </div>`}

      <div class="result-actions">
        <button class="button button-primary" id="assignAmbulance">Assign ${winner.id}</button>
        <button class="button button-secondary" id="rerunDispatch">Recalculate</button>
      </div>
      <p style="margin:12px 0 0;color:var(--muted);font-size:9px;line-height:1.6">
        Simulation only. The score is an educational heuristic, not a validated medical dispatch rule.
      </p>
    </div>`;
}

/* ------------------ Dispatch Assignment ------------------ */

function assignAmbulance() {
  if (!lastResult) return;

  const ambulance = ambulances.find(
    (a) => a.id === lastResult.winnerId
  );
  const emergency = emergencies.find(
    (e) => e.id === lastResult.emergencyId
  );

  if (
    !ambulance || ambulance.status !== "Available" ||
    !emergency || emergency.status !== "Waiting"
  ) {
    showToast("The assignment is no longer valid. Recalculate dispatch.");
    return;
  }

  ambulance.status = "On Mission";
  ambulance.assignedEmergency = emergency.id;
  emergency.status = "Assigned";
  emergency.assignedAmbulance = ambulance.id;

  renderAll();
  showToast(`${ambulance.id} assigned to ${emergency.id} in the simulation.`);
  lastResult = null;

  $("dispatchResult").innerHTML = `
    <div class="dispatch-placeholder">
      <div class="placeholder-icon">✓</div>
      <div><strong>Simulated assignment recorded</strong>
      <p>${ambulance.id} is marked On Mission for ${emergency.id}. No real dispatch occurred.</p></div>
    </div>`;

  drawMap([], null, null);
}

/* ------------------ Map Visualization ------------------ */

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg", tag
  );

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }

  return element;
}

function drawMap(route = [], emergencyLocation = null, selectedAmbulance = null) {
  const roadEdges = $("roadEdges");
  const routeEdges = $("routeEdges");
  const markers = $("mapMarkers");

  roadEdges.replaceChildren();
  routeEdges.replaceChildren();
  markers.replaceChildren();

  // Draw base roads and dashed center lines.
  for (const [a, b] of edges) {
    const p1 = nodes[a];
    const p2 = nodes[b];
    const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

    roadEdges.appendChild(svgElement("path", {
      d, class: "road-edge"
    }));
    roadEdges.appendChild(svgElement("path", {
      d, class: "road-center"
    }));
  }

  // Highlight the actual route returned by Dijkstra.
  for (let i = 0; i < route.length - 1; i++) {
    const a = nodes[route[i]];
    const b = nodes[route[i + 1]];

    routeEdges.appendChild(svgElement("path", {
      d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
      class: "route-edge"
    }));
  }

  // Render every graph node.
  for (const [id, node] of Object.entries(nodes)) {
    const group = svgElement("g", {
      transform: `translate(${node.x} ${node.y})`
    });

    group.appendChild(svgElement("circle", {
      r: 17,
      class: "node-circle",
      stroke: route.includes(id) ? "#55d8ed" : "#526c8d"
    }));

    const label = svgElement("text", {
      x: 0, y: 4, class: "node-label"
    });
    label.textContent = id;
    group.appendChild(label);

    const sub = svgElement("text", {
      x: 0, y: 32, class: "node-sub"
    });
    sub.textContent = node.name;
    group.appendChild(sub);

    markers.appendChild(group);
  }

  // Ambulance markers.
  for (const ambulance of ambulances) {
    const node = nodes[ambulance.location];
    const isSelected = ambulance.id === selectedAmbulance;

    const marker = svgElement("g", {
      transform: `translate(${node.x + (ambulance.id === "A2" ? 25 : -23)} ${node.y - 23})`
    });

    marker.appendChild(svgElement("rect", {
      x: -11, y: -10, width: 22, height: 19, rx: 5,
      fill: isSelected ? "#1e554d" : "#183458",
      stroke: isSelected ? "#52d6a2" : "#6095ff"
    }));

    const text = svgElement("text", {
      x: 0, y: 3, "text-anchor": "middle",
      fill: "#ffffff", "font-size": "10", "font-weight": "700"
    });
    text.textContent = "A";
    marker.appendChild(text);
    markers.appendChild(marker);
  }

  // Incident marker.
  if (emergencyLocation && nodes[emergencyLocation]) {
    const node = nodes[emergencyLocation];
    const marker = svgElement("g", {
      transform: `translate(${node.x + 24} ${node.y + 23})`
    });

    marker.appendChild(svgElement("circle", {
      r: 10, fill: "#492432", stroke: "#ff667b", "stroke-width": 2
    }));

    const text = svgElement("text", {
      x: 0, y: 4, "text-anchor": "middle",
      fill: "#ff9eac", "font-size": "12", "font-weight": "700"
    });
    text.textContent = "!";
    marker.appendChild(text);
    markers.appendChild(marker);
  }

  // Hospital markers.
  for (const hospital of hospitals) {
    const node = nodes[hospital.location];
    const marker = svgElement("g", {
      transform: `translate(${node.x - 23} ${node.y + 23})`
    });

    marker.appendChild(svgElement("rect", {
      x: -10, y: -10, width: 20, height: 20, rx: 5,
      fill: "#15372f", stroke: "#52d6a2"
    }));

    const text = svgElement("text", {
      x: 0, y: 4, "text-anchor": "middle",
      fill: "#8ce5c1", "font-size": "12", "font-weight": "700"
    });
    text.textContent = "+";
    marker.appendChild(text);
    markers.appendChild(marker);
  }

  const summary = $("routeSummary");

  if (route.length) {
    summary.innerHTML = `
      <div class="route-summary-icon">↗</div>
      <div><strong>Selected route · ${selectedAmbulance}</strong>
      <small>${route.join(" → ")} · ${route.length - 1} road segments. Cyan lines show the computed route.</small></div>`;
  } else {
    summary.innerHTML = `
      <div class="route-summary-icon">⌁</div>
      <div><strong>Route engine ready</strong>
      <small>Run a dispatch to visualize the selected route.</small></div>`;
  }
}

/* ------------------ Dashboard Rendering ------------------ */

function renderEmergencies() {
  const queue = getPriorityQueue();

  $("emergencyList").innerHTML = queue.length
    ? queue.map((e) => `
      <button class="queue-item ${$("emergencySelect").value === e.id ? "selected" : ""}" data-emergency="${e.id}">
        <div class="queue-main">
          <strong>${escapeHTML(e.id)} · ${escapeHTML(e.type)}</strong>
          <small>Junction ${e.location} · Severity ${e.severity}/10</small>
        </div>
        <span class="severity ${severityClass(e.severity)}">${severityLabel(e.severity)}</span>
      </button>`).join("")
    : `<div class="empty-list">No waiting incidents. Add a new simulation incident to continue.</div>`;

  $("queueCount").textContent = String(queue.length).padStart(2, "0");
  $("statIncidents").textContent = String(
    emergencies.filter((e) => e.status === "Waiting" || e.status === "Assigned").length
  ).padStart(2, "0");

  $("criticalCount").textContent =
    `${queue.filter((e) => e.severity >= 10).length} critical waiting`;

  const select = $("emergencySelect");
  const oldValue = select.value;

  select.innerHTML = queue.map((e) =>
    `<option value="${e.id}">${escapeHTML(e.id)} — ${severityLabel(e.severity)} — Junction ${e.location}</option>`
  ).join("");

  if (queue.some((e) => e.id === oldValue)) select.value = oldValue;
  else if (queue.length) select.value = queue[0].id;

  if (lastResult && !queue.some((e) => e.id === lastResult.emergencyId)) {
    lastResult = null;
  }
}

function renderAmbulances() {
  $("ambulanceTable").innerHTML = ambulances.map((a) => `
    <tr>
      <td class="unit-id">${a.id}</td>
      <td class="unit-location">Junction ${a.location}</td>
      <td><span class="status-pill ${a.status === "Available" ? "available" : "busy"}">${a.status}</span></td>
      <td><button class="table-action" data-release="${a.id}" ${a.status === "Available" ? "disabled" : ""}>Release</button></td>
    </tr>`).join("");

  $("statAvailable").textContent = String(
    ambulances.filter((a) => a.status === "Available").length
  ).padStart(2, "0");
}

function renderHospitals() {
  $("hospitalList").innerHTML = hospitals.map((h) => {
    const percent = Math.round(h.occupied / h.capacity * 100);
    const free = h.capacity - h.occupied;
    const trackClass = percent >= 90 ? "full" : percent >= 75 ? "high" : "";

    return `
      <div class="hospital-row">
        <div>
          <strong>✚ ${escapeHTML(h.name)}</strong>
          <small>Junction ${h.location} · ${free} simulated beds available</small>
          <div class="capacity-track"><span class="${trackClass}" style="width:${percent}%"></span></div>
        </div>
        <div class="hospital-percent">${percent}%</div>
      </div>`;
  }).join("");

  $("statHospitals").textContent = String(hospitals.length).padStart(2, "0");
}

function renderAverageETA() {
  const queue = getPriorityQueue();
  const available = ambulances.filter((a) => a.status === "Available");

  if (!queue.length || !available.length) {
    $("statEta").innerHTML = "—<small> min</small>";
    return;
  }

  const estimates = queue.map((e) => {
    const best = available
      .map((a) => dijkstra(a.location, e.location, "normal").cost)
      .sort((a, b) => a - b)[0];
    return best;
  }).filter(Number.isFinite);

  const average = estimates.length
    ? estimates.reduce((sum, value) => sum + value, 0) / estimates.length
    : NaN;

  $("statEta").innerHTML = Number.isFinite(average)
    ? `${average.toFixed(1)}<small> units</small>`
    : "—<small> units</small>";
}

function renderAll() {
  renderEmergencies();
  renderAmbulances();
  renderHospitals();
  renderAverageETA();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

/* ------------------ Interaction Handlers ------------------ */

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function openModal() {
  $("emergencyModal").classList.add("open");
  $("emergencyModal").setAttribute("aria-hidden", "false");
  $("incidentName").focus();
}

function closeModal() {
  $("emergencyModal").classList.remove("open");
  $("emergencyModal").setAttribute("aria-hidden", "true");
}

$("openEmergency").addEventListener("click", openModal);
$("closeEmergency").addEventListener("click", closeModal);
$("cancelEmergency").addEventListener("click", closeModal);

$("emergencyModal").addEventListener("click", (event) => {
  if (event.target === $("emergencyModal")) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

$("emergencyForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const type = $("incidentName").value.trim();
  if (!type) return;

  emergencies.push({
    id: `E${nextEmergencyNumber++}`,
    type,
    location: $("incidentLocation").value,
    severity: Number($("incidentSeverity").value),
    status: "Waiting"
  });

  closeModal();
  event.target.reset();
  renderAll();

  $("emergencySelect").value = emergencies[emergencies.length - 1].id;
  showToast("Fictional incident added to the emergency priority queue.");
});

$("runDispatch").addEventListener("click", () => {
  calculateDispatch($("emergencySelect").value);
});

$("emergencySelect").addEventListener("change", () => {
  renderEmergencies();
});

$("trafficMode").addEventListener("change", () => {
  if (lastResult) calculateDispatch(lastResult.emergencyId);
});

$("dispatchResult").addEventListener("click", (event) => {
  if (event.target.closest("#assignAmbulance")) {
    assignAmbulance();
  }

  if (event.target.closest("#rerunDispatch")) {
    calculateDispatch($("emergencySelect").value);
  }
});

$("emergencyList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-emergency]");
  if (!button) return;

  $("emergencySelect").value = button.dataset.emergency;
  renderEmergencies();
  calculateDispatch(button.dataset.emergency);
  $("dispatch").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("ambulanceTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-release]");
  if (!button || button.disabled) return;

  const ambulance = ambulances.find((a) => a.id === button.dataset.release);
  if (!ambulance) return;

  const assigned = emergencies.find(
    (e) => e.assignedAmbulance === ambulance.id && e.status === "Assigned"
  );

  if (assigned) {
    assigned.status = "Completed";
    delete assigned.assignedAmbulance;
  }

  ambulance.status = "Available";
  delete ambulance.assignedEmergency;

  renderAll();
  showToast(`${ambulance.id} released and marked available in the simulation.`);
});

$("resetMap").addEventListener("click", () => {
  drawMap();
  showToast("Route highlighting reset.");
});

$("viewEmergencies").addEventListener("click", () => {
  $("emergencyList").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

function updateClock() {
  $("clock").textContent = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
}

/* ------------------ Initialize ------------------ */

renderAll();
drawMap();
updateClock();
setInterval(updateClock, 1000);
