document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const keyNumberEl = document.getElementById('keyNumber');
    const sectorEl = document.getElementById('sector');
    const personNameEl = document.getElementById('personName');
    const btnSaida = document.getElementById('btnSaida');
    const btnEntrada = document.getElementById('btnEntrada');
    const keysInUseList = document.getElementById('keysInUseList');
    const historyTableBody = document.getElementById('historyTableBody');
    const searchInput = document.getElementById('searchInput');
    const inUseCountEl = document.getElementById('inUseCount');

    // Modal de Notificação
    const modal = document.getElementById('notificationModal');
    const modalContent = document.getElementById('notificationContent');
    const modalTitle = document.getElementById('notificationTitle');
    const modalMessage = document.getElementById('notificationMessage');
    const modalIcon = document.getElementById('notificationIcon');
    const closeModalButton = document.getElementById('closeModalButton');

    // Armazenamento de dados local
    let keysInUse = JSON.parse(localStorage.getItem('keysInUse')) || [];
    let fullHistory = JSON.parse(localStorage.getItem('fullHistory')) || [];

    // Converte timestamps de string para Date ao carregar
    keysInUse.forEach(k => k.timestamp = new Date(k.timestamp));
    fullHistory.forEach(h => h.timestamp = new Date(h.timestamp));

    // --- Funções de persistência ---
    function saveState() {
        localStorage.setItem('keysInUse', JSON.stringify(keysInUse));
        localStorage.setItem('fullHistory', JSON.stringify(fullHistory));
    }

    // --- Funções de Renderização ---
    function renderAll() {
        renderKeysInUse();
        renderHistory(fullHistory);
        saveState();
    }

    function renderKeysInUse() {
        keysInUseList.innerHTML = '';
        inUseCountEl.textContent = keysInUse.length;

        if (keysInUse.length === 0) {
            keysInUseList.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhuma chave retirada no momento.</p>';
            return;
        }

        const sortedKeys = [...keysInUse].sort((a,b) => b.timestamp - a.timestamp);
        const now = Date.now();
        const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

        sortedKeys.forEach(key => {
            const isOverdue = (now - key.timestamp.getTime()) > twentyFourHoursInMs;
            const cardClasses = isOverdue
              ? 'bg-red-200 border-red-600 overdue-key'
              : 'bg-blue-50 border-blue-200';
            
            const date = key.timestamp.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const card = `
                <div class="rounded-lg p-3 pr-4 flex flex-col sm:flex-row justify-between items-center gap-3 transition-colors duration-500 ${cardClasses}">
                    <div class="flex-grow">
                        <p class="font-bold text-gray-800">${key.keyNumber}</p>
                        <p class="text-sm text-gray-600">Por: <span class="font-semibold">${key.personName}</span> (${key.sector || 'N/A'})</p>
                        <p class="text-xs text-gray-500">Em: ${date}</p>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full sm:w-auto">
                         <button data-key-id="${key.keyNumber}" data-return-type="normal" class="return-key-btn w-full bg-green-500 text-white font-bold py-2 px-3 rounded-md hover:bg-green-600 transition-colors text-sm flex items-center justify-center gap-2">
                            <i class="fa-solid fa-right-to-bracket"></i> Devolver
                        </button>
                        <button data-key-id="${key.keyNumber}" data-return-type="final" class="return-key-btn w-full bg-orange-500 text-white font-bold py-2 px-3 rounded-md hover:bg-orange-600 transition-colors text-sm flex items-center justify-center gap-2">
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
            historyTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4">${message}</td></tr>`;
            return;
        }
        
        const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

        sortedHistory.forEach(item => {
            const date = item.timestamp.toLocaleString('pt-BR');
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
                    <td class="px-4 py-3">${item.sector || 'N/A'}</td>
                    <td class="px-4 py-3"><span class="px-2 py-1 font-semibold leading-tight text-xs rounded-full ${statusClass}">${statusText}</span></td>
                    <td class="px-4 py-3">${date}</td>
                </tr>
            `;
            historyTableBody.innerHTML += row;
        });
    }
    
    // --- Lógica Principal ---
    function returnKey(keyNumber, returnType = 'normal') {
        const keyIndex = keysInUse.findIndex(k => k.keyNumber === keyNumber);
        if (keyIndex === -1) {
            showNotification('Chave Não Encontrada', `A chave "${keyNumber}" não consta como retirada.`, 'error');
            return;
        }
        const keyData = keysInUse[keyIndex];
        const historyStatus = returnType === 'final' ? 'entrega_final' : 'entrada';
        const successMessage = returnType === 'final'
            ? `Entrega definitiva da chave "${keyNumber}" registrada com sucesso.`
            : `Entrada da chave "${keyNumber}" registrada com sucesso.`;
        
        fullHistory.push({ ...keyData, status: historyStatus, timestamp: new Date() });
        keysInUse.splice(keyIndex, 1);
        showNotification('Sucesso!', successMessage, 'success');
        renderAll();
    }

    btnSaida.addEventListener('click', () => {
        const keyNumber = keyNumberEl.value.trim();
        const sector = sectorEl.value;
        const personName = personNameEl.value.trim();

        if (!keyNumber || !personName || !sector) {
            showNotification('Campos Obrigatórios', 'Por favor, preencha todos os campos: Chave, Setor e Nome.', 'error');
            return;
        }
        if (keysInUse.some(k => k.keyNumber === keyNumber)) {
            showNotification('Chave em Uso', `A chave "${keyNumber}" já está retirada.`, 'error');
            return;
        }
        
        const keyData = { keyNumber, sector, personName, timestamp: new Date() };
        keysInUse.push(keyData);
        fullHistory.push({ ...keyData, status: 'saida' });
        showNotification('Sucesso!', `Saída da chave "${keyNumber}" registrada para ${personName}.`, 'success');
        
        keyNumberEl.value = ''; sectorEl.value = ''; personNameEl.value = '';
        renderAll();
    });

    btnEntrada.addEventListener('click', () => {
        const keyNumber = keyNumberEl.value.trim();
        if (!keyNumber) {
            showNotification('Campo Obrigatório', 'Por favor, informe o número da chave para registrar a entrada.', 'error');
            return;
        }
        returnKey(keyNumber);
        keyNumberEl.value = ''; sectorEl.value = ''; personNameEl.value = '';
    });

    keysInUseList.addEventListener('click', (e) => {
        const button = e.target.closest('.return-key-btn');
        if (button) returnKey(button.dataset.keyId, button.dataset.returnType);
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (!searchTerm) { renderHistory(fullHistory); return; }
        const filtered = fullHistory.filter(item => 
            item.keyNumber.toLowerCase().includes(searchTerm) ||
            item.personName.toLowerCase().includes(searchTerm) ||
            (item.sector && item.sector.toLowerCase().includes(searchTerm))
        );
        renderHistory(filtered);
    });

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
    closeModalButton.addEventListener('click', () => modal.classList.add('hidden'));

    // --- Inicialização ---
    renderAll();
    setInterval(renderAll, 60000); // Atualiza os alertas de atraso a cada minuto
});