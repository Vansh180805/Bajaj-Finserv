# Baja Finserv Graph Engine Sandbox

An industry-grade **Graph Modeling & Hierarchical Analysis Sandbox** built for the **Chitkara Full Stack Engineering Challenge (Round 1)**. 

This full-stack application processes hierarchical node connections, resolves conflicts, detects cycles, calculates tree heights, and displays the relationships on an interactive 2D physics-based network canvas along with comprehensive graph theory analytics.

---

## 🌟 Key Features

### 1. Interactive 2D Physics network diagram (Vis.js integration)
- Live, physics-based, draggable and zoomable graph visualization.
- **Node Classification**: Tree nodes colored in purple/blue; cyclic components highlighted in crimson red.
- **Edge Conflict Resolution**: Multi-parent conflicts are dynamically identified, and the discarded connections are drawn as dashed gray paths labelled `discarded`.
- **Invalid Nodes representation**: Rejected letters/nodes are rendered as isolated, free-floating gray blocks.

### 2. Quick Edge Builder UI
- Add connections interactively via node input boxes without writing raw JSON arrays.
- Automatic real-time synchronization between the visual builder and code textarea.

### 3. Step-by-Step Parser Terminal Log
- Renders a live terminal console showing compile-time parsing actions, warnings, conflicts, and BFS splits with staggers.

### 4. Advanced Graph Analytics Dashboard
- **Adjacency Matrix**: Renders an interactive connectivity table.
- **Topological Sorting**: Displays node linear ordering paths for valid tree structures.
- **Degree Centrality Analysis**: Custom SVG double-bar chart representing in-degree vs out-degree counts per node.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) installed.

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/Vansh180805/Bajaj-Finserv.git
   cd Bajaj-Finserv
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```

### Running Locally
1. Configure credentials by copying the example template:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` or `config.json` with your details.*
2. Start the Express server:
   ```bash
   npm start
   ```
3. Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 📝 API Specification

### Endpoint: `POST /bfhl`
Processes hierarchical node edges and compiles structural analytics.

#### Request Body Schema:
```json
{
  "data": [
    "A->B", "A->C", "B->D", "C->E", "E->F",
    "X->Y", "Y->Z", "Z->X",
    "hello", "1->2", "A->"
  ]
}
```

#### Response Body Schema:
```json
{
  "user_id": "vansh_24062026",
  "email_id": "vansh@college.edu",
  "college_roll_number": "2210999999",
  "hierarchies": [
    {
      "root": "A",
      "tree": { "A": { "B": { "D": {} }, "C": { "E": { "F": {} } } } },
      "depth": 4,
      "topological_sort": ["A", "B", "D", "C", "E", "F"]
    },
    {
      "root": "X",
      "tree": {},
      "has_cycle": true
    }
  ],
  "invalid_entries": ["hello", "1->2", "A->"],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 1,
    "largest_tree_root": "A"
  },
  "analytics": {
    "logs": [
      "[19:05:01] INFO: Initializing graph parser engine...",
      "[19:05:01] ERROR: \"hello\" does not match format. Rejected."
    ],
    "matrix": {
      "nodes": ["A", "B", "C", "D", "E", "F", "X", "Y", "Z"],
      "grid": [[0, 1, 1, 0, 0, 0, 0, 0, 0], ...]
    },
    "degrees": {
      "A": { "in": 0, "out": 2 }
    }
  }
}
```

---

## 🧪 Running Integration Tests
To execute the automated test cases and verify the pipeline rules:
```bash
node test.js
```
All assertions (standard forest, diamond conflict resolution, invalid trims, self-loop rejections) will run locally and report status.
