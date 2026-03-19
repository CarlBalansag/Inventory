const puppeteer = require("puppeteer");
require("../server"); // Starts the server on port 3000 or from env
const { seed_db, testUserPassword, factory } = require("../util/seed_db");
const Item = require("../models/Item");

let testUser = null;
let page = null;
let browser = null;

describe("inventory puppeteer test", function () {
  before(async function () {
    this.timeout(10000);
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });
  
  after(async function () {
    this.timeout(5000);
    await browser.close();
    // Force process exit to clean up the hanging server
    setTimeout(() => { process.exit(0) }, 500); 
  });

  describe("logon page test", function () {
    this.timeout(20000);
    it("gets to the logon page", async () => {
      // Small pause to ensure server is listening
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.goto("http://localhost:3000");
      // Since it requires auth, it should redirect to login
      await page.waitForSelector('input[name="email"]');
    });

    it("sends the logon", async () => {
      testUser = await seed_db();
      const emailInput = await page.waitForSelector('input[name="email"]');
      const passwordInput = await page.waitForSelector('input[name="password"]');
      const submitBtn = await page.waitForSelector("button ::-p-text(Log in)");
      
      await emailInput.type(testUser.email);
      await passwordInput.type(testUserPassword);
      
      await Promise.all([
        page.waitForNavigation(),
        submitBtn.click()
      ]);
      
      // We should be at the dashboard, which should have the items link
      await page.waitForSelector('a[href="/items"]');
    });
  });

  describe("puppeteer item operations", function () {
    this.timeout(20000);
    it("gets the items list", async () => {
      const itemsLink = await page.waitForSelector('a[href="/items"]');
      await Promise.all([
        page.waitForNavigation(),
        itemsLink.click()
      ]);
      
      const content = await page.content();
      const rows = content.split("<tr>").length - 1; 
      
      const { expect } = await import("chai");
      // There are 20 entries. Table has a header row, and maybe 10 body rows (pagination)
      expect(rows).to.be.greaterThan(0);
    });

    it("gets to the Add Item form", async () => {
      const addLink = await page.waitForSelector('a[href="/items/new"]');
      await Promise.all([
        page.waitForNavigation(),
        addLink.click()
      ]);
      await page.waitForSelector('input[name="name"]');
    });

    it("adds an item", async () => {
      const newItem = await factory.build("item");
      const nameInput = await page.waitForSelector('input[name="name"]');
      const priceInput = await page.waitForSelector('input[name="purchasePrice"]');
      const dateInput = await page.waitForSelector('input[name="purchaseDate"]');
      const platformInput = await page.waitForSelector('input[name="platformBought"]');
      const submitBtn = await page.waitForSelector('button[type="submit"]');

      await nameInput.type(newItem.name);
      await priceInput.type(newItem.purchasePrice.toString());
      await dateInput.type(newItem.purchaseDate.toISOString().split('T')[0]);
      await platformInput.type(newItem.platformBought);

      await Promise.all([
        page.waitForNavigation(),
        submitBtn.click()
      ]);

      const content = await page.content();
      const { expect } = await import("chai");
      expect(content).to.include(newItem.name);
      
      const itemsCount = await Item.countDocuments({ user: testUser._id });
      expect(itemsCount).to.equal(21);
    });
  });
});
