window.onload = init;
var board = Object.assign({}, ...initialBoard.map((node) => ({[node.id]: {"id": node.id, "x": node.x, "y": node.y, "active": node.active, "connectedNodes": node.connectedNodes}})));

function init() {
	let canvas = document.getElementById("board");
	let ctx = canvas.getContext("2d");
	
	canvas.width = 1841;
	canvas.height = 1001;
	canvas.addEventListener('click', function(e) {
		let position = getCursorPosition(canvas, e, ctx);
		let nodeId = detectClickedNode(board, position.x, position.y);
		leftClick(nodeId, ctx);
	});
	
	canvas.addEventListener('contextmenu', function(e) {
		e.preventDefault();

		let position = getCursorPosition(canvas, e, ctx);
		let nodeId = detectClickedNode(board, position.x, position.y);
		rightClick(nodeId, ctx);
	});
	
	let background = new Image();
	background.src = "background.png";
	background.onload = function() {
		ctx.drawImage(background, 0, 0);
		renderNodes(board, ctx);
	};
}

function getCursorPosition(canvas, event, ctx) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
	
	return { x, y };	
}

function leftClick(nodeId, ctx) {
	if (nodeId > 1) {
		if (board[nodeId].active) {
			deactivateNodeIfAllowed(board[nodeId]);
		} else if (!board[nodeId].active && hasActiveConnectedNode(board[nodeId])) {
			board[nodeId].active = true;
		}

		renderNodes(board, ctx);
	}
}

function rightClick(nodeId, ctx) {
	activateShortestPath(board[nodeId]);
	renderNodes(board, ctx);
}

function renderNodes(nodes, ctx) {
	for (const [id, node] of Object.entries(nodes)) {
		ctx.beginPath();
		ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI);
		ctx.stroke();
		ctx.fillStyle = node.active ? "green" : "red";
		ctx.fill();
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

function deactivateNodeIfAllowed(node) {	
	node.active = false;
	var dfsCount = dfs(board[1], [], node);
	var activeCount = 0;
	Object.keys(board).forEach(id => {
		if (board[id].active) {
			activeCount++;
		}
	});

	if (dfsCount != activeCount) {
		node.active = true;	
	}
}

function dfs(node, visited) {
	if (visited.includes(node.id)) {
		return 0;
	}
	
	visited.push(node.id);
	let connectedNodes = board[node.id].connectedNodes.filter(x => !visited.includes(x) && board[x].active);
	if (connectedNodes.length == 0) {
		return 1;
	}
	
	if (connectedNodes.length == 1) {
		return dfs(board[connectedNodes[0]], visited) + 1;
	} else if (connectedNodes.length == 2) {
		return dfs(board[connectedNodes[0]], visited)
			+ dfs(board[connectedNodes[1]], visited) + 1;
	} else if (connectedNodes.length == 3) {
		return dfs(board[connectedNodes[0]], visited)
			+ dfs(board[connectedNodes[1]], visited)
			+ dfs(board[connectedNodes[2]], visited) + 1;
	} else {
		return dfs(board[connectedNodes[0]], visited)
			+ dfs(board[connectedNodes[1]], visited)
			+ dfs(board[connectedNodes[2]], visited)
			+ dfs(board[connectedNodes[3]], visited) + 1;
	}
}

function activateShortestPath(currentNode) {
	let stopNodes = [];
	Object.keys(board).forEach(id => {
		if (board[id].active) {
			stopNodes.push(board[id]);
		}
	});
	
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
		board[nodeId].active = true;
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