import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/ordinoLogin.page';
import { HomePage } from '../pages/ordinoHome.page';
import { OrdinoSidePanel } from '../pages/panels/ordinoSidePanel';




// Declare the types of fixtures
type MyFixtures = {
  loginPage: LoginPage;
  homePage: HomePage;
  sidePanel: OrdinoSidePanel;
};

// Extend the base test with our fixtures
export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
  sidePanel: async ({ page }, use) => {
    const sidePanel = new OrdinoSidePanel(page);
    await use(sidePanel);
  }



});

// Export the page fixtures
export { expect } from '@playwright/test'; 