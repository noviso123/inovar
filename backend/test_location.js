const http = require('http');

console.log('Starting verification script...');

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
                    console.error('Failed to parse JSON response:', data);
                    reject(e);
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
        console.log('1. Attempting login...');
        const loginData = await makeRequest('/api/auth/login', 'POST', { email: 'admin@inovar.com', password: '123456' });

        if (!loginData.success) {
            console.error('Login failed. Response:', loginData);
            return;
        } else {
            var token = loginData.data.accessToken;
            console.log('Login successful with admin@inovar.com');
        }

        console.log('2. Fetching requests...');
        const listData = await makeRequest('/api/requests?limit=1', 'GET', null, token);

        if (!listData.success || !listData.data || listData.data.length === 0) {
            console.warn('No requests found in list. Creating one for test...');
            // Find a client first to create request
            const clientsData = await makeRequest('/api/clients', 'GET', null, token);
            if (!clientsData.success || clientsData.data.length === 0) {
                console.error('No clients found either. Cannot create request.');
                return;
            }
            const clientId = clientsData.data[0].id;

            // Create request
            const createData = await makeRequest('/api/requests', 'POST', {
                clientId: clientId,
                equipmentIds: [], // Might need equipment
                priority: 'BAIXA',
                serviceType: 'Manutenção',
                description: 'Test Request'
            }, token);
             if (!createData.success && createData.message !== 'Selecione pelo menos um equipamento') {
                 console.error('Failed to create request:', createData);
                 return;
             }
             // If equipment needed, just skip and warn
             console.log('Skipping creation due to complexity. Please ensure DB has requests.');
             return;
        }

        const requestId = listData.data[0].id;
        console.log(`Testing request ID: ${requestId}`);

        console.log('3. Fetching request details...');
        const detailData = await makeRequest(`/api/requests/${requestId}`, 'GET', null, token);

        if (!detailData.success) {
            console.error('Failed to get details:', detailData);
            return;
        }

        const request = detailData.data;

        // 4. Verification
        console.log('--- VERIFICATION RESULTS ---');
        console.log(`Client Name: ${request.clientName}`);

        const clientLoaded = !!request.client;
        console.log(`Client Loaded: ${clientLoaded}`);

        if (clientLoaded) {
            const addressLoaded = !!request.client.endereco;
            console.log(`Address Loaded: ${addressLoaded}`);
            if (addressLoaded) {
                console.log('Address Details:', request.client.endereco);
                console.log('>>> SUCCESS: Client Address is correctly preloaded! <<<');
            } else {
                console.error('>>> FAILURE: Client loaded but Address is missing! <<<');
            }
        } else {
            console.error('>>> FAILURE: Client object is NOT loaded! <<<');
        }

    } catch (error) {
        console.error('Test script error:', error);
    }
}

test();
