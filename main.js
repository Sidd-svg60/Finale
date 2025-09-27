// main.js — corrected game logic: batting/bowling, wicket, innings, target, winner
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ---------- your firebase config ----------
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

// ---------- DOM ----------
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");
const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const playerNameInput = document.getElementById("playerName");
const roomCodeInput = document.getElementById("roomCodeInput");
const roomCodeBox = document.getElementById("roomCodeBox");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const waitingText = document.getElementById("waitingText");

const roomInfo = document.getElementById("roomInfo");
const statusText = document.getElementById("status");
const scoreBoard = document.getElementById("scoreBoard");
const lastEvent = document.getElementById("lastEvent");
const winnerBox = document.getElementById("winnerBox");
const moveButtons = Array.from(document.querySelectorAll(".moveBtn"));

let playerName = "";
let playerRole = ""; // "player1" or "player2"
let roomId = "";

// ---------- helpers ----------
function genRoom() { return Math.random().toString(36).substring(2,7).toUpperCase(); }
function setButtonsEnabled(enabled){
  moveButtons.forEach(b=> b.disabled = !enabled);
}
function showLobbyRoom(code){
  roomCodeBox.style.display = "block";
  roomCodeDisplay.value = code;
}

// ---------- create / join ----------
createGameBtn.addEventListener("click", async () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name.");

  roomId = genRoom();
  playerRole = "player1";

  // create initial game object
  await set(ref(db, `games/${roomId}`), {
    player1: { name: playerName, score: 0 },
    player2: { name: null, score: 0 },
    inning: 1,
    batting: "player1",
    bowling: "player2",
    currentMove: {},     // per-ball moves (role -> number)
    target: null,
    gameOver: false,
    roomCode: roomId,
    lastEvent: "Game created. Waiting for player 2..."
  });

  showLobbyRoom(roomId);
  waitingText.style.display = "block";
  startListening();
});

copyCodeBtn.addEventListener("click", () => {
  if (roomCodeDisplay.value) navigator.clipboard.writeText(roomCodeDisplay.value);
  alert("Room code copied.");
});

joinGameBtn.addEventListener("click", async () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name.");

  roomId = roomCodeInput.value.trim().toUpperCase();
  if (!roomId) return alert("Enter a room code.");

  const snap = await get(ref(db, `games/${roomId}`));
  if (!snap.exists()) return alert("Room not found.");

  playerRole = "player2";
  await update(ref(db, `games/${roomId}/player2`), { name: playerName, score: 0 });
  showLobbyRoom(roomId);
  waitingText.style.display = "none";
  startListening();
});

// ---------- game listener & core logic ----------
function startListening(){
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "block";
  roomInfo.innerText = `Room: ${roomId}`;
  winnerBox.innerText = "";

  const gameRef = ref(db, `games/${roomId}`);

  onValue(gameRef, async (snap) => {
    const data = snap.val();
    if (!data) return;

    // If players not ready
    if (!data.player1?.name || !data.player2?.name) {
      statusText.innerText = "Waiting for both players to join...";
      scoreBoard.innerHTML = `${data.player1?.name || "player1"}: ${data.player1?.score || 0}<br>${data.player2?.name || "player2"}: ${data.player2?.score || 0}`;
      setButtonsEnabled(false);
      roomCodeBox.style.display = "block";
      roomCodeDisplay.value = roomId;
      waitingText.style.display = "block";
      return;
    }
    // both present — hide waiting
    waitingText.style.display = "none";
    roomCodeBox.style.display = "none";

    // If game already over
    if (data.gameOver) {
      statusText.innerText = `Game Over — ${data.winnerText || "Result"}`;
      scoreBoard.innerHTML = `${data.player1.name}: ${data.player1.score} runs<br>${data.player2.name}: ${data.player2.score} runs`;
      winnerBox.innerText = data.winnerText || "";
      lastEvent.innerText = data.lastEvent || "";
      setButtonsEnabled(false);
      return;
    }

    // show batting / bowling
    const battingRole = data.batting;
    const bowlingRole = data.bowling;
    const batterName = data[battingRole].name;
    const bowlerName = data[bowlingRole].name;
    let status = `Inning ${data.inning} — ${batterName} batting, ${bowlerName} bowling`;
    if (data.inning === 2 && data.target) {
      status += ` — Target: ${data.target}`;
    }
    statusText.innerHTML = status;
    scoreBoard.innerHTML = `${data.player1.name}: ${data.player1.score} runs<br>${data.player2.name}: ${data.player2.score} runs`;
    lastEvent.innerText = data.lastEvent || "";

    // Determine if this client has already submitted a move for current ball
    const moves = data.currentMove || {};
    const myMove = moves[playerRole];
    const otherMoveExists = Boolean(moves[playerRole === "player1" ? "player2" : "player1"]);
    // allow only if game not over and player hasn't submitted yet
    if (!myMove) {
      // enable buttons — but we should allow submission even if the opponent hasn't submitted
      setButtonsEnabled(true);
    } else {
      // player already submitted -> disable until round resolves
      setButtonsEnabled(false);
    }

    // If both moves present -> resolve
    const player1Move = moves.player1;
    const player2Move = moves.player2;
    if ((player1Move !== undefined) && (player2Move !== undefined)) {
      // resolve exactly once
      await resolveRound(data, moves);
    }
  });
}

// ---------- resolve round (both moves present) ----------
async function resolveRound(data, moves) {
  // ensure we don't double-process: use a flag lastEvent to mark processing; but simplest: process then clear moves
  const battingRole = data.batting;
  const bowlingRole = data.bowling;
  const batterMove = Number(moves[battingRole]);
  const bowlerMove  = Number(moves[bowlingRole]);

  const batterName = data[battingRole].name;
  const bowlerName = data[bowlingRole].name;

  // If both same -> out
  if (batterMove === bowlerMove) {
    // OUT — no runs added
    const eventText = `${batterName} is OUT! (they both chose ${batterMove})`;
    // If inning 1 -> switch to inning 2
    if (data.inning === 1) {
      // set target = batterScore + 1
      const firstInningsScore = data[battingRole].score || 0;
      await update(ref(db, `games/${roomId}`), {
        inning: 2,
        batting: bowlingRole,
        bowling: battingRole,
        target: firstInningsScore + 1,
        currentMove: {},
        lastEvent: eventText
      });
      return;
    } else {
      // inning 2 -> game over, determine winner
      const p1 = data.player1.score || 0;
      const p2 = data.player2.score || 0;
      let winnerText = "Draw!";
      if (p1 > p2) winnerText = `${data.player1.name} wins!`;
      else if (p2 > p1) winnerText = `${data.player2.name} wins!`;
      await update(ref(db, `games/${roomId}`), {
        gameOver: true,
        winnerText,
        currentMove: {},
        lastEvent: eventText
      });
      return;
    }
  } else {
    // Not out — add runs to batter
    const currentScore = data[battingRole].score || 0;
    const newScore = currentScore + batterMove;

    // update batter score and clear moves
    await update(ref(db, `games/${roomId}`), {
      [`${battingRole}/score`]: newScore,
      currentMove: {},
      lastEvent: `${batterName} scored ${batterMove} (bowler: ${bowlerName} chose ${bowlerMove})`
    });

    // If second inning and target set, check win
    if (data.inning === 2 && data.target) {
      if (newScore >= data.target) {
        const p1 = (battingRole === "player1") ? newScore : (data.player1.score || 0);
        const p2 = (battingRole === "player2") ? newScore : (data.player2.score || 0);
        let winnerText = "Draw!";
        if (p1 > p2) winnerText = `${data.player1.name} wins!`;
        else if (p2 > p1) winnerText = `${data.player2.name} wins!`;
        await update(ref(db, `games/${roomId}`), {
          gameOver: true,
          winnerText,
          lastEvent: `Game Over: ${winnerText}`
        });
      }
    }
    return;
  }
}

// ---------- submit move (submit only if not already submitted and game still active) ----------
moveButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    const move = Number(btn.dataset.move);
    if (!roomId || !playerRole) return alert("Not in a game.");

    // check if gameOver or players not ready
    const baseSnap = await get(ref(db, `games/${roomId}`));
    const data = baseSnap.val();
    if (!data || data.gameOver) return alert("Game is over or invalid.");
    if (!data.player1?.name || !data.player2?.name) return alert("Both players must join first.");

    // ensure the player hasn't already submitted for this ball
    const cur = data.currentMove || {};
    if (cur[playerRole] !== undefined) {
      return alert("You already submitted this ball. Wait for resolution.");
    }

    // set our move
    await update(ref(db, `games/${roomId}/currentMove`), { [playerRole]: move });
    // disable until processed (UI will disable on next onValue)
    setButtonsEnabled(false);
  });
});