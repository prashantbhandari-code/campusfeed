import { BUCKETS, SERVER_ENDPOINT, SERVER_PROJECT_ID, SERVER_API_KEY } from "./appwrite";

export async function setupStorage() {
  console.log("Setting up Appwrite storage buckets...");

  const buckets = [
    { id: BUCKETS.avatars, name: "Avatars" },
    { id: BUCKETS.posts, name: "Post Images" },
    { id: BUCKETS.messages, name: "Message Files" },
    { id: BUCKETS.materials, name: "Course Materials" },
  ];

  for (const bucket of buckets) {
    try {
      await fetch(`${SERVER_ENDPOINT}/v1/storage/buckets`, {
        method: "POST",
        headers: {
          "X-Appwrite-Project": SERVER_PROJECT_ID,
          "X-Appwrite-Key": SERVER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketId: bucket.id,
          name: bucket.name,
          permissions: ["read(\"\")", "write(\"user:\")"],
        }),
      });
      console.log(`Created bucket: ${bucket.name}`);
    } catch (e: any) {
      console.log(`Bucket ${bucket.name}: ${e.message || "exists"}`);
    }
  }

  console.log("Storage setup complete!");
}
