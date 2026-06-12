// functions/api/redefinir-senha.js

let cachedToken = null;
let tokenExpiresAt = 0;

async function getValidOAuthToken(env) {
    const now = Math.floor(Date.now() / 1000);
    
    if (cachedToken && now < (tokenExpiresAt - 60)) {
        return cachedToken;
    }

    const response = await fetch('https://api.smartsecurities.com.br/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            grant_type: "client_credentials",
            client_id: env.SMART_CLIENT_ID,         
            client_secret: env.SMART_CLIENT_SECRET  
        })
    });

    if (!response.ok) throw new Error('Falha na geração do Token OAuth2');

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiresAt = now + data.expires_in;

    return cachedToken;
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { username } = await request.json();

        // 1. Pega o token seguro
        const bearerToken = await getValidOAuthToken(env);

        // 2. Aciona o endpoint de redefinir senha da API Smart
        const smartResponse = await fetch('https://api.smartsecurities.com.br/debenturista/auth/redefinir-senha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            },
            body: JSON.stringify({
                login: username // O endpoint exige a chave "login"
            })
        });

        const smartData = await smartResponse.json();

        // 3. Devolve para a tela do usuário
        return new Response(JSON.stringify(smartData), {
            status: smartResponse.status,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ 
            status: "ERROR", 
            mensagem: "Falha de comunicação com o servidor de disparo." 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}