import { test } from '@playwright/test';
import { OrdinoService } from '../../requests/ordino-service';

const ordinoService = new OrdinoService();

test.describe.serial('Ordino Demo API - Items Tests', () => {

    let createdItemId: string;

    test('Create new item (POST /items)', async ({ request }) => {
        const item = await ordinoService.createItem(request, {
            name: "Laptop",
            description: "Dell XPS 15",
            category: "electronics"
        });
        createdItemId = item.id;
    });

    test('Get all items (GET /items)', async ({ request }) => {
        await ordinoService.getAllItems(request);
    });

    test('Get item by ID (GET /items/{id})', async ({ request }) => {
        await ordinoService.getItemById(request, createdItemId);
    });

    test('Update item (PUT /items/{id})', async ({ request }) => {
        await ordinoService.updateItem(request, createdItemId, {
            name: "Laptop Pro",
            description: "Dell XPS 15 - Premium Edition",
            category: "electronics"
        });
    });

    test('Get items by category (GET /items)', async ({ request }) => {
        await ordinoService.getItemsByCategory(request, "electronics");
    });

    test('Delete item (DELETE /items/{id})', async ({ request }) => {
        await ordinoService.deleteItem(request, createdItemId);
    });
    
});