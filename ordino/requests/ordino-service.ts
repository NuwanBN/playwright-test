import { expect } from '@playwright/test';

const BASE_URL = 'http://demoapi.ordino.ai/api';

export class OrdinoService {

    /**
     * Helper function to make API calls
     */
    async apiCall(request: any, method: string, endpoint: string, data?: any) {
        const options: any = {
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
        
        if (data) options.data = data;
        
        const response = await request[method](`${BASE_URL}${endpoint}`, options);
        expect(response.ok()).toBeTruthy();
        
        const responseData = await response.json();
        expect(responseData.status).toBe('success');
        
        console.log(`✅ ${method.toUpperCase()} ${endpoint} - Success`);
        return responseData.data;
    }

    async createItem(request: any, itemData: { name: string; description: string; category: string }) {
        return await this.apiCall(request, 'post', '/items', itemData);
    }

    async getAllItems(request: any) {
        return await this.apiCall(request, 'get', '/items');
    }

    async getItemById(request: any, itemId: string) {
        return await this.apiCall(request, 'get', `/items/${itemId}`);
    }

    async updateItem(request: any, itemId: string, itemData: { name: string; description: string; category: string }) {
        return await this.apiCall(request, 'put', `/items/${itemId}`, itemData);
    }

    async deleteItem(request: any, itemId: string) {
        return await this.apiCall(request, 'delete', `/items/${itemId}`);
    }

    async getItemsByCategory(request: any, category: string) {
        return await this.apiCall(request, 'get', `/items?category=${category}`);
    }
}