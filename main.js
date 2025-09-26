// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

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

let playerName = "";
let playerRole = "";
let roomId = "";

// Utility
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Create Game
createGameBtn.addEventListener("click", () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name first!");

  roomId = generateRoomCode();
  playerRole = "player1";

  // Create room in Firebase
  set(ref(db, "games/" + roomId), {
    player1: { name: playerName, score: 0 },
    turn: "player1"
  });

  // Show Room Code
  roomCodeBox.style.display = "block";
  roomCodeDisplay.value = roomId;

  startGame();
});

// Copy Room Code
copyCodeBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(roomCodeDisplay.value);
  alert("Room Code copied: " + roomCodeDisplay.value);
});

// Join Game
joinGameBtn.addEventListener("click", async () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name first!");

  roomId = roomCodeInput.value.trim().toUpperCase();
  if (!roomId) return alert("Enter a valid room code");

  const snapshot = await get(ref(db, "games/" + roomId));
  if (!snapshot.exists()) {
    return alert("Room not found!");
  }

  playerRole = "player2";

  // Add Player 2 to Firebase
  set(ref(db, "games/" + roomId + "/player2"), {
    name: playerName,
    score: 0
  });

  startGame();
});

// Start Game
function startGame() {
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "block";
  roomInfo.innerText = "Room: " + roomId;

  const gameRef = ref(db, "games/" + roomId);
  onValue(gameRef, (snapshot) => {
    const gameData = snapshot.val();
    if (!gameData) return;

    // Update scoreboard
    let board = "";
    if (gameData.player1) {
      board += `${gameData.player1.name}: ${gameData.player1.score} runs<br>`;
    }
    if (gameData.player2) {
      board += `${gameData.player2.name}: ${gameData.player2.score} runs<br>`;
    }
    scoreBoard.innerHTML = board;

    statusText.innerText = gameData.turn === playerRole ? "Your Turn!" : "Opponent's Turn!";
  });
}

// Handle move
document.querySelectorAll(".moveBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const move = parseInt(btn.dataset.move);
    playMove(move);
  });
});

function playMove(move) {
  if (!roomId) return;

  const gameRef = ref(db, "games/" + roomId);
  get(gameRef).then((snapshot) => {
    if (!snapshot.exists()) return;
    const gameData = snapshot.val();

    if (gameData.turn !== playerRole) return; // Not your turn

    let scorePath = "player1";
    let nextTurn = "player2";
    if (playerRole === "player2") {
      scorePath = "player2";
      nextTurn = "player1";
    }

    const newScore = (gameData[scorePath].score || 0) + move;
    set(ref(db, "games/" + roomId + "/" + scorePath), {
      name: playerName,
      score: newScore,
    });
    set(ref(db, "games/" + roomId + "/turn"), nextTurn);
  });
}