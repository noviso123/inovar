const http = require('http');

function makeRequest(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve({ success: false, raw: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        console.log('Logging in...');
        const login = await makeRequest('/api/auth/login', 'POST', { email: 'admin@inovar.com', password: '123456' });
        if (!login.success) { console.error('Login failed', login); return; }
        const token = login.data.accessToken;

        console.log('Checking clients...');
        const clients = await makeRequest('/api/clients', 'GET', null, token);
        if (clients.success && clients.data.length > 0) {
            console.log(`Found ${clients.data.length} clients. First ID: ${clients.data[0].id}`);
        } else {
            console.log('No clients found. Creating one...');
            const newClient = {
                name: "Test Client Persistence",
                email: "testclient@inovar.com",
                phone: "11999999999", // Adjusted valid phone
                document: "12345678900", // CPF
                type: "PF",
                address: {
                    street: "Rua Teste",
                    number: "123",
                    district: "Bairro Teste",
                    city: "São Paulo",
                    state: "SP",
                    zipCode: "01000-000"
                }
            };
            const create = await makeRequest('/api/clients', 'POST', newClient, token);
            if (create.success) {
                console.log('Client created:', create.data.id);
            } else {
                console.error('Failed to create client:', create);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();
