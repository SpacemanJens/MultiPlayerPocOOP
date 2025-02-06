const gameConstants = { planetDiameter: 350, bulletSpeed: 2, bulletDiameter: 10 }

let xText;

class Bullet {
  constructor(x, y, xMouse, yMouse) {
    this.x = x;
    this.y = y;
    this.xStart = x;
    this.yStart = y;
    this.xMouseStart = xMouse;
    this.yMouseStart = yMouse;
  }

  draw() {
    fill('yellow');
    push();
    imageMode(CENTER);
    translate(this.x, this.y);
    let head = createVector(
      this.xMouseStart - this.xStart,
      this.yMouseStart - this.yStart,
    ).normalize().heading();
    rotate(head + 1.555);
    rect(-3, -3, 10, 10);
    pop();
  }

  move() {
    let bulletVector = createVector(
      int(this.xMouseStart) - this.xStart,
      int(this.yMouseStart) - this.yStart,
    ).normalize();
    this.x += bulletVector.x * gameConstants.bulletSpeed;
    this.y += bulletVector.y * gameConstants.bulletSpeed;
    return onScreen(this.x, this.y);
  }
}

class Flight {
  constructor(config) {
    this.playerNumber = config.playerNumber;
    this.playerName = config.playerName;
    this.x = config.x;
    this.y = config.y;
    this.r = config.r;
    this.xMouse = config.xMouse;
    this.yMouse = config.yMouse;
    this.spawnX = config.spawnX;
    this.spawnY = config.spawnY;
    this.color = config.color;
    this.buls = config.buls || [];
    this.hits = config.hits || [0, 0];
    this.rotation = config.rotation;
  }

  draw() {
    this.drawFlight();
    this.drawBullets();
    this.drawScore();
  }

  drawFlight() {
    fill(this.color);
    push();
    imageMode(CENTER);
    translate(this.x, this.y);
    let head = createVector(
      this.xMouse - this.x,
      this.yMouse - this.y,
    ).normalize().heading();
    rotate(head + 1.555);
    rect(-10, -10, 30, 30);
    rect(0, -15, 10, 15);
    pop();
  }

  drawBullets() {
    if (this.buls) {
      this.buls.forEach(bullet => bullet.draw());
    }
  }

  drawScore() {
    fill(this.color);
    xText += 30;
    if (this.playerName === "player0") {
      if (this.hits) {
        text("Player0 (" + this.hits[1] + ")", 320, xText);
      } else {
        text("Player0", 320, xText);
      }
    } else if (this.playerName === "player1") {
      if (this.hits) {
        text("Player1 (" + this.hits[0] + ")", 320, xText);
      } else {
        text("Player1", 320, xText);
      }
    }
  }

  shoot() {
    let bullet = new Bullet(this.x, this.y, mouseX, mouseY);
    this.buls.push(bullet);
  }

  moveBullets() {
    for (let i = this.buls.length - 1; i >= 0; i--) {
      const isOnScreen = this.buls[i].move();
      if (!isOnScreen) {
        this.buls.splice(i, 1);
      }
    }
  }

  syncFromShared(sharedFlight) {
    Object.assign(this, sharedFlight);
  }
}

const flights = [
  new Flight({
    playerNumber: 0,
    playerName: "player0",
    x: 100,
    y: 100,
    r: 30,
    xMouse: 0,
    yMouse: 0,
    spawnX: 100,
    spawnY: 100,
    color: 'green',
  }),
  new Flight({
    playerNumber: 1,
    playerName: "player1",
    x: 200,
    y: 200,
    r: 30,
    xMouse: 0,
    yMouse: 0,
    spawnX: 200,
    spawnY: 200,
    color: 'blue',
  })
];

let me;
let guests;
let gameState = "PLAYING";

function preload() {

  partyConnect("wss://p5js-spaceman-server-29f6636dfb6c.herokuapp.com", "jkh-MultiPlayerPoc");
  me = partyLoadMyShared({ playerName: "observer" });
  guests = partyLoadGuestShareds();

  shared = partyLoadShared("shared", {
    shared: { xSun: 0 },
  });
}

function setup() {
  createCanvas(400, 400);

  if (me.playerName !== "player0" && me.playerName !== "player1") {
    joinGame();
    return;
  }
}

function draw() {

  background(0);
  fill('white')
  ellipse(200, 200, gameConstants.planetDiameter)

  if (partyIsHost()) {
    console.log("I am host")
    fill('yellow')
    text('I am host', 10, 10);
  }

  text(me.playerName, 10, 25);
  text("Left: F", 10, 40);
  text("Right: H", 10, 55);
  text("Up: T", 10, 70);
  text("Down: G", 10, 85);

  if (gameState === "PLAYING") {
    stepLocal();

    if (me.playerName != "observer") {
      moveMe();
      checkCollisions();

    }
    drawGame();
  }
}

function stepHost() {
}

function moveMe() {
  let offSetX = 0;
  let offSetY = 0;
  if (keyIsDown(70)) { offSetX = -3 } // F
  if (keyIsDown(72)) { offSetX = 3 } // H
  if (keyIsDown(84)) { offSetY = -3 } // T
  if (keyIsDown(71)) { offSetY = 3 } // G

  xTemp = me.x + offSetX;
  yTemp = me.y + offSetY;

  if (onScreen(xTemp, yTemp)) {
    me.x = xTemp;
    me.y = yTemp;
  }

  me.xMouse = mouseX;
  me.yMouse = mouseY;

  const myFlight = flights.find(f => f.playerName === me.playerName);
  if (myFlight) {
    myFlight.x = me.x;
    myFlight.y = me.y;
    myFlight.xMouse = me.xMouse;
    myFlight.yMouse = me.yMouse;
    myFlight.buls = me.buls;
    myFlight.moveBullets();
    me.buls = myFlight.buls;
  }
}

function checkCollisions() {

  flights.forEach((flight) => {
    if (flight.playerName != me.playerName) {
      checkCollisionsWithFlight(flight);
    }
  });

}
function checkCollisionsWithFlight(flight) {

  for (let i = me.buls.length - 1; i >= 0; i--) {

    let bullet = me.buls[i];

    let d = dist(flight.x, flight.y, bullet.x, bullet.y);

    if (d < (flight.r + gameConstants.bulletDiameter) / 2) {
      me.hits[flight.playerNumber]++;
      me.buls.splice(i, 1);
    }
  }
}
function onScreen(x, y) {
  return dist(200, 200, x, y) < gameConstants.planetDiameter / 2;
}
function stepLocal() {

  // find the current players, if they exist
  const p0 = guests.find((p) => p.playerName === "player0");
  const p1 = guests.find((p) => p.playerName === "player1");

  // hide flights if they are not in the game
  if (!p0) flights[0].x = -32;
  if (!p1) flights[1].x = -32;

  // sync flight positions from shared to local
  if (p0) flights[0].syncFromShared(p0);
  if (p1) flights[1].syncFromShared(p1);
}

function mousePressed() {

  if (me.playerName === "observer")
    return

  const myFlight = flights.find(f => f.playerName === me.playerName);
  if (myFlight) {
    myFlight.shoot();
    me.buls = myFlight.buls;
  }
}

function drawGame() {
  xText = 0
  flights.forEach((flight) => {
    flight.draw();
  });

}

function joinGame() {

  // don't let current players double join
  if (me.playerName === "player0" || me.playerName === "player1") return;

  if (!guests.find((p) => p.playerName === "player0")) {
    spawn(flights[0]);
    me.playerName = "player0";
    return;
  }
  if (!guests.find((p) => p.playerName === "player1")) {
    spawn(flights[1]);
    me.playerName = "player1";
  }
}

function watchGame() {
  me.playerName = "observer";
}

function spawn(flight) {
  me.playerNumber = flight.playerNumber;
  me.playerName = flight.playerName;
  me.x = flight.spawnX;
  me.y = flight.spawnY;
  me.r = flight.r
  me.rotation = flight.rotation;
  me.color = flight.color;
  me.buls = [];
  me.hits = [0, 0];
}