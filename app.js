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

// বাটন ইভেন্ট লিসেনার (HTML এর অন-ক্লিক ঝামেলা এড়ানোর জন্য)
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

    for (let i = 1; i <= 31; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><b>Day ${i}</b></td>
            <td><input type="number" id="m-saif-${i}" value="0" step="0.5" min="0"></td>
            <td><input type="number" id="m-tanzil-${i}" value="0" step="0.5" min="0"></td>
            <td><input type="number" id="m-ismail-${i}" value="0" step="0.5" min="0"></td>
            <td><input type="number" id="bazaar-${i}" value="0" min="0"></td>
            <td><input type="text" id="desc-${i}" placeholder="বিবরণ"></td>
        `;
        tbody.appendChild(row);

        // ইনপুট বক্সের ইভেন্ট লিসেনার যোগ করা
        document.getElementById(`m-saif-${i}`).addEventListener('change', (e) => updateData(i, 'Saif (Meal)', e.target.value));
        document.getElementById(`m-tanzil-${i}`).addEventListener('change', (e) => updateData(i, 'Tanzil (Meal)', e.target.value));
        document.getElementById(`m-ismail-${i}`).addEventListener('change', (e) => updateData(i, 'Ismail (Meal)', e.target.value));
        document.getElementById(`bazaar-${i}`).addEventListener('change', (e) => updateData(i, 'Bazaar Cost', e.target.value));
        document.getElementById(`desc-${i}`).addEventListener('change', (e) => updateData(i, 'Description', e.target.value));
    }

    // জমার ইনপুট বক্সের ইভেন্ট লিসেনার যোগ করা
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
            const p = document.createElement('p');
            p.className = "log-item";
            p.innerHTML = `<b>${log.time}</b> - 👤 <b>${log.user}</b> ${log.action}`;
            logBox.appendChild(p);
        });
    });
}

async function updateData(day, field, value) {
    const docRef = doc(db, "mess", "month_data");
    let formattedValue = field === 'Description' ? value : parseFloat(value) || 0;

    await setDoc(docRef, {
        [`day_${day}`]: {
            [field.replace(/[^a-zA-Z0-9]/g, "_")]: formattedValue
        }
    }, { merge: true });

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await addDoc(collection(db, "logs"), {
        user: currentUser,
        action: `changed Day ${day} ${field} to "${value}"`,
        time: timeStr,
        timestamp: new Date()
    });
}

async function updateDeposit(name, value) {
    const docRef = doc(db, "mess", "month_data");
    const parseFloatValue = parseFloat(value) || 0;

    await setDoc(docRef, {
        deposits: {
            [name]: parseFloatValue
        }
    }, { merge: true });

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await addDoc(collection(db, "logs"), {
        user: currentUser,
        action: `updated ${name}'s deposit to ${parseFloatValue} TK`,
        time: timeStr,
        timestamp: new Date()
    });
}

function calculateAndRender(data) {
    let totalBazaar = 0, mealsSaif = 0, mealsTanzil = 0, mealsIsmail = 0;

    for (let i = 1; i <= 31; i++) {
        const dayData = data[`day_${i}`] || {};
        const sMeal = dayData['Saif__Meal_'] !== undefined ? dayData['Saif__Meal_'] : 0;
        const tMeal = dayData['Tanzil__Meal_'] !== undefined ? dayData['Tanzil__Meal_'] : 0;
        const iMeal = dayData['Ismail__Meal_'] !== undefined ? dayData['Ismail__Meal_'] : 0;
        const bCost = dayData['Bazaar_Cost'] !== undefined ? dayData['Bazaar_Cost'] : 0;
        const desc = dayData['Description'] || "";

        if(document.getElementById(`m-saif-${i}`) && document.activeElement !== document.getElementById(`m-saif-${i}`)) document.getElementById(`m-saif-${i}`).value = sMeal;
        if(document.getElementById(`m-tanzil-${i}`) && document.activeElement !== document.getElementById(`m-tanzil-${i}`)) document.getElementById(`m-tanzil-${i}`).value = tMeal;
        if(document.getElementById(`m-ismail-${i}`) && document.activeElement !== document.getElementById(`m-ismail-${i}`)) document.getElementById(`m-ismail-${i}`).value = iMeal;
        if(document.getElementById(`bazaar-${i}`) && document.activeElement !== document.getElementById(`bazaar-${i}`)) document.getElementById(`bazaar-${i}`).value = bCost;
        if(document.getElementById(`desc-${i}`) && document.activeElement !== document.getElementById(`desc-${i}`)) document.getElementById(`desc-${i}`).value = desc;

        mealsSaif += sMeal;
        mealsTanzil += tMeal;
        mealsIsmail += iMeal;
        totalBazaar += bCost;
    }

    const totalMeals = mealsSaif + mealsTanzil + mealsIsmail;
    const mealRate = totalMeals > 0 ? totalBazaar / totalMeals : 0;

    document.getElementById('summary-bazaar').innerText = totalBazaar + " TK";
    document.getElementById('summary-meals').innerText = totalMeals;
    document.getElementById('summary-rate').innerText = mealRate.toFixed(2) + " TK";

    const costSaif = mealsSaif * mealRate;
    const costTanzil = mealsTanzil * mealRate;
    const costIsmail = mealsIsmail * mealRate;

    document.getElementById('cost-saif').innerText = costSaif.toFixed(2);
    document.getElementById('cost-tanzil').innerText = costTanzil.toFixed(2);
    document.getElementById('cost-ismail').innerText = costIsmail.toFixed(2);

    const currentDeposits = data.deposits || {};
    const depSaif = currentDeposits['Saif'] !== undefined ? currentDeposits['Saif'] : 1500;
    const depTanzil = currentDeposits['Tanzil'] !== undefined ? currentDeposits['Tanzil'] : 1500;
    const depIsmail = currentDeposits['Ismail'] !== undefined ? currentDeposits['Ismail'] : 2000;

    if(document.getElementById('dep-saif') && document.activeElement !== document.getElementById('dep-saif')) document.getElementById('dep-saif').value = depSaif;
    if(document.getElementById('dep-tanzil') && document.activeElement !== document.getElementById('dep-tanzil')) document.getElementById('dep-tanzil').value = depTanzil;
    if(document.getElementById('dep-ismail') && document.activeElement !== document.getElementById('dep-ismail')) document.getElementById('dep-ismail').value = depIsmail;
    
    const totalDeposit = depSaif + depTanzil + depIsmail;
    document.getElementById('total-deposit').innerText = totalDeposit + " TK";

    formatCell('bal-saif', depSaif - costSaif);
    formatCell('bal-tanzil', depTanzil - costTanzil);
    formatCell('bal-ismail', depIsmail - costIsmail);
}

function formatCell(id, val) {
    const el = document.getElementById(id);
    if(val >= 0) {
        el.innerText = `+${val.toFixed(2)} (Refund)`;
        el.style.color = "green";
    } else {
        el.innerText = `${val.toFixed(2)} (Due)`;
        el.style.color = "red";
    }
}