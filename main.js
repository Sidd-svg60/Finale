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
const roomCodeBox = document.getElementById("roomCodeBox");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const roomInfo = document.getElementById("roomInfo");

let playerName = "";
let playerRole = "";
let roomId = "";

// Generate 5-character code
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
    player1: { name: playerName },
    player2: { name: null },
    moves: {}
  });
  roomCodeBox.style.display = "block";
  roomCodeDisplay.value = roomId;
  startListening();
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
  update(ref(db, "games/" + roomId + "/player2"), { name: playerName });
  startListening();
});

// Start Listening
function startListening() {
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "block";
  roomInfo.innerText = "Room: " + roomId;

  const gameRef = ref(db, "games/" + roomId);
  onValue(gameRef, async (snapshot) => {
    const data = snapshot.val();
    if (!data || !data.player1.name || !data.player2.name) {
      statusText.innerText = "Waiting for both players...";
      return;
    }

    statusText.innerText = `Player1: ${data.player1.name} vs Player2: ${data.player2.name}`;

    const moves = data.moves || {};
    if (moves.player1 != null && moves.player2 != null) {
      const batter = moves.player1; 
      const bowler = moves.player2; 
      if (batter === bowler) {
        alert(`${data.player1.name} is OUT!`);
      } else {
        alert(`${data.player1.name} scored ${batter} runs`);
      }
      await update(ref(db, `games/${roomId}/moves`), {}); 
    }
  });
}

// Move buttons
document.querySelectorAll(".moveBtn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const move = parseInt(btn.dataset.move);
    if (!roomId || !playerRole) return alert("Join a game first!");
    await set(ref(db, `games/${roomId}/moves/${playerRole}`), move);
  });
});