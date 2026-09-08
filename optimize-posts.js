const fs = require('fs');
let content = fs.readFileSync('src/app/api/posts/route.ts', 'utf8');

// Replace the inefficient query with optimized version
const oldQuery = `const posts = await prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
        comments: {
          include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: 3, // Only load first 3 comments, load more on demand
        },
        likes: { select: { userId: true } },
        saves: { select: { userId: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });`;

const newQuery = `const posts = await prisma.post.findMany({
      where,
      select: {
        id: true,
        content: true,
        images: true,
        createdAt: true,
        authorId: true,
        author: { select: { id: true, name: true, username: true, avatar: true } },
        _count: { select: { likes: true, comments: true, saves: true } },
        likes: { where: { userId: (session.user as any).id }, select: { userId: true } },
        saves: { where: { userId: (session.user as any).id }, select: { userId: true } },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, name: true, username: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });`;

content = content.replace(oldQuery, newQuery);

// Update the mapping to use _count
const oldMapping = `const postsWithMeta = posts.map((post) => ({
      ...post,
      content: post.content ? sanitize(post.content) : null,
      isLiked: post.likes.some((l) => l.userId === (session.user as any).id),
      likesCount: post.likes.length,
      commentsCount: post.comments.length,
      isSaved: post.saves.some((s) => s.userId === (session.user as any).id),
      savesCount: post.saves.length,
    }));`;

const newMapping = `const postsWithMeta = posts.map((post) => ({
      ...post,
      content: post.content ? sanitize(post.content) : null,
      isLiked: post.likes.length > 0,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isSaved: post.saves.length > 0,
      savesCount: post._count.saves,
    }));`;

content = content.replace(oldMapping, newMapping);

fs.writeFileSync('src/app/api/posts/route.ts', content);
console.log('Posts API optimized');
