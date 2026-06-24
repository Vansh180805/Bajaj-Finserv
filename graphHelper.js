/**
 * Helper to process the graph hierarchical data according to the challenge rules
 * with added industrial-grade analytics (execution logging, topological sorting, adjacency matrix, centrality).
 * @param {string[]} data - Array of strings representing parent-child edges
 * @returns {object} Processed result matching the challenge response schema with advanced analytics
 */
function processGraph(data) {
  const logs = [];
  const invalid_entries = [];
  const duplicate_edges = [];
  const valid_edges = [];
  const seen_edges = new Set();
  const child_to_parent = new Map();

  const timestamp = () => `[${new Date().toLocaleTimeString()}]`;
  logs.push(`${timestamp()} INFO: Initializing graph parser engine with ${Array.isArray(data) ? data.length : 0} elements.`);

  // 1. Validation and Filter
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      let entry = data[i];
      if (typeof entry !== 'string') {
        logs.push(`${timestamp()} ERROR: Entry at index ${i} is not a string (type: ${typeof entry}). Rejected.`);
        invalid_entries.push(String(entry));
        continue;
      }
      
      const trimmed = entry.trim();
      if (!trimmed) {
        logs.push(`${timestamp()} ERROR: Empty string detected at index ${i}. Rejected.`);
        invalid_entries.push(trimmed);
        continue;
      }
      
      // Pattern: X->Y where X and Y are single uppercase letters (A-Z)
      const match = trimmed.match(/^([A-Z])->([A-Z])$/);
      if (!match) {
        logs.push(`${timestamp()} ERROR: "${trimmed}" does not match uppercase standard letter format "X->Y". Rejected.`);
        invalid_entries.push(trimmed);
        continue;
      }

      const parent = match[1];
      const child = match[2];

      // Self loop check
      if (parent === child) {
        logs.push(`${timestamp()} ERROR: "${trimmed}" represents a self-loop (parent matches child). Rejected.`);
        invalid_entries.push(trimmed);
        continue;
      }

      const edgeKey = `${parent}->${child}`;

      // Duplicate check
      if (seen_edges.has(edgeKey)) {
        logs.push(`${timestamp()} WARNING: Edge "${edgeKey}" is a duplicate. Added to duplicate registry.`);
        if (!duplicate_edges.includes(edgeKey)) {
          duplicate_edges.push(edgeKey);
        }
        continue;
      }
      seen_edges.add(edgeKey);

      // Multi-parent case: first-encountered parent wins, others discarded
      if (child_to_parent.has(child)) {
        const existingParent = child_to_parent.get(child);
        logs.push(`${timestamp()} CONFLICT: Child "${child}" already has parent "${existingParent}". Discarding new edge "${edgeKey}".`);
        continue;
      }
      child_to_parent.set(child, parent);

      logs.push(`${timestamp()} SUCCESS: Registered valid edge "${edgeKey}".`);
      valid_edges.push({ parent, child, raw: trimmed });
    }
  }

  // 2. Graph Building
  const allNodes = new Set();
  const adj = new Map(); // directed adj list
  const undirectedAdj = new Map(); // undirected adj list for component splitting
  const inDegree = new Map();
  const outDegree = new Map();

  for (const edge of valid_edges) {
    const { parent, child } = edge;
    allNodes.add(parent);
    allNodes.add(child);

    if (!adj.has(parent)) adj.set(parent, []);
    adj.get(parent).push(child);

    // Initialize degrees
    if (!inDegree.has(parent)) inDegree.set(parent, 0);
    if (!inDegree.has(child)) inDegree.set(child, 0);
    inDegree.set(child, inDegree.get(child) + 1);

    if (!outDegree.has(parent)) outDegree.set(parent, 0);
    if (!outDegree.has(child)) outDegree.set(child, 0);
    outDegree.set(parent, outDegree.get(parent) + 1);

    // Undirected graph building for components separation
    if (!undirectedAdj.has(parent)) undirectedAdj.set(parent, []);
    if (!undirectedAdj.has(child)) undirectedAdj.set(child, []);
    undirectedAdj.get(parent).push(child);
    undirectedAdj.get(child).push(parent);
  }

  logs.push(`${timestamp()} INFO: Registered ${allNodes.size} unique active nodes and ${valid_edges.length} edges.`);

  // 3. Find Connected Components
  const visited = new Set();
  const components = [];

  for (const node of allNodes) {
    if (!visited.has(node)) {
      const comp = new Set();
      const queue = [node];
      visited.add(node);

      while (queue.length > 0) {
        const curr = queue.shift();
        comp.add(curr);
        const neighbors = undirectedAdj.get(curr) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      components.push(comp);
    }
  }

  logs.push(`${timestamp()} INFO: Connected component splitter detected ${components.length} isolated clusters.`);

  // Sort components by first appearance index in the input data
  const getComponentFirstIndex = (comp) => {
    let minIdx = Infinity;
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] !== 'string') continue;
      const trimmed = data[i].trim();
      const match = trimmed.match(/^([A-Z])->([A-Z])$/);
      if (match) {
        const p = match[1];
        const c = match[2];
        if (comp.has(p) || comp.has(c)) {
          minIdx = Math.min(minIdx, i);
        }
      }
    }
    return minIdx;
  };

  const componentsWithOrder = components.map(comp => ({
    nodes: comp,
    firstIndex: getComponentFirstIndex(comp)
  }));

  componentsWithOrder.sort((a, b) => a.firstIndex - b.firstIndex);

  // 4. Processing each component
  const hierarchies = [];
  let total_trees = 0;
  let total_cycles = 0;
  let maxDepth = -1;
  let largest_tree_root = null;

  for (const { nodes } of componentsWithOrder) {
    const rootsInComponent = [];
    for (const node of nodes) {
      if ((inDegree.get(node) || 0) === 0) {
        rootsInComponent.push(node);
      }
    }

    const componentLabel = Array.from(nodes).sort().join(',');

    if (rootsInComponent.length === 1) {
      const rootNode = rootsInComponent[0];
      logs.push(`${timestamp()} ANALYSIS: Cluster [${componentLabel}] has exactly one root "${rootNode}". Processing as Valid Tree.`);

      // Recursively build tree JSON object
      const buildTreeJson = (currNode) => {
        const treeObj = {};
        const children = adj.get(currNode) || [];
        const sortedChildren = [...children].sort();
        for (const child of sortedChildren) {
          treeObj[child] = buildTreeJson(child);
        }
        return treeObj;
      };

      const treeStructure = {};
      treeStructure[rootNode] = buildTreeJson(rootNode);

      // Depth = number of nodes on the longest path
      const calculateMaxDepth = (currNode) => {
        const children = adj.get(currNode) || [];
        if (children.length === 0) return 1;
        let maxChildDepth = 0;
        for (const child of children) {
          maxChildDepth = Math.max(maxChildDepth, calculateMaxDepth(child));
        }
        return 1 + maxChildDepth;
      };

      const depth = calculateMaxDepth(rootNode);

      // Topological Sort for this specific tree component
      const topoOrder = [];
      const computeTopo = (currNode) => {
        topoOrder.push(currNode);
        const children = adj.get(currNode) || [];
        // Sort alphabetically to maintain deterministic order
        const sorted = [...children].sort();
        for (const child of sorted) {
          computeTopo(child);
        }
      };
      computeTopo(rootNode);

      total_trees++;

      hierarchies.push({
        root: rootNode,
        tree: treeStructure,
        depth: depth,
        topological_sort: topoOrder
      });

      logs.push(`${timestamp()} TREE_STATS: Tree "${rootNode}" processed. Depth: ${depth}. Topological sort path: ${topoOrder.join(' -> ')}`);

      // Largest tree comparison (depth-based, tie breaker is lexicographical small root)
      if (depth > maxDepth) {
        maxDepth = depth;
        largest_tree_root = rootNode;
      } else if (depth === maxDepth) {
        if (rootNode < largest_tree_root) {
          largest_tree_root = rootNode;
        }
      }
    } else {
      // Cyclic component (0 roots)
      total_cycles++;
      const sortedNodes = Array.from(nodes).sort();
      const rootNode = sortedNodes[0];

      logs.push(`${timestamp()} WARNING: Cluster [${componentLabel}] has 0 root nodes. Loop cycle detected! Root selected by default: "${rootNode}".`);

      hierarchies.push({
        root: rootNode,
        tree: {},
        has_cycle: true
      });
    }
  }

  // 5. Build Advanced Analytics (Adjacency Matrix & Node Degrees)
  const sortedUniqueNodes = Array.from(allNodes).sort();
  const matrixNodes = sortedUniqueNodes;
  const matrixGrid = [];

  // Build Adjacency Matrix
  for (let r = 0; r < sortedUniqueNodes.length; r++) {
    const parent = sortedUniqueNodes[r];
    const row = [];
    for (let c = 0; c < sortedUniqueNodes.length; c++) {
      const child = sortedUniqueNodes[c];
      const children = adj.get(parent) || [];
      row.push(children.includes(child) ? 1 : 0);
    }
    matrixGrid.push(row);
  }

  // Build Centrality Degree structure
  const degrees = {};
  for (const node of sortedUniqueNodes) {
    degrees[node] = {
      in: inDegree.get(node) || 0,
      out: outDegree.get(node) || 0
    };
  }

  logs.push(`${timestamp()} SUCCESS: Analytics computation completed.`);

  return {
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root: largest_tree_root || ""
    },
    analytics: {
      logs,
      matrix: {
        nodes: matrixNodes,
        grid: matrixGrid
      },
      degrees
    }
  };
}

module.exports = { processGraph };
