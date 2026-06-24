const { processGraph } = require('./graphHelper');

function assert(condition, message) {
  if (!condition) {
    console.error("❌ ASSERTION FAILED:", message);
    process.exit(1);
  }
}

console.log("Starting Graph Processing Integration Tests...\n");

// Test Case 1: Standard case from challenge PDF
const tc1 = [
  "A->B", "A->C", "B->D", "C->E", "E->F",
  "X->Y", "Y->Z", "Z->X",
  "P->Q", "Q->R",
  "G->H", "G->H", "G->I",
  "hello", "1->2", "A->"
];
const res1 = processGraph(tc1);

console.log("TC1: Standard case");
// Check identity structures
assert(res1.invalid_entries.length === 3, "Invalid entry count mismatch: " + JSON.stringify(res1.invalid_entries));
assert(res1.invalid_entries.includes("hello"), "Missing hello in invalid");
assert(res1.invalid_entries.includes("1->2"), "Missing 1->2 in invalid");
assert(res1.invalid_entries.includes("A->"), "Missing A-> in invalid");

assert(res1.duplicate_edges.length === 1 && res1.duplicate_edges[0] === "G->H", "Duplicate edge mismatch: " + JSON.stringify(res1.duplicate_edges));

assert(res1.summary.total_trees === 3, "Total trees count mismatch: " + res1.summary.total_trees);
assert(res1.summary.total_cycles === 1, "Total cycles count mismatch: " + res1.summary.total_cycles);
assert(res1.summary.largest_tree_root === "A", "Largest tree root mismatch: " + res1.summary.largest_tree_root);

// Check hierarchies
const roots = res1.hierarchies.map(h => h.root);
assert(JSON.stringify(roots) === JSON.stringify(["A", "X", "P", "G"]), "Hierarchies order mismatch: " + JSON.stringify(roots));

const aTree = res1.hierarchies.find(h => h.root === "A");
assert(aTree.depth === 4, "A tree depth mismatch: " + aTree.depth);
assert(JSON.stringify(aTree.tree) === JSON.stringify({ A: { B: { D: {} }, C: { E: { F: {} } } } }), "A tree JSON mismatch: " + JSON.stringify(aTree.tree));

const xCycle = res1.hierarchies.find(h => h.root === "X");
assert(xCycle.has_cycle === true, "X cycle missing has_cycle key");
assert(JSON.stringify(xCycle.tree) === JSON.stringify({}), "X cycle tree not empty");
assert(xCycle.depth === undefined, "X cycle contains depth key: " + xCycle.depth);

console.log("✅ TC1 Passed successfully.");

// Test Case 2: Multi-parent (Diamond) case
// "if a node has more than one parent (e.g. A->D and B->D), the first-encountered parent edge wins; subsequent parent edges for that child are silently discarded."
const tc2 = [
  "A->D", "B->D"
];
const res2 = processGraph(tc2);
console.log("\nTC2: Multi-parent (Diamond) case");
// Since A->D is first, it wins. B->D is silently discarded.
// That leaves: A->D (Tree with root A, depth 2). Node B is not connected to D, but wait.
// Does node B exist in the graph? Since B->D was discarded, does B appear as a node?
// Let's check: in B->D, B is a parent, D is child. If B->D is discarded, B and D are not in a valid edge for B->D.
// But wait! Is B included in the graph at all? If the edge B->D is discarded, it is NOT in `valid_edges`.
// If B does not appear in any other valid edge, it is not part of the graph at all.
// So the graph is just A->D.
// Let's verify:
assert(res2.summary.total_trees === 1, "TC2 total trees should be 1");
assert(res2.hierarchies[0].root === "A", "TC2 root should be A");
assert(res2.hierarchies[0].depth === 2, "TC2 depth should be 2");
console.log("✅ TC2 Passed successfully.");

// Test Case 3: Empty inputs
const tc3 = [];
const res3 = processGraph(tc3);
console.log("\nTC3: Empty input case");
assert(res3.hierarchies.length === 0, "TC3 hierarchies should be empty");
assert(res3.summary.total_trees === 0, "TC3 total trees should be 0");
assert(res3.summary.total_cycles === 0, "TC3 total cycles should be 0");
assert(res3.summary.largest_tree_root === "", "TC3 largest root should be empty");
console.log("✅ TC3 Passed successfully.");

// Test Case 4: Whitespace and self loops
const tc4 = [
  "  A->B  ", "B->B", "C -> D"
];
const res4 = processGraph(tc4);
console.log("\nTC4: Whitespace and self loop checks");
assert(res4.invalid_entries.includes("B->B"), "B->B self-loop should be invalid");
assert(res4.invalid_entries.includes("C -> D"), "C -> D with spaces should be invalid (since separator is -> and space inside letter is invalid. Wait, pattern is single uppercase letter. 'C ' is not a single uppercase letter)");
// A->B should be valid because we trim it first, and it becomes 'A->B' which matches pattern.
assert(res4.summary.total_trees === 1, "TC4 should have 1 tree");
assert(res4.hierarchies[0].root === "A", "TC4 root should be A");
console.log("✅ TC4 Passed successfully.");

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Graph processing algorithm is correct!");
