import { Post } from '../db/models/post.js'
import { User } from '../db/models/user.js'

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

export async function listPostsByAuthor(authorUsername, options) {
  // if (!mongoose.Types.ObjectId.isValid(author)) {
  //   throw new Error('Invalid author ID')
  // }
  const author = await User.findOne({ username: authorUsername })
  if (!author) return []
  return await listPosts({ author: author._id }, options)
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
