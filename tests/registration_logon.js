const app = require("../app");
const { factory } = require("../util/seed_db");
const { fakerEN_US: faker } = require("@faker-js/faker");
const get_chai = require("../util/get_chai");
const User = require("../models/User");

describe("tests for registration and logon", function () {
  it("should get the registration page", async () => {
    const { expect, request } = await get_chai();
    const req = request.execute(app).get("/auth/register").send();
    const res = await req;
    expect(res).to.have.status(200);
    expect(res).to.have.property("text");
    expect(res.text).to.include("Register");
  });

  it("should register the user", async () => {
    const { expect, request } = await get_chai();
    this.password = faker.internet.password();
    this.user = await factory.build("user", { password: this.password });
    const dataToPost = {
      username: this.user.username,
      email: this.user.email,
      password: this.password,
    };
    const req = request
      .execute(app)
      .post("/auth/register")
      .set("content-type", "application/x-www-form-urlencoded")
      .send(dataToPost);
    const res = await req;
    expect(res).to.have.status(200); 
    expect(res).to.have.property("text");
    expect(res.text).to.include("Login"); // Redirects to login
    
    const newUser = await User.findOne({ email: this.user.email });
    expect(newUser).to.not.be.null;
  });

  it("should log the user on", async () => {
    const dataToPost = {
      email: this.user.email,
      password: this.password,
    };
    const { expect, request } = await get_chai();
    const req = request
      .execute(app)
      .post("/auth/login")
      .set("content-type", "application/x-www-form-urlencoded")
      .redirects(0)
      .send(dataToPost);
    const res = await req;
    expect(res).to.have.status(302);
    expect(res.headers.location).to.equal("/");
    
    const cookies = res.headers["set-cookie"];
    this.sessionCookie = cookies.find((element) =>
      element.startsWith("connect.sid")
    );
    expect(this.sessionCookie).to.not.be.undefined;
  });

  it("should get the index page", async () => {
    const { expect, request } = await get_chai();
    const req = request
      .execute(app)
      .get("/")
      .set("Cookie", this.sessionCookie)
      .send();
    const res = await req;
    expect(res).to.have.status(200);
    expect(res).to.have.property("text");
  });

  it("should log off the user", async () => {
    const { expect, request } = await get_chai();
    const req = request
      .execute(app)
      .get("/auth/logout")
      .set("Cookie", this.sessionCookie)
      .send();
    const res = await req;
    expect(res).to.have.status(200); 
    expect(res.text).to.include("Login"); // Redirects to login after logout
  });
});
