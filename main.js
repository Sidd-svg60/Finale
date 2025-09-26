import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4BAOLryVquqH_tqYPHUi4RypwOvWqrLo",
  authDomain: "iiiiiiii-1b65f.firebaseapp.com",
  databaseURL: "https://iiiiiiii-1b65f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iiiiiiii-1b65f",
  storageBucket: "iiiiiiii-1b65f.firebasestorage.app",
  messagingSenderId: "351966581285",
  appId: "1:351966581285:web:a9c36086e659fd6048a5cc",
  measurementId: "G-LC4HKZZDG2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Elements
const lobbyScreen = document.getElementById("lobbyScreen");
const tossScreen = document.getElementById("tossScreen");
const gameScreen = document.getElementById("gameScreen");
const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const playerNameInput = document.getElementById("playerName");
const roomCodeInput = document.getElementById("roomCodeInput");
const statusText = document.getElementById("status");
const scoreBoard = document.getElementById("scoreBoard");
const roomInfo = document.getElementById("roomInfo");
const roomCodeBox = document.getElementById("roomCodeBox");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const tossMessage = document.getElementById("tossMessage");
const tossButtons = document.getElementById("tossButtons");
const chooseBatting = document.getElementById("chooseBatting");
const chooseBowling = document.getElementById("chooseBowling");
const tossRoomCode = document.getElementById("tossRoomCode");

let playerName = "";
let playerRole = "";
let roomId = "";
let isTossMaster = false;

// Generate room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Create Game
createGameBtn.addEventListener("click", () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name!");

  roomId = generateRoomCode();
  playerRole = "player1";

  set(ref(db, "games/" + roomId), {
    player1: { name: playerName, score: 0 },
    turn: "waiting",
    roomCode: roomId
  });

  roomCodeBox.style.display = "block";
  roomCodeDisplay.value = roomId;

  waitForPlayer2();
});

// Join Game
joinGameBtn.addEventListener("click", async () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name!");

  roomId = roomCodeInput.value.trim().toUpperCase();
  if (!roomId) return alert("Enter a valid room code!");

  const snapshot = await get(ref(db, "games/" + roomId));
  if (!snapshot.exists()) return alert("Room not found!");

  playerRole = "player2";
  set(ref(db, "games/" + roomId + "/player2"), { name: playerName, score: 0 });

  waitForPlayer2();
});

// Wait for both players to join
function waitForPlayer2() {
  const gameRef = ref(db, "games/" + roomId);
  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    roomCodeBox.style.display = "block";
    roomCodeDisplay.value = roomId;

    if (data.player1 && data.player2 && data.turn === "waiting") {
      // Randomly select Toss Master
      const tossMaster = Math.random() < 0.5 ? "player1" : "player2";
      isTossMaster = (playerRole === tossMaster);

      update(ref(db, "games/" + roomId), { turn: "toss", tossMaster });

      if (isTossMaster) showTossScreen();
      else showWaitingForToss();
    }
  });
}

// Show Toss Screen to Toss Master
function showTossScreen() {
  lobbyScreen.style.display = "none";
  tossScreen.style.display = "block";
  tossRoomCode.innerText = roomId;
  tossMessage.innerText = "You are Toss Master! Choose Batting or Bowling";
}

// Show waiting message for non-toss master
function showWaitingForToss() {
  lobbyScreen.style.display = "none";
  tossScreen.style.display = "block";
  tossRoomCode.innerText = roomId;
  tossMessage.innerText = "Waiting for Toss Master to choose...";
  tossButtons.style.display = "none";
}

// Toss choice
chooseBatting.addEventListener("click", () => doToss("batting"));
chooseBowling.addEventListener("click", () => doToss("bowling"));

function doToss(choice) {
  update(ref(db, "games/" + roomId), {
    tossChoice: choice,
    turn: "player1" // start game with player1 batting or update logic
  });
}

// Start Game once toss choice is set
onValue(ref(db), (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  if (data.games && data.games[roomId] && data.games[roomId].tossChoice) {
    tossScreen.style.display = "none";
    gameScreen.style.display = "block";
    roomInfo.innerText = "Room: " + roomId;

    listenGameUpdates();
  }
});

// Game updates
function listenGameUpdates() {
  const gameRef = ref(db, "games/" + roomId);
  onValue(gameRef, (snapshot) => {
    const gameData = snapshot.val();
    if (!gameData) return;

    let board = "";
    if (gameData.player1) board += `${gameData.player1.name}: ${gameData.player1.score} runs<br>`;
    if (gameData.player2) board += `${gameData.player2.name}: ${gameData.player2.score} runs<br>`;
    scoreBoard.innerHTML = board;

    statusText.innerText = gameData.turn === playerRole ? "Your Turn!" : "Opponent's Turn!";
  });
}

// Handle move buttons
document.querySelectorAll(".moveBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const move = parseInt(btn.dataset.move);
    playMove(move);
  });
});

function playMove(move) {
  const gameRef =