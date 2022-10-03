window.onload = init;
var board = Object.assign({}, ...initialBoard.map((node) => ({[node.id]: node})));
var nodeSelectionEnabled = false;
var possibleStats = ["All Skills (Excluding Summons)\nTarget", "Attack / Elemental Intensity", "Attack / Elemental Intensity %",
		"Basic Stats", "Basic Stats %", "Confusion Resistance %", "Cooldown Reduction", "Damage Mitigation %", "Defense",
		"Dual Accuracy", "Dual Back Attack Damage", "Dual Critical Damage", "Dual Critical Damage %", "Dual Critical Rate",
		"Dual Damage", "Dual Defense Penetration", "Dual Evasion", "Dual Maximum Damage", "Dual Maximum Damage %", "Dual Minimum Damage",
		"Dual Minimum Damage %", "Dual Static Damage", "Dual Static Damage %", "Elemental Resistance", "HP", "HP %", "Infinity Skill Level",
		"Legend II Skill 7 (LL7) Target", "Luck", "Luck %", "Movement Speed", "Normal Added Damage", "Normal Added Damage %",
		"Normal Damage Amplification %", "Boss Added Damage", "Boss Added Damage %", "Boss Damage Amplification %", "Other", "Special Points",
		"Stamina", "Stamina %", "Strength / Magic", "Strength / Magic %", "Stun Resistance %"];

function init() {
	let canvas = document.getElementById("board");
	let ctx = canvas.getContext("2d");
	
	canvas.width = 1841;
	canvas.height = 1001;
	canvas.addEventListener('click', function(e) {
		let position = getCursorPosition(canvas, e, ctx);
		let nodeId = detectClickedNode(board, position.x, position.y);
		leftClick(nodeId, ctx);
		if (isResetButton(position.x, position.y)) {
			resetBoard(true);
			drawAll(ctx);
		}
		
		if (isNodeSelectionButton(position.x, position.y)) {
			nodeSelectionEnabled = !nodeSelectionEnabled;
			drawAll(ctx);
		}
		
		if (isOptimizeButton(position.x, position.y)) {
			generateOptimalTree();
			drawAll(ctx);
		}
	});
	
	canvas.addEventListener('contextmenu', function(e) {
		e.preventDefault();

		let position = getCursorPosition(canvas, e, ctx);
		let nodeId = detectClickedNode(board, position.x, position.y);
		rightClick(nodeId, ctx);
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
		} else {
			drawAll(ctx);
		}
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
		
		ctx.fillStyle = "white";
		ctx.font = '14px sans-serif';
		ctx.fillText("Reset", 85, 981);
		ctx.fillText("Optimize", 464, 981);
		
		ctx.fillStyle = nodeSelectionEnabled ? "yellow" : "white";
		ctx.fillText("Select Nodes", 255, 981);
	};
}

function getCursorPosition(canvas, event, ctx) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
	return { x, y };	
}

function isBelowPrioritizationLimit() {
	// Limit optimal tree generation to use a max of 6 prioritized nodes due to computation time
	let numberOfPrioritizeNodes = Object.values(board).filter(node => node.prioritize).length;
	return numberOfPrioritizeNodes < 6;
}

function canTogglePriority(nodeId) {
	return (isBelowPrioritizationLimit() || board[nodeId].prioritize);
}

function leftClick(nodeId, ctx) {
	if (nodeId > 1) {
		if (nodeSelectionEnabled && validateAwakeningSkillPrioritization(nodeId) && canTogglePriority(nodeId)) {
			board[nodeId].prioritize = !board[nodeId].prioritize;
		} else {
			if (board[nodeId].active) {
				deactivateAllDependentNodes(board[nodeId]);
			} else if (!board[nodeId].active && hasActiveConnectedNode(board[nodeId]) && validateAwakeningSkillActivation(nodeId)) {	
				board[nodeId].active = true;
			}			
		}
			
		drawAll(ctx);
	}
}

function middleClick(nodeId, ctx) {
	if (nodeId > 1 && validateAwakeningSkillPrioritization(nodeId) && canTogglePriority(nodeId)) {
		board[nodeId].prioritize = !board[nodeId].prioritize;
		drawAll(ctx);
	}
}

function rightClick(nodeId, ctx) {
	if (nodeId > 1) {
		activateShortestPath(board[nodeId]);
		drawAll(ctx);
	}
}

function validateAwakeningSkillActivation(nodeId) {
	const leftTopSkillId = "205";
	const leftBottomSkillId = "206";
	const rightTopSkillId = "281";
	const rightBottomSkillId = "282";
	
	return !((nodeId == leftTopSkillId && board[leftBottomSkillId].active)
		|| (nodeId == leftBottomSkillId && board[leftTopSkillId].active)
		|| (nodeId == rightTopSkillId && board[rightBottomSkillId].active)
		|| (nodeId == rightBottomSkillId && board[rightTopSkillId].active));
}

function validateAwakeningSkillPrioritization(nodeId) {
	const leftTopSkillId = "205";
	const leftBottomSkillId = "206";
	const rightTopSkillId = "281";
	const rightBottomSkillId = "282";
	
	return !((nodeId == leftTopSkillId && board[leftBottomSkillId].prioritize)
		|| (nodeId == leftBottomSkillId && board[leftTopSkillId].prioritize)
		|| (nodeId == rightTopSkillId && board[rightBottomSkillId].prioritize)
		|| (nodeId == rightBottomSkillId && board[rightTopSkillId].prioritize));
}

function isResetButton(x, y) {
	return x >= 12 && x <= 199 && y >= 962 && y <= 992;
}

function isNodeSelectionButton(x, y) {
	return x >= 205 && x <= 392 && y >= 962 && y <= 992;
}

function isOptimizeButton(x, y) {
	return x >= 399 && x <= 585 && y >= 962 && y <= 992;
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
		if (validateAwakeningSkillActivation(nodeId)) {
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
	let node = board[nodeId];
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

function drawTextbox(x, y, text, ctx) {
	const boxWidth = 225;
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