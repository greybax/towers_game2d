// A cross-browser requestAnimationFrame
// See https://hacks.mozilla.org/2011/08/animating-with-javascript-from-setinterval-to-requestanimationframe/
var requestAnimFrame = (function(){
    return window.requestAnimationFrame    ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

// Returns a random number between min (inclusive) and max (exclusive)
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = document.body.clientWidth - 20; //512;
canvas.height = document.body.clientHeight  - 50; //460;
document.body.appendChild(canvas);

// The main game loop
var lastTime;
function main() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;

    update(dt);
    render();

    lastTime = now;
    requestAnimFrame(main);
}

function init() {
    terrainPattern = ctx.createPattern(resources.get('img/terrain.png'), 'repeat');

    reset();
    lastTime = Date.now();
    main();
}

resources.load([
    'img/tower.png',
	'img/sprites.png',
	'img/spider.png',
    'img/hero.png',
    'img/terrain.png'
]);
resources.onReady(init);

// Game state
var player = {
    pos: [0, 0],
    sprite: new Sprite('img/hero.png', [0, 0], [64, 64], 5, [0, 1, 2, 1])
};

var towers = [];
var bullets = [];
var enemies = [];
var explosions = [];

var lastTower = 0;
var gameTime = 0;
var isGameOver;
var terrainPattern;

var score = 0;
var scoreEl = document.getElementById('score');

// Speed in pixels per second
var playerSpeed = 100;
var bulletSpeed = 300;
var enemySpeed = 50;

// Update game objects
function update(dt) {
    gameTime += dt;

    handleInput(dt);
    updateEntities(dt);
	
	// It gets harder over time by adding enemies using this
    // equation: 1-0.993^gameTime
    if (Math.random() < 1 - Math.pow(0.993, gameTime)) {
		switch (getRandomInt(0,4)) {
		    case 0:	//left
			enemies.push({
				pos: [0, Math.random() * (canvas.height - 35)],
				dir: 'left',
				sprite: new Sprite('img/spider.png', [0, 0], [40, 35], 5, [0, 1, 2, 1])
			});
			break;
		    case 1:	//top
			enemies.push({
				pos: [Math.random() * canvas.width, 0],
				dir: 'top',
				sprite: new Sprite('img/spider.png', [0, 0], [40, 35], 5, [0, 1, 2, 1])
			});
			break;
			case 2:	//bottom
			enemies.push({
				pos: [Math.random() * canvas.width, canvas.height - 35],
				dir: 'bottom',
				sprite: new Sprite('img/spider.png', [0, 0], [40, 35], 5, [0, 1, 2, 1])
			});
			break;
			default:	//right
			enemies.push({
				pos: [canvas.width, Math.random() * (canvas.height - 35)],
				dir: 'right',
				sprite: new Sprite('img/spider.png', [0, 0], [40, 35], 5, [0, 1, 2, 1])
			});
			break;
		}
    }

    checkCollisions();

    scoreEl.innerHTML = score;
}

function handleInput(dt) {
    if (input.isDown('DOWN') || input.isDown('s')) {
        player.pos[1] += playerSpeed * dt;
		player.sprite = new Sprite('img/hero.png', [0, 0], [64, 64], 5, [0, 1, 2, 1]);
    }

    if (input.isDown('UP') || input.isDown('w')) {
        player.pos[1] -= playerSpeed * dt;
		player.sprite = new Sprite('img/hero.png', [0, 192], [64, 64], 5, [0, 1, 2, 1]);
	}

    if (input.isDown('LEFT') || input.isDown('a')) {
        player.pos[0] -= playerSpeed * dt;
		player.sprite = new Sprite('img/hero.png', [0, 64], [64, 64], 5, [0, 1, 2, 1]);
    }

    if (input.isDown('RIGHT') || input.isDown('d')) {
        player.pos[0] += playerSpeed * dt;
		player.sprite = new Sprite('img/hero.png', [0, 128], [64, 64], 5, [0, 1, 2, 1]);
    }

    if (input.isDown('SPACE') && !isGameOver) {
		var isClosest = false;
		for (var i = 0; i < towers.length; i++) {
			if (Math.abs(player.pos[0] - towers[i].pos[0]) < 50 && 
				Math.abs(player.pos[1] - towers[i].pos[1]) < 50) {
				isClosest = true;
			}
		}
		
		if (!isClosest) {
			towers[lastTower % 3] = {
				pos: [player.pos[0], player.pos[1]],
				lastFire: Date.now(),
				sprite: new Sprite('img/tower.png', [0, 0], [38, 35], 8, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
			};
			lastTower++;
		}
    }
}

function updateEntities(dt) {
    // Update the player sprite animation
    player.sprite.update(dt);

	// Update the towers sprite animation
	for(var i = 0; i < towers.length; i++) {
		var tower = towers[i];
		tower.sprite.update(dt);

		if (!isGameOver && Date.now() - tower.lastFire > 500) {
			var pi = Math.PI;
			var x = tower.pos[0] + tower.sprite.size[0] / 2;
			var y = tower.pos[1] + tower.sprite.size[1] / 2;
			
			bullets.push({
				pos: [x, y],
				k: getRandomArbitrary(-5 * pi, 5 * pi),
				sprite: new Sprite('img/sprites.png', [0, 39], [18, 8]) 
			});
			tower.lastFire = Date.now();
		}
	}

    // Update all the bullets
    for (var i = 0; i < bullets.length; i++) {
        var bullet = bullets[i];

		var c = dt * bulletSpeed;
		var sin = Math.sin(bullet.k);		
		var cos = Math.cos(bullet.k);

		bullet.pos[0] += sin * c;
		bullet.pos[1] += cos * c;		

        // Remove the bullet if it goes offscreen
        if (bullet.pos[1] < 0 || bullet.pos[1] > canvas.height ||
			bullet.pos[0] > canvas.width) {
			
            bullets.splice(i, 1);
            i--;
        }
    }

    // Update all the enemies
    for (var i = 0; i < enemies.length; i++) {
	
		if (enemies[i].dir === 'left') {
			enemies[i].pos[0] += enemySpeed * dt;
			enemies[i].sprite.update(dt);
		}
        else if (enemies[i].dir === 'top') {
			enemies[i].pos[1] += enemySpeed * dt;
			enemies[i].sprite.update(dt);
		}
		else if (enemies[i].dir === 'right') {
			enemies[i].pos[0] -= enemySpeed * dt;
			enemies[i].sprite.update(dt);
		}
		else if (enemies[i].dir === 'bottom') {
			enemies[i].pos[1] -= enemySpeed * dt;
			enemies[i].sprite.update(dt);
		}

        // Remove if offscreen
        if (enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
            enemies.splice(i, 1);
            i--;
        }
    }

    // Update all the explosions
    for (var i = 0; i < explosions.length; i++) {
        explosions[i].sprite.update(dt);

        // Remove if animation is done
        if (explosions[i].sprite.done) {
            explosions.splice(i, 1);
            i--;
        }
    }
}

// Collisions

function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 || b <= y2 || y > b2);
}

function boxCollides(pos, size, pos2, size2) {
    return collides(pos[0], pos[1],
                    pos[0] + size[0], pos[1] + size[1],
                    pos2[0], pos2[1],
                    pos2[0] + size2[0], pos2[1] + size2[1]);
}

function checkCollisions() {
    checkPlayerBounds();
    
    // Run collision detection for all enemies and bullets
    for (var i = 0; i < enemies.length; i++) {
        var pos = enemies[i].pos;
        var size = enemies[i].sprite.size;

        for (var j = 0; j < bullets.length; j++) {
            var pos2 = bullets[j].pos;
            var size2 = bullets[j].sprite.size;

            if (boxCollides(pos, size, pos2, size2)) {
                // Remove the enemy
                enemies.splice(i, 1);
                i--;

                // Add score
                score += 100;

                // Add an explosion
                explosions.push({
                    pos: pos,
                    sprite: new Sprite('img/sprites.png',
                                       [0, 117],
                                       [39, 39],
                                       16,
                                       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                       null,
                                       true)
                });

                // Remove the bullet and stop this iteration
                bullets.splice(j, 1);
                break;
            }
        }

        if (boxCollides(pos, size, player.pos, player.sprite.size)) {
            gameOver();
        }
    }
}

function checkPlayerBounds() {
    // Check bounds
    if (player.pos[0] < 0) {
        player.pos[0] = 0;
    }
    else if (player.pos[0] > canvas.width - player.sprite.size[0]) {
        player.pos[0] = canvas.width - player.sprite.size[0];
    }

    if (player.pos[1] < 0) {
        player.pos[1] = 0;
    }
    else if (player.pos[1] > canvas.height - player.sprite.size[1]) {
        player.pos[1] = canvas.height - player.sprite.size[1];
    }
}

// Draw everything
function render() {
    ctx.fillStyle = terrainPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render the player if the game isn't over
    if (!isGameOver) {
        renderEntity(player);
		renderEntities(towers);
		renderEntities(enemies);
    }
    
    renderEntities(bullets);    
    renderEntities(explosions);
}

function renderEntities(list) {
    for(var i=0; i<list.length; i++) {
        renderEntity(list[i]);
    }
}

function renderEntity(entity) {
    ctx.save();
    ctx.translate(entity.pos[0], entity.pos[1]);
    entity.sprite.render(ctx);
    ctx.restore();
}

// Game over
function gameOver() {
    isGameOver = true;
}

// Reset game to original state
function reset() {
    isGameOver = false;
    gameTime = 0;
    score = 0;

    enemies = [];
    bullets = [];

    player.pos = [50, canvas.height / 2];
}