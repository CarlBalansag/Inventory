const app = require("../app");
const { seed_db, testUserPassword, factory } = require("../util/seed_db");
const Item = require("../models/Item");
const get_chai = require("../util/get_chai");

describe("Item CRUD operations", function () {
  before(async () => {
    const { expect, request } = await get_chai();
    this.test_user = await seed_db();
    
    // Logon to get session cookie
    const dataToPost = {
      email: this.test_user.email,
      password: testUserPassword,
    };
    
    let req = request
      .execute(app)
      .post("/auth/login")
      .set("content-type", "application/x-www-form-urlencoded")
      .redirects(0)
      .send(dataToPost);
      
    let res = await req;
    
    let cookies = res.headers["set-cookie"];
    this.sessionCookie = cookies.find((element) =>
      element.startsWith("connect.sid")
    );
    expect(this.sessionCookie).to.not.be.undefined;
  });

  it("should get the items list", async () => {
    const { expect, request } = await get_chai();
    // Getting the items list with limit=50 to see all 20 if pagination is active
    const req = request
      .execute(app)
      .get("/items?limit=50")
      .set("Cookie", this.sessionCookie)
      .send();
    const res = await req;
    expect(res).to.have.status(200);
    expect(res.text).to.include("Inventory");
    
    // Validate that our 20 seeds are in the database
    const jobs = await Item.find({ user: this.test_user._id });
    expect(jobs.length).to.equal(20);
  });

  it("should add an item entry", async () => {
    const { expect, request } = await get_chai();
    const newItem = await factory.build("item");
    
    const dataToPost = {
      name: newItem.name,
      purchasePrice: newItem.purchasePrice,
      purchaseDate: newItem.purchaseDate.toISOString().split('T')[0],
      platformBought: newItem.platformBought,
      condition: newItem.condition,
    };
    
    const req = request
      .execute(app)
      .post("/items")
      .set("Cookie", this.sessionCookie)
      .set("content-type", "application/x-www-form-urlencoded")
      .send(dataToPost);
      
    const res = await req;
    
    // Follows redirect to /items, expect 200
    expect(res).to.have.status(200);
    
    // Verify DB count has increased by 1
    const items = await Item.find({ user: this.test_user._id });
    expect(items.length).to.equal(21);
  });
});
