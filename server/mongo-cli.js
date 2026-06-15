const mongoose = require("mongoose");
const readline = require("readline");

// -------------------------
// MongoDB Connection
// -------------------------
mongoose.connect("mongodb://localhost:27017/unified_integration_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// -------------------------
// Collection Models
// -------------------------
const collections = {
  users: mongoose.model(
    "users",
    new mongoose.Schema({}, { strict: false, collection: "users" })
  ),
  connections: mongoose.model(
    "connections",
    new mongoose.Schema({}, { strict: false, collection: "connections" })
  ),
  // Add more collections here
  // orders: mongoose.model(...)
};

// -------------------------
// CLI Setup
// -------------------------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  try {
    console.log("\nAvailable Collections:\n");

    const collectionNames = Object.keys(collections);

    collectionNames.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });

    const collectionChoice = await ask(
      "\nSelect Collection Number: "
    );

    const selectedCollection =
      collectionNames[Number(collectionChoice) - 1];

    if (!selectedCollection) {
      console.log("Invalid collection selected.");
      process.exit(0);
    }

    const Model = collections[selectedCollection];

    console.log(`
Selected Collection: ${selectedCollection}

1. Fetch
2. Delete
3. Update
4. Drop Collection
`);

    const operation = await ask("Select Operation: ");

    switch (operation) {
      case "1": {
        const condition = await ask(
          '\nEnter condition (Example: {"userId":"123"}): '
        );

        const query = JSON.parse(condition);

        const result = await Model.find(query).lean();

        console.log("\nResult:\n");
        console.dir(result, { depth: null });

        break;
      }

      case "2": {
        const condition = await ask(
          '\nEnter delete condition (Example: {"userId":"123"}): '
        );

        const query = JSON.parse(condition);

        const confirm = await ask(
          "\nAre you sure? (yes/no): "
        );

        if (confirm.toLowerCase() !== "yes") {
          console.log("Delete cancelled.");
          break;
        }

        const result = await Model.deleteMany(query);

        console.log(
          `Deleted ${result.deletedCount} document(s).`
        );

        break;
      }

      case "3": {
        const condition = await ask(
          '\nEnter filter condition (Example: {"userId":"123"}): '
        );

        const updateData = await ask(
          '\nEnter update object (Example: {"name":"Amit"}): '
        );

        const query = JSON.parse(condition);
        const update = JSON.parse(updateData);

        const result = await Model.updateMany(query, {
          $set: update,
        });

        console.log(
          `Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`
        );

        break;
      }

      case "4": {
        const confirm = await ask(
          `\nType DROP_${selectedCollection} to confirm: `
        );

        if (confirm !== `DROP_${selectedCollection}`) {
          console.log("Drop cancelled.");
          break;
        }

        await Model.collection.drop();

        console.log(
          `${selectedCollection} collection dropped successfully.`
        );

        break;
      }

      default:
        console.log("Invalid operation.");
    }
  } catch (error) {
    console.error("\nError:");
    console.error(error.message);
  } finally {
    rl.close();
    mongoose.connection.close();
  }
}

main();