import { Page } from "playwright";
import { HomePage } from "./ordinoHome.page";
import { oi } from '@ordino.ai/ordino-engine';

export class LoginPage {
    
    private txt_username = '#username';
    private txt_password = '#password';
    private btn_login = '#login-button';

    private txt_error = '#username-helper-text';
   
    page: Page;
    
    constructor(page: Page) {
        this.page = page;
    }     
    
    async goto() {
        await this.page.goto('https://demoapp.ordino.ai/login');
        return this;
    }
   
    async step_enterUsername(username: string) {
        await oi.ui(this.page).textbox(this.txt_username).clearAndType(username);
        return this;
    }

    async step_enterPassword(password: string) {
        await oi.ui(this.page).textbox(this.txt_password).enterText(password);
        return this;
    }

    async step_clickLogin() {
        await oi.ui(this.page).button(this.btn_login).click();
        return new HomePage(this.page);
    }

    async validate_login_error() {
        await oi.ui(this.page).label(this.txt_error).assertText("Enter a valid email");
        return this;
    }

    //  async step_logout() {
    //     await oi.ui(this.page).button(this.loc_userDropdown).click();
    //     // Wait for dropdown menu to appear
    //     await this.page.waitForTimeout(500);
    //     await oi.ui(this.page).button(this.loc_logoutOption).click();       
    //     return new LoginPage(this.page);
    // }
} 