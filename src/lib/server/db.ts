import { MongoClient } from "mongodb";
import { env } from '$env/dynamic/private';

// console.log("=== Environment Variables Debug ===");
// console.log("All env keys:", Object.keys(env));
// console.log("MONGO_DB_URI:", env.MONGO_DB_URI);
// console.log("===================================");

const uri = env.MONGO_DB_URI;

if (!uri) {
  throw new Error("MONGO_DB_URI is missing from environment variables");
}

const client = new MongoClient(uri);
export const db = client.db("gmuApp");
export const students = db.collection("students");



