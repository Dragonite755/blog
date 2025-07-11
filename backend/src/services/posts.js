import { Post } from '../db/models/post.js'

export async function createPost(userId, { title, contents, tags }) {
  const post = new Post({ title, author: userId, contents, tags })
  return await post.save()
}

async function listPosts(
  query = {},
  { sortBy = 'createdAt', sortOrder = 'descending' } = {},
) {
  return await Post.find(query).sort({ [sortBy]: sortOrder })
}

export async function listAllPosts(options) {
  return await listPosts({}, options)
}

export async function listPostsByAuthor(author, options) {
  // if (!mongoose.Types.ObjectId.isValid(author)) {
  //   throw new Error('Invalid author ID')
  // }

  return await listPosts({ author }, options)
}

export async function listPostsByTag(tags, options) {
  return await listPosts({ tags }, options)
}

export async function getPostById(postId) {
  return await Post.findById(postId)
}

// TODO: update function to not allow the author to be changed
export async function updatePost(userId, postId, { title, contents, tags }) {
  // if (!mongoose.Types.ObjectId.isValid(author)) {
  //   throw new Error('Invalid author ID')
  // }

  return await Post.findOneAndUpdate(
    { _id: postId, author: userId },
    { $set: { title, contents, tags } },
    { new: true },
  )
}

export async function deletePost(userId, postId) {
  return await Post.deleteOne({ _id: postId, author: userId })
}
