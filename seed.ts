import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "journey_monitor";

const testUsers = [
  {
    email: 'niran@kku.ac.th',
    name: 'รศ.ดร.นิรันดร์ วงศ์พงษ์คำ',
    role: 'ADVISOR',
    secondaryRole: 'PROGRAM_COMMITTEE'
  },
  {
    email: 'staff@kku.ac.th',
    name: 'พัชรดนย์ บุญเสริม',
    role: 'STAFF'
  },
  {
    email: 'patttan@kku.ac.th',
    name: 'คุณ พัชรดนย์ (User)',
    role: 'STAFF' // หรือเปลี่ยนเป็น 'ADVISOR' เพื่อทดสอบหน้าอาจารย์
  }
];

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log("Connected to MongoDB for seeding...");
    const db = client.db(DB_NAME);
    const usersCollection = db.collection("users");

    // Clear existing users and insert test data
    await usersCollection.deleteMany({});
    const result = await usersCollection.insertMany(testUsers);

    console.log(`Successfully seeded ${result.insertedCount} users into collection 'users'`);
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await client.close();
  }
}

seed();
