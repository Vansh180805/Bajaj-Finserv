// UI Elements
const nodeDataTextarea = document.getElementById('node-data');
const submitBtn = document.getElementById('submit-btn');
const submitSpinner = document.getElementById('submit-spinner');
const resultsDashboard = document.getElementById('results-dashboard');

const profileUserId = document.getElementById('profile-user-id');
const profileEmail = document.getElementById('profile-email');
const profileRoll = document.getElementById('profile-roll');

const statTrees = document.getElementById('stat-trees');
const statCycles = document.getElementById('stat-cycles');
const statDeepest = document.getElementById('stat-deepest');

const invalidBadge = document.getElementById('invalid-badge');
const invalidContainer = document.getElementById('invalid-container');
const duplicateBadge = document.getElementById('duplicate-badge');
const duplicateContainer = document.getElementById('duplicate-container');

const hierarchiesList = document.getElementById('hierarchies-list');
const jsonOutput = document.getElementById('json-output');
const copyJsonBtn = document.getElementById('copy-json-btn');

// Upgraded Interactive Elements
const builderParent = document.getElementById('builder-parent');
const builderChild = document.getElementById('builder-child');
const addEdgeBtn = document.getElementById('add-edge-btn');
const compilerTerminal = document.getElementById('compiler-terminal');
const clearTerminalBtn = document.getElementById('clear-terminal-btn');
const canvasPrompt = document.getElementById('canvas-prompt');
const matrixContainer = document.getElementById('matrix-container');
const degreesChartContainer = document.getElementById('degrees-chart-container');

// Vis.js Global Network Reference
let networkInstance = null;

// Preset Datasets
const examples = {
  standard: [
    "A->B", "A->C", "B->D", "C->E", "E->F",
    "X->Y", "Y->Z", "Z->X",
    "P->Q", "Q->R",
    "G->H", "G->H", "G->I",
    "hello", "1->2", "A->"
  ],
  cycle: [
    "A->B", "B->C", "C->A",
    "M->N", "N->O",
    "D->E", "E->F", "F->D",
    "xyz", "A->A"
  ],
  diamonds: [
    "A->B", "A->C", "B->D", "C->D",
    "P->Q", "Q->R", "P->R",
    "K->L", "L->M", "K->M"
  ]
};

// Prefill example presets
function loadExample(key) {
  if (examples[key]) {
    nodeDataTextarea.value = JSON.stringify(examples[key], null, 2);
    logToTerminal(`System loaded preset: "${key}" template dataset.`, 'system');
    triggerPipelineExecution();
  }
}

// Write line-by-line logs inside the simulated terminal
function logToTerminal(message, type = 'info') {
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerText = message;
  compilerTerminal.appendChild(line);
  compilerTerminal.scrollTop = compilerTerminal.scrollHeight;
}

// Clear terminal logs
clearTerminalBtn.addEventListener('click', () => {
  compilerTerminal.innerHTML = `<div class="log-line system">[SYSTEM] Console cleared. Waiting for actions...</div>`;
});

// Helper: Local UI Logger wrapper
const getTimestamp = () => `[${new Date().toLocaleTimeString()}]`;

// Interactive Builder: Add Edge
addEdgeBtn.addEventListener('click', () => {
  const parent = builderParent.value.trim().toUpperCase();
  const child = builderChild.value.trim().toUpperCase();

  if (!parent || !child || parent.length !== 1 || child.length !== 1 || !/[A-Z]/.test(parent) || !/[A-Z]/.test(child)) {
    logToTerminal(`${getTimestamp()} [BUILDER_ERROR] Nodes must be single uppercase letters (A-Z).`, 'error');
    return;
  }

  if (parent === child) {
    logToTerminal(`${getTimestamp()} [BUILDER_ERROR] Self-loops (e.g. ${parent}->${child}) are invalid under constraints.`, 'error');
    return;
  }

  const newEdge = `${parent}->${child}`;
  let currentArray = [];
  
  try {
    const rawVal = nodeDataTextarea.value.trim();
    if (rawVal) {
      currentArray = JSON.parse(rawVal);
      if (!Array.isArray(currentArray)) currentArray = [];
    }
  } catch (e) {
    currentArray = [];
  }

  currentArray.push(newEdge);
  nodeDataTextarea.value = JSON.stringify(currentArray, null, 2);
  
  logToTerminal(`${getTimestamp()} [BUILDER] Appended edge "${newEdge}" to input buffer.`, 'info');
  
  // Clear inputs
  builderParent.value = '';
  builderChild.value = '';
  builderParent.focus();

  // Execute pipeline automatically for visual real-time update
  triggerPipelineExecution();
});

// Execute graph analysis
submitBtn.addEventListener('click', () => {
  triggerPipelineExecution();
});

// Trigger pipeline fetch
async function triggerPipelineExecution() {
  let rawInput = nodeDataTextarea.value.trim();
  let parsedData = null;
  
  try {
    if (!rawInput) {
      throw new Error("Input array empty.");
    }
    parsedData = JSON.parse(rawInput);
    if (!Array.isArray(parsedData)) {
      throw new Error("Target is not a valid JSON array.");
    }
  } catch (err) {
    logToTerminal(`${getTimestamp()} [PARSE_FATAL] Invalid input syntax: ${err.message}`, 'error');
    return;
  }

  // UI state updates
  submitBtn.disabled = true;
  submitSpinner.classList.remove('hide');
  if (canvasPrompt) canvasPrompt.classList.add('hide');

  logToTerminal(`${getTimestamp()} [COMPILER] Streaming JSON payload. Contacting API server /bfhl...`, 'info');

  try {
    const response = await fetch('/bfhl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: parsedData })
    });
    
    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      throw new Error(errRes.error || `HTTP Status: ${response.status}`);
    }
    
    const data = await response.json();

    // Stream backend parsing logs sequentially to terminal
    const serverLogs = data.analytics?.logs || [];
    if (serverLogs.length > 0) {
      // Stream server-side logs with micro-delays for nice visual feedback
      let delay = 0;
      serverLogs.forEach((logMsg) => {
        setTimeout(() => {
          let type = 'info';
          if (logMsg.includes('SUCCESS')) type = 'success';
          else if (logMsg.includes('ERROR')) type = 'error';
          else if (logMsg.includes('WARNING')) type = 'warn';
          else if (logMsg.includes('ANALYSIS')) type = 'system';
          
          logToTerminal(logMsg, type);
        }, delay);
        delay += 60; // 60ms stagger per log line
      } );
    }

    // Load dashboards
    renderResults(data);

  } catch (err) {
    logToTerminal(`${getTimestamp()} [HTTP_FAIL] API Call failed: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitSpinner.classList.add('hide');
  }
}

// Master Render Dashboard
function renderResults(data) {
  // Update developer credentials cards
  profileUserId.innerText = data.user_id || '-';
  profileEmail.innerText = data.email_id || '-';
  profileRoll.innerText = data.college_roll_number || '-';

  // Update Stats Counters
  statTrees.innerText = data.summary?.total_trees ?? 0;
  statCycles.innerText = data.summary?.total_cycles ?? 0;
  statDeepest.innerText = data.summary?.largest_tree_root || 'None';

  // Update Invalid tag badges
  invalidContainer.innerHTML = '';
  const invalids = data.invalid_entries || [];
  invalidBadge.innerText = invalids.length;
  if (invalids.length === 0) {
    invalidContainer.innerHTML = '<span class="empty-text">None</span>';
  } else {
    invalids.forEach(item => {
      const span = document.createElement('span');
      span.className = 'pill pill-error';
      span.innerText = item;
      invalidContainer.appendChild(span);
    });
  }

  // Update Duplicate tag badges
  duplicateContainer.innerHTML = '';
  const duplicates = data.duplicate_edges || [];
  duplicateBadge.innerText = duplicates.length;
  if (duplicates.length === 0) {
    duplicateContainer.innerHTML = '<span class="empty-text">None</span>';
  } else {
    duplicates.forEach(item => {
      const span = document.createElement('span');
      span.className = 'pill pill-warn';
      span.innerText = item;
      duplicateContainer.appendChild(span);
    });
  }

  // Update CSS recursive trees list
  hierarchiesList.innerHTML = '';
  const hierarchies = data.hierarchies || [];
  
  if (hierarchies.length === 0) {
    hierarchiesList.innerHTML = '<div class="flex-center padded-empty"><p class="empty-text">No structural trees detected.</p></div>';
  } else {
    hierarchies.forEach(h => {
      const hCard = document.createElement('div');
      hCard.className = 'hierarchy-card';
      const isCycle = !!h.has_cycle;
      
      hCard.innerHTML = `
        <div class="hierarchy-header">
          <div class="hierarchy-title">
            Root: <span class="logo-accent">${h.root}</span>
            <span class="${isCycle ? 'tag-cycle' : 'tag-tree'}">${isCycle ? 'Cycle' : 'Tree'}</span>
          </div>
          <div class="hierarchy-meta">
            ${isCycle ? 'Cyclic' : `Depth: <strong>${h.depth}</strong>`}
          </div>
        </div>
      `;

      const visualizerDiv = document.createElement('div');
      visualizerDiv.className = 'hierarchy-visualizer';
      
      if (isCycle) {
        visualizerDiv.innerHTML = `
          <div class="cycle-visual-info">
            <div class="cycle-diagram">
              <div class="tree-node-capsule cycle-root-node">${h.root}</div>
              <span class="arrow-symbol">🔄</span>
              <div class="tree-node-capsule cycle-root-node">?</div>
            </div>
            <span class="empty-text">Circular dependencies resolved.</span>
          </div>
        `;
      } else {
        const rootTreeKey = Object.keys(h.tree)[0];
        if (rootTreeKey) {
          const treeDom = renderTreeDom(rootTreeKey, h.tree[rootTreeKey]);
          visualizerDiv.appendChild(treeDom);
        } else {
          visualizerDiv.innerHTML = '<span class="empty-text">Empty structure</span>';
        }
      }
      
      hCard.appendChild(visualizerDiv);
      hierarchiesList.appendChild(hCard);
    });
  }

  // Render Adjacency Connection Matrix Table
  renderAdjacencyMatrix(data.analytics?.matrix);

  // Render svg centrality degree chart
  renderDegreesChart(data.analytics?.degrees);

  // Render Vis.js Interactive 2D Network Simulation
  try {
    renderVisNetwork(data);
  } catch (visError) {
    console.error("Vis.js rendering error:", visError);
    logToTerminal(`[SYSTEM_ERROR] Failed to render physics sandbox: ${visError.message}`, 'error');
  }

  // Render raw JSON payload inspector
  jsonOutput.innerText = JSON.stringify(data, null, 2);
}

// Render dynamic recursive CSS trees
function renderTreeDom(nodeName, childrenObj) {
  const wrapper = document.createElement('div');
  wrapper.className = 'tree-node-wrapper';

  const capsule = document.createElement('div');
  capsule.className = 'tree-node-capsule';
  capsule.innerText = nodeName;
  wrapper.appendChild(capsule);

  const childKeys = Object.keys(childrenObj || {});
  if (childKeys.length > 0) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-node-children';

    childKeys.forEach(childKey => {
      const branch = document.createElement('div');
      branch.className = 'child-branch';
      
      const childDom = renderTreeDom(childKey, childrenObj[childKey]);
      branch.appendChild(childDom);
      childrenContainer.appendChild(branch);
    });

    wrapper.appendChild(childrenContainer);
  }

  return wrapper;
}

// Renders the connections matrix table grid
function renderAdjacencyMatrix(matrixData) {
  matrixContainer.innerHTML = '';
  if (!matrixData || !matrixData.nodes || matrixData.nodes.length === 0) {
    matrixContainer.innerHTML = '<span class="empty-text">No active connections.</span>';
    return;
  }

  const { nodes, grid } = matrixData;
  const table = document.createElement('table');
  table.className = 'matrix-table';

  // Table header row
  const headerRow = document.createElement('tr');
  headerRow.appendChild(document.createElement('th')); // Top-left blank cell
  nodes.forEach(node => {
    const th = document.createElement('th');
    th.className = 'matrix-node-header';
    th.innerText = node;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Connection rows
  nodes.forEach((rowNode, rIdx) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.className = 'matrix-node-header';
    th.innerText = rowNode;
    tr.appendChild(th);

    nodes.forEach((colNode, cIdx) => {
      const td = document.createElement('td');
      const connectionValue = grid[rIdx][cIdx];
      td.innerText = connectionValue;
      td.className = connectionValue === 1 ? 'matrix-cell-active' : 'matrix-cell-inactive';
      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  matrixContainer.appendChild(table);
}

// Renders dynamic SVG degrees centrality chart
function renderDegreesChart(degreesData) {
  degreesChartContainer.innerHTML = '';
  if (!degreesData || Object.keys(degreesData).length === 0) {
    degreesChartContainer.innerHTML = '<span class="empty-text">No degree statistics to compute.</span>';
    return;
  }

  const nodesList = Object.keys(degreesData).sort();
  const maxDegree = Math.max(...nodesList.map(n => Math.max(degreesData[n].in, degreesData[n].out)), 2);

  // SVG dimensions
  const svgWidth = 320;
  const svgHeight = 180;
  const paddingLeft = 30;
  const paddingBottom = 20;
  const paddingTop = 15;
  const paddingRight = 10;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const groupWidth = chartWidth / nodesList.length;
  const barWidth = (groupWidth * 0.7) / 2;

  // Build SVG wrapper
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'bar-chart-svg');
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

  // Draw background grid lines (y-axis grid lines)
  const gridLinesCount = 3;
  for (let i = 0; i <= gridLinesCount; i++) {
    const val = Math.round((maxDegree / gridLinesCount) * i);
    const y = paddingTop + chartHeight - (chartHeight / maxDegree) * val;
    
    // Grid line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', paddingLeft);
    line.setAttribute('y1', y);
    line.setAttribute('x2', svgWidth - paddingRight);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(255,255,255,0.04)');
    line.setAttribute('stroke-dasharray', '2 2');
    svg.appendChild(line);

    // Grid axis label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', paddingLeft - 5);
    text.setAttribute('y', y + 3);
    text.setAttribute('fill', '#6b7280');
    text.setAttribute('font-size', '8');
    text.setAttribute('text-anchor', 'end');
    text.innerText = val;
    svg.appendChild(text);
  }

  // Draw bars
  nodesList.forEach((node, idx) => {
    const inDeg = degreesData[node].in;
    const outDeg = degreesData[node].out;
    const xGroupStart = paddingLeft + idx * groupWidth;

    const inBarHeight = (chartHeight / maxDegree) * inDeg;
    const outBarHeight = (chartHeight / maxDegree) * outDeg;

    const inBarY = paddingTop + chartHeight - inBarHeight;
    const outBarY = paddingTop + chartHeight - outBarHeight;

    const xIn = xGroupStart + (groupWidth - barWidth * 2) / 2;
    const xOut = xIn + barWidth + 2;

    // Draw In-degree Bar (Electric Blue)
    if (inDeg > 0) {
      const rectIn = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rectIn.setAttribute('x', xIn);
      rectIn.setAttribute('y', inBarY);
      rectIn.setAttribute('width', barWidth);
      rectIn.setAttribute('height', inBarHeight);
      rectIn.setAttribute('class', 'chart-bar-in');
      rectIn.setAttribute('rx', '1');
      rectIn.innerHTML = `<title>Node ${node} In-Degree: ${inDeg}</title>`;
      svg.appendChild(rectIn);
    }

    // Draw Out-degree Bar (Teal Cyan)
    if (outDeg > 0) {
      const rectOut = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rectOut.setAttribute('x', xOut);
      rectOut.setAttribute('y', outBarY);
      rectOut.setAttribute('width', barWidth);
      rectOut.setAttribute('height', outBarHeight);
      rectOut.setAttribute('class', 'chart-bar-out');
      rectOut.setAttribute('rx', '1');
      rectOut.innerHTML = `<title>Node ${node} Out-Degree: ${outDeg}</title>`;
      svg.appendChild(rectOut);
    }

    // Draw Node label text below bars
    const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textLabel.setAttribute('x', xGroupStart + groupWidth / 2);
    textLabel.setAttribute('y', paddingTop + chartHeight + 12);
    textLabel.setAttribute('class', 'chart-text');
    textLabel.innerText = node;
    svg.appendChild(textLabel);
  });

  // Render Legend
  const legend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  legend.setAttribute('transform', `translate(${svgWidth - 100}, 5)`);

  const inDot = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  inDot.setAttribute('width', '6');
  inDot.setAttribute('height', '6');
  inDot.setAttribute('fill', '#818cf8');
  inDot.setAttribute('rx', '1');
  legend.appendChild(inDot);

  const inLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  inLabel.setAttribute('x', '10');
  inLabel.setAttribute('y', '6');
  inLabel.setAttribute('class', 'chart-legend');
  inLabel.innerText = 'In-Deg';
  legend.appendChild(inLabel);

  const outDot = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  outDot.setAttribute('x', '45');
  outDot.setAttribute('width', '6');
  outDot.setAttribute('height', '6');
  outDot.setAttribute('fill', '#06b6d4');
  outDot.setAttribute('rx', '1');
  legend.appendChild(outDot);

  const outLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  outLabel.setAttribute('x', '55');
  outLabel.setAttribute('y', '6');
  outLabel.setAttribute('class', 'chart-legend');
  outLabel.innerText = 'Out-Deg';
  legend.appendChild(outLabel);

  svg.appendChild(legend);
  degreesChartContainer.appendChild(svg);
}

// Renders Vis.js physics simulation node map
function renderVisNetwork(data) {
  const container = document.getElementById('vis-network-container');
  const prompt = document.getElementById('canvas-prompt');

  if (typeof vis === 'undefined') {
    console.warn("Vis.js is not loaded.");
    logToTerminal("[SYSTEM_WARN] Vis.js physics engine is offline. Draggable graph canvas is disabled.", "warn");
    if (prompt) {
      prompt.innerText = "⚠️ Vis.js physics engine could not be loaded. Please check your internet connection.";
      prompt.classList.remove('hide');
    }
    return;
  }

  // Hide prompt since we are rendering successfully
  if (prompt) {
    prompt.classList.add('hide');
  }

  // Collect nodes
  const nodesSet = new Set();
  const treeNodes = new Set();
  const cycleNodes = new Set();
  const rootNodes = new Set();

  data.hierarchies.forEach(h => {
    rootNodes.add(h.root);
    const isCycle = !!h.has_cycle;
    
    // Depth-first list parser
    const extractNodes = (obj) => {
      Object.keys(obj).forEach(key => {
        nodesSet.add(key);
        if (isCycle) cycleNodes.add(key);
        else treeNodes.add(key);
        extractNodes(obj[key]);
      });
    };
    
    if (isCycle) {
      nodesSet.add(h.root);
      cycleNodes.add(h.root);
    } else {
      nodesSet.add(h.root);
      treeNodes.add(h.root);
      const rootKey = Object.keys(h.tree)[0];
      if (rootKey) extractNodes(h.tree[rootKey]);
    }
  });

  const visNodes = [];
  const visEdges = [];

  // Color specs
  const colors = {
    tree: { background: '#1e293b', border: '#818cf8', hover: { background: '#2e3b56', border: '#4f46e5' }, highlight: { background: '#2e3b56', border: '#4f46e5' } },
    cycle: { background: '#1e293b', border: '#fca5a5', hover: { background: '#3b2f2f', border: '#f87171' }, highlight: { background: '#3b2f2f', border: '#f87171' } },
    invalid: { background: '#0b0f19', border: '#4b5563', hover: { background: '#1e293b', border: '#6b7280' }, highlight: { background: '#1e293b', border: '#6b7280' } }
  };

  // Add tree/cycle nodes
  nodesSet.forEach(node => {
    const isCycle = cycleNodes.has(node);
    const isRoot = rootNodes.has(node);
    
    visNodes.push({
      id: node,
      label: node,
      shape: 'circle',
      font: { color: '#ffffff', face: 'Outfit', size: 14, bold: true },
      borderWidth: isRoot ? 3 : 1.5,
      color: isCycle ? colors.cycle : colors.tree,
      shadow: { enabled: true, color: 'rgba(0,0,0,0.4)', size: 4, x: 2, y: 2 }
    });
  });

  // Render edges
  const edgeTracker = new Set();
  
  // Recursively extract edges
  const extractEdges = (parent, obj) => {
    Object.keys(obj).forEach(child => {
      const edgeKey = `${parent}->${child}`;
      if (!edgeTracker.has(edgeKey)) {
        visEdges.push({
          from: parent,
          to: child,
          arrows: 'to',
          color: { color: '#818cf8', highlight: '#6366f1', hover: '#6366f1' },
          width: 1.5
        });
        edgeTracker.add(edgeKey);
      }
      extractEdges(child, obj[child]);
    });
  };

  data.hierarchies.forEach(h => {
    const isCycle = !!h.has_cycle;
    if (!isCycle) {
      const rootKey = Object.keys(h.tree)[0];
      if (rootKey) extractEdges(rootKey, h.tree[rootKey]);
    }
  });

  // Cycle components edges
  // Since we don't have cyclic edge maps in hierarchies directly, let's parse the original input edges
  // and check if both nodes in the input belong to the cycle components
  const rawInput = nodeDataTextarea.value.trim();
  let parsedArray = [];
  try { parsedArray = JSON.parse(rawInput); } catch (e) {}

  if (Array.isArray(parsedArray)) {
    parsedArray.forEach(edgeStr => {
      const trimmed = edgeStr.trim();
      const match = trimmed.match(/^([A-Z])->([A-Z])$/);
      if (match) {
        const parent = match[1];
        const child = match[2];
        
        // Render cycle edges
        if (cycleNodes.has(parent) && cycleNodes.has(child)) {
          const edgeKey = `${parent}->${child}`;
          if (!edgeTracker.has(edgeKey)) {
            visEdges.push({
              from: parent,
              to: child,
              arrows: 'to',
              color: { color: '#fca5a5', highlight: '#f87171', hover: '#f87171' },
              dashes: false,
              width: 2
            });
            edgeTracker.add(edgeKey);
          }
        }

        // Render multi-parent discarded paths (as dashed gray lines to show conflict resolution)
        if (nodesSet.has(parent) && nodesSet.has(child) && !isEdgeInHierarchies(parent, child, data.hierarchies)) {
          const edgeKey = `${parent}->${child}`;
          // Ensure we don't duplicate
          if (!edgeTracker.has(edgeKey)) {
            visEdges.push({
              from: parent,
              to: child,
              arrows: 'to',
              label: 'discarded',
              font: { size: 8, color: '#6b7280', strokeWidth: 0, face: 'Fira Code' },
              color: { color: 'rgba(255, 255, 255, 0.15)', highlight: '#9ca3af', hover: '#9ca3af' },
              dashes: [4, 4],
              width: 1,
              physics: false // Discarded edges don't pull nodes
            });
            edgeTracker.add(edgeKey);
          }
        }
      }
    });
  }

  // Draw completely invalid nodes as floating isolated grey circles (if they are letters)
  const processedInvalids = new Set();
  const invalidsList = data.invalid_entries || [];
  invalidsList.forEach(entry => {
    // If it represents something like A->B but with self loop (which is invalid), or 2 letters with space
    const letters = entry.replace(/[^A-Z]/gi, '').toUpperCase();
    for (let char of letters) {
      if (char.length === 1 && !nodesSet.has(char) && !processedInvalids.has(char)) {
        visNodes.push({
          id: char,
          label: char,
          shape: 'circle',
          font: { color: '#6b7280', face: 'Outfit', size: 12 },
          borderWidth: 1,
          color: colors.invalid,
          shadow: false
        });
        processedInvalids.add(char);
      }
    }
  });

  // Vis.js configuration dataset
  const visData = {
    nodes: new vis.DataSet(visNodes),
    edges: new vis.DataSet(visEdges)
  };

  const visOptions = {
    nodes: {
      useBorderWithImage: false
    },
    edges: {
      smooth: {
        type: 'cubicBezier',
        forceDirection: 'none',
        roundness: 0.25
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 100,
      zoomView: true
    },
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -1800,
        centralGravity: 0.15,
        springLength: 85,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 0.5
      },
      solver: 'barnesHut',
      stabilization: {
        enabled: true,
        iterations: 150,
        updateInterval: 25
      }
    }
  };

  // Instantiate network diagram canvas
  if (networkInstance) {
    networkInstance.destroy();
  }
  networkInstance = new vis.Network(container, visData, visOptions);
}

// Helper: Checks if a directed edge is inside processed acyclic trees
function isEdgeInHierarchies(fromNode, toNode, hierarchies) {
  let found = false;
  
  const checkBranch = (parent, obj) => {
    Object.keys(obj).forEach(child => {
      if (parent === fromNode && child === toNode) {
        found = true;
      }
      checkBranch(child, obj[child]);
    });
  };

  hierarchies.forEach(h => {
    const isCycle = !!h.has_cycle;
    if (!isCycle) {
      const rootKey = Object.keys(h.tree)[0];
      if (rootKey) {
        if (h.root === fromNode && rootKey === toNode) found = true;
        checkBranch(rootKey, h.tree[rootKey]);
      }
    } else {
      // In cycle, edge is treated as active if it lies inside the loop.
      // But we handled cycles separately, so return false here to let input analyzer draw it solid.
    }
  });

  return found;
}

// Copy JSON response clipboard
copyJsonBtn.addEventListener('click', () => {
  const codeText = jsonOutput.innerText;
  if (!codeText) return;
  
  navigator.clipboard.writeText(codeText)
    .then(() => {
      const originalText = copyJsonBtn.innerText;
      copyJsonBtn.innerText = "Payload Copied!";
      copyJsonBtn.style.background = 'linear-gradient(135deg, var(--color-success), #059669)';
      setTimeout(() => {
        copyJsonBtn.innerText = originalText;
        copyJsonBtn.style.background = '';
      }, 2000);
    })
    .catch(err => console.error('Copy fail:', err));
});

// Default prefill loaded on startup
loadExample('standard');
