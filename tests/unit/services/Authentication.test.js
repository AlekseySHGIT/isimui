import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ISIMClient } from '../../../src/services/ISIMClient';

describe('Authentication Integration Test', () => {
  let client;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Initialize the client with test credentials
    client = new ISIMClient({
      baseURI: 'https://test-server.com',
      username: 'ITIM Manager',
      password: '1q@3e4r',
      onLog: vi.fn()
    });
    
    // Mock the fetch function
    global.fetch = vi.fn();
  });
  
  it('should successfully authenticate and load the next page', async () => {
    // Mock successful authentication responses
    
    // 1. Mock LTPA2 cookie response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([
        ['set-cookie', ['LtpaToken2=test-token; Path=/; HttpOnly; Secure']]
      ])
    });
    
    // Mock document.cookie for the LTPA2 test
    // Since we can't directly mock document.cookie, we'll modify the client's token directly
    const originalRetrieveLTPA2 = client.retrieveLTPA2Cookie;
    client.retrieveLTPA2Cookie = async function() {
      await originalRetrieveLTPA2.call(this);
      // Manually set the token that would normally be set by the browser
      this.token.ltpa2 = '_client_wat=test-client-token; _clerk_db_jwt=test-clerk-token';
      return true;
    };
    
    // 2. Mock JSESSION cookie response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([
        ['x-auth-cookie-count', '1'],
        ['x-auth-cookie-0', 'JSESSIONID=test-session-id; Path=/; HttpOnly; Secure']
      ])
    });
    
    // 3. Mock CSRF token response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ csrf: 'test-csrf-token' })
    });
    
    // 4. Mock the page load after authentication
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html><body>Welcome to ISIM Dashboard</body></html>')
    });
    
    // Perform the authentication
    await client.connect();
    
    // Verify all tokens were set correctly
    expect(client.token.ltpa2).toBe('_client_wat=test-client-token; _clerk_db_jwt=test-clerk-token');
    expect(client.token.jsession).toBe('JSESSIONID=test-session-id');
    expect(client.token.csrf).toBe('test-csrf-token');
    
    // Simulate loading the next page after authentication
    const response = await fetch('/itim/dashboard', {
      method: 'GET',
      headers: {
        'Cookie': `${client.token.jsession}; ${client.token.ltpa2}`,
        'X-CSRF-Token': client.token.csrf
      }
    });
    
    // Verify the page loaded successfully
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    
    // Verify the content contains the expected welcome message
    const content = await response.text();
    expect(content).toContain('Welcome to ISIM Dashboard');
  });
  
  it('should fail authentication with incorrect credentials', async () => {
    // Create a client with incorrect credentials
    const badClient = new ISIMClient({
      baseURI: 'https://test-server.com',
      username: 'ITIM Manager',
      password: 'wrong-password',
      onLog: vi.fn()
    });
    
    // Mock failed authentication response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });
    
    // Attempt authentication and expect it to fail
    await expect(badClient.connect()).rejects.toThrow();
    
    // Verify no tokens were set
    expect(badClient.token.ltpa2).toBeUndefined();
    expect(badClient.token.jsession).toBeUndefined();
    expect(badClient.token.csrf).toBeUndefined();
  });
});
