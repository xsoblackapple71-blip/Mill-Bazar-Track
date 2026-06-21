import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, collection, addDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDs15CnfkHUT9W9H_Th4qHZgijzQtIUICQ",
  authDomain: "mill-and-bazar-track.firebaseapp.com",
  projectId: "mill-and-bazar-track",
  storageBucket: "mill-and-bazar-track.firebasestorage.app",
  messagingSenderId: "780292214339",
  appId: "1:780292214339:web:4d4ca017df035393db4ef6",
  measurementId: "G-EQSQ4ZBGKF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USER_PASSWORDS = {
    Saif: "1234",
    Tanzil: "5678",
    Ismail: "9090"
};

let currentUser = "";

// বাটন ইভেন্ট লিসেনার
document.getElementById('login-btn').addEventListener('click', () => {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    if (user && USER_PASSWORDS[user] === pass) {
        currentUser = user;
        document.getElementById('current-user-display').innerText = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        initTracker();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    location.reload();
});

function initTracker() {
    const tbody = document.getElementById('daily-rows');
    tbody.innerHTML = "";

    // ৩১ দিনের রো তৈরি করা (শুধু সংখ্যা বা তারিখ রাখা হলো)
    for (let i = 1; i <= 31; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><b>${i}</b></td>
            <td><input type="number" id="m-saif-${i}" value="0" step="0.5" min="0"></td>
            <td><input type="number" id="m-tanzil-${i}" value="0" step="0.5" min="0"></td>
            <td><input type="number" id="m-ismail-${i}" value="0" step="0.5" min="0"></td>
            <td><input type="number" id="bazaar-${i}" value="0" min="0"></td>
            <td><input type="text" id="desc-${i}" placeholder="বিবরণ"></td>
        `;
        tbody.appendChild(row);

        document.getElementById(`m-saif-${i}`).addEventListener('change', (e) => updateData(i, 'Saif (Meal)', e.target.value));
        document.getElementById(`m-tanzil-${i}`).addEventListener('change', (e) => updateData(i, 'Tanzil (Meal)', e.target.value));
        document.getElementById(`m-ismail-${i}`).addEventListener('change', (e) => updateData(i, 'Ismail (Meal)', e.target.value));
        document.getElementById(`bazaar-${i}`).addEventListener('change', (e) => updateData(i, 'Bazaar Cost', e.target.value));
        document.getElementById(`desc-${i}`).addEventListener('change', (e) => updateData(i, 'Description', e.target.value));
    }

    document.getElementById('dep-saif').addEventListener('change', (e) => updateDeposit('Saif', e.target.value));
    document.getElementById('dep-tanzil').addEventListener('change', (e) => updateDeposit('Tanzil', e.target.value));
    document.getElementById('dep-ismail').addEventListener('change', (e) => updateDeposit('Ismail', e.target.value));

    onSnapshot(doc(db, "mess", "month_data"), (docSnap) => {
        let data = {};
        if (docSnap.exists()) {
            data = docSnap.data();
        }
        calculateAndRender(data);
    });

    const logQuery = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(10));
    onSnapshot(logQuery, (querySnapshot) => {
        const logBox = document.getElementById('activity-log');
        logBox.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const log = doc.data();
            const p =