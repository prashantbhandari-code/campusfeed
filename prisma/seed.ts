import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create users
  const password = await bcrypt.hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      name: "Alice Johnson",
      username: "alice",
      email: "alice@example.com",
      password,
      bio: "Full-stack developer & coffee enthusiast. Building the future one commit at a time.",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      name: "Bob Smith",
      username: "bob",
      email: "bob@example.com",
      password,
      bio: "UI/UX Designer. Making the web beautiful.",
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: {},
    create: {
      name: "Carol Davis",
      username: "carol",
      email: "carol@example.com",
      password,
      bio: "Data scientist by day, photographer by night.",
    },
  });

  const dave = await prisma.user.upsert({
    where: { email: "dave@example.com" },
    update: {},
    create: {
      name: "Dave Wilson",
      username: "dave",
      email: "dave@example.com",
      password,
      bio: "DevOps engineer. Automating all the things.",
    },
  });

  const eve = await prisma.user.upsert({
    where: { email: "eve@example.com" },
    update: {},
    create: {
      name: "Eve Martinez",
      username: "eve",
      email: "eve@example.com",
      password,
      bio: "Mobile developer. React Native enthusiast.",
    },
  });

  // Create posts
  const posts = [
    { authorId: alice.id, content: "Just shipped a major feature! The team did an incredible job. Feeling accomplished today. 🚀" },
    { authorId: bob.id, content: "New design system is live! Check out the updated component library. Consistency is key in design." },
    { authorId: carol.id, content: "Trained a new ML model that achieves 98.5% accuracy on the test set. The power of good data preprocessing!" },
    { authorId: dave.id, content: "Migrated our entire infrastructure to Kubernetes. Zero downtime deployment is now our default. 🔧" },
    { authorId: eve.id, content: "React Native 0.74 is amazing! The new bridgeless mode improves performance by 40%." },
    { authorId: alice.id, content: "Protip: Always write tests before implementing features. TDD saves time in the long run." },
    { authorId: bob.id, content: "Beautiful sunset from my workspace today. Sometimes you need to step back and appreciate the moment." },
    { authorId: carol.id, content: "Just published my research paper on transformer architectures for time-series prediction!" },
    { authorId: dave.id, content: "Set up a complete CI/CD pipeline in under an hour. GitHub Actions + Terraform = magic." },
    { authorId: eve.id, content: "Working on a cross-platform app that supports iOS, Android, and web from a single codebase. The future is now." },
    { authorId: alice.id, content: "Code review tip: Focus on logic and design, not style. Let linters handle the rest." },
    { authorId: bob.id, content: "Accessibility isn't optional. Every component we build should be usable by everyone." },
  ];

  for (const post of posts) {
    await prisma.post.create({ data: post });
  }

  // Create follows
  const follows = [
    { followerId: alice.id, followingId: bob.id },
    { followerId: alice.id, followingId: carol.id },
    { followerId: bob.id, followingId: alice.id },
    { followerId: bob.id, followingId: dave.id },
    { followerId: carol.id, followingId: alice.id },
    { followerId: carol.id, followingId: eve.id },
    { followerId: dave.id, followingId: bob.id },
    { followerId: dave.id, followingId: carol.id },
    { followerId: eve.id, followingId: alice.id },
    { followerId: eve.id, followingId: bob.id },
  ];

  for (const follow of follows) {
    await prisma.follow.upsert({
      where: { followerId_followingId: follow },
      update: {},
      create: follow,
    });
  }

  // Add some likes
  const allPosts = await prisma.post.findMany();
  for (const post of allPosts.slice(0, 8)) {
    const likers = [alice.id, bob.id, carol.id, dave.id, eve.id].filter((id) => id !== post.authorId);
    for (const userId of likers.slice(0, Math.floor(Math.random() * 3) + 1)) {
      await prisma.like.upsert({
        where: { postId_userId: { postId: post.id, userId } },
        update: {},
        create: { postId: post.id, userId },
      });
    }
  }

  // Add some comments
  const commentData = [
    { postId: allPosts[0].id, authorId: bob.id, content: "Congrats! The feature looks great." },
    { postId: allPosts[0].id, authorId: carol.id, content: "Amazing work team! 🎉" },
    { postId: allPosts[1].id, authorId: alice.id, content: "Love the new design tokens!" },
    { postId: allPosts[2].id, authorId: dave.id, content: "That accuracy is impressive! What dataset?" },
    { postId: allPosts[4].id, authorId: alice.id, content: "Bridgeless mode is a game changer!" },
  ];

  for (const comment of commentData) {
    await prisma.comment.create({ data: comment });
  }

  console.log("Database seeded successfully!");
  console.log("\nDemo accounts (password: password123):");
  console.log("  alice@example.com");
  console.log("  bob@example.com");
  console.log("  carol@example.com");
  console.log("  dave@example.com");
  console.log("  eve@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
