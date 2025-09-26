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
  if (!playerName) return alert("Enter your name!");

  roomId = generateRoomCode();
  playerRole = "player1";

  set(ref(db, "games/" + roomId), {
    player1: { name: playerName, score: 0 },
    turn: "player1",
    roomCode: roomId
  });

  roomCodeBox.style.display = "block";
  roomCodeDisplay.value = roomId;

  startListening();
});

// Copy Room Code
copyCodeBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(roomCodeDisplay.value);
  alert("Room code copied: " + roomCodeDisplay.value);
});

// Join Game
joinGameBtn.addEventListener("click", async () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name!");

  roomId = roomCodeInput.value.trim().toUpperCase();
  if (!roomId) return alert("Enter valid room code");

  const snapshot = await get(ref(db, "games/" + roomId));
  if (!snapshot.exists()) return alert("Room not found!");

  playerRole = "player2";
  set(ref(db, "games/" + roomId + "/player2"), { name: playerName, score: 0 });

  startListening();
});

// Listen for game updates
function startListening() {
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "block";
  roomInfo.innerText = "Room: " + roomId;

  const gameRef = ref(db, "games/" + roomId);
  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Display scoreboard
    let board = "";
    if (data.player1) board += `${data.player1.name}: ${data.player1.score} runs<br>`;
    if (data.player2) board += `${data.player2.name}: ${data.player2.score} runs<br>`;
    scoreBoard.innerHTML = board;

    // Show current player's turn by name
    if (data.turn === playerRole) {
      statusText.innerText = `Your Turn (${playerName})`;
    } else {
      const otherName = playerRole === "player1" ? data.player2?.name : data.player1?.name;
      statusText.innerText = `Waiting for ${otherName}`;
    }
  });
}

// Handle moves
document.querySelectorAll(".moveBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const move = parseInt(btn.dataset.move);
    playMove(move);
  });
});

function playMove(move) {
  const gameRef = ref(db, "games/" + roomId);
  get(gameRef).then((snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    if (data.turn !== playerRole) return;

    const scorePath = playerRole;
    const nextTurn = playerRole === "player1" ? "player2" : "player1";

    const newScore = (data[scorePath].score || 0) + move;
    set(ref(db, "games/" + roomId + "/" + scorePath), {
      name: playerName,
      score: newScore
    });
    set(ref(db, "games/" + roomId + "/turn"), nextTurn);
  });
}