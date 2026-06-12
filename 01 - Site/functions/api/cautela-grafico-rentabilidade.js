// functions/api/cautela-grafico-rentabilidade.js

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

export async function onRequestGet(context) {
    const { request, env } = context;
    try {
        const bearerToken = await getValidOAuthToken(env);
        const url = new URL(request.url);
        const queryString = url.search;

        const smartResponse = await fetch(`https://api.smartsecurities.com.br/debenturista/cautela/grafico-rentabilidade${queryString}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            }
        });

        const smartData = await smartResponse.json();
        return new Response(JSON.stringify(smartData), {
            status: smartResponse.status,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            status: "ERROR",
            mensagem: "Falha na ponte de segurança do servidor."
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
