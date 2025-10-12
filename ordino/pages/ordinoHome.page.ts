import { expect } from '@playwright/test';
import { Page } from 'playwright';
import { LoginPage } from './ordinoLogin.page';
import { OrdinoSidePanel } from './panels/ordinoSidePanel';
import { oi } from '@ordino.ai/ordino-engine';

export class HomePage {

    page: Page;
    sidePanel: OrdinoSidePanel;

    private btn_profile = '.MuiAvatar-root';
    private btn_logout = '#logout-button';

    constructor(page: Page) {
        this.page = page;
        this.sidePanel = new OrdinoSidePanel(this.page);
    }

    public step_searchOption() {
        this.sidePanel.step_searchOption();
        return this;
    }

     async step_logout() {
        await oi.ui(this.page).button(this.btn_profile).click(); 
        // Wait for dropdown menu to appear
        await this.page.waitForTimeout(500);      
        oi.ui(this.page).button(this.btn_logout).click();
        return this;
    }
} 