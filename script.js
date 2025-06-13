import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, setDoc, addDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ▼▼▼ COLE A SUA CONFIGURAÇÃO DO FIREBASE AQUI ▼▼▼
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbERa8PF2cKWicvh5YFyHvYEnre9H2AIw",
  authDomain: "controle-de-chaves-fb740.firebaseapp.com",
  projectId: "controle-de-chaves-fb740",
  storageBucket: "controle-de-chaves-fb740.firebasestorage.app",
  messagingSenderId: "929271149164",
  appId: "1:929271149164:web:7c4a315f8e9a239f43de49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Coleções no Firestore
const keysInUseCollection = collection(db, "keysInUse");
const historyCollection = collection(db, "keyHistory");

// Elementos do DOM
const keyNumberEl = document.getElementById('keyNumber');
const sectorEl = document.getElementById('sector');
const personNameEl = document.getElementById('personName');
const btnSaida = document.getElementById('btnSaida');
const keysInUseList = document.getElementById('keysInUseList');
const historyTableBody = document.getElementById('historyTableBody');
const searchInput = document.getElementById('searchInput');
const inUseCountEl = document.getElementById('inUseCount');
const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
const userIdEl = document.getElementById('userId');

// Modal
const modal = document.getElementById('notificationModal');
const modalTitle = document.getElementById('notificationTitle');
const modalMessage = document.getElementById('notificationMessage');
const modalIcon = document.getElementById('notificationIcon');
const closeModalButton = document.getElementById('closeModalButton');

let fullHistory = [];

function setupListeners() {
    // Escuta por mudanças nas chaves em uso
    onSnapshot(keysInUseCollection, (snapshot) => {
        const keys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderKeysInUse(keys);
    });

    // Escuta por mudanças no histórico
    onSnapshot(historyCollection, (snapshot) => {
        fullHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderHistory(fullHistory);
    });
}

function renderKeysInUse(keys) {
    keysInUseList.innerHTML = '';
    inUseCountEl.textContent = keys.length;

    if (keys.length === 0) {
        keysInUseList.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhuma chave retirada no momento.</p>';
        return;
    }

    const sortedKeys = keys.sort((a,b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
    const now = Date.now();
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

    sortedKeys.forEach(key => {
        const isOverdue = (now - key.timestamp?.toMillis()) > twentyFourHoursInMs;
        const cardClasses = isOverdue
          ? 'bg-red-200 border-red-600 overdue-key'
          : 'bg-blue-50 border-blue-200';
        
        const date = key.timestamp?.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) || 'N/A';
        const card = `
            <div class="border rounded-lg p-3 flex flex-col sm:flex-row justify-between items-center gap-3 transition-colors duration-500 ${cardClasses}">
                <div class="flex-grow">
                    <p class="font-bold text-gray-800">${key.keyNumber}</p>
                    <p class="text-sm text-gray-600">
                        Por: <span class="font-semibold">${key.personName}</span> (${key.sector || 'N/A'}) - <span class="font-medium">${key.quadro || ''}</span>
                    </p>
                    <p class="text-xs text-gray-500 mt-1">Em: ${date}</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full sm:w-auto">
                     <button data-key-id="${key.id}" data-return-type="normal" class="return-key-btn w-full bg-green-500 text-white font-bold py-2 px-3 rounded-md hover:bg-green-600 transition-colors text-sm flex items-center justify-center gap-2">
                        <i class="fa-solid fa-right-to-bracket"></i> Devolver
                    </button>
                    <button data-key-id="${key.id}" data-return-type="final" class="return-key-btn w-full bg-orange-500 text-white font-bold py-2 px-3 rounded-md hover:bg-orange-600 transition-colors text-sm flex items-center justify-center gap-2">
                        <i class="fa-solid fa-check-double"></i> Entrega definitiva
                    </button>
                </div>
            </div>
        `;
        keysInUseList.innerHTML += card;
    });
}

function renderHistory(history) {
    historyTableBody.innerHTML = '';
    if (history.length === 0) {
        const message = searchInput.value ? `Nenhum resultado para "${searchInput.value}".` : "Nenhum histórico encontrado.";
        historyTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4">${message}</td></tr>`;
        return;
    }
    
    const sortedHistory = [...history].sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());

    sortedHistory.forEach(item => {
        const date = item.timestamp?.toDate().toLocaleString('pt-BR') || 'N/A';
        let statusClass, statusText;
        switch (item.status) {
            case 'saida': statusClass = 'bg-red-100 text-red-800'; statusText = 'Saída'; break;
            case 'entrada': statusClass = 'bg-green-100 text-green-800'; statusText = 'Entrada'; break;
            case 'entrega_final': statusClass = 'bg-orange-100 text-orange-800'; statusText = 'Entrega definitiva'; break;
            default: statusClass = 'bg-gray-200 text-gray-800'; statusText = item.status || 'N/A'; break;
        }
        const row = `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">${item.keyNumber}</td>
                <td class="px-4 py-3">${item.personName}</td>
                <td class="px-4 py-3">${item.quadro || 'N/A'}</td>
                <td class="px-4 py-3">${item.sector || 'N/A'}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 font-semibold leading-tight text-xs rounded-full ${statusClass}">${statusText}</span></td>
                <td class="px-4 py-3">${date}</td>
            </tr>
        `;
        historyTableBody.innerHTML += row;
    });
}

async function returnKey(keyId, returnType = 'normal') {
    const keyDocRef = doc(db, "keysInUse", keyId);
    try {
        const docSnap = await getDoc(keyDocRef);
        if (!docSnap.exists()) {
            showNotification('Erro', 'Esta chave já foi devolvida.', 'error');
            return;
        }
        const keyData = docSnap.data();
        const historyStatus = returnType === 'final' ? 'entrega_final' : 'entrada';
        
        await addDoc(historyCollection, { ...keyData, status: historyStatus });
        await deleteDoc(keyDocRef);

        showNotification('Sucesso', 'Chave devolvida com sucesso!', 'success');
    } catch (error) {
        console.error("Erro ao devolver chave: ", error);
        showNotification('Erro', 'Não foi possível devolver a chave.', 'error');
    }
}

async function handleSaida() {
    const keyNumber = keyNumberEl.value.trim();
    const sector = sectorEl.value;
    const personName = personNameEl.value.trim();
    const quadro = document.querySelector('input[name="quadro"]:checked').value;

    if (!keyNumber || !personName || !sector) {
        showNotification('Campos Obrigatórios', 'Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    try {
        const keyDocRef = doc(db, "keysInUse", keyNumber);
        const docSnap = await getDoc(keyDocRef);

        if (docSnap.exists()) {
            showNotification('Chave em Uso', `A chave "${keyNumber}" já está retirada.`, 'error');
            return;
        }

        const keyData = {
            keyNumber,
            sector,
            personName,
            quadro,
            timestamp: serverTimestamp()
        };

        await setDoc(keyDocRef, keyData);
        await addDoc(historyCollection, { ...keyData, status: 'saida' });
        
        showNotification('Sucesso!', `Saída da chave "${keyNumber}" registrada.`, 'success');
        keyNumberEl.value = '';
        sectorEl.value = '';
        personNameEl.value = '';
        document.getElementById('quadro1').checked = true;

    } catch (error) {
        console.error("Erro ao registrar saída: ", error);
        showNotification('Erro', 'Ocorreu um erro ao registrar a saída.', 'error');
    }
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.text("Relatório de Movimentação de Chaves", 14, 15);

    const tableColumn = ["Chave", "Pessoa", "Quadro", "Setor", "Status", "Data e Hora"];
    const tableRows = [];

    const sortedHistory = [...fullHistory].sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());

    sortedHistory.forEach(item => {
        const date = item.timestamp?.toDate().toLocaleString('pt-BR') || 'N/A';
        let statusText;
        switch (item.status) {
            case 'saida': statusText = 'Saída'; break;
            case 'entrada': statusText = 'Entrada'; break;
            case 'entrega_final': statusText = 'Entrega definitiva'; break;
            default: statusText = item.status || 'N/A'; break;
        }
        const rowData = [item.keyNumber, item.personName, item.quadro || 'N/A', item.sector || 'N/A', statusText, date];
        tableRows.push(rowData);
    });

    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`relatorio_chaves_${dateStr}.pdf`);
}

function showNotification(title, message, type = 'info') {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalIcon.innerHTML = '';
    let iconClass, bgColor, textColor;
    if (type === 'success') { iconClass = 'fa-solid fa-check'; bgColor = 'bg-green-100'; textColor = 'text-green-600'; } 
    else if (type === 'error') { iconClass = 'fa-solid fa-xmark'; bgColor = 'bg-red-100'; textColor = 'text-red-600'; } 
    else { iconClass = 'fa-solid fa-info'; bgColor = 'bg-blue-100'; textColor = 'text-blue-600'; }
    const iconEl = document.createElement('i');
    iconEl.className = `${iconClass} text-2xl`;
    modalIcon.className = 'mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center';
    modalIcon.classList.add(bgColor, textColor);
    modalIcon.appendChild(iconEl);
    modal.classList.remove('hidden');
}

// Event Listeners
btnSaida.addEventListener('click', handleSaida);
keysInUseList.addEventListener('click', (e) => {
    const button = e.target.closest('.return-key-btn');
    if (button) returnKey(button.dataset.keyId, button.dataset.returnType);
});
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = fullHistory.filter(item => 
        Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm))
    );
    renderHistory(filtered);
});
btnGerarRelatorio.addEventListener('click', generatePDF);
closeModalButton.addEventListener('click', () => modal.classList.add('hidden'));

// Autenticação
onAuthStateChanged(auth, (user) => {
    if (user) {
        userIdEl.textContent = user.uid.substring(0, 8) + '...';
        setupListeners();
    } else {
        signInAnonymously(auth).catch((error) => {
            console.error("Erro no login anônimo: ", error);
            userIdEl.textContent = "Falha na autenticação";
        });
    }
});

setInterval(renderKeysInUse, 60000);
