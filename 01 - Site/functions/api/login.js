// functions/api/login.js

// Cache em memória do Worker para reaproveitar o token e economizar requisições
let cachedToken = null;
let tokenExpiresAt = 0;

// Função interna para gerenciar o Token OAuth2 da Smart Securities
async function getValidOAuthToken(env) {
    const now = Math.floor(Date.now() / 1000);
    
    // Reutiliza o token se ainda for válido (com margem de 60 segundos)
    if (cachedToken && now < (tokenExpiresAt - 60)) {
        return cachedToken;
    }

    // Busca um novo token usando as credenciais do cofre da Cloudflare (Environment Variables)
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

// Interceptador de requisições POST vindas do formulário HTML
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. Captura os dados enviados pelo JavaScript do navegador
        const { username, password } = await request.json();

        // 2. Busca o token de barramento ativo
        const bearerToken = await getValidOAuthToken(env);

        // 3. Dispara a autenticação oficial para a Smart Securities
        const smartResponse = await fetch('https://api.smartsecurities.com.br/debenturista/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            },
            body: JSON.stringify({
                login: username,
                senha: password
            })
        });

        const smartData = await smartResponse.json();

        // 4. Retorna a resposta exata da API para o Frontend tratar
        return new Response(JSON.stringify(smartData), {
            status: smartResponse.status,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // Proteção contra quebra silenciosa
        return new Response(JSON.stringify({ 
            status: "ERROR", 
            mensagem: "Falha na ponte de segurança do servidor." 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}