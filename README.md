
# 🚑 AADS — Adaptive Ambulance Dispatch & Emergency Routing System

AADS is a Data Structures and Algorithms (DSA) mini-project designed to simulate intelligent ambulance dispatch and emergency route optimization.

## 📌 Problem Statement

Selecting an ambulance based only on physical distance may not always produce the best response. Traffic conditions, road connectivity, emergency severity, ambulance availability, and hospital capacity can influence dispatch decisions.

## 💡 Proposed Solution

AADS simulates an adaptive dispatch system that evaluates available ambulances, calculates routes through a road network, prioritizes emergency requests, and recommends suitable hospitals using algorithmic scoring.

## ✨ Key Features

- Interactive emergency response dashboard
- Emergency registration and severity-based prioritization
- Graph-based road network visualization
- Shortest-path calculation using Dijkstra's algorithm
- Ambulance candidate ranking using an adaptive score
- Hospital capacity and suitability evaluation
- Simulated ambulance assignment and availability management
- Baseline comparison with nearest-ambulance selection
- Responsive interface for desktop and mobile

## 🧠 Data Structures and Algorithms

| Concept | Application |
|---|---|
| Graph | Represents road junctions and connections |
| Dijkstra's Algorithm | Calculates minimum-cost routes |
| Priority Queue | Ranks waiting emergencies by severity |
| Binary Min Heap | Efficiently selects the next shortest-path candidate |
| Hash Map | Supports graph and resource lookups |
| Greedy Selection | Ranks feasible ambulance candidates |

## 🛠️ Technology Stack

- HTML5
- CSS3
- JavaScript
- SVG
- Git and GitHub

## 🚀 How to Run

1. Clone or download this repository.
2. Open `index.html` in a modern web browser.
3. Register a simulated emergency.
4. Select a traffic profile and calculate the recommended dispatch.
5. Explore the route, ambulance ranking, and hospital capacity.

No package installation is required.

## 🌐 Deployment

This static website can be hosted using GitHub Pages.

Go to **Settings → Pages**, select **Deploy from a branch**, choose the `main` branch and `/ (root)` folder, and save.

## 🔬 Future Enhancements

- Connect the interface to a Python DSA backend.
- Add persistent storage and incident history.
- Evaluate the algorithm using repeatable test scenarios.
- Incorporate validated traffic and geographic data.
- Investigate the novelty of the dispatch and reallocation mechanism.

## ⚠️ Disclaimer

AADS is an academic simulation using fictional locations and illustrative data. Its dispatch scores are not clinically validated. It is not connected to actual ambulances, hospitals, GPS, or live traffic services and must not be used for real emergency decisions.

## 👨‍💻 Project Information

**Project:** Adaptive Ambulance Dispatch & Emergency Routing System  
**Category:** Data Structures and Algorithms Mini-Project  
**Status:** Prototype / Simulation
