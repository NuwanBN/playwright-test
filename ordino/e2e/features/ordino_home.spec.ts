import { test } from '../../fixtures/pages';

test.describe('Ordino Home Dashboard - Test Suite', () => {

    test('Verify Profile Logout', async ({ loginPage, homePage }) => {
        await loginPage.goto();
        await loginPage.step_enterUsername("admin@platform.com");
        await loginPage.step_enterPassword("admin");
        await loginPage.step_clickLogin();           
        await homePage.step_logout();
    });    
});