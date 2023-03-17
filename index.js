window.onload = init;
var board = Object.assign({}, ...initialBoard.map((node) => ({[node.id]: node})));
var nodeSelectionEnabled = false;
var isSubclassModeEnabled = false;
var possibleStats = ["All Skills (Excluding Summons)\nTarget", "Attack / Elemental Intensity", "Attack / Elemental Intensity %",
		"Basic Stats", "Basic Stats %", "Confusion Resistance %", "Cooldown Reduction", "Damage Mitigation %", "Defense",
		"Dual Accuracy", "Dual Back Attack Damage", "Dual Critical Damage", "Dual Critical Damage %", "Dual Critical Rate",
		"Dual Damage", "Dual Defense Penetration", "Dual Evasion", "Dual Maximum Damage", "Dual Maximum Damage %", "Dual Minimum Damage",
		"Dual Minimum Damage %", "Dual Static Damage", "Dual Static Damage %", "Elemental Resistance", "HP", "HP %", "Infinity Skill Level",
		"Legend II Skill 7 (LL7) Target", "Luck", "Luck %", "Movement Speed", "Normal Added Damage", "Normal Added Damage %",
		"Normal Damage Amplification %", "Boss Added Damage", "Boss Added Damage %", "Boss Damage Amplification %", "Other", "Special Points",
		"Stamina", "Stamina %", "Strength / Magic", "Strength / Magic %", "Stun Resistance %"];
var helpText = "Left Click: Activate/Deactivate node\n"
				+ "Right Click: Activate nodes along shortest path to target\n"
				+ "Middle Click on Nodes: Select Nodes shortcut\n"
				+ "Select Nodes: Pick nodes to include in generation\n"
				+ "Generate: Generates a near-optimal tree based on\n	 selected nodes. When more nodes are selected, there is\n"
				+ "	   a greater chance for a non-optimal tree to be generated.\n"
				+ "	   Try to generate a few times or manually adjust the tree\n"
				+ "	   after generation.\n";

function init() {
	let canvas = document.getElementById("board");
	let ctx = canvas.getContext("2d");
	activateNodesFromURL();
	refreshStatSummary(getStatSummary())
	buildChecklist();
	canvas.width = 1841;
	canvas.height = 1001;
	canvas.addEventListener('click', function(e) {
		let position = getCursorPosition(canvas, e, ctx);
		let nodeId = detectClickedNode(board, position.x, position.y);
		leftClick(nodeId, ctx);
		if (isResetButton(position.x, position.y)) {
			resetBoard(true);
			refreshStatSummary(getStatSummary());
			drawAll(ctx);
		}
		
		if (isNodeSelectionButton(position.x, position.y)) {
			nodeSelectionEnabled = !nodeSelectionEnabled;
			drawAll(ctx);
		}
		
		
		if (isSubclassModeButton(position.x, position.y)) {
			isSubclassModeEnabled= !isSubclassModeEnabled;
			refreshStatSummary(getStatSummary());
			highlightNodes();
			drawAll(ctx);
		}
		if (isGenerateButton(position.x, position.y)) {
			generateOptimalTree();
			refreshStatSummary(getStatSummary())
			drawAll(ctx);
		}
		
		updateURL()
	});
	
	canvas.addEventListener('contextmenu', function(e) {
		e.preventDefault();

		let position = getCursorPosition(canvas, e, ctx);
		let nodeId = detectClickedNode(board, position.x, position.y);
		rightClick(nodeId, ctx);
		
		updateURL()
	});
	
	canvas.addEventListener('mousedown', function(e) {
		if (e.button == 1 || e.buttons == 4) {			
			e.preventDefault();
			
			let position = getCursorPosition(canvas, e, ctx);
			let nodeId = detectClickedNode(board, position.x, position.y);
			middleClick(nodeId, ctx);
		}
	});
	
	canvas.addEventListener('mousemove', function(e) {
		let position = getCursorPosition(canvas, e, ctx);
		let nodeId = detectClickedNode(board, position.x, position.y);
		if (nodeId > 0) {
			let stats = getNodeStatsDisplay(nodeId);
			let node = board[nodeId];
			drawTextbox(node.x, node.y, stats, ctx);
		} else if (isHelpText(position.x, position.y)) {
			drawTextbox(1635, 80, helpText, ctx, 400);
		} else {
			drawAll(ctx);
		}
	});
	
	$("input[type=checkbox]").change(function() {
		highlightNodes();
		drawAll(ctx);
	});
	
	drawAll(ctx);
}

function drawAll(ctx) {
	let background = new Image();
	background.src = "background.png";
	background.onload = function() {
		ctx.drawImage(background, 0, 0);
		renderNodes(board, ctx);
		
		let pointsUsed = 0;
		Object.keys(board).forEach(id => {
			if (board[id].active) {
				pointsUsed++;
			}
		});
		
		ctx.fillStyle = "yellow";
		ctx.font = '12px sans-serif';
		ctx.fillText((pointsUsed - 1) + 'p', 1780, 97);
		ctx.font = '16px sans-serif';
		ctx.fillText("HELP", 1635, 85);
		
		ctx.fillStyle = "white";
		ctx.font = '14px sans-serif';
		ctx.fillText("Reset", 85, 981);
		ctx.fillText("Generate", 463, 981);
		
		ctx.fillStyle = nodeSelectionEnabled ? "yellow" : "white";
		ctx.fillText("Select Nodes", 255, 981);
	
		ctx.fillStyle = isSubclassModeEnabled ? "yellow" : "white";
		ctx.fillText("Subclass Mode", 60, 27);
	};
}

function getCursorPosition(canvas, event, ctx) {
	const rect = canvas.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const y = event.clientY - rect.top;
	return { x, y };	
}

function isBelowPermutationLimit() {
	// Limit optimal tree generation using permutations to use a max of 6 prioritized nodes due to computation time
	let numberOfPrioritizeNodes = Object.values(board).filter(node => node.prioritize).length;
	return numberOfPrioritizeNodes < 6;
}

function leftClick(nodeId, ctx) {
	if (nodeId > 1) {
		if (nodeSelectionEnabled && validateAwakeningSkill(nodeId, true)) {
			board[nodeId].prioritize = !board[nodeId].prioritize;
		} else if (!nodeSelectionEnabled) {
			if (board[nodeId].active) {
				deactivateAllDependentNodes(board[nodeId]);
				refreshStatSummary(getStatSummary());
			} else if (!board[nodeId].active && hasActiveConnectedNode(board[nodeId]) && validateAwakeningSkill(nodeId, false)) {	
				board[nodeId].active = true;
				refreshStatSummary(getStatSummary());
			}
		}
			
		drawAll(ctx);
	}
}

function middleClick(nodeId, ctx) {
	if (nodeId > 1 && validateAwakeningSkill(nodeId, true)) {
		board[nodeId].prioritize = !board[nodeId].prioritize;
		drawAll(ctx);
	}
}

function rightClick(nodeId, ctx) {
	if (nodeId > 1) {
		activateShortestPath(board[nodeId]);
		refreshStatSummary(getStatSummary());
		drawAll(ctx);
	}
}

function validateAwakeningSkill(nodeId, isPrioritization) {
	const leftTopSkillId = "205";
	const leftBottomSkillId = "206";
	const rightTopSkillId = "281";
	const rightBottomSkillId = "282";
	
	let property = isPrioritization ? "prioritize" : "active";
	
	return !((nodeId == leftTopSkillId && board[leftBottomSkillId][property])
		|| (nodeId == leftBottomSkillId && board[leftTopSkillId][property])
		|| (nodeId == rightTopSkillId && board[rightBottomSkillId][property])
		|| (nodeId == rightBottomSkillId && board[rightTopSkillId][property]));
}

function isResetButton(x, y) {
	return x >= 12 && x <= 199 && y >= 962 && y <= 992;
}

function isNodeSelectionButton(x, y) {
	return x >= 205 && x <= 392 && y >= 962 && y <= 992;
}

function isSubclassModeButton(x, y) {
	return x >= 10 && x <= 199 && y >= 9 && y <= 39;
}

function isGenerateButton(x, y) {
	return x >= 399 && x <= 585 && y >= 962 && y <= 992;
}

function isHelpText(x, y) {
	return x >= 1635 && x <= 1685 && y >= 65 && y <= 90;
}

function resetBoard(deprioritize) {
	Object.keys(board).forEach(id => {
		if (id > 1) {
			board[id].active = false;
			if (deprioritize) {				
				board[id].prioritize = false;
			}
		}
	});
}

function renderNodes(nodes, ctx) {
	for (const [id, node] of Object.entries(nodes)) {
		ctx.beginPath();
		ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI);
		ctx.lineWidth = 1;
		ctx.strokeStyle = "black";
		ctx.stroke();
		ctx.fillStyle = node.active ? "#39FF14" : "#9B1003";
		ctx.fill();
		
		if (node.prioritize) {
			ctx.beginPath();
			ctx.arc(node.x, node.y, 15, 0, 2 * Math.PI);
			ctx.lineWidth = 4;
			ctx.strokeStyle = "yellow";
			ctx.stroke();
		}
		
		if (node.highlight) {
			ctx.beginPath();
			ctx.arc(node.x, node.y, 18, 0, 2 * Math.PI);
			ctx.lineWidth = 4;
			ctx.strokeStyle = "#c585f7";
			ctx.stroke();
		}
	}
}

function detectClickedNode(nodes, x, y) {
	for (const [id, node] of Object.entries(nodes)) {
		let xDiff = x - node.x;
		let yDiff = y - node.y;
		
		if (xDiff * xDiff + yDiff * yDiff < 100) {
			return id;
		}
	}
	
	return -1;
}

function hasActiveConnectedNode(node) {
	for (const id of node.connectedNodes) {
		if (board[id].active) {
			return true;
		}
	}
	
	return false;
}

function deactivateAllDependentNodes(node) {	
	node.active = false;
	let visited = [];
	dfs(board[1], visited);
	Object.keys(board).forEach(id => {
		if (!visited.includes(parseInt(id))) {
			board[id].active = false;
		}
	});
}

function dfs(node, visited) {
	if (visited.includes(node.id)) {
		return;
	}
	
	visited.push(node.id);
	let connectedNodes = board[node.id].connectedNodes.filter(x => !visited.includes(x) && board[x].active);
	if (connectedNodes.length == 0) {
		return;
	}
	
	if (connectedNodes.length == 1) {
		return dfs(board[connectedNodes[0]], visited);
	} else if (connectedNodes.length == 2) {
		return dfs(board[connectedNodes[0]], visited)
			+ dfs(board[connectedNodes[1]], visited);
	} else if (connectedNodes.length == 3) {
		return dfs(board[connectedNodes[0]], visited)
			+ dfs(board[connectedNodes[1]], visited)
			+ dfs(board[connectedNodes[2]], visited);
	} else {
		return dfs(board[connectedNodes[0]], visited)
			+ dfs(board[connectedNodes[1]], visited)
			+ dfs(board[connectedNodes[2]], visited)
			+ dfs(board[connectedNodes[3]], visited);
	}
}

function activateShortestPath(currentNode) {
	let stopNodes = Object.values(board).filter(node => node.active);
	
	let currentBest = bfs(currentNode, stopNodes[0]);
	currentBest.stopNode = stopNodes[0];
	
	let remainingStopNodes = stopNodes.slice(1);
	for (const target of remainingStopNodes) {
		let pathInfo = bfs(currentNode, target);
		if (pathInfo.distance < currentBest.distance) {
			currentBest = pathInfo;
			currentBest.stopNode = target;
		}
	}
	
	let path = getPath(currentBest.steps, currentBest.stopNode);
	for (const nodeId of path) {
		if (validateAwakeningSkill(nodeId, false)) {
			board[nodeId].active = true;
		}
	}
}

function bfs(startNode, stopNode) {
	const steps = new Map();
	const visited = new Set();
	const queue = [];
	queue.push({ node: startNode, distance: 0 });
	visited.add(startNode);

	while (queue.length > 0) {
		const { node, distance } = queue.shift();
		if (node === stopNode) {
			return { distance: distance, steps };
		}
		
		for (let neighbourId of board[node.id].connectedNodes) {
			let neighbour = board[neighbourId];
			if (!visited.has(neighbour)) {
				steps.set(neighbour.id, node.id);
				queue.push({ node: neighbour, distance: distance + 1 });
				visited.add(neighbour);
			}
		}
	}

	return { distance: -1, steps };
}

function getPath(pathMap, stopNode) {
	let path = [stopNode.id];
	let currentId = stopNode.id;
	while (pathMap.has(currentId)) {
		path.push(pathMap.get(currentId));
		currentId = pathMap.get(currentId);
	}
	
	return path;
}

function generateOptimalTree() {
	let targetNodes = Object.values(board).filter(node => node.prioritize).map(node => node.id);

	let currentMin = Object.keys(board).length;
	let currentBoard = structuredClone(board);
	
	if (isBelowPermutationLimit()) {
		let permutations = getPermutations(targetNodes);
		for (let permutation of permutations) {
			resetBoard(false);
			for (let nodeId of permutation) {
				activateShortestPath(board[nodeId]);
			}
			
			let pointCount = Object.values(board).filter(node => node.active).length;
			if (pointCount < currentMin) {
				currentMin = pointCount;
				currentBoard = structuredClone(board);
			}
		}
	} else {
		for (let i = 0; i < 50; i++) {
			shuffleArray(targetNodes);
			resetBoard(false);
			for (let nodeId of targetNodes) {
				activateShortestPath(board[nodeId]);
			}
			
			let pointCount = Object.values(board).filter(node => node.active).length;
			if (pointCount < currentMin) {
				currentMin = pointCount;
				currentBoard = structuredClone(board);
			}
		}
	}
	
	board = currentBoard;
}

function getPermutations(array) {
	let result = [];
	permute(array, [], result);
	return result;
}

function permute(array, permutation, result) {
	if (array.length === 0) {
		result.push(permutation)
	} else {
		for (let i = 0; i < array.length; i++) {
			let current = array.slice();
			let next = current.splice(i, 1);
			permute(current, permutation.concat(next), result);
		}
	}
	
	return result;
}

function getNodeStatsDisplay(nodeId) {
	let node = getMainOrSubStats(board[nodeId]);
	
	let stats = "";
	for (let statName of possibleStats) {
		if (Object.hasOwn(node, statName)) {
			if (statName == "Other") {
				stats += node[statName] + "\n";
			} else if(statName.includes("%")) {
				stats += statName.replace("%", "") + node[statName] + "%\n";
			} else {				
				stats += statName + " " + node[statName] + "\n";
			}
		}
	}
	
	return stats;
}

function drawTextbox(x, y, text, ctx, boxWidth = 225) {
	const lineHeight = 15;
	
	if (x > 920) {
		x -= boxWidth;
	}
	
	let lines = text.split('\n');
	ctx.beginPath();
	ctx.rect(x, y, boxWidth, lineHeight * lines.length);
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black"
	ctx.lineWidth = 2;
	ctx.fill();
	ctx.stroke();
	
	ctx.fillStyle = "black";
	ctx.font = '14px sans-serif';
	for (let line of lines) {
		ctx.fillText(line, x + 15, y + 20);
		y += lineHeight;
	}
}

function shuffleArray(array) {
	let currentIndex = array.length;

	while (currentIndex != 0) {
		let randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}

	return array;
}

function getStatSummary() {
	let activeNodes = Object.values(board).filter(node => node.active);
	let stats = {};
	
	for (let node of activeNodes) {
		node = getMainOrSubStats(node);
		
		for (let stat of possibleStats) {
			if (stat != "Other" && Object.hasOwn(node, stat)) {
				if (stat in stats) {
					stats[stat] += parseFloat(node[stat]);
				} else {
					stats[stat] = parseFloat(node[stat]);
				}
			} else if (stat == "Other" && Object.hasOwn(node, stat)) {
				stats[node[stat] + stat] = node[stat];
			}
		}
	}
	
	return stats;
}

function refreshStatSummary(statSummary) {
	let summaryList = $("#summary");
	summaryList.empty();

	Object.keys(statSummary).sort().forEach(stat => {
		if (statSummary[stat] != 0) {
			summaryList.append("<li>" + parseStatSummaryDisplay(stat, statSummary) + "</li>");
		}
	});
}

function parseStatSummaryDisplay(stat, statSummary) {
	let sign = statSummary[stat] > 0 ? "+" : "";
	
	if (stat.includes("Other")) {
		if (statSummary[stat].includes(":")) {
			let description = statSummary[stat].split(":");
			return description[0].replace("\n", " ") + ": " + description[1].trim().replaceAll("\n", ", ");
		} else {
			return statSummary[stat].replace("\n", " ");
		}
	} else if (stat.includes("\n")) {
		return stat.replace("\n", " ") + " " + sign + statSummary[stat];
	} else if (stat.includes("%")) {
		return stat.replace("%", "") + sign + statSummary[stat] + "%";
	}
	
	return stat + " " + sign + statSummary[stat];
}

function buildChecklist() {
	let checklist = $("#checklist");
	let sortedStats = possibleStats.slice().sort();
	for (let stat of sortedStats) {
		checklist.append("<li>"
			+ "<input class='" + stat +"' type='checkbox' value='" + stat + "' id='" + stat + "'/>"
			+ stat.replace("\n", " ")
			+ "</li>"
		);
	}
}

function highlightNodes() {
	let checkedStats = $("#checklist input:checked");
	Object.values(board).forEach(node => node.highlight = false);
	checkedStats.each(function() {
		Object.values(board).filter(node => Object.hasOwn(getMainOrSubStats(node), $(this).attr("value"))).forEach(node => node.highlight = true);
	});
}

function activateNodesFromURL() {
	let url = window.location.href;
	if (url.includes("?")) {
		let nodeIds = url.slice(window.location.href.indexOf("?") + 1).split("&");
		for (let nodeId of nodeIds) {
			if (nodeId == "-1") {
				isSubclassModeEnabled = true;
				continue;
			}
			
			if (nodeId in board) {
				board[nodeId].active = true;
			}
		}
		
		let visited = [];
		dfs(board[1], visited);
		Object.keys(board).forEach(id => {
			if (!visited.includes(parseInt(id))) {
				board[id].active = false;
			}
		});
	}
}

function updateURL() {
	let activeNodes = Object.values(board).filter(node => node.active).map(node => node.id);
	let queryString = isSubclassModeEnabled ? "-1&" : "";
	window.history.replaceState(null, null, "?" + queryString + activeNodes.join("&"));
}

function getMainOrSubStats(node) {
	if (Object.hasOwn(node, "Main")) {
		if (isSubclassModeEnabled) {
			node = node["Sub"];
		} else {
			node = node["Main"];
		}
	}
	
	return node;
}