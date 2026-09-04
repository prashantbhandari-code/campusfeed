import { DB_ID, SERVER_ENDPOINT, SERVER_PROJECT_ID, SERVER_API_KEY } from "./appwrite";

async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${SERVER_ENDPOINT}${path}`, {
    method,
    headers: {
      "X-Appwrite-Project": SERVER_PROJECT_ID,
      "X-Appwrite-Key": SERVER_API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function setupDatabase() {
  console.log("Setting up Appwrite database...");

  // Create database
  try {
    await api("POST", "/v1/databases", { databaseId: DB_ID, name: "CampusConnect" });
    console.log("Database created:", DB_ID);
  } catch (e: any) {
    if (e.code === 409) console.log("Database already exists");
    else console.log("Database setup:", e.message || "continuing...");
  }

  console.log("Database setup complete!");
}
