const Item = require("../models/Item");
const User = require("../models/User");
const { fakerEN_US: faker } = require("@faker-js/faker");
const FactoryBot = require("factory-bot");
require("dotenv").config();

const testUserPassword = faker.internet.password();
const factory = FactoryBot.factory;
const factoryAdapter = new FactoryBot.MongooseAdapter();
factory.setAdapter(factoryAdapter);

factory.define("item", Item, {
  name: () => faker.commerce.productName(),
  category: () => faker.commerce.department(),
  purchasePrice: () => parseFloat(faker.commerce.price()),
  purchaseDate: () => faker.date.past(),
  platformBought: () => ['eBay', 'StockX', 'GOAT'][Math.floor(3 * Math.random())],
  condition: () => ['New', 'Like New', 'Good', 'Fair', 'Poor'][Math.floor(5 * Math.random())],
  quantity: () => 1
});

factory.define("user", User, {
  username: () => faker.internet.userName(),
  email: () => faker.internet.email(),
  password: () => testUserPassword // We'll just generate a throwaway one but override when needed
});

const seed_db = async () => {
  let testUser = null;
  try {
    const mongoURL = process.env.MONGODB_URI_TEST;
    await Item.deleteMany({}); // deletes all item records
    await User.deleteMany({}); // and all the users
    testUser = await factory.create("user", { password: testUserPassword });
    await factory.createMany("item", 20, { user: testUser._id }); // put 20 item entries in the database.
  } catch (e) {
    console.log("database error");
    console.log(e.message);
    throw e;
  }
  return testUser;
};

module.exports = { testUserPassword, factory, seed_db };
