# La Tale Awakening Build Simulator (LABS)

## Description
LABS is a simple build simulator for the Awakening system in an MMORPG called La Tale.

## Usage
* **Left Click on Node**: Activate/Deactivate nodes
  * Deactivating a node also deactivates all dependent nodes
* **Right Click on Node**: Activate the shortest path of nodes from an active node to the target node
* **Middle Click on Node**: Shortcut for "Select Nodes"
* **Select Nodes**: Left click on node while active to include that node in tree generation
* **Generate**: Generate a near-optimal tree using the selected nodes
  * With more nodes selected, the chance to generate a non-optimal tree increases. Generate a few times if you suspect a non-optimal tree has been generated or manually adjust as necessary.
* **Highlighting Nodes**: Check the checkbox for a stat to display a light purple circle around nodes that provide the select stat
  
## Challenges
### Optimal Trees
Generating optimal trees with specific nodes is known as the Steiner Tree Problem, which is NP-hard. My solution to approximate this is to activate nodes along the shortest path to a target and then activate the nodes along the shortest path from an active node to the next target. Each permutation of target nodes is tested.

This works well for most cases. Unfortunately, at 7 selected nodes and above, computation time increases dramatically, causing the browser to forcefully kill the tab. To handle trees with 7 or more selected nodes, I opted to randomly shuffle the target nodes and testing a set number of times instead of testing each permutation. This generally results in optimal trees, but when more nodes are selected, the chances of generating a non-optimal tree is increased.

Subgraphing could allow permutation testing to be used for 7 or more nodes. However, the remaining issue would be cycles in the graph.
