export class PeopleClient {
    constructor(authClient) {
        this.authClient = authClient;
    }

    async getPeople() {
        return this.searchPeople({ attributes: ['*'] });
    }

    async searchPeople({ 
        attributes = [], 
        limit = 1000,
        range = '',
        noCache = false
    } = {}) {
        const searchUrl = '/itim/rest/people';
        this.authClient.onLog('People Search', searchUrl, 'pending');

        try {
            const params = new URLSearchParams();
            params.append('attributes', attributes.length > 0 ? attributes.join(',') : '*');
            
            if (limit) {
                params.append('limit', limit.toString());
            }

            const token = this.authClient.getToken();
            const headers = {
                'Accept': '*/*',
                'Cookie': [token.jsession, token.ltpa2].filter(Boolean).join('; '),
                'X-CSRF-Token': token.csrf
            };

            if (noCache) {
                headers['Cache-Control'] = 'no-cache';
            }
            if (range) {
                headers['Range'] = `items=${range}`;
            }

            const url = `${searchUrl}${params.toString() ? '?' + params.toString() : ''}`;
            console.log('Searching people with URL:', url);
            console.log('Using headers:', headers);

            const response = await fetch(url, {
                method: 'GET',
                headers,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('People search failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText
                });
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('People search response:', data);

            this.authClient.onLog('People Search', searchUrl, 'success', JSON.stringify({
                url,
                resultCount: Array.isArray(data) ? data.length : 0
            }));

            return data;

        } catch (error) {
            console.error('People search error:', error);
            this.authClient.onLog('People Search', searchUrl, 'error', JSON.stringify({
                error: error.message,
                tokens: {
                    jsession: !!this.authClient.token.jsession,
                    ltpa2: !!this.authClient.token.ltpa2,
                    csrf: !!this.authClient.token.csrf
                }
            }));
            throw error;
        }
    }

    async getPersonAccounts(personId) {
        const token = this.authClient.getToken();
        const response = await fetch(`/itim/rest/people/${personId}/accounts`, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Cookie': [token.jsession, token.ltpa2].filter(Boolean).join('; '),
                'X-CSRF-Token': token.csrf
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return response.json();
    }
}

export default PeopleClient;
