import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, collection, addDoc, query, orderBy, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

    const today = new Date();
    const currentDay = today.getDate(); 

    for (let i = 1; i <= 31; i++) {
        const row = document.createElement('tr');
        
        if (i === currentDay) {
            row.style.backgroundColor = "#fff9c4"; 
            row.style.border = "2px solid #fbc02d";
        }

        row.innerHTML = `
            <td><b>${i}</b></td>
            <td><input type="number" id="m-saif-${i}" placeholder="Saif" step="0.5" min="0"></td>
            <td><input type="number" id="m-tanzil-${i}" placeholder="Tanzil" step="0.5" min="0"></td>
            <td><input type="number" id="m-ismail-${i}" placeholder="Ismail" step="0.5" min="0"></td>
            <td><input type="number" id="bazaar-${i}" placeholder="Bazaar" min="0"></td>
            <td><textarea id="desc-${i}" placeholder="বিবরণ..." style="width: 95%; height: 60px; resize: none; font-family: inherit; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;"></textarea></td>
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

    // 🧹 ক্লিয়ার অল বাটন লজিক (কনফার্মেশন + পিন ভেরিফিকেশন সহ)
    document.getElementById('clear-all-btn').addEventListener('click', async () => {
        const firstConfirm = confirm("Are you sure to clear all monthly data?");
        if (!firstConfirm) return;

        const enteredPin = prompt("Security Check: Enter your PIN/Password to clear data:");
        if (!enteredPin) return;

        // যে লগইন করে আছে, তার পিনের সাথে মিললেই কেবল ডিলিট হবে
        if (USER_PASSWORDS[currentUser] === enteredPin) {
            try {
                // ১ ক্লিকে ফায়ারবেস থেকে ৩১ দিনের সব ডাটা ডিলিট করা
                await deleteDoc(doc(db, "mess", "month_data"));
                
                // লগে ডাটা সেভ করা যে কে ডিলিট করল
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                await addDoc(collection(db, "logs"), {
                    user: currentUser,
                    action: `🧹 CLEARED all monthly data and reset the tracker!`,
                    time: `${dateStr}, ${timeStr}`,
                    timestamp: new Date()
                });

                alert("All data cleared successfully!");
            } catch (error) {
                alert("Error clearing data: " + error.message);
            }
        } else {
            alert("Wrong PIN! Data was not cleared.");
        }
    });

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
            p.innerHTML = `<b>${log.time || ''}</b> - 👤 <b>${log.user}</b> ${log.action}`;
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
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullDateTime = `${dateStr}, ${timeStr}`;

    await addDoc(collection(db, "logs"), {
        user: currentUser,
        action: `changed Day ${day} ${field} to "${value}"`,
        time: fullDateTime,
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
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullDateTime = `${dateStr}, ${timeStr}`;

    await addDoc(collection(db, "logs"), {
        user: currentUser,
        action: `updated ${name}'s deposit to ${parseFloatValue} TK`,
        time: fullDateTime,
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

        const inputSaif = document.getElementById(`m-saif-${i}`);
        const inputTanzil = document.getElementById(`m-tanzil-${i}`);
        const inputIsmail = document.getElementById(`m-ismail-${i}`);
        const inputBazaar = document.getElementById(`bazaar-${i}`);
        const inputDesc = document.getElementById(`desc-${i}`);

        if(inputSaif && document.activeElement !== inputSaif) {
            inputSaif.value = sMeal === 0 ? "" : sMeal;
            inputSaif.style.backgroundColor = sMeal > 0 ? "#d4edda" : ""; 
            inputSaif.style.color = sMeal > 0 ? "#155724" : "";
            inputSaif.style.fontWeight = sMeal > 0 ? "bold" : "";
        }
        if(inputTanzil && document.activeElement !== inputTanzil) {
            inputTanzil.value = tMeal === 0 ? "" : tMeal;
            inputTanzil.style.backgroundColor = tMeal > 0 ? "#d4edda" : ""; 
            inputTanzil.style.color = tMeal > 0 ? "#155724" : "";
            inputTanzil.style.fontWeight = tMeal > 0 ? "bold" : "";
        }
        if(inputIsmail && document.activeElement !== inputIsmail) {
            inputIsmail.value = iMeal === 0 ? "" : iMeal;
            inputIsmail.style.backgroundColor = iMeal > 0 ? "#d4edda" : ""; 
            inputIsmail.style.color = iMeal > 0 ? "#155724" : "";
            inputIsmail.style.fontWeight = iMeal > 0 ? "bold" : "";
        }
        if(inputBazaar && document.activeElement !== inputBazaar) {
            inputBazaar.value = bCost === 0 ? "" : bCost;
            inputBazaar.style.backgroundColor = bCost > 0 ? "#f8d7da" : ""; 
            inputBazaar.style.color = bCost > 0 ? "#721c24" : "";
            inputBazaar.style.fontWeight = bCost > 0 ? "bold" : "";
        }
        if(inputDesc && document.activeElement !== inputDesc) {
            inputDesc.value = desc;
        }

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

    document.getElementById('cost-saif').innerHTML = `<b>${mealsSaif}</b> <span style="font-size:12px;color:#666;">meals</span><br>${costSaif.toFixed(2)} TK`;
    document.getElementById('cost-tanzil').innerHTML = `<b>${mealsTanzil}</b> <span style="font-size:12px;color:#666;">meals</span><br>${costTanzil.toFixed(2)} TK`;
    document.getElementById('cost-ismail').innerHTML = `<b>${mealsIsmail}</b> <span style="font-size:12px;color:#666;">meals</span><br>${costIsmail.toFixed(2)} TK`;

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