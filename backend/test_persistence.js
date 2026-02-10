const http = require('http');

console.log('Starting persistence verification script...');

function makeRequest(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    // console.error('Failed to parse JSON response:', data);
                    resolve({ success: false, raw: data });
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Request error: ${e.message}`);
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function test() {
    try {
        // 1. Login
        const loginData = await makeRequest('/api/auth/login', 'POST', { email: 'admin@inovar.com', password: '123456' });
        if (!loginData.success) {
            console.error('Login failed:', loginData);
            return;
        }
        const token = loginData.data.accessToken;
        console.log('Login successful');

        // 2. Get a Request
        let requestId;
        const listData = await makeRequest('/api/requests?limit=1', 'GET', null, token);
        if (!listData.success || listData.data.length === 0) {
            console.log('No requests found. Creating prerequisites...');

            // Get Client
            const clientsRes = await makeRequest('/api/clients', 'GET', null, token);
            let clientId;
            if (clientsRes.success && clientsRes.data.length > 0) {
                clientId = clientsRes.data[0].id;
            } else {
                console.error('No clients found either. Seeding failed?');
                return;
            }

            // Get Equipment
            let equipmentIds = [];
            const equipRes = await makeRequest('/api/equipments', 'GET', null, token);
            if (equipRes.success && equipRes.data.length > 0) {
                equipmentIds.push(equipRes.data[0].id);
            } else {
                console.log('No equipment found. Creating one...');
                const newEquip = {
                    name: "Test Equipment",
                    brand: "Test Brand",
                    model: "Test Model",
                    serialNumber: "12345",
                    clientId: clientId,
                    location: "Lab"
                };
                const createEquip = await makeRequest('/api/equipments', 'POST', newEquip, token);
                if (createEquip.success) {
                    equipmentIds.push(createEquip.data.id);
                } else {
                    console.error('Failed to create equipment:', createEquip);
                    return;
                }
            }

            // Create Request
            const createPayload = {
                clientId: clientId,
                equipmentIds: equipmentIds,
                priority: "BAIXA",
                serviceType: "Manutenção",
                description: "Persistence Test Request"
            };
            const createRes = await makeRequest('/api/requests', 'POST', createPayload, token);
            if (!createRes.success) {
                console.error('Failed to create request:', createRes);
                return;
            }
            requestId = createRes.data.id;
            console.log(`Created new Request ID: ${requestId}`);
        } else {
            requestId = listData.data[0].id;
        }
        console.log(`Testing with Request ID: ${requestId}`);

        // --- TEST BUDGET ---
        console.log('\n--- BUDGET TEST ---');
        // Add Item
        const itemPayload = {
            descricao: "Test Item Persistence",
            quantidade: 2,
            valorUnit: 100,
            tipo: "SERVICO"
        };
        const addItemRes = await makeRequest(`/api/requests/${requestId}/orcamento/itens`, 'POST', itemPayload, token);
        if (addItemRes.success) {
            console.log('Budget Item Added:', addItemRes.data.id);
            const itemId = addItemRes.data.id;

            // Verify Persistence (Get Request)
            const verifyRes = await makeRequest(`/api/requests/${requestId}`, 'GET', null, token);
            const items = verifyRes.data.orcamentoItens || [];
            const found = items.find(i => i.id === itemId);
            if (found) console.log('✅ PASS: Budget Item persisted.');
            else console.error('❌ FAIL: Budget Item NOT found after add.');

            // Remove Item
            const removeRes = await makeRequest(`/api/requests/${requestId}/orcamento/itens/${itemId}`, 'DELETE', null, token);
            if (removeRes.success) {
                 // Verify Removal
                const verifyRes2 = await makeRequest(`/api/requests/${requestId}`, 'GET', null, token);
                const items2 = verifyRes2.data.orcamentoItens || [];
                const found2 = items2.find(i => i.id === itemId);
                if (!found2) console.log('✅ PASS: Budget Item removed.');
                else console.error('❌ FAIL: Budget Item STILL exists after delete.');
            } else {
                console.error('Failed to remove item:', removeRes);
            }
        } else {
            console.error('Failed to add budget item:', addItemRes);
        }

        // --- TEST CHECKLIST ---
        console.log('\n--- CHECKLIST TEST ---');
        // Create Checklist
        const checkPayload = { description: "Test Checklist Persistence" };
        const addCheckRes = await makeRequest(`/api/requests/${requestId}/checklists`, 'POST', checkPayload, token);
        if (addCheckRes.success) {
            console.log('Checklist Item Added:', addCheckRes.data.id);
            const checkId = addCheckRes.data.id;

            // Toggle Check
            const updatePayload = { checked: true, observation: "Checked!" };
            const updateRes = await makeRequest(`/api/requests/${requestId}/checklists/${checkId}`, 'PUT', updatePayload, token); // NOTE: Handler uses PUT or PATCH? requests.go says UpdateChecklist, route is PUT /:id (line 143)
            // Actually config in main.go says: checklists.Put("/:id", ... h.UpdateChecklist)

            if (updateRes.success && updateRes.data.checked === true) {
                 // Verify Persistence
                 const verifyRes = await makeRequest(`/api/requests/${requestId}/checklists`, 'GET', null, token);
                 const found = verifyRes.data.find(c => c.id === checkId);
                 if (found && found.checked === true) console.log('✅ PASS: Checklist Toggle persisted.');
                 else {
                     console.error('❌ FAIL: Checklist state NOT persisted.', found);
                 }
            } else {
                console.error('Failed to update checklist:', updateRes);
            }

            // Clean up
             await makeRequest(`/api/requests/${requestId}/checklists/${checkId}`, 'DELETE', null, token);
        } else {
             console.error('Failed to add checklist:', addCheckRes);
        }

        // --- TEST SCHEDULE ---
        console.log('\n--- SCHEDULE TEST ---');
        // Update Status/Schedule
        const now = new Date();
        const scheduleTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
        const schedulePayload = {
            status: "AGENDADA",
            materialsUsed: "",
            nextMaintenanceAt: "",
            scheduledAt: scheduleTime,
            preventiveDone: false
        };

        console.log('Sending Schedule:', scheduleTime);
        const schedRes = await makeRequest(`/api/requests/${requestId}/status`, 'PATCH', schedulePayload, token);

        if (schedRes.success) {
             // Verify Persistence
             const verifyRes = await makeRequest(`/api/requests/${requestId}`, 'GET', null, token);
             const savedDate = verifyRes.data.scheduledAt;
             console.log('Saved Schedule:', savedDate);

             if (savedDate === scheduleTime) {
                 console.log('✅ PASS: Schedule persisted exactly.');
             } else if (new Date(savedDate).getTime() === new Date(scheduleTime).getTime()) {
                 console.log('✅ PASS: Schedule persisted (timestamp match).');
             } else {
                 console.error('❌ FAIL: Schedule mismatch or not saved.');
             }
        } else {
             console.error('Failed to schedule:', schedRes);
        }

    } catch (error) {
        console.error('Test script error:', error);
    }
}

test();
